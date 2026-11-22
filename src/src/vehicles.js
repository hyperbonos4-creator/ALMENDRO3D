// v4: vehículos procedurales (sin red): sedán / hatchback / SUV y motocicleta. Geometría fusionada por material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const ni = (g) => (g.index ? g.toNonIndexed() : g);
function prep(g, color) { g = ni(g); if (!g.attributes.normal) g.computeVertexNormals(); if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  const n = g.attributes.position.count, a = new Float32Array(n * 3), c = new THREE.Color(color ?? 0xffffff); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k); return g; }
const box = (sx, sy, sz, x, y, z) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z); return g; };
function beam(a, b, t, tz) { // caja entre dos puntos (a,b: Vector3), sección t × tz
  const d = new THREE.Vector3().subVectors(b, a); const L = d.length(); const g = new THREE.BoxGeometry(L, t, tz ?? t);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.clone().normalize()); g.applyQuaternion(q); const m = a.clone().add(b).multiplyScalar(0.5); g.translate(m.x, m.y, m.z); return g; }
function tube(a, b, r, seg = 10) { const d = new THREE.Vector3().subVectors(b, a); const g = new THREE.CylinderGeometry(r, r, d.length(), seg, 1);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())); const m = a.clone().add(b).multiplyScalar(0.5); g.translate(m.x, m.y, m.z); return g; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function extrudeProfile(pts, width, bevel) { const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: width - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 6 }); g.translate(0, 0, -(width - 2 * bevel) / 2); return g; }
function arcPts(xc, yc, r, a0, a1, n) { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([xc + r * Math.cos(a), yc + r * Math.sin(a)]); } return o; }

