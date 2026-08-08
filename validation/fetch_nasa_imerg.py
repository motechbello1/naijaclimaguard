#!/usr/bin/env python3
"""Stream/extract NASA GPM IMERG Final V07 daily precipitation for validation sites.

Source: NASA GES DISC, GPM_3IMERGDF Version 07.
Requires a free NASA Earthdata Login.

Authentication is deliberately non-interactive for reproducibility:
set EARTHDATA_TOKEN (preferred for CI), or EARTHDATA_USERNAME/EARTHDATA_PASSWORD.
Never commit credentials to Git.

The script streams remote HDF5 files through earthaccess/fsspec in small batches
instead of downloading years of full global IMERG granules to disk.
"""
from __future__ import annotations

import argparse
import os
import re
from pathlib import Path
from typing import BinaryIO

import earthaccess
import h5py
import numpy as np
import pandas as pd

LOCATIONS = {
    "Lokoja": (7.8023, 6.7333),
    "Makurdi": (7.7322, 8.5391),
    "Onitsha": (6.1407, 6.7869),
    "Yenagoa": (4.9247, 6.2642),
    "Hadejia": (12.4494, 10.0447),
}

SHORT_NAME = "GPM_3IMERGDF"
VERSION = "07"
# west, south, east, north — covers all five sites with margin.
NIGERIA_BBOX = (3.0, 3.0, 12.0, 14.0)


def find_dataset(f: h5py.File):
    candidates = [
        "Grid/precipitation",
        "Grid/precipitationCal",
        "precipitation",
        "precipitationCal",
    ]
    for name in candidates:
        if name in f:
            return f[name]
    found = []

    def visit(name, obj):
        if isinstance(obj, h5py.Dataset) and "precip" in name.lower():
            found.append(name)

    f.visititems(visit)
    if not found:
        raise KeyError("No precipitation dataset found in IMERG file")
    return f[found[0]]


def read_lat_lon(f: h5py.File):
    for lat_name in ("Grid/lat", "lat"):
        if lat_name in f:
            lat = np.asarray(f[lat_name][:]).squeeze()
            break
    else:
        raise KeyError("Latitude array not found")

    for lon_name in ("Grid/lon", "lon"):
        if lon_name in f:
            lon = np.asarray(f[lon_name][:]).squeeze()
            break
    else:
        raise KeyError("Longitude array not found")
    return lat, lon


def infer_date(f: h5py.File, source_name: str = "") -> str:
    # Prefer authoritative in-file metadata.
    for key in ("FileHeader", "FileInfo"):
        if key in f.attrs:
            txt = str(f.attrs[key])
            m = re.search(r"(20\d{2}-\d{2}-\d{2})", txt)
            if m:
                return m.group(1)
            m = re.search(r"(20\d{6})", txt)
            if m:
                return pd.to_datetime(m.group(1), format="%Y%m%d").strftime("%Y-%m-%d")

    # Fallback to the remote object name / granule identifier.
    m = re.search(r"(20\d{6})", source_name)
    if not m:
        raise ValueError(f"Could not infer IMERG date from metadata or {source_name!r}")
    return pd.to_datetime(m.group(1), format="%Y%m%d").strftime("%Y-%m-%d")


