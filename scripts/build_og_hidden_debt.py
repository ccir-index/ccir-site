"""OG card for /research/big-tech-hidden-debt (1200x630).

Output: site/public/og/big-tech-hidden-debt.png
Palette + type mirror build_og_image.py (editorial tokens).
Data mirrors the note's chart 1 (latest filings as of 2026-07-22, $B).
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "public" / "og" / "big-tech-hidden-debt.png"
OUT.parent.mkdir(parents=True, exist_ok=True)

W, H = 1200, 630
BG, INK = (245, 241, 232), (13, 13, 13)
INK_DIM, INK_FAINT = (91, 88, 82), (142, 138, 130)
ACCENT, RULE_2 = (20, 48, 85), (184, 179, 164)
ACCENT_LT = (20, 48, 85, 102)  # 40% for purchase segment

SERIF_B = "C:/Windows/Fonts/georgiab.ttf"
MONO = "C:/Windows/Fonts/consola.ttf"
MONO_B = "C:/Windows/Fonts/consolab.ttf"

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img, "RGBA")

f_kicker = ImageFont.truetype(MONO_B, 26)
f_title = ImageFont.truetype(SERIF_B, 62)
f_lab = ImageFont.truetype(MONO, 24)
f_val = ImageFont.truetype(MONO_B, 24)
f_key = ImageFont.truetype(MONO, 22)
f_foot = ImageFont.truetype(MONO, 22)

d.text((70, 56), "CCIR RESEARCH · FILINGS · 2026-07-22", font=f_kicker, fill=ACCENT)
d.text((66, 100), "Breaking Down Big Tech’s", font=f_title, fill=INK)
d.text((66, 176), "$1.65 Trillion “Hidden Debt”", font=f_title, fill=INK)

# decomposition strip (leases-not-commenced solid; purchase 40%)
rows = [  # name, leases, purchase ($B), latest filing
    ("Meta", 182.9, 237.7),
    ("Alphabet", 75.6, 332.4),
    ("Microsoft", 196.6, 142.1),
    ("Oracle", 260.0, 13.3),
    ("Amazon", 106.3, 122.6),
]
x0, xmax, bh, gap, top = 232, 1050, 31, 15, 282
scale = (xmax - x0) / 440.0
y = top
for name, lv, pv in rows:
    d.text((x0 - 16, y + bh // 2), name, font=f_lab, fill=INK, anchor="rm")
    lw, pw = lv * scale, pv * scale
    d.rectangle([x0, y, x0 + lw, y + bh], fill=ACCENT)
    d.rectangle([x0 + lw + 3, y, x0 + lw + 3 + pw, y + bh], fill=ACCENT_LT)
    d.text((x0 + lw + 3 + pw + 14, y + bh // 2), f"${lv + pv:.0f}B", font=f_val, fill=INK, anchor="lm")
    y += bh + gap

ky = y + 8
d.rectangle([x0, ky, x0 + 18, ky + 18], fill=ACCENT)
d.text((x0 + 28, ky + 9), "leases not yet commenced", font=f_key, fill=INK_DIM, anchor="lm")
d.rectangle([x0 + 400, ky, x0 + 418, ky + 18], fill=ACCENT_LT)
d.text((x0 + 428, ky + 9), "purchase & other commitments", font=f_key, fill=INK_DIM, anchor="lm")

d.line([70, H - 62, W - 70, H - 62], fill=RULE_2, width=2)
d.text((70, H - 44), "ccir.io/research · every figure from SEC filings, accessions cited", font=f_foot, fill=INK_FAINT)

img.save(OUT)
print(f"wrote {OUT} ({OUT.stat().st_size//1024} KB)")
