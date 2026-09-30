"""Arrange real browser captures at one common scale, without cropping or stretching."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import html

ROOT = Path(__file__).resolve().parent
PAGES = [('index','Home'),('projects','Projects'),('project','Project detail'),('writing','Writing'),('article','Article'),('about','About + contact')]
SCALE = .5
GAP, PAD, LABEL = 24, 44, 76
DESKTOP, MOBILE = 720, 195
GROUP = DESKTOP + GAP + MOBILE
WIDTH = PAD * 2 + GROUP * 3 + PAD * 2
font_path = '/usr/share/fonts/noto/NotoSans-Regular.ttf'
font = ImageFont.truetype(font_path,24)
small = ImageFont.truetype(font_path,16)
title = ImageFont.truetype(font_path,42)
captures = {}
for slug,_ in PAGES:
    for size in ['desktop','mobile']:
        original = Image.open(ROOT / 'screens' / f'{slug}-{size}.png').convert('RGB')
        captures[slug,size] = original.resize((round(original.width*SCALE),round(original.height*SCALE)),Image.Resampling.LANCZOS)
rows = [max(captures[slug,size].height for slug,_ in PAGES[row*3:row*3+3] for size in ['desktop','mobile']) + LABEL + 48 for row in range(2)]
canvas = Image.new('RGB',(WIDTH,190+sum(rows)+65),'#e9e7e1')
draw = ImageDraw.Draw(canvas)
draw.text((PAD,32),'Aaron / the portfolio notebook',font=title,fill='#292a24')
draw.text((PAD,96),'Refined concept A  ·  6 screens / desktop + mobile  ·  Real browser renders, no generated imagery',font=font,fill='#55564e')
draw.text((PAD,137),'1440 px desktop + 390 px mobile · Every capture shown at 50% scale · Content placeholders are intentional',font=small,fill='#55564e')
y=190
for row in range(2):
    for col,(slug,label) in enumerate(PAGES[row*3:row*3+3]):
        x=PAD+col*(GROUP+PAD)
        draw.text((x,y),label,font=font,fill='#292a24')
        draw.text((x,y+40),'DESKTOP · 1440 px',font=small,fill='#55564e')
        draw.text((x+DESKTOP+GAP,y+40),'MOBILE · 390 px',font=small,fill='#55564e')
        for size,offset in [('desktop',0),('mobile',DESKTOP+GAP)]:
            capture=captures[slug,size]
            canvas.paste(capture,(x+offset,y+LABEL))
            draw.rectangle((x+offset,y+LABEL,x+offset+capture.width,y+LABEL+capture.height),outline='#c5c2b8',width=1)
    y+=rows[row]
draw.text((PAD,y+10),'Actual assets: Patrick Hand (OFL) · Rough Notation (MIT) · Lucide (ISC/MIT) · Native HTML and CSS',font=small,fill='#55564e')
canvas.save(ROOT/'contact-sheet.png')
canvas.resize((1500,round(canvas.height*1500/canvas.width)),Image.Resampling.LANCZOS).save(ROOT/'contact-sheet-overview.png')
sections=[]
for slug,label in PAGES:
    sections.append(f'<section><h2>{html.escape(label)}</h2><p><a href="{slug}.html">Open screen</a> · <a href="screens/{slug}-desktop.png">Full desktop capture</a> · <a href="screens/{slug}-mobile.png">Full mobile capture</a></p><div class="pair"><a href="screens/{slug}-desktop.png"><img src="screens/{slug}-desktop.png" alt="{label}, desktop"></a><a href="screens/{slug}-mobile.png"><img src="screens/{slug}-mobile.png" alt="{label}, mobile"></a></div></section>')
(ROOT/'contact-sheet.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Portfolio screen gallery</title><style>
body{margin:0;padding:32px;background:#e9e7e1;color:#292a24;font:16px/1.6 system-ui}h1{margin:0}a{color:#284fa4;text-underline-offset:3px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:40px}section{min-width:0}h2{margin:24px 0 4px}.pair{display:grid;grid-template-columns:1440fr 390fr;gap:16px;align-items:start}img{width:100%;height:auto;border:1px solid #c5c2b8;display:block}a:focus-visible{outline:2px solid #284fa4;outline-offset:4px}@media(max-width:900px){main{grid-template-columns:1fr}body{padding:18px}}
</style><h1>Aaron / the portfolio notebook</h1><p>Six screens, desktop + mobile. Click any capture to inspect it at full resolution.</p><p><a href="contact-sheet.png">Download full contact sheet</a> · <a href="index.html">Open connected preview</a></p><main>'''+''.join(sections)+'</main></html>')
print(f'Contact sheet: {canvas.width} × {canvas.height}; 12 uncropped browser captures.')
