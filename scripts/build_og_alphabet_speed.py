"""OG card for /research/alphabet-pays-for-data-center-speed (1200x630).

Output: site/public/og/alphabet-pays-for-data-center-speed.png
Palette + type mirror build_og_image.py (editorial tokens).
Visual mirrors the note's chart 2: the backstop notional ladder with the
agreed-pending extension.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = (Path(__file__).resolve().parents[1] / "public" / "og"
       / "alphabet-pays-for-data-center-speed.png")
OUT.parent.mkdir(parents=True, exist_ok=True)

W, H = 1200, 630
BG, INK = (245, 241, 232), (13, 13, 13)
INK_DIM, INK_FAINT = (91, 88, 82), (142, 138, 130)
ACCENT = (20, 48, 85)
ACCENT_EST = (20, 48, 85, 77)  # ~30% for the pending extension

SERIF_B = "C:/Windows/Fonts/georgiab.ttf"
MONO = "C:/Windows/Fonts/consola.ttf"
MONO_B = "C:/Windows/Fonts/consolab.ttf"

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img, "RGBA")

f_kicker = ImageFont.truetype(MONO_B, 26)
f_title = ImageFont.truetype(SERIF_B, 42)
f_lab = ImageFont.truetype(MONO, 24)
f_val = ImageFont.truetype(MONO_B, 26)
f_key = ImageFont.truetype(MONO, 22)

d.text((70, 54), "CCIR RESEARCH · FILINGS · 2026-07-24", font=f_kicker, fill=ACCENT)
d.text((66, 102), "Buying, Building, Renting, Guaranteeing:", font=f_title, fill=INK)
d.text((66, 156), "How Alphabet Pays to Get Compute Capacity Faster", font=f_title, fill=INK)

# backstop ladder (chart 2 of the note); pending drawn as its own bar
bars = [("Dec-24", 0.0, False), ("Dec-25", 16.9, False),
        ("Mar-26", 28.4, False), ("Jun-26", 43.8, False),
        ("agreed,\npending", 24.1, True)]
x0, bw, gap, base, hmax, vmax = 140, 110, 80, 548, 250, 50.0

for i, (t, v, est) in enumerate(bars):
    x = x0 + i * (bw + gap)
    hh = int(v / vmax * hmax)
    if hh:
        d.rectangle([x, base - hh, x + bw, base],
                    fill=ACCENT_EST if est else ACCENT)
    lab = "$0" if v == 0 else (f"+~${v:,.1f}B" if est else f"${v:,.1f}B")
    d.text((x + bw // 2, base - hh - 36), lab, font=f_val,
           fill=INK_DIM if est else INK, anchor="ma")
    d.text((x + bw // 2, base + 12), t, font=f_lab, fill=INK_DIM,
           anchor="ma", align="center")

d.line([x0 - 40, base, W - 70, base], fill=INK_FAINT, width=2)
d.text((70, 252), "data-center payment backstops, credit-derivative notional",
       font=f_key, fill=INK_DIM)
d.text((W - 70, 252), "ccir.io", font=f_key, fill=INK_FAINT, anchor="ra")

img.save(OUT)
print("wrote", OUT)
