import importlib.util
from pathlib import Path

import pandas as pd

MODULE_PATH = Path(__file__).resolve().parents[1] / "model_v5_confirmatory_strict.py"
spec = importlib.util.spec_from_file_location("model_v5_confirmatory_strict", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_outer_years_are_frozen_and_complete():
    assert module.OUTER_YEARS == (2022, 2023, 2024)


def test_inner_folds_are_strictly_past_to_future():
    dates = pd.date_range("2021-05-01", "2021-12-31", freq="D")
    df = pd.DataFrame({
        "issue_date": dates,
        "label": [(i % 7) == 0 for i in range(len(dates))],
    })
    seen = 0
    for _, train, val in module.monthly_inner_folds(df):
        seen += 1
        assert train["issue_date"].max() < val["issue_date"].min()
    assert seen > 0


def test_event_detection_has_no_hidden_outer_year_filter():
    source = MODULE_PATH.read_text(encoding="utf-8")
    fn = source.split("def event_detection", 1)[1].split("def decision_summary", 1)[0]
    assert "OUTER_YEARS" not in fn
    assert "event rows supplied by the caller" in fn


def test_prior_event_filter_is_strictly_before_outer_year():
    source = MODULE_PATH.read_text(encoding="utf-8")
    assert 'events["observed_by_date"] < pd.Timestamp(f"{year}-01-01")' in source


def test_freeze_gate_requires_all_outer_years():
    source = MODULE_PATH.read_text(encoding="utf-8")
    assert 'complete_outer_pass = all(bool(group_results[g]["all_outer_years_present"]) for g in GROUPS)' in source
    assert "complete_outer_pass\n        and ablation_pass" in source


def test_no_source_retrieval_in_strict_scorer():
    source = MODULE_PATH.read_text(encoding="utf-8").lower()
    forbidden = ["cdsapi", "earthaccess", "ewds_api_key", "requests.get(", "requests.post(", "retrieve("]
    for token in forbidden:
        assert token not in source
