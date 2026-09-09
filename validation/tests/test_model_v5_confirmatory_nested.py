import importlib.util
from pathlib import Path

import pandas as pd

MODULE_PATH = Path(__file__).resolve().parents[1] / "model_v5_confirmatory_nested.py"
spec = importlib.util.spec_from_file_location("model_v5_confirmatory_nested", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_outer_years_are_frozen():
    assert module.OUTER_YEARS == (2022, 2023, 2024)


def test_fallback_is_explicit_and_predeclared():
    assert module.PREDECLARED_FALLBACK_CANDIDATE == "logistic_operational_native"
    assert module.PREDECLARED_FALLBACK_THRESHOLD == 0.50


def test_inner_folds_never_use_future_rows():
    dates = pd.date_range("2021-05-01", "2021-12-31", freq="D")
    df = pd.DataFrame({
        "issue_date": dates,
        "label": [(i % 5) == 0 for i in range(len(dates))],
    })
    seen = 0
    for _, train, val in module.monthly_inner_folds(df):
        seen += 1
        assert train["issue_date"].max() < val["issue_date"].min()
    assert seen > 0


def test_confirmatory_source_declares_prior_only_selection():
    source = MODULE_PATH.read_text(encoding="utf-8")
    assert 'prior = df[df["issue_date"] < pd.Timestamp(f"{year}-01-01")].copy()' in source
    assert 'test = df[df["issue_date"].dt.year.eq(year)].copy()' in source
    assert 'selection = select_candidate_and_threshold(prior' in source
    assert '"selection_rule": "candidate and threshold selected using only information strictly before each outer scoring year"' in source


def test_no_source_retrieval_imports_or_calls():
    source = MODULE_PATH.read_text(encoding="utf-8").lower()
    forbidden = ["cdsapi", "earthaccess", "ewds_api_key", "requests.get(", "requests.post(", "retrieve("]
    for token in forbidden:
        assert token not in source
