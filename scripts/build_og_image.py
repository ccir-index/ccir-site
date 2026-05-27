"""
Build the default OG card (1200x630 PNG) for ccir.io.

Output: site/public/og-default.png

Mirrors the editorial homepage hero pattern from src/pages/index.astro:
    kicker  → "CCIR · INDEPENDENT REFERENCE RATES" (mono, accent)
    h1      → "Independent Reference Rates for GPU Compute" (serif, ink)
    lede    → standfirst line referencing the Intelligence Factory Taxonomy
    chips   → T1IF / T2IF / T3IF tier ladder
    foot    → ccir.io + the site-footer disclosure strapline

Palette matches editorial-theme tokens in src/styles/tokens.css:
    bg #f5f1e8 / ink #0d0d0d / ink-dim #5b5852 / accent #143055 / rule-2 #b8b3a4

Re-run when the headline copy or palette changes; image is bundled into the
Pages deploy via site/public/.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "public" / "og-default.png"

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

# Kicker — mirrors homepage `.kicker` ("CCIR · Independent Reference Rates · ...")
f_kicker = ImageFont.truetype(FONT_MONO_B, 20)
d.text((PAD, PAD), "CCIR · INDEPENDENT REFERENCE RATES", font=f_kicker, fill=ACCENT)
d.line([(PAD, PAD + 42), (W - PAD, PAD + 42)], fill=RULE_2, width=1)

# Hero — mirrors homepage h1 "Independent Reference Rates for GPU Compute"
f_hero = ImageFont.truetype(FONT_SERIF_B, 68)
d.text((PAD, PAD + 72),  "Independent Reference Rates", font=f_hero, fill=INK)
d.text((PAD, PAD + 152), "for GPU Compute",            font=f_hero, fill=INK)

# Lede — standfirst echoing the homepage `.standfirst` copy.
f_lede = ImageFont.truetype(FONT_SANS, 24)
d.text(
    (PAD, PAD + 246),
    "A reference rate for every level of the GPU compute market —",
    font=f_lede, fill=INK_DIM,
)
d.text(
    (PAD, PAD + 280),
    "Tier 1, Tier 2, Tier 3 across the Intelligence Factory Taxonomy.",
    font=f_lede, fill=INK_DIM,
)

# Tier chips — T1IF / T2IF / T3IF
chip_y = H - PAD - 84
f_chip_label = ImageFont.truetype(FONT_MONO, 14)
f_chip       = ImageFont.truetype(FONT_SANS_B, 22)
chips = [
    # Capability/deployment-grade descriptors — NOT operator classes. Tiers are
    # assigned per-SKU from the fabric/host/bundle, so the same operator can span
    # tiers (the card must not imply T2 == "neoclouds"). Mirrors TierDefinitions.
    ("T1IF", "Tier 1 · Top fabric · full bundle"),
    ("T2IF", "Tier 2 · Dedicated · real fabric"),
    ("T3IF", "Tier 3 · Shared / marketplace"),
]
col_w = (W - 2 * PAD) // 3
for i, (code, label) in enumerate(chips):
    x = PAD + i * col_w
    d.line([(x, chip_y - 12), (x + 36, chip_y - 12)], fill=ACCENT, width=2)
    d.text((x, chip_y), code, font=f_chip, fill=INK)
    d.text((x, chip_y + 32), label, font=f_chip_label, fill=INK_DIM)

# Footer — URL + disclosure strapline (echoes site-footer .disclosure-foot strong)
f_url = ImageFont.truetype(FONT_MONO_B, 18)
d.text((PAD, H - PAD - 4), "ccir.io", font=f_url, fill=ACCENT)

f_tag = ImageFont.truetype(FONT_MONO, 14)
tag = "INDEPENDENT · OBSERVABLE · POSTED"
tw = d.textlength(tag, font=f_tag)
d.text((W - PAD - tw, H - PAD), tag, font=f_tag, fill=INK_FAINT)

img.save(OUT, "PNG", optimize=True)
print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