import { buildCar8, CAR_TYPES8 } from './car8.js';
export const CAR_TYPES = CAR_TYPES8; // v8.1
export function carParts(type, paint, opt = {}) {
  const P = { paint: [], glass: [], tyre: [], rim: [], trim: [], chrome: [], lightF: [], lightR: [], plate: [] }; const add = (k, g, c) => P[k].push(prep(g, c ?? (k === 'paint' ? paint : 0xffffff)));
  const R = buildCar8(type, add, opt, { box, beam, prep }); if (opt.wheels) P.wheels = R.wheels; return P;
}
export function motoParts(paint) {
  const P = { paint: [], glass: [], tyre: [], rim: [], trim: [], chrome: [], lightF: [], lightR: [], plate: [] }; const add = (k, g, c) => P[k].push(prep(g, c ?? (k === 'paint' ? paint : 0xffffff)));
  const R = 0.31, xF = 0.69, xR = -0.69;
  for (const x of [xF, xR]) { const t = new THREE.TorusGeometry(R - 0.055, 0.055, 10, 28); t.translate(x, R, 0); add('tyre', t);
    const rim = new THREE.TorusGeometry(R - 0.105, 0.014, 6, 24); rim.translate(x, R, 0); add('rim', rim);
    const hub = new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12); hub.rotateX(Math.PI / 2); hub.translate(x, R, 0); add('rim', hub);
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.2; add('rim', beam(V(x, R, 0), V(x + Math.cos(a) * (R - 0.11), R + Math.sin(a) * (R - 0.11), 0), 0.022, 0.012)); }
    const disc = new THREE.CylinderGeometry(0.12, 0.12, 0.008, 18); disc.rotateX(Math.PI / 2); disc.translate(x, R, 0.07); add('chrome', disc, 0xb9bdc2); }
  // horquilla, tijera trasera, chasis
  const head = V(0.47, 0.96, 0);
  for (const s of [-1, 1]) { add('chrome', tube(V(xF, R, s * 0.075), V(head.x + 0.02, head.y - 0.02, s * 0.075), 0.022)); add('trim', tube(V(-0.12, 0.42, s * 0.085), V(xR, R, s * 0.085), 0.02)); }
  add('trim', tube(head, V(-0.12, 0.44, 0), 0.035)); add('trim', tube(V(0.30, 0.85, 0), V(-0.55, 0.80, 0), 0.025)); add('trim', tube(V(-0.12, 0.44, 0), V(-0.45, 0.80, 0), 0.022));
  // motor y escape
  add('trim', box(0.36, 0.28, 0.24, 0.05, 0.46, 0), 0x2a2d31); for (let k = 0; k < 4; k++) add('chrome', box(0.2, 0.012, 0.25, 0.18, 0.5 + k * 0.045, 0), 0x8d9297);
  add('chrome', tube(V(0.2, 0.36, 0.08), V(-0.25, 0.34, 0.15), 0.028)); add('chrome', tube(V(-0.25, 0.34, 0.15), V(-0.72, 0.56, 0.17), 0.055, 14));
  // tanque, asiento, colín, guardabarros
  const tk = new THREE.SphereGeometry(1, 18, 12); tk.scale(0.27, 0.13, 0.155); tk.rotateZ(-0.12); tk.translate(0.2, 0.89, 0); add('paint', tk);
  const se = new THREE.CapsuleGeometry(0.085, 0.42, 4, 10); se.rotateZ(Math.PI / 2 - 0.06); se.scale(1, 0.7, 1.1); se.translate(-0.22, 0.88, 0); add('trim', se, 0x151515);
  const tl = new THREE.BoxGeometry(0.34, 0.1, 0.16); tl.translate(-0.52, 0.86, 0); tl.rotateZ(0); add('paint', tl);
  add('lightR', box(0.03, 0.05, 0.1, -0.70, 0.86, 0));
  const ff = new THREE.TorusGeometry(R + 0.03, 0.025, 4, 12, Math.PI * 0.55); ff.scale(1, 1, 3.2); ff.rotateZ(Math.PI * 0.18); ff.translate(xF, R, 0); add('paint', ff);
  const rf = new THREE.TorusGeometry(R + 0.04, 0.025, 4, 12, Math.PI * 0.45); rf.scale(1, 1, 3.2); rf.rotateZ(Math.PI * 0.5); rf.translate(xR, R, 0); add('trim', rf);
  // faro, tablero, manubrio, espejos
  const hl = new THREE.CylinderGeometry(0.085, 0.07, 0.08, 16); hl.rotateZ(Math.PI / 2); hl.translate(0.6, 0.93, 0); add('trim', hl);
  const lens = new THREE.CircleGeometry(0.075, 16); lens.rotateY(Math.PI / 2); lens.translate(0.642, 0.93, 0); add('lightF', lens);
  add('trim', box(0.08, 0.06, 0.14, 0.5, 1.03, 0)); add('trim', tube(V(0.44, 1.06, -0.37), V(0.44, 1.06, 0.37), 0.014));
  for (const s of [-1, 1]) { add('trim', tube(V(0.44, 1.06, s * 0.30), V(0.44, 1.06, s * 0.38), 0.02), 0x0e0e0e); add('chrome', tube(V(0.44, 1.07, s * 0.22), V(0.40, 1.25, s * 0.27), 0.007)); add('chrome', box(0.02, 0.05, 0.08, 0.40, 1.26, s * 0.28)); }
  // estribos y placa
  for (const s of [-1, 1]) add('trim', tube(V(-0.02, 0.34, s * 0.1), V(-0.02, 0.34, s * 0.2), 0.012));
  add('plate', box(0.01, 0.12, 0.17, -0.76, 0.74, 0));
  // pata lateral (lado izquierdo, -z) que llega al piso con la inclinación
  const lean = -0.14; const zf = -0.30, yf = zf * Math.tan(lean);
  add('chrome', tube(V(-0.05, 0.38, -0.11), V(-0.12, yf + 0.01, zf), 0.012), 0x55595e);
  for (const k of Object.keys(P)) P[k].forEach((g) => g.rotateX(lean));
  return P;
}
export function vehicleMaterials() {
  return {
    paint: new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.55, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.06 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x0a0e12, metalness: 0.35, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.9 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x151617, roughness: 0.92 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xc3c7cc, metalness: 0.9, roughness: 0.28 }),
    trim: new THREE.MeshStandardMaterial({ vertexColors: true, color: 0x1a1c1f, roughness: 0.6, metalness: 0.2 }),
    chrome: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 1, roughness: 0.16 }),
    lightF: new THREE.MeshStandardMaterial({ color: 0xf2f5fa, emissive: 0xdfe8ff, emissiveIntensity: 0.25, metalness: 0.3, roughness: 0.1 }),
    lightR: new THREE.MeshStandardMaterial({ color: 0x8c0d12, emissive: 0x5a0508, emissiveIntensity: 0.5, roughness: 0.25 }),
    plate: new THREE.MeshStandardMaterial({ color: 0xf2e9b8, roughness: 0.5 }),
  };
}
// fusiona varias piezas (con su matriz) en una malla por material
export function mergeVehicles(list, MAT) {
  const acc = {}; for (const { parts, m } of list) for (const [k, gs] of Object.entries(parts)) if (k !== 'wheels') for (const g of gs) { const c = g.clone(); c.applyMatrix4(m); (acc[k] = acc[k] || []).push(c); }
  const G = new THREE.Group(); for (const [k, gs] of Object.entries(acc)) { if (!gs.length) continue; const me = new THREE.Mesh(mergeGeometries(gs, false), MAT[k]); me.castShadow = k !== 'glass'; me.receiveShadow = true; G.add(me); } return G;
}
