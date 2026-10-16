from __future__ import annotations

import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr

VALIDATION = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(VALIDATION))

from build_model_v5_dataset import attach_future_target, build_glofas_features  # noqa: E402
from fetch_glofas_operational_archive_v5 import ARCHIVE_START, issue_dates, select_if_dimension  # noqa: E402
from model_v5_operational_archive import VALIDATION_YEARS  # noqa: E402
from model_v5_operational_native import apply_location_stats, fit_location_stats  # noqa: E402


class ModelV5ContractTests(unittest.TestCase):
    def frozen_events(self) -> pd.DataFrame:
        locations = ["Lokoja", "Makurdi", "Onitsha", "Yenagoa", "Hadejia"]
        rows = []
        for i in range(35):
            rows.append({
                "event_id": f"e{i:02d}",
                "location": locations[i % len(locations)],
                "observed_by_date": "2022-10-06" if i == 0 else f"2023-{(i % 12) + 1:02d}-{(i % 20) + 1:02d}",
                "include_in_benchmark": True,
            })
        return pd.DataFrame(rows)

    def test_same_day_is_not_future_positive(self):
        rows = pd.DataFrame([
            {"issue_date": pd.Timestamp("2022-10-05"), "location": "Lokoja"},
            {"issue_date": pd.Timestamp("2022-10-06"), "location": "Lokoja"},
        ])
        labelled = attach_future_target(rows, self.frozen_events())
        before = labelled[labelled["issue_date"].eq(pd.Timestamp("2022-10-05"))].iloc[0]
        same_day = labelled[labelled["issue_date"].eq(pd.Timestamp("2022-10-06"))].iloc[0]
        self.assertEqual(int(before["label"]), 1)
        self.assertEqual(int(same_day["label"]), 0)

    def test_glofas_requires_three_lead_columns(self):
        src = pd.DataFrame([
            {"issue_date": "2022-10-03", "location": "Lokoja", "lead_time_hours": 24, "forecast_discharge_m3s": 100.0},
            {"issue_date": "2022-10-03", "location": "Lokoja", "lead_time_hours": 48, "forecast_discharge_m3s": 130.0},
            {"issue_date": "2022-10-03", "location": "Lokoja", "lead_time_hours": 72, "forecast_discharge_m3s": 160.0},
        ])
        out = build_glofas_features(src).iloc[0]
        self.assertAlmostEqual(float(out["q24"]), 100.0)
        self.assertAlmostEqual(float(out["q48"]), 130.0)
        self.assertAlmostEqual(float(out["q72"]), 160.0)
        self.assertAlmostEqual(float(out["q72_minus_q24"]), 60.0)
        self.assertEqual(int(out["q_monotonic_rise"]), 1)

    def test_location_normalization_is_fitted_only_from_train(self):
        train = pd.DataFrame({
            "location": ["Lokoja"] * 4,
            "q24": [10.0, 20.0, 30.0, 40.0],
            "q48": [20.0, 30.0, 40.0, 50.0],
            "q72": [30.0, 40.0, 50.0, 60.0],
            "qmax_72": [30.0, 40.0, 50.0, 60.0],
            "rain_30d": [1.0, 2.0, 3.0, 4.0],
        })
        validation = pd.DataFrame({
            "location": ["Lokoja"],
            "q24": [10000.0], "q48": [11000.0], "q72": [12000.0],
            "qmax_72": [12000.0], "rain_30d": [1000.0],
        })
        stats = fit_location_stats(train)
        self.assertAlmostEqual(stats["Lokoja"]["q24"]["median"], 25.0)
        transformed = apply_location_stats(validation, stats)
        self.assertGreater(float(transformed.iloc[0]["q24_loc_z"]), 100.0)
        self.assertAlmostEqual(stats["Lokoja"]["q24"]["median"], 25.0)

    def test_consistent_control_archive_start_is_frozen(self):
        self.assertEqual(ARCHIVE_START, pd.Timestamp("2021-05-26"))
        dates = issue_dates(
            2021,
            [5],
            ["2021-05-25", "2021-05-26", "2021-05-27"],
        )
        self.assertEqual([d.strftime("%Y-%m-%d") for d in dates], ["2021-05-26", "2021-05-27"])
        self.assertEqual(list(VALIDATION_YEARS), [2022, 2023, 2024])

    def test_scalar_time_coordinate_is_not_selected_as_dimension(self):
        scalar = xr.DataArray(
            np.ones((2, 2)),
            dims=("latitude", "longitude"),
            coords={
                "latitude": [1.0, 0.0],
                "longitude": [5.0, 6.0],
                "time": np.datetime64("2022-09-21"),
            },
        )
        out = select_if_dimension(scalar, "time", np.datetime64("2022-09-21"))
        self.assertEqual(out.shape, (2, 2))

        indexed = xr.DataArray(
            np.arange(4).reshape(2, 2),
            dims=("time", "x"),
            coords={"time": [0, 1], "x": [0, 1]},
        )
        selected = select_if_dimension(indexed, "time", 1)
        self.assertEqual(selected.dims, ("x",))


if __name__ == "__main__":
    unittest.main()
