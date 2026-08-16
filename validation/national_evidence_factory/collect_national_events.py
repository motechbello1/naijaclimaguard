#!/usr/bin/env python3
"""Build a Nigeria-wide independent retrospective flood-event registry.

Primary automatic label source:
- GDACS / EC-JRC flood event archive and observed flood geometry.
- geoBoundaries gbOpen Nigeria ADM1 polygons for state assignment.

The automatic headline denominator therefore comes from an observed/geospatial flood
product that is independent from the ERA5-Land/NASA rainfall predictors used by the
benchmark. Repository-curated institutional events are retained as a second label path.

A GDACS event is not assigned to a Nigerian state from nearby news text. It becomes
headline-eligible for a state only when the returned event/observed-flood geometry
intersects that state's ADM1 polygon. If geometry is unavailable, the event remains a
non-headline discovery record unless a repository-curated record already supports it.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import time
from dataclasses import asdict, dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any

import requests
from shapely.geometry import shape
from shapely.ops import unary_union

GDACS_SEARCH = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/search"
GDACS_GEOMETRY = "https://www.gdacs.org/gdacsapi/api/polygons/getgeometry"
GEOBOUNDARIES_META = "https://www.geoboundaries.org/api/current/gbOpen/NGA/ADM1/"

INSTITUTIONAL_HINTS = (
    "NEMA", "NiHSA", "NIHSA", "SEMA", "IFRC", "OCHA", "UNICEF", "IOM",
    "European Commission", "Copernicus", "World Bank", "FAO", "WFP", "JRC",
)

NAME_ALIASES = {
    "FCT": "Federal Capital Territory",
    "Federal Capital Territory": "Federal Capital Territory",
    "Nassarawa": "Nasarawa",
    "Cross Rivers": "Cross River",
}


@dataclass
class Candidate:
    event_id: str
    state: str
    event_date: str
    event_end_date: str
    discovery_source: str
    source_url: str
    corroborating_sources: str
    corroborating_urls: str
    confidence_grade: str
    headline_eligible: bool
    evidence_summary: str
    date_basis: str


def get_json(url: str, params: dict[str, Any] | None = None, tries: int = 4):
    last = None
    for attempt in range(tries):
        try:
            r = requests.get(url, params=params, timeout=90, headers={"User-Agent": "NaijaClimaGuard-NationalEvidence/1.0"})
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            last = exc
            if attempt + 1 < tries:
                time.sleep(min(15, 2 ** attempt))
    raise RuntimeError(f"request failed: {url}: {last}")


def parse_date(value: Any) -> date | None:
    if not value:
        return None
    text = str(value).replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(text).date()
    except Exception:
        m = re.search(r"(20\d{2})[-/](\d{1,2})[-/](\d{1,2})", text)
        return date(int(m.group(1)), int(m.group(2)), int(m.group(3))) if m else None


def canonical_state(raw: str) -> str:
    raw = (raw or "").strip()
    raw = NAME_ALIASES.get(raw, raw)
    raw = re.sub(r"\s+State$", "", raw, flags=re.I).strip()
    return NAME_ALIASES.get(raw, raw)


def load_adm1() -> dict[str, Any]:
    meta = get_json(GEOBOUNDARIES_META)
    if isinstance(meta, list):
        meta = meta[0] if meta else {}
    url = meta.get("gjDownloadURL") or meta.get("simplifiedGeometryGeoJSON")
    if not url:
        raise RuntimeError("geoBoundaries Nigeria ADM1 metadata did not provide a GeoJSON URL")
    gj = get_json(url)
    states: dict[str, Any] = {}
    for feature in gj.get("features", []):
        props = feature.get("properties") or {}
        raw_name = props.get("shapeName") or props.get("ADM1_NAME") or props.get("name") or ""
        name = canonical_state(str(raw_name))
        if not name or not feature.get("geometry"):
            continue
        geom = shape(feature["geometry"])
        if not geom.is_empty:
            states[name] = geom
    if len(states) < 30:
        raise RuntimeError(f"geoBoundaries ADM1 mapping unexpectedly small: {len(states)}")
    return states


def geometry_from_payload(payload: Any):
    geoms = []
    def add_geo(obj: Any):
        if not isinstance(obj, dict):
            return
        typ = obj.get("type")
        if typ == "FeatureCollection":
            for f in obj.get("features", []):
                add_geo(f)
        elif typ == "Feature":
            add_geo(obj.get("geometry"))
        elif typ in {"Polygon", "MultiPolygon"}:
            try:
                g = shape(obj)
                if not g.is_empty:
                    geoms.append(g)
            except Exception:
                pass
        else:
            for v in obj.values():
                if isinstance(v, (dict, list)):
                    add_geo(v)
    if isinstance(payload, list):
        for item in payload:
            add_geo(item)
    else:
        add_geo(payload)
    return unary_union(geoms) if geoms else None


def event_state_intersections(event_id: str, state_geoms: dict[str, Any]) -> tuple[list[str], str]:
    try:
        payload = get_json(GDACS_GEOMETRY, {"eventtype": "FL", "eventid": event_id})
        flood_geom = geometry_from_payload(payload)
    except Exception as exc:
        return [], f"geometry unavailable: {exc}"
    if flood_geom is None or flood_geom.is_empty:
        return [], "geometry response contained no Polygon/MultiPolygon"
    hit = []
    for state, state_geom in state_geoms.items():
        try:
            inter = flood_geom.intersection(state_geom)
            if not inter.is_empty and getattr(inter, "area", 0.0) > 1e-10:
                hit.append(state)
        except Exception:
            continue
    return sorted(hit), "observed/event flood polygon intersects ADM1"


def collect_gdacs(start: date, end: date, state_geoms: dict[str, Any]) -> list[Candidate]:
    out: list[Candidate] = []
    for year in range(start.year, end.year + 1):
        a = max(start, date(year, 1, 1)); b = min(end, date(year, 12, 31))
        params = {
            "eventlist": "FL", "fromdate": a.isoformat(), "todate": b.isoformat(),
            "alertlevel": "reg;green;orange;red", "pagesize": 100,
        }
        data = get_json(GDACS_SEARCH, params)
        features = data.get("features", []) if isinstance(data, dict) else data if isinstance(data, list) else []
        for feature in features:
            props = feature.get("properties", feature) if isinstance(feature, dict) else {}
            blob = json.dumps(props, ensure_ascii=False)
            if not re.search(r"Nigeria|\bNGA\b", blob, flags=re.I):
                continue
            event_id = str(props.get("eventid") or props.get("eventId") or props.get("event_id") or props.get("id") or "").strip()
            if not event_id:
                continue
            start_d = parse_date(props.get("fromdate") or props.get("fromDate") or props.get("datefrom") or props.get("startdate"))
            end_d = parse_date(props.get("todate") or props.get("toDate") or props.get("dateto") or props.get("enddate")) or start_d
            if not start_d:
                continue
            states, spatial_note = event_state_intersections(event_id, state_geoms)
            name = str(props.get("name") or props.get("eventname") or props.get("country") or "Nigeria flood")
            if not states:
                out.append(Candidate(
                    event_id=f"gdacs-{event_id}-unassigned", state="UNASSIGNED", event_date=start_d.isoformat(),
                    event_end_date=(end_d or start_d).isoformat(), discovery_source="GDACS / EC-JRC",
                    source_url=f"https://www.gdacs.org/resources.aspx?eventid={event_id}&eventtype=FL",
                    corroborating_sources="geoBoundaries gbOpen ADM1", corroborating_urls=GEOBOUNDARIES_META,
                    confidence_grade="C", headline_eligible=False,
                    evidence_summary=f"{name}. {spatial_note}", date_basis="GDACS-event-start",
                ))
                continue
            for state in states:
                out.append(Candidate(
                    event_id=f"gdacs-{event_id}-{state.lower().replace(' ', '-')}", state=state,
                    event_date=start_d.isoformat(), event_end_date=(end_d or start_d).isoformat(),
                    discovery_source="GDACS / EC-JRC observed flood/event geometry",
                    source_url=f"https://www.gdacs.org/resources.aspx?eventid={event_id}&eventtype=FL",
                    corroborating_sources="geoBoundaries gbOpen ADM1 spatial intersection",
                    corroborating_urls=GEOBOUNDARIES_META,
                    confidence_grade="A", headline_eligible=True,
                    evidence_summary=f"{name}. {spatial_note}; label source is independent from meteorological predictors.",
                    date_basis="GDACS-event-start-spatial",
                ))
            time.sleep(0.08)
    return out


def curated_repository_events(path: Path) -> list[Candidate]:
    if not path.exists():
        return []
    location_state = {"Lokoja":"Kogi", "Makurdi":"Benue", "Onitsha":"Anambra", "Yenagoa":"Bayelsa", "Hadejia":"Jigawa"}
    out: list[Candidate] = []
    with path.open(encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            if str(row.get("include_in_benchmark", "")).lower() not in {"true","1","yes"}:
                continue
            state = location_state.get(row.get("location", ""))
            event_date = row.get("observed_by_date", "")
            if not state or not event_date:
                continue
            source = row.get("source", "")
            institutional = any(k.lower() in source.lower() for k in INSTITUTIONAL_HINTS)
            out.append(Candidate(
                event_id=f"curated-{row.get('event_id','')}", state=state, event_date=event_date,
                event_end_date=row.get("event_end_date", "") or event_date,
                discovery_source=source, source_url=row.get("source_url", ""),
                corroborating_sources="repository-curated independent event registry", corroborating_urls="",
                confidence_grade="A" if institutional else "B", headline_eligible=True,
                evidence_summary=row.get("evidence_note", ""), date_basis="observed-date-curated",
            ))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2018-01-01")
    ap.add_argument("--end", default="2025-12-31")
    ap.add_argument("--out", default="validation/national_evidence_factory/out/national_event_registry.csv")
    ap.add_argument("--curated", default="validation/model_v4_event_registry.csv")
    args = ap.parse_args()
    start, end = date.fromisoformat(args.start), date.fromisoformat(args.end)

    state_geoms = load_adm1()
    candidates = curated_repository_events(Path(args.curated)) + collect_gdacs(start, end, state_geoms)

    priority = {"observed-date-curated": 3, "GDACS-event-start-spatial": 2, "GDACS-event-start": 1}
    dedup: dict[tuple[str,str], Candidate] = {}
    for c in candidates:
        key = (c.state, c.event_date)
        if key not in dedup or priority.get(c.date_basis, 0) > priority.get(dedup[key].date_basis, 0):
            dedup[key] = c
    rows = sorted(dedup.values(), key=lambda x: (x.event_date, x.state))

    out = Path(args.out); out.parent.mkdir(parents=True, exist_ok=True)
    fields = list(Candidate.__annotations__)
    with out.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields); writer.writeheader(); writer.writerows(asdict(r) for r in rows)

    eligible = [r for r in rows if r.headline_eligible and r.state != "UNASSIGNED"]
    all_jurisdictions = sorted(state_geoms)
    covered = sorted({r.state for r in eligible})
    summary = {
        "generated_at": datetime.utcnow().isoformat()+"Z",
        "registered_adm1_geometries": len(state_geoms),
        "total_candidates": len(rows),
        "headline_eligible": len(eligible),
        "jurisdictions_with_eligible_events": len(covered),
        "covered_jurisdictions": covered,
        "jurisdictions_without_eligible_events": sorted(set(all_jurisdictions)-set(covered)),
        "grade_counts": {g: sum(r.confidence_grade == g for r in rows) for g in ["A","B","C"]},
        "rule": "Automatic headline eligibility requires EC-JRC/GDACS flood geometry intersecting a Nigeria ADM1 polygon; curated independent institutional/remote-sensing events remain eligible.",
        "label_independence": "Automatic flood labels are EC-JRC/GDACS observed/event geometry and are not derived from ERA5-Land rainfall predictor thresholds.",
    }
    Path(out.with_suffix(".summary.json")).write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    main()
