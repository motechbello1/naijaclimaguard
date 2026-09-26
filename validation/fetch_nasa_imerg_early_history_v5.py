#!/usr/bin/env python3
"""Fetch historical NASA GPM IMERG Early V07 daily rainfall for Model v5.

Product: GPM_3IMERGDE V07, Early Run, daily 0.1 degree.
Only the five frozen pilot coordinates are extracted. Output is deterministic
and records source granule identity for provenance.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
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
SHORT_NAME = "GPM_3IMERGDE"
VERSION = "07"
NIGERIA_BBOX = (3.0, 3.0, 12.0, 14.0)


def find_dataset(f: h5py.File):
    for name in ("Grid/precipitation", "Grid/precipitationCal", "precipitation", "precipitationCal"):
        if name in f:
            return f[name]
    found: list[str] = []
    def visit(name, obj):
        if isinstance(obj, h5py.Dataset) and "precip" in name.lower():
            found.append(name)
    f.visititems(visit)
    if not found:
        raise KeyError("No precipitation dataset found in IMERG Early daily file")
    return f[found[0]]


def read_lat_lon(f: h5py.File):
    lat = next((np.asarray(f[n][:]).squeeze() for n in ("Grid/lat", "lat") if n in f), None)
    lon = next((np.asarray(f[n][:]).squeeze() for n in ("Grid/lon", "lon") if n in f), None)
    if lat is None or lon is None:
        raise KeyError("IMERG latitude/longitude arrays not found")
    return lat, lon


def infer_date(f: h5py.File, source_name: str) -> str:
    for key in ("FileHeader", "FileInfo"):
        if key in f.attrs:
            text = str(f.attrs[key])
            m = re.search(r"(20\d{2}-\d{2}-\d{2})", text)
            if m:
                return m.group(1)
            m = re.search(r"(20\d{6})", text)
            if m:
                return pd.to_datetime(m.group(1), format="%Y%m%d").strftime("%Y-%m-%d")
    m = re.search(r"(20\d{6})", source_name)
    if not m:
        raise ValueError(f"Could not infer IMERG date from {source_name!r}")
    return pd.to_datetime(m.group(1), format="%Y%m%d").strftime("%Y-%m-%d")


def extract_file(file_obj: BinaryIO, source_name: str) -> list[dict]:
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
            raise ValueError(f"Unexpected IMERG grid shape {shape}; lat={len(lat)}, lon={len(lon)}")

        units = str(ds.attrs.get("units", "mm/day"))
        rows: list[dict] = []
        for location, (qlat, qlon) in LOCATIONS.items():
            iy = int(np.argmin(np.abs(lat - qlat)))
            ix = int(np.argmin(np.abs(lon - qlon)))
            if len(shape) == 3 and shape[0] == 1:
                raw = ds[0, ix, iy] if orientation == "lon_lat" else ds[0, iy, ix]
            elif len(shape) == 3 and shape[-1] == 1:
                raw = ds[ix, iy, 0] if orientation == "lon_lat" else ds[iy, ix, 0]
            else:
                raw = ds[ix, iy] if orientation == "lon_lat" else ds[iy, ix]
            value = float(np.asarray(raw).squeeze())
            fill = ds.attrs.get("_FillValue")
            if fill is not None and np.isclose(value, float(np.asarray(fill).squeeze())):
                value = np.nan
            elif value < -1000:
                value = np.nan
            rows.append({
                "date": date,
                "location": location,
                "latitude_requested": qlat,
                "longitude_requested": qlon,
                "latitude_grid": float(lat[iy]),
                "longitude_grid": float(lon[ix]),
                "nasa_imerg_early_mm_day": value,
                "nasa_units": units,
                "source_precipitation": "NASA GPM IMERG Early V07 daily",
                "nasa_short_name": SHORT_NAME,
                "nasa_version": VERSION,
                "source_granule": source_name,
            })
        return rows


def external_url(granule) -> str:
    links = granule.data_links(access="external")
    candidates = [u for u in links if u.lower().split("?")[0].endswith((".nc4", ".nc", ".h5", ".hdf5"))]
    ges = [u for u in candidates if "gesdisc.earthdata.nasa.gov" in u]
    chosen = ges or candidates
    if not chosen:
        raise RuntimeError(f"No HDF/NetCDF link for IMERG granule: {links}")
    return chosen[0]


def read_url(url: str, token: str, attempts: int = 5) -> list[dict]:
    source_name = url.rsplit("/", 1)[-1].split("?", 1)[0]
    last: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            fs = fsspec.filesystem(
                "http",
                headers={
                    "Authorization": f"Bearer {token}",
                    "User-Agent": "NaijaClimaGuard-Model-v5/1.0",
                },
            )
            with fs.open(url, "rb", block_size=2 * 1024 * 1024, cache_type="blockcache") as fobj:
                return extract_file(fobj, source_name)
        except Exception as exc:
            last = exc
            if attempt == attempts:
                break
            time.sleep(min(20, 2 ** attempt))
    raise RuntimeError(f"IMERG Early read failed for {source_name}: {last}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", required=True)
    ap.add_argument("--end", required=True)
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    token = os.getenv("EARTHDATA_TOKEN")
    if not token:
        raise RuntimeError("EARTHDATA_TOKEN is required")

    start = pd.Timestamp(args.start)
    end = pd.Timestamp(args.end)
    if end < start:
        raise ValueError("--end must be >= --start")

    granules = earthaccess.search_data(
        short_name=SHORT_NAME,
        version=VERSION,
        bounding_box=NIGERIA_BBOX,
        temporal=(start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")),
    )
    if not granules:
        raise RuntimeError(f"NASA CMR returned no {SHORT_NAME} V{VERSION} granules")

    urls = [external_url(g) for g in granules]
    rows: list[dict] = []
    failures: list[str] = []
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
        future_to_url = {pool.submit(read_url, url, token): url for url in urls}
        for i, future in enumerate(as_completed(future_to_url), 1):
            url = future_to_url[future]
            try:
                rows.extend(future.result())
            except Exception as exc:
                failures.append(f"{url.rsplit('/',1)[-1]}: {exc}")
            if i % 25 == 0 or i == len(urls):
                print(f"processed {i}/{len(urls)} IMERG Early daily granules", flush=True)
    if failures:
        raise RuntimeError(f"{len(failures)} IMERG granules failed; first failures: {failures[:5]}")

    out = pd.DataFrame(rows)
    out["date"] = pd.to_datetime(out["date"])
    out = out[out["date"].between(start, end)]
    out = out.sort_values(["location", "date"]).drop_duplicates(["location", "date"], keep="last")
    expected = ((end - start).days + 1) * len(LOCATIONS)
    coverage = len(out) / expected if expected else 0.0
    if coverage < 0.98:
        raise RuntimeError(f"IMERG Early coverage below 98%: {len(out)}/{expected} ({coverage:.2%})")
    if out["location"].nunique() != len(LOCATIONS):
        raise RuntimeError("IMERG Early output does not contain all five pilot locations")

    path = Path(args.out)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(path, index=False)
    print(f"Wrote {len(out):,} IMERG Early location-days to {path}; coverage={coverage:.2%}")


if __name__ == "__main__":
    main()
