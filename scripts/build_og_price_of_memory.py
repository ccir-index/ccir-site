"""OG card for /research/price-of-memory-in-china (1200x630).

Output: site/public/og/price-of-memory-in-china.png

Card title is the FIGURE pun ("Making Valuable Memories"), not the article
title. The link preview already carries "The Price of Memory in China" as
text beside the image, so the card would only repeat it. The pun agrees
thematically and lets the subtitle do the explaining.

TERMINAL palette, to match the note's five figures
(scratch/build_memory_note_figures_20260815.py) rather than the cream
editorial cards. Amber carries data; CXMT is full amber because it is the
subject, the rest step down to AMBER_MID.

BASIS (stated on the card): market value at 14 August 2026 close, in yuan.
Mainland names on their Shanghai A-share line. Tencent and Alibaba are
Hong Kong lines converted at that day's fix (USD/CNY 6.74, HKD pegged).
Cross-checked: ICBC, Agricultural Bank, Construction Bank and PetroChina
price within 1% across their Shanghai and Hong Kong lines on this date, so
the A/H split does not move the ranking.
US companies carrying Hong Kong lines (Intel, Cisco, Applied Materials)
are excluded: the chart is Chinese issuers.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = (Path(__file__).resolve().parents[1] / "public" / "og"
       / "price-of-memory-in-china.png")
OUT.parent.mkdir(parents=True, exist_ok=True)

W, H = 1200, 630
BG = (5, 6, 7)
INK = (215, 219, 222)
DIM = (138, 144, 150)
FAINT = (92, 97, 103)
AMBER = (232, 163, 61)
AMBER_MID = (179, 121, 42)
RULE = (34, 38, 42)

MONO = "C:/Windows/Fonts/consola.ttf"
MONO_B = "C:/Windows/Fonts/consolab.ttf"

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img, "RGBA")

f_kicker = ImageFont.truetype(MONO_B, 22)
f_title = ImageFont.truetype(MONO_B, 42)
f_sub = ImageFont.truetype(MONO, 23)
f_lab = ImageFont.truetype(MONO, 24)
f_val = ImageFont.truetype(MONO_B, 26)
f_foot = ImageFont.truetype(MONO, 19)

d.text((70, 48), "CCIR RESEARCH \u00b7 2026-08-16", font=f_kicker, fill=AMBER)
d.text((70, 92), "Making Valuable Memories", font=f_title, fill=INK)
d.text((70, 148), "market value \u00b7 14 August 2026 \u00b7 trillion yuan",
       font=f_sub, fill=DIM)

# ranked, one basis. CXMT is the subject and carries full amber.
bars = [
    ("CXMT",              3.69, True),
    ("Tencent",           3.41, False),
    ("ICBC",              2.57, False),
    ("Agricultural Bank", 2.22, False),
    ("Construction Bank", 2.02, False),
    ("Alibaba",           1.92, False),
]

X_LAB, X0, X_MAX = 70, 340, 1010          # label col, bar origin, bar limit
Y0, ROW, BAR_H = 200, 55, 30
VMAX = 3.69

for i, (name, v, subject) in enumerate(bars):
    y = Y0 + i * ROW
    w = int((v / VMAX) * (X_MAX - X0))
    d.text((X_LAB, y + BAR_H // 2), name, font=f_lab,
           fill=INK if subject else DIM, anchor="lm")
    d.rectangle([X0, y, X0 + w, y + BAR_H],
                fill=AMBER if subject else AMBER_MID)
    d.text((X0 + w + 18, y + BAR_H // 2), f"{v:.2f}T", font=f_val,
           fill=INK if subject else DIM, anchor="lm")

foot_y = Y0 + len(bars) * ROW + 22
d.line([70, foot_y, W - 70, foot_y], fill=RULE, width=1)
d.text((70, foot_y + 18),
       "Shanghai A-share lines; Hong Kong lines converted at that day's fix",
       font=f_foot, fill=FAINT)
d.text((W - 70, foot_y + 18), "ccir.io", font=f_foot, fill=FAINT, anchor="ra")

img.save(OUT)
print("wrote", OUT, img.size)
