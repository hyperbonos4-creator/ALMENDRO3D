import json, sys, math, os, argparse
from shapely.geometry import Polygon, LineString, Point, box, LinearRing
from shapely.ops import unary_union, substring
ap = argparse.ArgumentParser(description='Arma datos/scene.json desde datos/geom.json.')
ap.add_argument('--geom', default=os.environ.get('GEOM_JSON', 'datos/geom.json'))
ap.add_argument('--out', default=os.environ.get('SCENE_JSON', 'datos/scene.json'))
ap.add_argument('--pypath', default=os.environ.get('ALMENDRA_PYPATH', ''), help='Carpeta con el módulo items (no está en este repo)')
args = ap.parse_args()
if args.pypath:
    sys.path.insert(0, args.pypath)
import items
g=json.load(open(args.geom))
P=lambda d:Polygon(d['o'],d.get('h',[])).buffer(0)
U=lambda k:unary_union([P(d) for d in g[k]])
def polys(geom,tol=0.008):
    geom=geom.simplify(tol)
    ps=list(geom.geoms) if hasattr(geom,'geoms') else [geom]
    out=[]
    for p in ps:
        if p.is_empty or p.area<0.004: continue
        r=lambda c:[[round(x,3),round(y,3)] for x,y in list(c)[:-1]]
        out.append({'o':r(p.exterior.coords),'h':[r(i.coords) for i in p.interiors if Polygon(i).area>0.004]})
    return out
W2=U('walls2'); L2=U('lint2'); C2=U('cols2'); F2=U('foot2')
W4=U('walls4'); C4=U('cols4'); F4=U('foot4')
F2=Polygon(F2.exterior) if F2.geom_type=='Polygon' else max(F2.geoms,key=lambda p:p.area)
band=box(-1,0,30,3.95)
f1=F2.difference(box(-1,-1,30,3.95))
f1=max(f1.geoms,key=lambda p:p.area) if hasattr(f1,'geoms') else f1
# skin pieces along footprint ring (CCW in x,z => outward normal)
ring=LinearRing(F2.exterior.coords)
if ring.is_ccw: coords=list(ring.coords)
else: coords=list(ring.coords)[::-1]
ring=LinearRing(coords); Lr=ring.length
ops=[]
for o in g['opens']:
    ls=LineString(o['pts']); a=ring.project(Point(o['pts'][0])); b=ring.project(Point(o['pts'][-1]))
    if abs(b-a)>Lr/2: a,b=b,a  # wrap unlikely
    a,b=min(a,b),max(a,b)
    code=o['code']; d=o.get('dist') or 9
    if o['L']>3.2: kind='open'; code=None
    elif code is None or d>1.0: kind='win'; code=None
    else: kind='win'
    ops.append(dict(a=a,b=b,kind=kind,code=code,L=o['L']))
# synthetic V-2 high windows hidden in plan (sill 1.70 above cut plane)
for m in g['miss']:
    if m['code']=='V-2':
        t=ring.project(Point(m['p'])); q=ring.interpolate(t)
        if q.distance(Point(m['p']))<0.8 and not any(o['a']-0.3<t<o['b']+0.3 for o in ops):
            ops.append(dict(a=t-0.495,b=t+0.495,kind='win',code='V-2',L=0.99,syn=True))
ops.sort(key=lambda o:o['a'])
SH={'V-1':(0.8,2.2),'V-2':(1.7,2.2),'V-3':(0.8,2.2),'V-4':(0.8,2.2),'V-5':(0.8,2.2),'V-6':(0.8,2.2),'V-7':(0.0,2.2),'V-8':(0.0,2.2)}
skin=[]
cum=0
pts=coords
for i in range(len(pts)-1):
    p0,p1=pts[i],pts[i+1]; L=math.dist(p0,p1)
    if L<0.02: cum+=L; continue
    s0,s1=cum,cum+L
    nx,nz=(p1[1]-p0[1])/L,-(p1[0]-p0[0])/L  # outward for CCW in (x,z) with z down? check below
    cuts=[]
    for o in ops:
        a,b=max(o['a'],s0),min(o['b'],s1)
        if b-a>0.02: cuts.append((a,b,o))
    t=s0
    def at(s): f=(s-s0)/L; return [round(p0[0]+(p1[0]-p0[0])*f,3),round(p0[1]+(p1[1]-p0[1])*f,3)]
    for a,b,o in cuts:
        if a-t>0.01: skin.append(dict(a=at(t),b=at(a),k='solid'))
        sh=SH.get(o['code'],(0.8,2.2))
        skin.append(dict(a=at(a),b=at(b),k=o['kind'],code=o['code'],sill=sh[0],head=sh[1],approx=(o['code'] is None or bool(o.get('syn')))))
        t=b
    if s1-t>0.01: skin.append(dict(a=at(t),b=at(s1),k='solid'))
    cum+=L
# outward test
cx,cz=F2.centroid.x,F2.centroid.y
s=skin[0];mx=(s['a'][0]+s['b'][0])/2;mz=(s['a'][1]+s['b'][1])/2
L=math.dist(s['a'],s['b']);nx,nz=(s['b'][1]-s['a'][1])/L,-(s['b'][0]-s['a'][0])/L
flip=-1 if F2.contains(Point(mx+nx*0.3,mz+nz*0.3)) else 1
print('flip',flip,'skin',len(skin),[ (x['k'],x.get('code')) for x in skin if x['k']!='solid'])
bom=[dict(i=i,g=x['g'],it=x['it'],q=x['q'],m=x['m'],p=x['p'],st=x['st'],why=x['why']) for i,x in enumerate(items.I)]
out=dict(walls2=polys(W2),lint2=polys(L2.difference(W2).buffer(0)),cols2=polys(C2),foot2=polys(F2),f1=polys(f1),
  walls4=polys(W4),cols4=polys(C4),foot4=polys(F4),bas_ceil=polys(F4.difference(box(-1,-1,7.8,3.95))),
  skin=skin,nflip=flip,bom=bom)
json.dump(out,open(args.out,'w'),separators=(',',':'))
print(os.path.getsize(args.out))
