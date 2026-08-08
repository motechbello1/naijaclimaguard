#!/usr/bin/env python3
"""Extract NASA GPM IMERG Final V07 daily precipitation for validation sites.

Source: NASA GES DISC, GPM_3IMERGDF Version 07.
Requires a free NASA Earthdata Login token in EARTHDATA_TOKEN.

The CMR catalogue search is public. Granule reads use the Earthdata token
DIRECTLY as an Authorization: Bearer header. This avoids depending on a
separate URS /profile network call from CI while still using authenticated
GES DISC HTTPS range reads.
"""
from __future__ import annotations

import argparse
import os
import re
import time
from pathlib import Path
from typing import BinaryIO

import earthaccess
import fsspec
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
NIGERIA_BBOX = (3.0, 3.0, 12.0, 14.0)  # west, south, east, north


def find_dataset(f: h5py.File):
    for name in ("Grid/precipitation", "Grid/precipitationCal", "precipitation", "precipitationCal"):
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
            lat = np.asarray(f[lat_name][:]).squeeze(); break
    else:
        raise KeyError("Latitude array not found")
    for lon_name in ("Grid/lon", "lon"):
        if lon_name in f:
            lon = np.asarray(f[lon_name][:]).squeeze(); break
    else:
        raise KeyError("Longitude array not found")
    return lat, lon


def infer_date(f: h5py.File, source_name: str = "") -> str:
    for key in ("FileHeader", "FileInfo"):
        if key in f.attrs:
            txt = str(f.attrs[key])
            m = re.search(r"(20\d{2}-\d{2}-\d{2})", txt)
            if m:
                return m.group(1)
            m = re.search(r"(20\d{6})", txt)
            if m:
                return pd.to_datetime(m.group(1), format="%Y%m%d").strftime("%Y-%m-%d")
    m = re.search(r"(20\d{6})", source_name)
    if not m:
        raise ValueError(f"Could not infer IMERG date from {source_name!r}")
    return pd.to_datetime(m.group(1), format="%Y%m%d").strftime("%Y-%m-%d")


def extract_file(file_obj: BinaryIO, source_name: str = "") -> list[dict]:
    with h5py.File(file_obj, "r") as f:
        ds = find_dataset(f)
        lat, lon = read_lat_lon(f)
        date = infer_date(f, source_name)
        shape = tuple(ds.shape)
        squeezed = tuple(d for d in shape if d != 1)
        if squeezed == (len(lon), len(lat)):
            orientation = "lon_lat"
        elif squeezed == (len(lat), len(lon)):
            orientation = "lat_lon"
        else:
            raise ValueError(f"Unexpected precipitation shape {shape}; lat={len(lat)}, lon={len(lon)}")

        rows = []
        for name, (qlat, qlon) in LOCATIONS.items():
            iy = int(np.argmin(np.abs(lat - qlat)))
            ix = int(np.argmin(np.abs(lon - qlon)))
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
    a, b = pd.Timestamp(start), pd.Timestamp(end)
    for year in range(a.year, b.year + 1):
        y0 = max(a, pd.Timestamp(year=year, month=1, day=1))
        y1 = min(b, pd.Timestamp(year=year, month=12, day=31))
        yield year, y0.strftime("%Y-%m-%d"), y1.strftime("%Y-%m-%d")


def search_with_retry(y0: str, y1: str, attempts: int = 5):
    last = None
    for attempt in range(1, attempts + 1):
        try:
            return earthaccess.search_data(
                short_name=SHORT_NAME,
                version=VERSION,
                bounding_box=NIGERIA_BBOX,
                temporal=(y0, y1),
            )
        except Exception as exc:
            last = exc
            if attempt == attempts:
                break
            delay = min(30, 2 ** attempt)
            print(f"CMR search retry {attempt}/{attempts - 1}: {type(exc).__name__}; sleeping {delay}s")
            time.sleep(delay)
    raise RuntimeError(f"NASA CMR search failed after {attempts} attempts: {last}")


def external_granule_url(granule) -> str:
    links = granule.data_links(access="external")
    candidates = [u for u in links if u.lower().endswith((".nc4", ".nc", ".h5", ".hdf5"))]
    ges = [u for u in candidates if "gesdisc.earthdata.nasa.gov" in u]
    chosen = ges or candidates
    if not chosen:
        raise RuntimeError(f"No NetCDF/HDF data URL found for granule: {links}")
    return chosen[0]


def read_granule(fs, url: str, source_name: str, attempts: int = 5):
    last = None
    for attempt in range(1, attempts + 1):
        try:
            with fs.open(url, "rb", block_size=2 * 1024 * 1024, cache_type="blockcache") as fobj:
                return extract_file(fobj, source_name)
        except Exception as exc:
            last = exc
            if attempt == attempts:
                break
            delay = min(30, 2 ** attempt)
            print(f"  granule retry {attempt}/{attempts - 1} for {source_name}: {type(exc).__name__}; sleeping {delay}s")
            time.sleep(delay)
    raise RuntimeError(f"Authenticated IMERG read failed for {source_name}: {last}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2018-01-01")
    ap.add_argument("--end", default="2023-12-31")
    ap.add_argument("--out", default="validation/raw/nasa_imerg_daily.csv")
    ap.add_argument("--batch-size", type=int, default=20)
    args = ap.parse_args()

    token = os.getenv("EARTHDATA_TOKEN")
    if not token:
        raise RuntimeError("EARTHDATA_TOKEN is required for NASA GES DISC access")

    # NASA/GES DISC supports EDL bearer-token downloads. Using the token directly
    # avoids earthaccess.login() performing a separate URS /profile request.
    fs = fsspec.filesystem(
        "http",
        headers={"Authorization": f"Bearer {token}", "User-Agent": "NaijaClimaGuard-Validation-v2/1.0"},
    )
    rows: list[dict] = []

    for year, y0, y1 in year_ranges(args.start, args.end):
        print(f"Searching NASA IMERG Final V07 for {year}: {y0} -> {y1}")
        results = search_with_retry(y0, y1)
        if not results:
            raise RuntimeError(f"NASA CMR returned no IMERG granules for {year}")
        print(f"Found {len(results):,} granules for {year}")
        for i, granule in enumerate(results, start=1):
            url = external_granule_url(granule)
            source_name = url.rsplit("/", 1)[-1]
            rows.extend(read_granule(fs, url, source_name))
            if i % args.batch_size == 0 or i == len(results):
                print(f"  streamed {i}/{len(results)} bearer-authenticated granules for {year}")

    out = pd.DataFrame(rows)
    out["date"] = pd.to_datetime(out["date"])
    out = out.sort_values(["location", "date"]).drop_duplicates(["location", "date"], keep="last")
    expected_days = (pd.Timestamp(args.end) - pd.Timestamp(args.start)).days + 1
    expected_rows = expected_days * len(LOCATIONS)
    if len(out) < expected_rows * 0.98:
        raise RuntimeError(f"IMERG coverage too low: {len(out):,}/{expected_rows:,} expected location-days")
    path = Path(args.out)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(path, index=False)
    print(f"Wrote {len(out):,} NASA IMERG location-days to {path}")


if __name__ == "__main__":
    main()
