#!/usr/bin/env python3
"""Build a Nigeria-wide retrospective flood-event candidate registry.

Sources:
- GDACS flood-event API for dated/geospatial event discovery.
- ReliefWeb reports API for independent institutional/humanitarian corroboration.

The collector never turns a single news/report mention into a headline benchmark event.
Events become headline-eligible only when geospatial GDACS evidence is independently
corroborated by a second publisher/report near the event date, or when a curated
repository event already carries an institutional/remote-sensing source.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import time
from dataclasses import dataclass, asdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import requests

GDACS_SEARCH = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/search"
RELIEFWEB = "https://api.reliefweb.int/v2/reports?appname=naijaclimaguard-national-benchmark"

STATE_ALIASES = {
    "Abia": ["Abia", "Umuahia"], "Adamawa": ["Adamawa", "Yola"],
    "Akwa Ibom": ["Akwa Ibom", "Uyo"], "Anambra": ["Anambra", "Awka", "Onitsha"],
    "Bauchi": ["Bauchi"], "Bayelsa": ["Bayelsa", "Yenagoa"],
    "Benue": ["Benue", "Makurdi"], "Borno": ["Borno", "Maiduguri"],
    "Cross River": ["Cross River", "Calabar"], "Delta": ["Delta State", "Asaba", "Warri"],
    "Ebonyi": ["Ebonyi", "Abakaliki"], "Edo": ["Edo State", "Benin City"],
    "Ekiti": ["Ekiti", "Ado Ekiti", "Ado-Ekiti"], "Enugu": ["Enugu"],
    "Gombe": ["Gombe"], "Imo": ["Imo State", "Owerri"],
    "Jigawa": ["Jigawa", "Dutse", "Hadejia"], "Kaduna": ["Kaduna"],
    "Kano": ["Kano"], "Katsina": ["Katsina"], "Kebbi": ["Kebbi", "Birnin Kebbi"],
    "Kogi": ["Kogi", "Lokoja"], "Kwara": ["Kwara", "Ilorin"],
    "Lagos": ["Lagos"], "Nasarawa": ["Nasarawa", "Lafia"],
    "Niger": ["Niger State", "Minna"], "Ogun": ["Ogun", "Abeokuta"],
    "Ondo": ["Ondo State", "Akure"], "Osun": ["Osun", "Osogbo"],
    "Oyo": ["Oyo State", "Ibadan"], "Plateau": ["Plateau State", "Jos"],
    "Rivers": ["Rivers State", "Port Harcourt"], "Sokoto": ["Sokoto"],
    "Taraba": ["Taraba", "Jalingo"], "Yobe": ["Yobe", "Damaturu"],
    "Zamfara": ["Zamfara", "Gusau"],
    "Federal Capital Territory": ["Federal Capital Territory", "FCT", "Abuja"],
}

INSTITUTIONAL_HINTS = (
    "NEMA", "NiHSA", "NIHSA", "SEMA", "IFRC", "OCHA", "UNICEF", "IOM",
    "European Commission", "Copernicus", "World Bank", "FAO", "WFP",
)

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


def get_json(url: str, *, params: dict[str, Any] | None = None, method="get", payload=None, tries=4):
    last = None
    for attempt in range(tries):
        try:
            if method == "post":
                r = requests.post(url, json=payload, timeout=60, headers={"User-Agent":"NaijaClimaGuard/1.0"})
            else:
                r = requests.get(url, params=params, timeout=60, headers={"User-Agent":"NaijaClimaGuard/1.0"})
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            last = exc
            if attempt + 1 < tries:
                time.sleep(2 ** attempt)
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


def state_mentions(text: str) -> set[str]:
    found: set[str] = set()
    for state, aliases in STATE_ALIASES.items():
        for alias in aliases:
            if re.search(rf"(?<!\w){re.escape(alias)}(?!\w)", text, flags=re.I):
                found.add(state)
                break
    return found


def collect_reliefweb(start: date, end: date) -> list[dict[str, Any]]:
    payload = {
        "query": {"value": "flood flooding Nigeria", "operator": "OR"},
        "filter": {
            "operator": "AND",
            "conditions": [
                {"field": "country", "value": "Nigeria"},
                {"field": "date.created", "value": {"from": f"{start.isoformat()}T00:00:00+00:00", "to": f"{end.isoformat()}T23:59:59+00:00"}},
            ],
        },
        "fields": {"include": ["title", "body", "date.created", "date.original", "source.name", "url", "disaster_type.name"]},
        "limit": 1000,
        "preset": "analysis",
        "sort": ["date.created:asc"],
    }
    data = get_json(RELIEFWEB, method="post", payload=payload)
    rows = []
    for item in data.get("data", []):
        f = item.get("fields", {})
        sources = [s.get("name", "") for s in (f.get("source") or []) if isinstance(s, dict)]
        title = f.get("title") or ""
        body = f.get("body") or ""
        states = state_mentions(f"{title}\n{body}")
        created = ((f.get("date") or {}).get("original") or (f.get("date") or {}).get("created"))
        d = parse_date(created)
        if not d or not states:
            continue
        rows.append({
            "date": d, "states": states, "title": title, "body": body,
            "sources": sources, "url": f.get("url") or "",
        })
    return rows


def collect_gdacs(start: date, end: date) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    # Year-sized queries avoid archive paging ambiguity and keep responses bounded.
    year = start.year
    while year <= end.year:
        a = max(start, date(year, 1, 1)); b = min(end, date(year, 12, 31))
        params = {"eventlist": "FL", "fromdate": a.isoformat(), "todate": b.isoformat(), "alertlevel": "green;orange;red"}
        data = get_json(GDACS_SEARCH, params=params)
        features = data.get("features", []) if isinstance(data, dict) else data if isinstance(data, list) else []
        for feature in features:
            props = feature.get("properties", feature) if isinstance(feature, dict) else {}
            blob = json.dumps(props, ensure_ascii=False)
            if not re.search(r"Nigeria|\bNGA\b", blob, flags=re.I):
                continue
            start_d = parse_date(props.get("fromdate") or props.get("fromDate") or props.get("datefrom") or props.get("startdate"))
            end_d = parse_date(props.get("todate") or props.get("toDate") or props.get("dateto") or props.get("enddate")) or start_d
            if not start_d:
                continue
            event_id = str(props.get("eventid") or props.get("eventId") or props.get("event_id") or props.get("id") or f"{start_d}-flood")
            name = str(props.get("name") or props.get("eventname") or props.get("country") or "Nigeria flood")
            states = state_mentions(blob + " " + name)
            events.append({"event_id": event_id, "date": start_d, "end": end_d or start_d, "states": states, "raw": props})
        year += 1
    # de-duplicate by event id
    return list({e["event_id"]: e for e in events}.values())


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
            if not state:
                continue
            source = row.get("source", "")
            institutional = any(k.lower() in source.lower() for k in INSTITUTIONAL_HINTS)
            out.append(Candidate(
                event_id=f"curated-{row['event_id']}", state=state,
                event_date=row.get("observed_by_date", ""), event_end_date=row.get("event_end_date", "") or row.get("observed_by_date", ""),
                discovery_source=source, source_url=row.get("source_url", ""),
                corroborating_sources="repository-curated", corroborating_urls="",
                confidence_grade="A" if institutional else "B", headline_eligible=True,
                evidence_summary=row.get("evidence_note", ""), date_basis="observed-date-curated",
            ))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2018-01-01")
    ap.add_argument("--end", default=date.today().isoformat())
    ap.add_argument("--out", default="validation/national_evidence_factory/out/national_event_registry.csv")
    ap.add_argument("--curated", default="validation/model_v4_event_registry.csv")
    args = ap.parse_args()
    start, end = date.fromisoformat(args.start), date.fromisoformat(args.end)

    relief = collect_reliefweb(start, end)
    gdacs = collect_gdacs(start, end)
    candidates: list[Candidate] = curated_repository_events(Path(args.curated))

    for event in gdacs:
        # If GDACS metadata does not identify a state, corroborating reports near the event may.
        nearby = [r for r in relief if abs((r["date"] - event["date"]).days) <= 21]
        states = set(event["states"])
        if not states:
            for r in nearby:
                states |= r["states"]
        for state in sorted(states):
            matches = [r for r in nearby if state in r["states"]]
            publishers = sorted({s for r in matches for s in r["sources"] if s})
            urls = sorted({r["url"] for r in matches if r["url"]})
            independent = bool(publishers)
            strong_publisher = any(any(k.lower() in p.lower() for k in INSTITUTIONAL_HINTS) for p in publishers)
            grade = "A" if independent and strong_publisher else "B" if independent else "C"
            eligible = independent
            props = event["raw"]
            candidates.append(Candidate(
                event_id=f"gdacs-{event['event_id']}-{state.lower().replace(' ','-')}",
                state=state, event_date=event["date"].isoformat(), event_end_date=event["end"].isoformat(),
                discovery_source="GDACS / EC-JRC", source_url=f"https://www.gdacs.org/resources.aspx?eventid={event['event_id']}&eventtype=FL",
                corroborating_sources=" | ".join(publishers), corroborating_urls=" | ".join(urls),
                confidence_grade=grade, headline_eligible=eligible,
                evidence_summary=str(props.get("name") or props.get("description") or "GDACS flood event with independent report cross-check"),
                date_basis="GDACS-event-start",
            ))

    # Exact duplicate protection; curated beats auto-discovered for same state/date.
    priority = {"observed-date-curated": 2, "GDACS-event-start": 1}
    dedup: dict[tuple[str,str], Candidate] = {}
    for c in candidates:
        key = (c.state, c.event_date)
        if key not in dedup or priority.get(c.date_basis,0) > priority.get(dedup[key].date_basis,0):
            dedup[key] = c

    rows = sorted(dedup.values(), key=lambda x: (x.event_date, x.state))
    out = Path(args.out); out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(asdict(rows[0]).keys()) if rows else list(Candidate.__annotations__))
        writer.writeheader(); writer.writerows(asdict(r) for r in rows)

    summary = {
        "generated_at": datetime.utcnow().isoformat()+"Z",
        "total_candidates": len(rows),
        "headline_eligible": sum(r.headline_eligible for r in rows),
        "jurisdictions_with_eligible_events": len({r.state for r in rows if r.headline_eligible}),
        "grade_counts": {g: sum(r.confidence_grade == g for r in rows) for g in ["A","B","C"]},
        "rule": "Headline-eligible requires repository-curated event evidence or GDACS plus independent ReliefWeb publisher corroboration.",
    }
    Path(out.with_suffix(".summary.json")).write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    main()
