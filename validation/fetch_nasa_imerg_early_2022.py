#!/usr/bin/env python3
"""Extract NASA IMERG Early V06 near-real-time rainfall for the 2022 Lokoja replay.

This is NOT the research-quality IMERG Final training stream. It reconstructs
rainfall information that could have been available with low latency in 2022.
NASA describes IMERG Early as the lowest-latency IMERG stream (~4 hours).

Source: NASA GES DISC `GPM_3IMERGHHE` Version 06, half-hourly 0.1° product.
EARTHDATA_TOKEN is used directly as an Authorization: Bearer header so CI does
not depend on a separate URS /profile request.
"""
from __future__ import annotations

import argparse
import os
import re
import time
from pathlib import Path

import earthaccess
import fsspec
import h5py
import numpy as np
import pandas as pd

SHORT_NAME = "GPM_3IMERGHHE"
VERSION = "06"
LOKOJA = (7.8023, 6.7333)


def find_precip(f: h5py.File):
    for name in ("Grid/precipitationCal", "Grid/precipitation", "precipitationCal", "precipitation"):
        if name in f:
            return f[name]
    found = []
    def visit(name, obj):
        if isinstance(obj, h5py.Dataset) and "precip" in name.lower():
            found.append(name)
    f.visititems(visit)
    if not found:
        raise KeyError("No precipitation field found in IMERG Early granule")
    return f[found[0]]


def coord(f: h5py.File, names):
    for name in names:
        if name in f:
            return np.asarray(f[name][:]).squeeze()
    raise KeyError(f"Missing coordinate: {names}")


def infer_timestamp(f: h5py.File, source_name: str) -> pd.Timestamp:
    m = re.search(r"(20\d{6})-S(\d{6})", source_name)
    if m:
        return pd.to_datetime(m.group(1) + m.group(2), format="%Y%m%d%H%M%S", utc=True)
    for key in ("FileHeader", "FileInfo"):
        if key in f.attrs:
            text = str(f.attrs[key])
            m = re.search(r"(20\d{2}-\d{2}-\d{2}).*?(\d{2}:\d{2}:\d{2})", text)
            if m:
                return pd.Timestamp(f"{m.group(1)}T{m.group(2)}Z")
    raise ValueError(f"Cannot infer IMERG Early timestamp from {source_name}")


def extract(file_obj, source_name: str) -> dict:
    qlat, qlon = LOKOJA
    with h5py.File(file_obj, "r") as f:
        ds = find_precip(f)
        lat = coord(f, ("Grid/lat", "lat"))
        lon = coord(f, ("Grid/lon", "lon"))
        iy = int(np.argmin(np.abs(lat - qlat)))
        ix = int(np.argmin(np.abs(lon - qlon)))
        shape = tuple(ds.shape)
        squeezed = tuple(d for d in shape if d != 1)
        orientation = "lon_lat" if squeezed == (len(lon), len(lat)) else "lat_lon"
        if squeezed not in {(len(lon), len(lat)), (len(lat), len(lon))}:
            raise ValueError(f"Unexpected IMERG Early grid shape: {shape}")
        if len(shape) == 3 and shape[0] == 1:
            raw = ds[0, ix, iy] if orientation == "lon_lat" else ds[0, iy, ix]
        elif len(shape) == 3 and shape[-1] == 1:
            raw = ds[ix, iy, 0] if orientation == "lon_lat" else ds[iy, ix, 0]
        else:
            raw = ds[ix, iy] if orientation == "lon_lat" else ds[iy, ix]
        rate = float(np.asarray(raw).squeeze())
        if rate < -1000:
            rate = np.nan
        accumulation = rate * 0.5 if np.isfinite(rate) else np.nan
        return {
            "observation_time_utc": infer_timestamp(f, source_name),
            "location": "Lokoja",
            "latitude_requested": qlat,
            "longitude_requested": qlon,
            "latitude_grid": float(lat[iy]),
            "longitude_grid": float(lon[ix]),
            "imerg_early_rate_mm_hr": rate,
            "imerg_early_30min_mm": accumulation,
            "source": "NASA GPM IMERG Early V06 half-hourly via GES DISC",
            "nasa_short_name": SHORT_NAME,
            "nasa_version": VERSION,
        }


