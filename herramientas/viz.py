import json,sys
from PIL import Image, ImageDraw
g=json.load(open('data/geom.json'))
S=34; X0,Y0=6,-1
im=Image.new('RGB',(int(23*S),int(27*S)),'white'); d=ImageDraw.Draw(im)
P=lambda a,b:((a-X0)*S,(b-Y0)*S)
def poly(p,fill,outline=None,holefill='white'):
    d.polygon([P(a,b) for a,b in p['o']],fill=fill,outline=outline)
    for h in p['h']: d.polygon([P(a,b) for a,b in h],fill=holefill,outline=outline)
for p in g['foot2']: poly(p,(235,235,250),'blue',(255,220,220))
for p in g['floors2']: poly(p,(215,230,215))
for p in g['walls2']: poly(p,(60,40,20))
for o in g['opens']:
    d.line([P(*q) for q in o['pts']],fill=(0,150,255) if o['code'] else (255,0,200),width=5)
    if o['code']: d.text(P(*o['pts'][0]),o['code'],fill='blue')
for t in g['texts2']:
    if 6<t['p'][0]<30: d.text(P(*t['p']),t['t'],fill=(200,0,0))
im.save(sys.argv[1] if len(sys.argv)>1 else '/tmp/viz2.png')
