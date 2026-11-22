import * as THREE from 'three';
import fs from 'fs';
const I = JSON.parse(fs.readFileSync('../data/interior.json'));
function shapeOf(p) { const s = new THREE.Shape(p.o.map(([x, z]) => new THREE.Vector2(x, -z))); (p.h || []).forEach((h) => s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))))); return s; }
for (const key of ['slab','hallFloor','lobby','caps']) {
 for (const p of I[key].slice(0,3)) { const g = new THREE.ShapeGeometry(shapeOf(p)); const pos=g.attributes.position, idx=g.index; let A=0; for(let i=0;i<idx.count;i+=3){const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2); A+=Math.abs((pos.getX(b)-pos.getX(a))*(pos.getY(c)-pos.getY(a))-(pos.getX(c)-pos.getX(a))*(pos.getY(b)-pos.getY(a)))/2;}
 console.log(key, p.o.length, (p.h||[]).length, (p.h||[]).map(h=>h.length).join(','), 'tri', idx.count/3, 'area', A.toFixed(2)); }
}
