#!/usr/bin/env python3
"""Download/extract NASA GPM IMERG Final V07 daily precipitation for validation sites.

Source: NASA GES DISC, GPM_3IMERGDF Version 07.
Requires a free NASA Earthdata Login. Authenticate with `earthaccess.login()`;
credentials should live in ~/.netrc or environment variables, never in Git.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import numpy as np
import pandas as pd
import earthaccess
import h5py

LOCATIONS = {
    "Lokoja": (7.8023, 6.7333),
    "Makurdi": (7.7322, 8.5391),
    "Onitsha": (6.1407, 6.7869),
    "Yenagoa": (4.9247, 6.2642),
    "Hadejia": (12.4494, 10.0447),
}

SHORT_NAME = "GPM_3IMERGDF"
VERSION = "07"


def find_dataset(f: h5py.File):
    """Find the precipitation grid robustly across IMERG daily file layouts."""
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


def extract_file(path: str) -> list[dict]:
    with h5py.File(path, "r") as f:
        ds = find_dataset(f)
        lat, lon = read_lat_lon(f)
        arr = np.asarray(ds[:]).squeeze()
        # IMERG grids may be [lon,lat] or [lat,lon]. Resolve from dimensions.
        if arr.shape == (len(lon), len(lat)):
            orientation = "lon_lat"
        elif arr.shape == (len(lat), len(lon)):
            orientation = "lat_lon"
        else:
            raise ValueError(f"Unexpected precipitation shape {arr.shape}")

        # Date is normally encoded in granule metadata; fall back to filename token.
        date = None
        for key in ("FileHeader", "FileInfo"):
            if key in f.attrs:
                txt = str(f.attrs[key])
                import re
                m = re.search(r"(20\d{2}-\d{2}-\d{2})", txt)
                if m:
                    date = m.group(1)
                    break
        if date is None:
            import re
            m = re.search(r"(20\d{6})", Path(path).name)
            if not m:
                raise ValueError(f"Could not infer date from {path}")
            date = pd.to_datetime(m.group(1), format="%Y%m%d").strftime("%Y-%m-%d")

        rows = []
        for name, (qlat, qlon) in LOCATIONS.items():
            iy = int(np.argmin(np.abs(lat - qlat)))
            ix = int(np.argmin(np.abs(lon - qlon)))
            val = float(arr[ix, iy] if orientation == "lon_lat" else arr[iy, ix])
            if val < -1000:  # common fill-value guard
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


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2018-01-01")
    ap.add_argument("--end", default="2023-12-31")
    ap.add_argument("--download-dir", default="validation/raw/imerg_granules")
    ap.add_argument("--out", default="validation/raw/nasa_imerg_daily.csv")
    args = ap.parse_args()

    earthaccess.login()
    # One Nigeria bounding box keeps the search constrained while covering all five sites.
    results = earthaccess.search_data(
        short_name=SHORT_NAME,
        version=VERSION,
        bounding_box=(3.0, 3.0, 12.0, 14.0),
        temporal=(args.start, args.end),
    )
    if not results:
        raise RuntimeError("NASA Earthdata search returned no IMERG daily granules")

    ddir = Path(args.download_dir)
    ddir.mkdir(parents=True, exist_ok=True)
    files = earthaccess.download(results, str(ddir))

    rows = []
    for i, path in enumerate(files, 1):
        if i % 100 == 0:
            print(f"Extracting IMERG granule {i}/{len(files)}")
        rows.extend(extract_file(str(path)))

    out = pd.DataFrame(rows)
    out["date"] = pd.to_datetime(out["date"])
    out = out.sort_values(["location", "date"]).drop_duplicates(["location", "date"], keep="last")
    path = Path(args.out)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(path, index=False)
    print(f"Wrote {len(out):,} NASA IMERG location-days to {path}")


if __name__ == "__main__":
    main()
