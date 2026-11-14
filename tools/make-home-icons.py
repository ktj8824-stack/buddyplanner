# 홈 화면 아이콘(아이폰용) 날짜별 PNG 만들기 → img/homeicons/M-D.png (예: 11-20.png)
# 아이폰 사파리는 화면에서 그린 그림(data: 주소) 아이콘을 안 쓰는 경우가 있어서, 진짜 파일 주소로 넣어 줌.
# 실행: python3 tools/make-home-icons.py
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'img', 'homeicons')
os.makedirs(OUT, exist_ok=True)

S = 512
base = Image.open(os.path.join(ROOT, 'icon-512.png')).convert('RGBA').resize((S, S))
bg = Image.new('RGBA', (S, S), '#16140f')
bg.alpha_composite(base)
base = bg

FONT_PATHS = ['/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc']
font = None
for p in FONT_PATHS:
    if os.path.exists(p):
        font = ImageFont.truetype(p, 92)
        break

DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
for m in range(1, 13):
    for d in range(1, DAYS[m - 1] + 1):
        im = base.copy()
        g = ImageDraw.Draw(im)
        g.rounded_rectangle([70, 360, 442, 470], radius=40, fill='#10b981')
        g.text((256, 418), f'{m}/{d}', fill='white', font=font, anchor='mm')
        im = im.convert('RGB').resize((180, 180), Image.LANCZOS)
        im = im.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
        im.save(os.path.join(OUT, f'{m}-{d}.png'), optimize=True)
print('done', len(os.listdir(OUT)))