def extract_file(file_obj: BinaryIO, source_name: str = "") -> list[dict]:
    # h5py supports seekable file-like objects; earthaccess.open provides one.
    with h5py.File(file_obj, "r") as f:
        ds = find_dataset(f)
        lat, lon = read_lat_lon(f)
        date = infer_date(f, source_name)

        # Resolve dimensions without materialising the entire global precip grid.
        shape = tuple(ds.shape)
        squeezed_shape = tuple(d for d in shape if d != 1)
        if squeezed_shape == (len(lon), len(lat)):
            orientation = "lon_lat"
        elif squeezed_shape == (len(lat), len(lon)):
            orientation = "lat_lon"
        else:
            raise ValueError(f"Unexpected precipitation shape {shape}")

        rows = []
        for name, (qlat, qlon) in LOCATIONS.items():
            iy = int(np.argmin(np.abs(lat - qlat)))
            ix = int(np.argmin(np.abs(lon - qlon)))

            # Slice one grid cell only. Handle optional singleton time dimension.
            if len(shape) == 3 and shape[0] == 1:
                val = ds[0, ix, iy] if orientation == "lon_lat" else ds[0, iy, ix]
            elif len(shape) == 3 and shape[-1] == 1:
                val = ds[ix, iy, 0] if orientation == "lon_lat" else ds[iy, ix, 0]
            else:
                val = ds[ix, iy] if orientation == "lon_lat" else ds[iy, ix]
            val = float(np.asarray(val).squeeze())

            fill = ds.attrs.get("_FillValue")
            if fill is not None and np.isclose(val, float(np.asarray(fill).squeeze())):
                val = np.nan
            elif val < -1000:
                val = np.nan

            rows.append({
                "date": date,
                "location": name,
                "latitude_requested": qlat,
                "longitude_requested": qlon,
                "latitude_grid": float(lat[iy]),
                "longitude_grid": float(lon[ix]),
                "nasa_imerg_precip_mm_day": val,
                "source_precipitation": "NASA GPM IMERG Final V07 daily",
                "nasa_short_name": SHORT_NAME,
                "nasa_version": VERSION,
            })
        return rows


def year_ranges(start: str, end: str):
    start_ts = pd.Timestamp(start)
    end_ts = pd.Timestamp(end)
    for year in range(start_ts.year, end_ts.year + 1):
        y0 = max(start_ts, pd.Timestamp(year=year, month=1, day=1))
        y1 = min(end_ts, pd.Timestamp(year=year, month=12, day=31))
        yield year, y0.strftime("%Y-%m-%d"), y1.strftime("%Y-%m-%d")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2018-01-01")
    ap.add_argument("--end", default="2023-12-31")
    ap.add_argument("--out", default="validation/raw/nasa_imerg_daily.csv")
    ap.add_argument("--batch-size", type=int, default=25)
    args = ap.parse_args()

    if not (os.getenv("EARTHDATA_TOKEN") or (os.getenv("EARTHDATA_USERNAME") and os.getenv("EARTHDATA_PASSWORD"))):
        raise RuntimeError(
            "NASA Earthdata credentials missing. Set EARTHDATA_TOKEN, or EARTHDATA_USERNAME and EARTHDATA_PASSWORD."
        )

    earthaccess.login(strategy="environment")
    rows: list[dict] = []

    for year, y0, y1 in year_ranges(args.start, args.end):
        print(f"Searching NASA IMERG Final V07 for {year}: {y0} -> {y1}")
        results = earthaccess.search_data(
            short_name=SHORT_NAME,
            version=VERSION,
            bounding_box=NIGERIA_BBOX,
            temporal=(y0, y1),
        )
        if not results:
            raise RuntimeError(f"NASA Earthdata search returned no IMERG granules for {year}")
        print(f"Found {len(results):,} granules for {year}")

        for start_idx in range(0, len(results), args.batch_size):
            batch = results[start_idx:start_idx + args.batch_size]
            remote_files = earthaccess.open(batch)
            for offset, (granule, fobj) in enumerate(zip(batch, remote_files), start=1):
                source_name = ""
                try:
                    source_name = granule["meta"]["native-id"]
                except Exception:
                    source_name = str(getattr(fobj, "path", granule))
                rows.extend(extract_file(fobj, source_name))
                try:
                    fobj.close()
                except Exception:
                    pass
            done = min(start_idx + len(batch), len(results))
            print(f"  streamed {done}/{len(results)} granules for {year}")

    out = pd.DataFrame(rows)
    out["date"] = pd.to_datetime(out["date"])
    out = out.sort_values(["location", "date"]).drop_duplicates(["location", "date"], keep="last")

    expected_days = (pd.Timestamp(args.end) - pd.Timestamp(args.start)).days + 1
    expected_rows = expected_days * len(LOCATIONS)
    if len(out) < expected_rows * 0.98:
        raise RuntimeError(
            f"IMERG extraction coverage too low: {len(out):,}/{expected_rows:,} expected location-days"
        )

    path = Path(args.out)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(path, index=False)
    print(f"Wrote {len(out):,} NASA IMERG location-days to {path}")


if __name__ == "__main__":
    main()
