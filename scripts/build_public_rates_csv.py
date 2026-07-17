"""Build the public download CSVs from the canonical bundled snapshot.

The canonical rates_daily.csv (src/data/) carries two parallel taxonomies:
operator-tier series (T1/T2/T3 — what /rates presents as Hyperscaler /
Neocloud / Marketplace) and legacy factory-class series (HIF/IIF/SIF/DIF)
that ride along for the /explorer long-tail section. The public download
(public/data/) should match what /rates presents, title-wise:

  - operator-tier rows only (legacy factory-class rows dropped);
  - the redundant factory_type column dropped;
  - a leading `segment` label column (Hyperscaler / Neocloud / Marketplace)
    matching the page vocabulary, with the T1/T2/T3 code retained in
    operator_tier and in the series_id grammar.

public/data/rates_history.csv gets the same series filter applied to
src/data/indices_history.csv (series_id tier token), replacing the copy
that had been frozen since the file was first committed (the sync workflow
fetched a file that never existed upstream and `|| true` hid the failure).

Run from the repo root (the sync workflow runs it after the history
rebuild; it is also safe to run locally).
"""
from __future__ import annotations

import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEGMENT_LABELS = {"T1": "Hyperscaler", "T2": "Neocloud", "T3": "Marketplace"}


def build_daily() -> None:
    src = ROOT / "src" / "data" / "rates_daily.csv"
    out = ROOT / "public" / "data" / "rates_daily.csv"
    with src.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        in_cols = list(reader.fieldnames or [])
        rows = [r for r in reader if r.get("operator_tier") in SEGMENT_LABELS]
    out_cols = ["series_id", "as_of_date", "segment"] + [
        c for c in in_cols if c not in ("series_id", "as_of_date", "factory_type")
    ]
    with out.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=out_cols, lineterminator="\n")
        writer.writeheader()
        for r in rows:
            r.pop("factory_type", None)
            r["segment"] = SEGMENT_LABELS[r["operator_tier"]]
            writer.writerow(r)
    print(f"public rates_daily.csv: {len(rows)} operator-tier rows "
          f"({out_cols.index('segment') + 1}th col = segment label)")


def build_history() -> None:
    src = ROOT / "src" / "data" / "indices_history.csv"
    out = ROOT / "public" / "data" / "rates_history.csv"
    if not src.exists():
        print("no src/data/indices_history.csv — leaving public history unchanged")
        return
    kept = 0
    with src.open(newline="", encoding="utf-8") as f, \
            out.open("w", newline="", encoding="utf-8") as g:
        reader = csv.reader(f)
        writer = csv.writer(g, lineterminator="\n")
        header = next(reader)
        writer.writerow(header)
        sid = header.index("series_id")
        for row in reader:
            parts = row[sid].split("-")
            if len(parts) > 1 and parts[1] in SEGMENT_LABELS:
                writer.writerow(row)
                kept += 1
    print(f"public rates_history.csv: {kept} operator-tier rows")


if __name__ == "__main__":
    build_daily()
    build_history()
