#!/usr/bin/env python3
"""
Build src/data/indices_history.csv from upstream daily snapshots.

Walks the last N days of indices/snapshots/<date>/ in ccir-v2-data, pulls
rates_daily.csv + rates_shadow.csv from each, and emits a compact 3-column
file (series_id, as_of_date, price_median) covering every series the loader
might need a sparkline for.

Used both at bootstrap time (run once locally to populate the file) and on
each sync tick (re-run from the sync workflow to roll the window forward).
"""
from __future__ import annotations

import csv
import io
import os
import sys
import urllib.request
from datetime import date, datetime, timedelta

REPO_BASE = "https://raw.githubusercontent.com/ccir-index/ccir-v2-data/main/indices/snapshots"
WINDOW_DAYS = int(os.environ.get("CCIR_HISTORY_DAYS", "30"))
OUT_PATH = os.environ.get(
    "CCIR_HISTORY_OUT",
    os.path.join(os.path.dirname(__file__), "..", "src", "data", "indices_history.csv"),
)
FILES = ("rates_daily.csv", "rates_shadow.csv")


def fetch(url: str) -> str | None:
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def extract_rows(csv_text: str):
    reader = csv.DictReader(io.StringIO(csv_text))
    for r in reader:
        sid = r.get("series_id")
        med = r.get("price_median")
        d = r.get("as_of_date")
        if not (sid and med and d):
            continue
        try:
            float(med)
        except ValueError:
            continue
        yield sid, d, med


def main() -> int:
    today = date.fromisoformat(os.environ.get("CCIR_HISTORY_TODAY", date.today().isoformat()))
    start = today - timedelta(days=WINDOW_DAYS - 1)

    rows: dict[tuple[str, str], str] = {}
    fetched = 0
    skipped = 0
    cur = start
    while cur <= today:
        d = cur.isoformat()
        cur += timedelta(days=1)
        any_for_date = False
        for fname in FILES:
            text = fetch(f"{REPO_BASE}/{d}/{fname}")
            if text is None:
                continue
            any_for_date = True
            for sid, asof, med in extract_rows(text):
                rows[(sid, asof)] = med
        if any_for_date:
            fetched += 1
        else:
            skipped += 1
            print(f"  no snapshot at {d}", file=sys.stderr)

    sorted_rows = sorted(rows.items(), key=lambda kv: (kv[0][0], kv[0][1]))
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["series_id", "as_of_date", "price_median"])
        for (sid, asof), med in sorted_rows:
            w.writerow([sid, asof, med])

    print(
        f"wrote {OUT_PATH}: {len(sorted_rows)} rows from {fetched} dates "
        f"({skipped} dates missing)",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
