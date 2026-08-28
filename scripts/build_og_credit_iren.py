"""OG card for /credit/issuer/iren (1200x630) — TERMINAL style.

Output: site/public/og/credit-iren.png
Dark terminal palette per CCIR chart style v1 (surface #0d1117, brand
amber, mono type), matching the-guaranty-book.png. Visual mirrors the
page's "Fixed coupons at issue" panel: every fixed-rate IREN instrument,
coupon vs issue date, hollow = convertible. Data is read from the ledger
JSON — nothing hardcoded. Card discipline: few words, window in the
kicker, selective labels only.
"""

import json
from datetime import date, datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "og" / "credit-iren.png"
OUT.parent.mkdir(parents=True, exist_ok=True)

W, H = 1200, 630
BG = (13, 17, 23)            # #0d1117
INK = (255, 255, 255)
INK_DIM = (195, 194, 183)    # #c3c2b7
INK_FAINT = (137, 135, 129)  # #898781
RULE = (44, 44, 42)          # #2c2c2a
BASELINE = (56, 56, 53)      # #383835
AMBER = (229, 165, 10)       # #e5a50a brand, single-series

MONO = "C:/Windows/Fonts/consola.ttf"
MONO_B = "C:/Windows/Fonts/consolab.ttf"

# --- data: fixed-rate IREN rows with a parseable issue date ------------------
ledger = json.loads((ROOT / "src" / "data" / "credit_instruments.json").read_text(encoding="utf-8"))
rows = [
    r for r in ledger["instruments"]
    if r.get("ticker") == "IREN" and (r.get("rate") or {}).get("kind") == "fixed"
    and r.get("rate", {}).get("value") is not None and r.get("issued")
]
n_total = sum(1 for r in ledger["instruments"] if r.get("ticker") == "IREN")
as_of = max(r.get("as_of", "") for r in ledger["instruments"] if r.get("ticker") == "IREN")


def issued_t(r):
    s = str(r["issued"])
    parts = s.split("-")
    y = int(parts[0])
    m = int(parts[1]) if len(parts) > 1 else 7
    d_ = int(parts[2]) if len(parts) > 2 else 15
    return date(y, m, d_).toordinal()


pts = [
    {
        "t": issued_t(r),
        "v": float(r["rate"]["value"]),
        "conv": r.get("instrument_type") == "convertible",
        "id": r["id"],
    }
    for r in rows
]
pts.sort(key=lambda p: p["t"])

t_min, t_max = min(p["t"] for p in pts), max(p["t"] for p in pts)
pad = max(60, int((t_max - t_min) * 0.07))
t_min, t_max = t_min - pad, t_max + pad
V_MAX = 12.5

# --- chart geometry ----------------------------------------------------------
CX0, CX1 = 120, 1130
CY0, CY1 = 190, 500  # top, baseline


def X(t):
    return CX0 + (t - t_min) / (t_max - t_min) * (CX1 - CX0)


def Y(v):
    return CY1 - v / V_MAX * (CY1 - CY0)


img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img, "RGBA")

f_brand = ImageFont.truetype(MONO_B, 40)
f_title = ImageFont.truetype(MONO_B, 40)
f_sub = ImageFont.truetype(MONO, 24)
f_right = ImageFont.truetype(MONO, 22)
f_lab = ImageFont.truetype(MONO_B, 23)
f_tick = ImageFont.truetype(MONO, 20)
f_foot = ImageFont.truetype(MONO_B, 24)

# header
d.text((70, 52), "C C I R", font=f_brand, fill=AMBER)
d.text((262, 52), "IREN", font=f_title, fill=INK)
d.text((W - 70, 52), f"credit · as of {as_of}", font=f_right, fill=INK_DIM, anchor="ra")
d.text((W - 70, 82), f"{n_total} instruments, as filed", font=f_right, fill=INK_FAINT, anchor="ra")


def fmt_month(t):
    dt = date.fromordinal(t)
    return dt.strftime("%b %Y")


d.text(
    (70, 116),
    f"Filed coupons at issue · hollow = convertible · {fmt_month(min(p['t'] for p in pts))} – {fmt_month(max(p['t'] for p in pts))}",
    font=f_sub,
    fill=INK_DIM,
)

# gridlines + y ticks
for gv in (2.5, 5.0, 7.5, 10.0, 12.5):
    y = Y(gv)
    d.line([CX0, y, CX1, y], fill=RULE, width=1)
    lab = f"{gv:g}%"
    d.text((CX0 - 12, y), lab, font=f_tick, fill=INK_FAINT, anchor="rm")
d.line([CX0, CY1, CX1, CY1], fill=BASELINE, width=2)

# x ticks: Jan 1 of each year in window
y0_, y1_ = date.fromordinal(t_min).year, date.fromordinal(t_max).year
for yy in range(y0_, y1_ + 1):
    jan = date(yy, 1, 1).toordinal()
    if t_min <= jan <= t_max:
        d.text((X(jan), CY1 + 16), str(yy), font=f_tick, fill=INK_FAINT, anchor="ma")

# points
R = 10
for p in pts:
    x, y = X(p["t"]), Y(p["v"])
    if p["conv"]:
        d.ellipse([x - R, y - R, x + R, y + R], outline=AMBER, width=4)
    else:
        d.ellipse([x - R, y - R, x + R, y + R], fill=AMBER)

# selective labels (anchored to computed point positions)
by_id = {p["id"]: p for p in pts}


def label(pid, text, dx, dy, anchor="mm", fill=INK_DIM):
    p = by_id.get(pid)
    if not p:
        return
    d.text((X(p["t"]) + dx, Y(p["v"]) + dy), text, font=f_lab, fill=fill, anchor=anchor)


# rates live on the y-axis — labels carry identity only
label("iren-mackenzie-tl", "Mackenzie TL + notes", -22, 0, anchor="rm", fill=INK)
label("iren-hw3-notes", "Hardware 3 notes", -22, 0, anchor="rm")
label("iren-gpu-leases", "GPU leases", 0, -30)
label("iren-conv-2030", "conv '30", 0, -30)
label("iren-conv-2029", "conv '29", 0, -30)
label("iren-conv-dec-2033", "converts '31–'33", 0, 40)

# footer
d.text((70, H - 52), "every row traces to a primary document", font=ImageFont.truetype(MONO, 21), fill=INK_FAINT, anchor="lm")
d.text((W - 70, H - 52), "ccir.io/credit/issuer/iren", font=f_foot, fill=AMBER, anchor="rm")

img.save(OUT)
print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
