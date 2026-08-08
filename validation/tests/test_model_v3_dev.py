import sys
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import model_v3_dev as m


class ModelV3ProtocolTests(unittest.TestCase):
    def test_post_event_days_are_not_positive_training_labels(self):
        dates = pd.date_range("2021-08-10", "2021-08-25", freq="D")
        features = pd.DataFrame({
            "date": dates,
            "location": "Makurdi",
            "nasa_imerg_precip_mm_day": 1.0,
            "river_discharge_m3s": 100.0,
        })
        events = pd.DataFrame({
            "event_id": ["e1"],
            "location": ["Makurdi"],
            "observed_by_date": [pd.Timestamp("2021-08-17")],
        })
        labelled = m.attach_development_labels(features, events)
        positives = labelled[labelled["label"].eq(1)]["date"].tolist()
        self.assertEqual(positives, list(pd.date_range("2021-08-14", "2021-08-17", freq="D")))
        self.assertNotIn(pd.Timestamp("2021-08-18"), positives)

    def test_location_statistics_are_training_only(self):
        train = pd.DataFrame({
            "location": ["Lokoja"] * 3,
            "river_discharge_m3s": [100.0, 110.0, 120.0],
            "nasa_imerg_precip_mm_day": [1.0, 2.0, 3.0],
        })
        stats = m.fit_location_calibration(train)
        validation = pd.DataFrame({
            "location": ["Lokoja"],
            "river_discharge_m3s": [10000.0],
            "nasa_imerg_precip_mm_day": [1000.0],
        })
        m.apply_location_calibration(validation, stats)
        self.assertEqual(stats["Lokoja"]["q_median"], 110.0)
        self.assertEqual(stats["Lokoja"]["r_median"], 2.0)

    def test_expanding_folds_are_forward_only(self):
        rows = []
        for year in [2018, 2019, 2020, 2021]:
            for label in [0, 1]:
                rows.append({"date": pd.Timestamp(f"{year}-09-{10 + label}"), "label": label})
        df = pd.DataFrame(rows)
        folds = m.build_expanding_folds(df)
        self.assertEqual([f.validation_year for f, _, _ in folds], [2019, 2020, 2021])
        for fold, train_idx, val_idx in folds:
            self.assertLess(df.loc[train_idx, "date"].max().year, fold.validation_year)
            self.assertEqual(set(df.loc[val_idx, "date"].dt.year), {fold.validation_year})

    def test_raw_calendar_features_cannot_enter_eligible_hydro_set(self):
        df = pd.DataFrame({
            "nasa_imerg_precip_mm_day": [1.0] * 10,
            "river_discharge_m3s": [100.0] * 10,
            "soil_moisture_profile_mean": [0.2] * 10,
            "month": [9] * 10,
            "day_of_year": [250] * 10,
        })
        cols, _ = m.eligible_feature_columns(df, include_season=False)
        self.assertNotIn("month", cols)
        self.assertNotIn("day_of_year", cols)


if __name__ == "__main__":
    unittest.main()
