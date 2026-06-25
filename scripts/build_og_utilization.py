"""
Build the OG card (1200x630 PNG) for ccir.io/utilization.

Output: site/public/og-utilization.png

Mirrors the editorial pattern of build_og_image.py (homepage) so the share
cards are a family. Evergreen copy — describes the Implied Market Utilization
metric (a trailing blocking rate over the named-provider panel), not a live
number, so it survives between deploys without daily regeneration.

Palette matches editorial-theme tokens in src/styles/tokens.css:
    bg #f5f1e8 / ink #0d0d0d / ink-dim #5b5852 / accent #143055 / rule-2 #b8b3a4

Re-run when the copy or palette changes; image is bundled into the Pages
deploy via site/public/.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "public" / "og-utilization.png"

W, H = 1200, 630
BG       = (245, 241, 232)   # --bg editorial
INK      = (13, 13, 13)      # --ink
INK_DIM  = (91, 88, 82)      # --ink-dim
INK_FAINT= (142, 138, 130)   # --ink-faint
ACCENT   = (20, 48, 85)      # --accent navy
RULE_2   = (184, 179, 164)   # --rule-2

FONT_SERIF_B = "C:/Windows/Fonts/georgiab.ttf"
FONT_SANS    = "C:/Windows/Fonts/arial.ttf"
FONT_SANS_B  = "C:/Windows/Fonts/arialbd.ttf"
FONT_MONO    = "C:/Windows/Fonts/consola.ttf"
FONT_MONO_B  = "C:/Windows/Fonts/consolab.ttf"

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

PAD = 72

# Kicker
f_kicker = ImageFont.truetype(FONT_MONO_B, 20)
d.text((PAD, PAD), "CCIR · MEASURED UTILIZATION", font=f_kicker, fill=ACCENT)
d.line([(PAD, PAD + 42), (W - PAD, PAD + 42)], fill=RULE_2, width=1)

# Hero
f_hero = ImageFont.truetype(FONT_SERIF_B, 68)
d.text((PAD, PAD + 72),  "Measured Utilization", font=f_hero, fill=INK)
d.text((PAD, PAD + 152), "for GPU Compute",      font=f_hero, fill=INK)

# Lede — describes the metric (rented share, supply-normalized, marketplace).
f_lede = ImageFont.truetype(FONT_SANS, 24)
d.text(
    (PAD, PAD + 246),
    "The share of listed GPUs actually rented on the one",
    font=f_lede, fill=INK_DIM,
)
d.text(
    (PAD, PAD + 280),
    "marketplace we can measure — supply-normalized.",
    font=f_lede, fill=INK_DIM,
)

# Concept chips — the three properties of the metric.
chip_y = H - PAD - 84
f_chip_label = ImageFont.truetype(FONT_MONO, 14)
f_chip       = ImageFont.truetype(FONT_SANS_B, 22)
chips = [
    ("Rented / total", "One marketplace source"),
    ("Rolling 7d", "Trailing, re-based daily"),
    ("Supply-normalized", "Denominator = median capacity"),
]
col_w = (W - 2 * PAD) // 3
for i, (code, label) in enumerate(chips):
    x = PAD + i * col_w
    d.line([(x, chip_y - 12), (x + 36, chip_y - 12)], fill=ACCENT, width=2)
    d.text((x, chip_y), code, font=f_chip, fill=INK)
    d.text((x, chip_y + 32), label, font=f_chip_label, fill=INK_DIM)

# Footer — URL + disclosure strapline.
f_url = ImageFont.truetype(FONT_MONO_B, 18)
d.text((PAD, H - PAD - 4), "ccir.io/utilization", font=f_url, fill=ACCENT)

f_tag = ImageFont.truetype(FONT_MONO, 14)
tag = "MEASURED · ONE MARKETPLACE SOURCE"
tw = d.textlength(tag, font=f_tag)
d.text((W - PAD - tw, H - PAD), tag, font=f_tag, fill=INK_FAINT)

img.save(OUT, "PNG", optimize=True)
print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
