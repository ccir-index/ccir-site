"""One-off CCIR tweet card: measured Vast occupancy, 30-day change.

House style matches shared/social_cards.py (dark theme palette, DejaVu mono/sans,
brand header + source footer) so it sits in the same card family. Self-contained
(palette hardcoded, DejaVu ships with matplotlib) so it runs without the notebook env.

Data: vast_utilization (denominator-fixed measured occupancy), May 25 -> Jun 24 2026.
"""
from __future__ import annotations
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# dark theme tokens (THEMES["dark"] in chart_cards.py)
BG, INK, DIM = "#101113", "#e8e6e1", "#9a9991"
GRID, ACCENT = "#2a2c30", "#d68a2a"
DOWN = "#c0533b"   # _MOVE["down"] — the number fell
MONO, SANS = "DejaVu Sans Mono", "DejaVu Sans"

# chip, from%, to%  (denominator-fixed occupancy, May 25 -> Jun 24)
ROWS = [
    ("H100", 84, 54),
    ("H200", 90, 63),
    ("B200", 81, 56),
]
OUT = __file__.rsplit("\\", 1)[0] + "\\occupancy_30d_change.png"

fig = plt.figure(figsize=(12, 6.75), dpi=120)  # 1440 x 810
fig.patch.set_facecolor(BG)

# brand header
fig.text(0.045, 0.955, "CCIR", fontfamily=MONO, fontsize=15, fontweight="bold",
         color=ACCENT, va="top")
fig.text(0.105, 0.9525, "M E A S U R E D   M A R K E T P L A C E   U T I L I Z A T I O N",
         fontfamily=MONO, fontsize=8.5, color=DIM, va="top")
fig.text(0.045, 0.885, "The GPU spot market is unwinding its May peak",
         fontsize=21, fontweight="bold", color=INK, va="top", fontfamily=SANS)
# plain description of what's shown — method lives in the tweet copy, not here
fig.text(0.045, 0.815,
         "Share of listed GPUs rented · GPU spot marketplace · 30-day change",
         fontfamily=MONO, fontsize=10.5, color=DIM, va="top")

# rows: chip | from -> to | delta
n = len(ROWS)
top, bot = 0.66, 0.20
step = (top - bot) / n
for i, (chip, a, b) in enumerate(ROWS):
    y = top - step * (i + 0.5)
    d = b - a
    fig.text(0.06, y, chip, fontfamily=SANS, fontsize=24, fontweight="bold",
             color=INK, va="center")
    # from -> to, the "to" emphasized
    fig.text(0.40, y, f"{a}%", fontfamily=MONO, fontsize=26, color=DIM,
             va="center", ha="right")
    fig.text(0.42, y, "→", fontfamily=MONO, fontsize=22, color=DIM, va="center")
    fig.text(0.585, y, f"{b}%", fontfamily=MONO, fontsize=32, fontweight="bold",
             color=INK, va="center", ha="right")
    fig.text(0.60, y, "rented", fontfamily=MONO, fontsize=10, color=DIM, va="center")
    # delta in points, down color
    fig.text(0.95, y, f"▼ {abs(d)} pts", fontfamily=MONO, fontsize=16,
             fontweight="bold", color=DOWN, va="center", ha="right")
    if i < n - 1:
        ys = top - step * (i + 1)
        fig.add_artist(plt.Line2D([0.06, 0.95], [ys, ys], color=GRID,
                                  linewidth=0.8, transform=fig.transFigure))

fig.text(0.045, 0.05,
         "Source: CCIR · ccir.io/availability · May 25 → Jun 24, 2026 "
         "· measured utilization · methodology disclosed",
         fontfamily=MONO, fontsize=8.5, color=DIM)

fig.savefig(OUT, facecolor=BG)
plt.close(fig)
print(f"wrote {OUT}")
