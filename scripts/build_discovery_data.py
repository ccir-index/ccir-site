"""Shape the daily per-zone spot print into src/data/discovery_daily.json for /discovery.

Input: ccir-v2-data aws_spot/az_daily.csv (the daily print; one row per
instance type x zone x UTC day). Output: derived per-GPU daily values only,
keyed by CCIR labels (chip, server, place, zone). No instance prices, no
instance codes and no zone codes reach the page. The site offers no download
of this file: the page embeds it and draws charts from it.

Zone labels come from src/data/discovery_zones.csv, a FROZEN table keyed on
the zone ID. Existing rows never change. A new zone in a known place is
appended with the next free number (Z1..Zn never shift). A zone in a place
with no entry is skipped and logged: add the place by hand.

The 30-day no-change display rule is applied at site build
(src/data/discovery.ts), not here, so it re-evaluates on every build.

Usage: python3 scripts/build_discovery_data.py <path/to/az_daily.csv>
"""
import csv
import json
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ZONES = ROOT / "src" / "data" / "discovery_zones.csv"
OUT = ROOT / "src" / "data" / "discovery_daily.json"

# Displayed products (owner rulings, 2026-09-23). The 1-GPU H100 and the
# A100 80GB are not shown; the A100 40GB is shown as plain "A100".
PRODUCTS = {
    "p5.48xlarge": ("H100", "8-GPU server", ""),
    "p5e.48xlarge": ("H200", "standard server", "standard"),
    "p5en.48xlarge": ("H200", "upgraded server", "upgraded"),
    "p4d.24xlarge": ("A100", "8-GPU server", ""),
    "p6-b200.48xlarge": ("B200", "8-GPU server", ""),
    "p6-b300.48xlarge": ("B300", "8-GPU server", ""),
}


def slug(s):
    return "".join(c if c.isalnum() else "-" for c in s.lower()).strip("-").replace("--", "-")


def load_zones():
    with open(ZONES, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main(src):
    zones = load_zones()
    by_az = {z["az_id"]: z for z in zones}
    places = {}
    for z in zones:
        places.setdefault(z["aws_region"], z)

    with open(src, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    # Append-only: new zones in known places get the next number.
    added, unplaced = [], set()
    for az in sorted({(r["region"], r["az_id"]) for r in rows if r["instance_type"] in PRODUCTS}):
        region, az_id = az
        if az_id in by_az:
            continue
        if region not in places:
            unplaced.add(region)
            continue
        p = places[region]
        n = 1 + max(int(z["zone"][1:]) for z in zones if z["aws_region"] == region)
        z = {"az_id": az_id, "aws_region": region, "place": p["place"], "zone": f"Z{n}",
             "lat": p["lat"], "lon": p["lon"], "frozen_on": date.today().isoformat()}
        zones.append(z)
        by_az[az_id] = z
        added.append(f"{az_id} -> {p['place']} Z{n}")
    if added:
        with open(ZONES, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(zones[0].keys()), lineterminator="\n")
            w.writeheader()
            w.writerows(zones)

    series = defaultdict(dict)
    close_through = None
    for r in rows:
        it = r["instance_type"]
        if it not in PRODUCTS or r["az_id"] not in by_az:
            continue
        v = r.get("usd_per_gpu_hour") or ""
        if not v:
            continue
        series[(it, r["az_id"])][r["as_of_date"]] = round(float(v), 4)
        if r.get("value_basis") == "close" and (close_through is None or r["as_of_date"] > close_through):
            close_through = r["as_of_date"]

    out = []
    for (it, az_id), pts in series.items():
        chip, product, variant = PRODUCTS[it]
        z = by_az[az_id]
        key = "-".join(x for x in (chip.lower(), variant, slug(z["place"]), z["zone"].lower()) if x)
        days = sorted(pts)
        d0 = date.fromisoformat(days[0])
        out.append({
            "key": key, "chip": chip, "product": product, "place": z["place"], "zone": z["zone"],
            "lat": float(z["lat"]), "lon": float(z["lon"]), "start": days[0],
            # [day offset from start, USD per GPU-hour]
            "p": [[(date.fromisoformat(d) - d0).days, pts[d]] for d in days],
        })
    out.sort(key=lambda s: s["key"])
    all_days = [s["start"] for s in out]
    as_of = max(max(r["as_of_date"] for r in rows), "")
    OUT.write_text(json.dumps({
        "as_of": as_of,
        "first_day": min(all_days) if all_days else None,
        "close_through": close_through,
        "series": out,
    }, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT.name}: {len(out)} series through {as_of} ({OUT.stat().st_size:,} bytes)")
    for a in added:
        print(f"new zone appended: {a}")
    for u in sorted(unplaced):
        print(f"WARNING: no place for {u}; its zones are not shown until a place row is added")


if __name__ == "__main__":
    main(sys.argv[1])
