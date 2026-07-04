"""CCIR tweet card: AWS EC2 Capacity Blocks committed-term price change, Jun -> Jul 1 2026.

Left panel = per-chip from -> to ($/GPU-hr) + delta, color-keyed (NVIDIA amber, Trainium gray).
Right = before/after dumbbell on a $ axis: every NVIDIA SKU shifts right +20.0%; Trainium2 stays put.

Numbers are AWS-sourced before/after: pre-hike from the Jun 11 2026 Wayback snapshot of
aws.amazon.com/ec2/capacityblocks/pricing/, post-hike from the live Jul-1-effective page.
Per accelerator (per GPU); US / globally-uniform rates. Dark theme to match shared/social_cards.py.
"""
from __future__ import annotations
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# dark theme tokens (THEMES["dark"])
BG, INK, DIM, GRID = "#101113", "#e8e6e1", "#9a9991", "#2a2c30"
MONO, SANS = "DejaVu Sans Mono", "DejaVu Sans"
NV_HOT, NV_DIM = "#ff9100", "#6f4a1f"   # NVIDIA after / before
TR = "#9a9991"                           # Trainium (flat)

# (chip label, instance, before $/GPU-hr, after $/GPU-hr, is_nvidia)
ROWS = [
    ("B300",      "P6-B300", 11.70,  14.04,  True),
    ("B200",      "P6-B200", 10.296, 12.355, True),
    ("H200",      "P5e",      4.975,  5.97,  True),
    ("H100",      "P5",       4.326,  5.191, True),
    ("A100",      "P4de",     1.845,  2.214, True),
    ("Trainium2", "Trn2",     2.235,  2.235, False),
]
OUT = str(Path(__file__).resolve().parent / "aws_capacity_blocks_card.png")

fig = plt.figure(figsize=(12, 6.75), dpi=120)  # 1440 x 810
fig.patch.set_facecolor(BG)

# brand header
fig.text(0.045, 0.95, "CCIR", fontfamily=MONO, fontsize=15, fontweight="bold", color="#d68a2a", va="top")
fig.text(0.105, 0.9475, "A W S   E C 2   C A P A C I T Y   B L O C K S   ·   C O M M I T T E D - T E R M   G P U",
         fontfamily=MONO, fontsize=8.5, color=DIM, va="top")
fig.text(0.045, 0.885, "AWS raised reserved NVIDIA capacity 20% — Trainium held flat",
         fontsize=20, fontweight="bold", color=INK, va="top", fontfamily=SANS)
fig.text(0.045, 0.823, "Per-GPU reserved $/hr  ·  every NVIDIA SKU +20.0%  ·  AWS's own Trainium2 unchanged",
         fontfamily=MONO, fontsize=10.5, color=DIM, va="top")

# right axes geometry (defined first so the left stat rows can align to chart rows)
AXBOX = [0.34, 0.16, 0.62, 0.58]
YLIM = (-0.6, len(ROWS) - 0.4)
ys = list(range(len(ROWS)))[::-1]   # B300 at top
def figy(yd):
    return AXBOX[1] + AXBOX[3] * (yd - YLIM[0]) / (YLIM[1] - YLIM[0])

# left panel: per-chip from -> to + delta, color-keyed, aligned to chart rows
for (label, inst, frm, to, nv), yd in zip(ROWS, ys):
    color = NV_HOT if nv else TR
    c = figy(yd)
    fig.text(0.05, c + 0.020, label, fontfamily=SANS, fontsize=16, fontweight="bold", color=color, va="center")
    fig.text(0.05, c - 0.022, f"${frm:.2f} → ${to:.2f}", fontfamily=MONO, fontsize=12.5, color=DIM, va="center")
    fig.text(0.205, c - 0.022, "+20.0%" if nv else "flat", fontfamily=MONO, fontsize=12.5,
             fontweight="bold", color=color, va="center")

# right: before/after dumbbell on a $ axis
ax = fig.add_axes(AXBOX)
ax.set_facecolor(BG)
for y, (label, inst, frm, to, nv) in zip(ys, ROWS):
    color = NV_HOT if nv else TR
    if nv:
        ax.annotate("", xy=(to, y), xytext=(frm, y),
                    arrowprops=dict(arrowstyle="-|>", color=color, lw=2.6, shrinkA=4, shrinkB=2))
        ax.scatter([frm], [y], s=70, facecolors=BG, edgecolors=NV_DIM, linewidths=2.2, zorder=3)
        ax.scatter([to], [y], s=95, facecolors=color, edgecolors=color, zorder=4)
    else:
        ax.scatter([to], [y], s=95, facecolors=BG, edgecolors=TR, linewidths=2.2, zorder=4)
    ax.text(to * 1.05, y, f"${to:.2f}", fontfamily=MONO, fontsize=11,
            color=(INK if nv else DIM), va="center", ha="left",
            fontweight=("bold" if nv else "normal"))

# log x-axis: a +20% change is the SAME visual length at every price level, so a
# uniform hike reads as uniform (a linear axis makes pricier chips look hiked
# harder). Trainium's 0% = a single dot.
ax.set_xscale("log")
ax.set_xlim(1.6, 19)
ax.set_ylim(*YLIM)
ax.set_yticks([])   # chip names live in the aligned left stat column
ax.xaxis.set_major_locator(plt.FixedLocator([2, 3, 5, 8, 12, 18]))
ax.xaxis.set_minor_locator(plt.NullLocator())
ax.xaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"${v:g}"))
ax.grid(axis="x", color=GRID, linewidth=0.8)
for s in ax.spines.values():
    s.set_visible(False)
ax.tick_params(colors=DIM, labelsize=9, length=0)
for lab in ax.get_xticklabels():
    lab.set_fontfamily(MONO)
ax.set_xlabel("reserved price, per GPU-hr  ·  log scale",
              fontfamily=MONO, fontsize=9.5, color=DIM, labelpad=8)

# tiny legend: before / after
ax.scatter([], [], s=70, facecolors=BG, edgecolors=DIM, linewidths=2.2, label="Jun 11")
ax.scatter([], [], s=95, facecolors=NV_HOT, edgecolors=NV_HOT, label="Jul 1 (+20%)")
leg = ax.legend(loc="lower right", frameon=False, fontsize=9.5, labelcolor=INK,
                handletextpad=0.4, borderaxespad=0.4)
for txt in leg.get_texts():
    txt.set_fontfamily(MONO)

fig.text(0.045, 0.05,
         "Source: AWS EC2 Capacity Blocks published pricing · Jun 11 → Jul 1 2026 · per accelerator (per GPU) · compiled by CCIR",
         fontfamily=MONO, fontsize=8, color=DIM)

fig.savefig(OUT, facecolor=BG)
plt.close(fig)
print(f"wrote {OUT}")
