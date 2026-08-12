from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

VALIDATION = Path(__file__).resolve().parents[1]
if str(VALIDATION) not in sys.path:
    sys.path.insert(0, str(VALIDATION))

from riverine_watch_v1 import load_model, score  # noqa: E402


class RiverineWatchV1RegressionTest(unittest.TestCase):
    def test_real_source_replay_matches_frozen_probabilities(self) -> None:
        model = load_model(VALIDATION / "riverine_watch_v1_model.json")
        replay = json.loads(
            (VALIDATION / "riverine_watch_v1_operational_replay_2026-08-10.json").read_text(
                encoding="utf-8"
            )
        )
        for expected in replay["results"]:
            row = {"location": expected["location"], **expected["features"]}
            actual = score(row, model)
            self.assertAlmostEqual(actual["probability"], expected["probability"], places=12)
            self.assertEqual(actual["state"], expected["state"])

    def test_scope_is_only_two_supported_locations(self) -> None:
        model = load_model(VALIDATION / "riverine_watch_v1_model.json")
        self.assertEqual(model["supported_locations"], ["Lokoja", "Makurdi"])
        with self.assertRaises(ValueError):
            score({"location": "Yenagoa"}, model)


if __name__ == "__main__":
    unittest.main()
