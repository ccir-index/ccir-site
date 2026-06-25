"""CCIR tweet card: measured GPU utilization — website-style trend chart + deltas.

Left panel = per-chip current value + 30-day Δ (color-keyed to the lines).
Right = the multi-chip rolling-7d utilization trend, same colors as the site chart.
Loads the real vast_utilization_trend_*.csv series so the lines are exact.

Dark theme + DejaVu fonts to match shared/social_cards.py. Self-contained.
"""
from __future__ import annotations
import csv
from datetime import datetime
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

# dark theme tokens (THEMES["dark"])
BG, INK, DIM, GRID = "#101113", "#e8e6e1", "#9a9991", "#2a2c30"
DOWN = "#c0533b"
MONO, SANS = "DejaVu Sans Mono", "DejaVu Sans"

# site CHIP_COLORS — match the website utilization chart exactly
CHIPS = [
    ("H100", "h100-sxm", "#ff9100"),
    ("H200", "h200-sxm", "#3b82f6"),
    ("B200", "b200-sxm", "#8b5cf6"),
]
# repo-relative: scratch/social -> site/ -> public/data
DATA = Path(__file__).resolve().parents[2] / "public" / "data"
UTIL_START = "2026-05-19"     # site UTIL_START
DPATH = lambda slug: DATA / f"vast_utilization_trend_{slug}.csv"
OUT = str(Path(__file__).resolve().parent / "utilization_chart_card.png")


def load(slug):
    xs, ys, by_date = [], [], {}
    with open(DPATH(slug), newline="") as f:
        for r in csv.DictReader(f):
            d = r["as_of_date"]
            if d < UTIL_START or not r["utilization"]:
                continue
            v = float(r["utilization"]) * 100
            xs.append(datetime.strptime(d, "%Y-%m-%d"))
            ys.append(v)
            by_date[d] = v
    return xs, ys, by_date


fig = plt.figure(figsize=(12, 6.75), dpi=120)  # 1440 x 810
fig.patch.set_facecolor(BG)

# brand header
fig.text(0.045, 0.95, "CCIR", fontfamily=MONO, fontsize=15, fontweight="bold", color="#d68a2a", va="top")
fig.text(0.105, 0.9475, "M E A S U R E D   M A R K E T P L A C E   U T I L I Z A T I O N",
         fontfamily=MONO, fontsize=8.5, color=DIM, va="top")
fig.text(0.045, 0.885, "The GPU spot market is unwinding its May peak",
         fontsize=21, fontweight="bold", color=INK, va="top", fontfamily=SANS)
fig.text(0.045, 0.823, "Share of listed GPUs rented · rolling 7-day · May peak → now",
         fontfamily=MONO, fontsize=10.5, color=DIM, va="top")

# left panel: per-chip current value + 30-day delta, color-keyed
series = {}
top, bot = 0.62, 0.26
step = (top - bot) / len(CHIPS)
for i, (label, slug, color) in enumerate(CHIPS):
    xs, ys, bd = load(slug)
    series[slug] = (xs, ys, color, label)
    cur = round(ys[-1])
    frm = round(max(ys))          # the May peak — matches the chart's left edge
    dlt = frm - cur
    y = top - step * (i + 0.5)
    fig.text(0.05, y + 0.018, label, fontfamily=SANS, fontsize=19, fontweight="bold", color=color, va="center")
    # from → to: one uniform light-gray string, current number not bolded
    fig.text(0.05, y - 0.045, f"{frm}% → {cur}%", fontfamily=MONO, fontsize=14, color=DIM, va="center")
    # delta on the SAME row, tightened toward the numbers so the left cols stay narrow
    fig.text(0.155, y - 0.045, f"▼ {abs(dlt)} pts", fontfamily=MONO, fontsize=14, fontweight="bold", color=DOWN, va="center")

# right: the trend chart
ax = fig.add_axes([0.30, 0.17, 0.66, 0.52])
ax.set_facecolor(BG)
for slug, (xs, ys, color, label) in series.items():
    ax.plot(xs, ys, color=color, linewidth=2.4, label=label, solid_capstyle="round")
ax.set_ylim(0, 100)
ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"{int(v)}%"))
ax.xaxis.set_major_locator(mdates.DayLocator(interval=7))
ax.xaxis.set_major_formatter(plt.FuncFormatter(
    lambda v, _: mdates.num2date(v).strftime("%b ") + str(mdates.num2date(v).day)))
ax.grid(axis="y", color=GRID, linewidth=0.8)
for s in ax.spines.values():
    s.set_visible(False)
ax.tick_params(colors=DIM, labelsize=9, length=0)
for lab in ax.get_xticklabels() + ax.get_yticklabels():
    lab.set_fontfamily(MONO)
leg = ax.legend(loc="upper right", frameon=False, ncol=3, fontsize=10,
                labelcolor=INK, handlelength=1.2, columnspacing=1.2)
for txt in leg.get_texts():
    txt.set_fontfamily(MONO)

fig.text(0.045, 0.05,
         "Source: CCIR · ccir.io/utilization · May 19 → Jun 25, 2026 · measured utilization · methodology disclosed",
         fontfamily=MONO, fontsize=8.5, color=DIM)

fig.savefig(OUT, facecolor=BG)
plt.close(fig)
print(f"wrote {OUT}")
