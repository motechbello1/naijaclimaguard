#!/usr/bin/env python3
"""Recover exact missing IMERG Early dates without substituting source products."""
from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

import pandas as pd

LOCATIONS = ("Lokoja", "Makurdi", "Onitsha", "Yenagoa", "Hadejia")


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, text=True, capture_output=True, check=False)


def expected_dates(end: pd.Timestamp, days: int) -> pd.DatetimeIndex:
    start = end - pd.Timedelta(days=max(1, days) - 1)
    return pd.date_range(start, end, freq="D")


def load_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame()
    frame = pd.read_csv(path)
    if not frame.empty:
        frame["date"] = pd.to_datetime(frame["date"])
    return frame


def missing_dates(frame: pd.DataFrame, dates: pd.DatetimeIndex) -> list[pd.Timestamp]:
    if frame.empty:
        return list(dates)
    present = set(pd.to_datetime(frame["date"]).dt.normalize())
    return [d for d in dates if d.normalize() not in present]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=35)
    ap.add_argument("--end", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    here = Path(__file__).resolve().parent
    base = here / "fetch_nasa_imerg_early_current.py"
    out_path = Path(args.out)
    cmd = [sys.executable, str(base), "--days", str(args.days), "--end", args.end, "--out", str(out_path)]
    first = run(cmd)
    sys.stdout.write(first.stdout)
    sys.stderr.write(first.stderr)

    frame = load_csv(out_path)
    end = pd.Timestamp(args.end)
    dates = expected_dates(end, args.days)
    missing = missing_dates(frame, dates)
    if not missing:
        return first.returncode

    print("resilient IMERG retry for exact missing dates: " + ",".join(d.strftime("%Y-%m-%d") for d in missing), flush=True)
    recovered: list[pd.DataFrame] = []
    with tempfile.TemporaryDirectory(prefix="imerg_retry_") as td:
        td_path = Path(td)
        for day in missing:
            day_str = day.strftime("%Y-%m-%d")
            retry_path = td_path / f"{day_str}.csv"
            retry = run([
                sys.executable,
                str(base),
                "--days", "1",
                "--end", day_str,
                "--out", str(retry_path),
            ])
            if retry.stdout:
                sys.stdout.write(retry.stdout)
            if retry.stderr:
                sys.stderr.write(retry.stderr)
            if retry.returncode != 0 or not retry_path.exists():
                print(f"exact-date IMERG retry unavailable for {day_str}", flush=True)
                continue
            one = load_csv(retry_path)
            one = one[pd.to_datetime(one["date"]).dt.normalize().eq(day.normalize())]
            if not one.empty:
                recovered.append(one)

    if recovered:
        frames = [frame] if not frame.empty else []
        frames.extend(recovered)
        frame = pd.concat(frames, ignore_index=True)
        frame["date"] = pd.to_datetime(frame["date"])
        frame = frame.sort_values(["location", "date"]).drop_duplicates(["location", "date"], keep="last")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        frame.to_csv(out_path, index=False)

    remaining = missing_dates(frame, dates)
    if remaining:
        print("IMERG exact-date recovery incomplete; remaining=" + ",".join(d.strftime("%Y-%m-%d") for d in remaining), flush=True)
    else:
        print("IMERG exact-date recovery restored the requested consecutive window", flush=True)

    # The prospective runner owns the strict 30-day scientific completeness check.
    # Return success when a usable CSV exists so that any remaining gap becomes a
    # durable source-incomplete status rather than a generic subprocess failure.
    return 0 if out_path.exists() else first.returncode


if __name__ == "__main__":
    raise SystemExit(main())
