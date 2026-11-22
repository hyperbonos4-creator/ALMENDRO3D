import pymupdf, json, re, numpy as np, sys
sys.path.insert(0,'/workspace/almendra/work')
from shapely.geometry import Polygon, box
from shapely.ops import unary_union
from vec import text_spans
from PIL import Image, ImageDraw
PTM=71.06
DX,DY=122,-8            # A002 -> A004 (pt), alineación por columnas/cortes (±0.1 m)
OX,OY=243.84,95.52      # origen = esquina min de muros A004
def w4(x,y): return ((x-OX)/PTM, (y-OY)/PTM)
def w2(x,y): return w4(x+DX,y+DY)
ID=lambda a,b:(a,b)
P2=pymupdf.open('A002.pdf')[0]; P4=pymupdf.open('A004.pdf')[0]
D2=P2.get_drawings(); D4=P4.get_drawings()
WALL=(0.45,0.37,0.24); FLOOR=(0.81,0.81,0.76)
def subpaths(x,T):
    subs=[];pts=[];cur=None
    for it in x['items']:
        if it[0]=='l':
            a,b=it[1],it[2]
            if cur is None or abs(cur.x-a.x)>0.05 or abs(cur.y-a.y)>0.05:
                if len(pts)>=3: subs.append(pts)
                pts=[T(a.x,a.y)]
            pts.append(T(b.x,b.y)); cur=b
        elif it[0] in('re','qu'):
            if len(pts)>=3: subs.append(pts)
            pts=[];cur=None
            if it[0]=='re':
                r=it[1]; subs.append([T(r.x0,r.y0),T(r.x1,r.y0),T(r.x1,r.y1),T(r.x0,r.y1)])
            else:
                q=it[1]; subs.append([T(q.ul.x,q.ul.y),T(q.ur.x,q.ur.y),T(q.lr.x,q.lr.y),T(q.ll.x,q.ll.y)])
    if len(pts)>=3: subs.append(pts)
    return subs
def fillsel(dr,fill): return [x for x in dr if x.get('fill') and tuple(round(v,2) for v in x['fill'])==fill]
def polys(dr, fill, T):
    out=[]
    for x in fillsel(dr,fill):
        for pts in subpaths(x,T):
            pg=Polygon(pts).buffer(0)
            if pg.area>1e-4: out.append(pg)
    return out
def colrects(dr):
    out=[]
    for x in dr:
        if x.get('color') and round(x.get('width') or 0,2)==0.6 and len(x['items'])==1 and x['items'][0][0] in ('qu','re'):
            r=x['rect']
            if 12<r.width<70 and 12<r.height<70: out.append(r)
    return out
W2=polys(D2,WALL,w2); W4=polys(D4,WALL,w4)
C2=[box(*w2(r.x0,r.y0),*w2(r.x1,r.y1)) for r in colrects(D2)]
C4=[box(*w4(r.x0,r.y0),*w4(r.x1,r.y1)) for r in colrects(D4)]
F2=polys(D2,FLOOR,w2); F4=polys(D4,FLOOR,w4)
print('walls',len(W2),len(W4),'cols',len(C2),len(C4),'floors',len(F2),len(F4))
def geo(g,simp=0.004):
    g=g.simplify(simp)
    ps=[g] if g.geom_type=='Polygon' else list(getattr(g,'geoms',[]))
    res=[]
    for p in ps:
        if p.geom_type!='Polygon' or p.area<0.002: continue
        res.append({'o':[[round(a,3),round(b,3)] for a,b in p.exterior.coords[:-1]],
                    'h':[[[round(a,3),round(b,3)] for a,b in r.coords[:-1]] for r in p.interiors if Polygon(r).area>0.002]})
    return res
def mclose(g,r): return g.buffer(r,join_style=2,mitre_limit=10).buffer(-r,join_style=2,mitre_limit=10)
def biggest(g): return max([g] if g.geom_type=='Polygon' else list(g.geoms),key=lambda p:p.area)
wall2=unary_union(W2+C2); wall4=unary_union(W4+C4)
foot2=Polygon(biggest(mclose(unary_union(W2+C2+F2),1.5)).exterior)
foot4=Polygon(biggest(mclose(unary_union(W4+C4),1.5)).exterior)
lint2=mclose(wall2,0.56); lint4=mclose(wall4,0.56)
print('foot areas',round(foot2.area,2),round(foot4.area,2))
# ---- windows ----
S=2.0
im=Image.new('L',(int(2835*S),int(2004*S)),0); d=ImageDraw.Draw(im)
for x in fillsel(D2,WALL):
    for pts in subpaths(x,ID): d.polygon([(a*S,b*S) for a,b in pts],fill=1)
for r in colrects(D2): d.rectangle([r.x0*S,r.y0*S,r.x1*S,r.y1*S],fill=1)
M=np.array(im,dtype=np.uint8)
from sheets import window_tags
tags,_=window_tags(P2,pymupdf.Rect(500,52,2212,1960))
def M_(x,y):
    xi,yi=int(x*S),int(y*S)
    if 0<=yi<M.shape[0] and 0<=xi<M.shape[1]: return M[yi,xi]
    return 0