def search_with_retry(start: str, end: str, attempts: int = 5):
    last = None
    for attempt in range(1, attempts + 1):
        try:
            return earthaccess.search_data(
                short_name=SHORT_NAME,
                version=VERSION,
                bounding_box=(6.5, 7.0, 7.0, 8.5),
                temporal=(start, end),
            )
        except Exception as exc:
            last = exc
            if attempt == attempts:
                break
            delay = min(30, 2 ** attempt)
            print(f"CMR retry {attempt}/{attempts - 1}: {type(exc).__name__}; sleeping {delay}s")
            time.sleep(delay)
    raise RuntimeError(f"NASA CMR search failed: {last}")


def external_url(granule) -> str:
    links = granule.data_links(access="external")
    candidates = [u for u in links if u.lower().endswith((".nc4", ".nc", ".h5", ".hdf5"))]
    ges = [u for u in candidates if "gesdisc.earthdata.nasa.gov" in u]
    chosen = ges or candidates
    if not chosen:
        raise RuntimeError(f"No downloadable IMERG data link found: {links}")
    return chosen[0]


def read_one(fs, url: str, attempts: int = 5) -> dict:
    name = url.rsplit("/", 1)[-1]
    last = None
    for attempt in range(1, attempts + 1):
        try:
            with fs.open(url, "rb", block_size=2 * 1024 * 1024, cache_type="blockcache") as fobj:
                return extract(fobj, name)
        except Exception as exc:
            last = exc
            if attempt == attempts:
                break
            delay = min(30, 2 ** attempt)
            print(f"  granule retry {attempt}/{attempts - 1}: {type(exc).__name__}; sleeping {delay}s")
            time.sleep(delay)
    raise RuntimeError(f"Authenticated IMERG Early read failed for {name}: {last}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2022-09-20T00:00:00Z")
    ap.add_argument("--end", default="2022-10-07T23:59:59Z")
    ap.add_argument("--batch-size", type=int, default=40)
    ap.add_argument("--out-halfhour", default="validation/nasa_imerg_early_lokoja_2022_halfhour.csv")
    ap.add_argument("--out-daily", default="validation/nasa_imerg_early_lokoja_2022_daily.csv")
    args = ap.parse_args()

    token = os.getenv("EARTHDATA_TOKEN")
    if not token:
        raise RuntimeError("EARTHDATA_TOKEN is required")
    fs = fsspec.filesystem(
        "http",
        headers={"Authorization": f"Bearer {token}", "User-Agent": "NaijaClimaGuard-Validation-v2/1.0"},
    )

    results = search_with_retry(args.start, args.end)
    if not results:
        raise RuntimeError("No NASA IMERG Early V06 granules found for Lokoja replay period")
    print(f"Found {len(results):,} IMERG Early granules")

    rows = []
    for i, granule in enumerate(results, start=1):
        rows.append(read_one(fs, external_url(granule)))
        if i % args.batch_size == 0 or i == len(results):
            print(f"  streamed {i}/{len(results)} bearer-authenticated half-hour granules")

    hh = pd.DataFrame(rows).sort_values("observation_time_utc")
    hh["observation_time_utc"] = pd.to_datetime(hh["observation_time_utc"], utc=True)
    hh = hh.drop_duplicates("observation_time_utc")
    Path(args.out_halfhour).write_text(hh.to_csv(index=False), encoding="utf-8")

    hh["date"] = hh["observation_time_utc"].dt.floor("D").dt.tz_localize(None)
    daily = hh.groupby("date", as_index=False).agg(
        imerg_early_daily_mm=("imerg_early_30min_mm", "sum"),
        halfhour_granules=("imerg_early_30min_mm", "count"),
    )
    daily["complete_day"] = daily["halfhour_granules"] >= 46
    daily["source"] = "NASA GPM IMERG Early V06 aggregated from half-hourly granules"
    Path(args.out_daily).write_text(daily.to_csv(index=False), encoding="utf-8")
    print(f"Wrote {len(hh):,} half-hour observations and {len(daily):,} daily accumulations")


if __name__ == "__main__":
    main()