wins=[];miss=[]
for t in tags:
    tx,ty=t['x'],t['y']-3
    best=None
    for dirn in ['down','up','left','right']:
        for dd in range(4,90):
            if dirn in('down','up'):
                yy=ty+dd if dirn=='down' else ty-dd
                row=np.array([M_(tx+k/S,yy) for k in range(-520,521)])
            else:
                xx=tx+dd if dirn=='right' else tx-dd
                row=np.array([M_(xx,ty+k/S) for k in range(-520,521)])
            if row.mean()<0.06: continue
            c=520
            if row[c]: break
            a=c
            while a>0 and not row[a-1]: a-=1
            b=c
            while b<len(row)-1 and not row[b+1]: b+=1
            L=(b-a+1)/S
            if 25<L<230 and a>0 and b<len(row)-1:
                cand=(dd,dirn,(a-c)/S,(b-c)/S,L)
                if best is None or cand[0]<best[0]: best=cand
            break
    if not best: miss.append(t); continue
    dd,dirn,a,b,L=best
    if dirn in('down','up'):
        sgn=1 if dirn=='down' else -1; y0=ty+sgn*dd; xa,xb=tx+a,tx+b
        th=0
        for k in range(0,40):
            if M_(xa-4,y0+sgn*k) or M_(xb+4,y0+sgn*k): th=k
            else: break
        yc=y0+sgn*th/2
        wins.append(dict(code=t['name'],sill=float(t['sill']),head=float(t['dint']),a=w2(xa,yc),b=w2(xb,yc),th=max(th,8)/PTM,ori='x',out=sgn))
    else:
        sgn=1 if dirn=='right' else -1; x0=tx+sgn*dd; ya,yb=ty+a,ty+b
        th=0
        for k in range(0,40):
            if M_(x0+sgn*k,ya-4) or M_(x0+sgn*k,yb+4): th=k
            else: break
        xc=x0+sgn*th/2
        wins.append(dict(code=t['name'],sill=float(t['sill']),head=float(t['dint']),a=w2(xc,ya),b=w2(xc,yb),th=max(th,8)/PTM,ori='z',out=sgn))
for w in wins: print(w['code'],[round(v,2) for v in w['a']],[round(v,2) for v in w['b']],round(w['th'],2),w['ori'],w['out'])
for t in miss: print('MISS',t['name'],[round(v,2) for v in w2(t['x'],t['y'])])
from shapely.geometry import LineString, Point
rings=[foot2.exterior]+list(foot2.interiors)
op=[]
for rg in rings:
    g=LineString(rg.coords).difference(wall2.buffer(0.03))
    for seg in ([g] if g.geom_type=='LineString' else list(getattr(g,'geoms',[]))):
        if seg.length>0.35: op.append(seg)
print('openings',len(op))
opens=[]
used=set()
for i,seg in enumerate(op):
    opens.append(dict(i=i,pts=[[round(a,3),round(b,3)] for a,b in seg.coords],L=round(seg.length,2),code=None))
for t in tags:
    p=Point(w2(t['x'],t['y']-3))
    ds=sorted((seg.distance(p),i) for i,seg in enumerate(op) if i not in used)
    if ds and ds[0][0]<1.6:
        i=ds[0][1]; used.add(i); opens[i].update(code=t['name'],sill=float(t['sill']),head=float(t['dint']),dist=round(ds[0][0],2))
    else: print('tag sin abertura',t['name'],round(ds[0][0],2) if ds else None)
for o in opens: print(o['code'],o['L'],o.get('dist'),o['pts'][0],o['pts'][-1],len(o['pts']))
def texts(page,T,minsz=4,maxsz=30):
    out=[]
    for s in text_spans(page,page.rect):
        t=s['text'].strip()
        if minsz<=s['size']<=maxsz and re.search(r'[A-Za-zÁÉÍÓÚáéíóú]{3,}',t):
            bx=s['bbox']; out.append(dict(t=t,p=T((bx[0]+bx[2])/2,(bx[1]+bx[3])/2),sz=round(s['size'],1)))
    return out
json.dump(dict(walls2=geo(wall2),walls4=geo(wall4),lint2=geo(lint2),lint4=geo(lint4),foot2=geo(foot2),foot4=geo(foot4),
  cols2=geo(unary_union(C2)),cols4=geo(unary_union(C4)),floors2=geo(unary_union(F2)),floors4=geo(unary_union(F4)),
  wins=wins,opens=opens,miss=[dict(code=t['name'],p=w2(t['x'],t['y']),sill=float(t['sill']),head=float(t['dint'])) for t in miss],
  texts2=texts(P2,w2),texts4=texts(P4,w4)),open('/workspace/almendra/3d/data/geom.json','w'))
