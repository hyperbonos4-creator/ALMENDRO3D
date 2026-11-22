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

// tipos (m): L largo, W ancho, H alto, wb distancia entre ejes, r radio de rueda, fo voladizo delantero, belt línea de cintura
export const CAR_TYPES = {
  sedan: { L: 4.55, W: 1.80, H: 1.45, wb: 2.70, r: 0.32, fo: 0.93, belt: 0.98, hood: 0.84, trunk: 0.99, ws: 0.72, rw: 0.55, roofL: 0.9, tail: 0.95 },
  hatch: { L: 4.05, W: 1.76, H: 1.48, wb: 2.55, r: 0.31, fo: 0.85, belt: 0.98, hood: 0.86, trunk: 1.02, ws: 0.78, rw: 0.30, roofL: 1.35, tail: 0.22 },
  cuv: { L: 4.22, W: 1.80, H: 1.62, wb: 2.60, r: 0.34, fo: 0.86, belt: 1.06, hood: 0.98, trunk: 1.08, ws: 0.72, rw: 0.22, roofL: 1.72, tail: 0.18 },
  suv: { L: 4.50, W: 1.85, H: 1.68, wb: 2.66, r: 0.36, fo: 0.90, belt: 1.10, hood: 1.02, trunk: 1.12, ws: 0.72, rw: 0.22, roofL: 1.85, tail: 0.18 },
};
export function carParts(type, paint, opt = {}) {
  const T = CAR_TYPES[type] || CAR_TYPES.sedan; const { L, W, H, wb, r, fo, belt, hood } = T; const x0 = -L / 2, x1 = L / 2; const xf = x1 - fo, xr = xf - wb; const tall = type === 'suv' || type === 'cuv'; const ra = r + 0.07, gc = tall ? 0.24 : 0.17;
  const P = { paint: [], glass: [], tyre: [], rim: [], trim: [], chrome: [], lightF: [], lightR: [], plate: [] }; const add = (k, g, c) => P[k].push(prep(g, c ?? (k === 'paint' ? paint : 0xffffff)));
  const bv = 0.085; const iw = W; // carrocería inferior (perfil lateral con pasos de rueda)
  const yb = gc + 0.02; const xw = xf - (tall ? 0.62 : 0.72); // base del parabrisas
  const xc = type === 'sedan' ? xr - 0.15 : x0 + 0.16; // base pilar C / portón
  const low = [[x1 - 0.06, yb + 0.06], ...arcPts(xf, r, ra, -0.4, Math.PI + 0.4, 12).map(([x, y]) => [x, Math.max(y, yb)]), ...arcPts(xr, r, ra, -0.4, Math.PI + 0.4, 12).map(([x, y]) => [x, Math.max(y, yb)]), [x0 + 0.08, yb + 0.04],
    [x0 + 0.0, yb + 0.28], [x0 + 0.02, T.trunk - 0.14], [x0 + 0.12, T.trunk], [xc, belt + 0.02], [xw, belt], [xw + 0.25, hood + 0.03], [x1 - 0.32, hood - 0.03], [x1 - 0.06, hood - 0.16], [x1, hood - 0.32], [x1 - 0.02, yb + 0.2]];
  const ins = low.map(([x, y]) => [x * (L - 2 * bv) / L, yb + (y - yb) * 0.985]);
  add('paint', extrudeProfile(ins, iw, bv));
  // habitáculo de vidrio (parabrisas, ventanas, luneta) con caída lateral (tumblehome)
  const rt = H, rf = xw - T.ws, rb = Math.max(xc + T.rw, rf - T.roofL);
  const gh = [[xw + 0.02, belt - 0.02], [rf, rt - 0.02], [rb, rt - 0.02], [xc - 0.02, belt - 0.0]];
  const gW = W - 0.17; const gg = extrudeProfile(gh, gW, 0.025); const pa = gg.attributes.position;
  for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); const k = 1 - 0.14 * Math.max(0, Math.min(1, (y - belt) / (rt - belt))); pa.setZ(i, pa.getZ(i) * k); } gg.computeVertexNormals(); add('glass', gg);
  // techo pintado + pilares A, B, C
  const tW = gW * 0.86 + 0.03; add('paint', extrudeProfile([[rf + 0.05, rt - 0.04], [rb - 0.03, rt - 0.04], [rb + 0.02, rt + 0.015], [rf + 0.0, rt + 0.015]], tW, 0.012));
  for (const s of [-1, 1]) { const zb = s * (gW / 2 + 0.006), zt = s * (gW * 0.86 / 2 + 0.008);
    add('paint', beam(V(xw + 0.02, belt, zb), V(rf, rt - 0.01, zt), 0.075, 0.03));
    add('paint', beam(V(xc - 0.02, belt, zb), V(rb, rt - 0.01, zt), type === 'sedan' ? 0.11 : 0.08, 0.03));
    add('trim', box(xw - xc, 0.03, 0.02, (xw + xc) / 2, belt + 0.01, s * (gW / 2 + 0.012)));
    const xbp = (rf + rb) / 2 + (type === 'sedan' ? 0.12 : 0.02); add('trim', beam(V(xbp, belt, zb * 1.002), V(xbp - 0.06, rt - 0.02, zt * 1.002), 0.07, 0.025));
    // espejos
    const mz = s * (W / 2 + 0.06); add('paint', box(0.13, 0.1, 0.15, xw - 0.08, belt + 0.1, mz)); add('trim', box(0.08, 0.03, 0.08, xw - 0.04, belt + 0.06, s * (W / 2 - 0.0)));
    add('glass', box(0.005, 0.07, 0.12, xw - 0.145, belt + 0.1, mz));
    // manijas y junta de puertas
    for (const xh of [xw - 0.45, (type === 'hatch' ? xr + 0.55 : xr + 0.75)]) add('chrome', box(0.16, 0.025, 0.02, xh, belt - 0.1, s * (W / 2 + 0.005)));
    for (const xs of [xw + 0.02, (rf + rb) / 2 + 0.06, xc + (type === 'sedan' ? 0.25 : 0.1)]) add('trim', box(0.006, belt - gc - 0.15, 0.006, xs - 0.05, (belt + gc + 0.12) / 2, s * (W / 2 + 0.001)));
    // faldón lateral
    add('trim', box(xf - xr - 2 * ra - 0.05, 0.07, 0.03, (xf + xr) / 2, yb + 0.06, s * (W / 2 - 0.0)));
    // luces delanteras y traseras
    add('lightF', box(0.1, tall ? 0.1 : 0.085, 0.36, x1 - 0.05, hood - 0.11, s * (W / 2 - 0.27)));
    add('lightR', box(0.05, 0.1, 0.34, x0 + 0.0, T.trunk - 0.15, s * (W / 2 - 0.25)));
  }
  // parachoques, rejilla, placas
  add('trim', box(0.09, 0.14, W - 0.12, x1 - 0.03, yb + 0.15, 0)); add('trim', box(0.09, 0.15, W - 0.12, x0 + 0.03, yb + 0.16, 0));
  add('trim', box(0.04, 0.15, W * 0.46, x1 - 0.01, hood - 0.25, 0)); add('chrome', box(0.045, 0.02, W * 0.46, x1 - 0.008, hood - 0.18, 0));
  add('plate', box(0.02, 0.11, 0.33, x1 + 0.02, yb + 0.22, 0)); add('plate', box(0.02, 0.11, 0.33, x0 - 0.01, T.trunk - 0.33, 0));
  if (tall) for (const s of [-1, 1]) add('trim', box(T.roofL * 0.9, 0.035, 0.035, (rf + rb) / 2, rt + 0.05, s * gW * 0.38));
  // ruedas: llanta con hombro redondeado + rin de 5 radios
  const tw = tall ? 0.24 : 0.21; const rr = r * 0.62;
  const prof = [[rr, -tw / 2], [r - 0.04, -tw / 2], [r - 0.005, -tw / 2 + 0.035], [r, 0], [r - 0.005, tw / 2 - 0.035], [r - 0.04, tw / 2], [rr, tw / 2]].map(([a, b]) => new THREE.Vector2(a, b));
  for (const wx of [xf, xr]) for (const s of [-1, 1]) {
    const wz = s * (W / 2 - tw / 2 - 0.03);
    const ty = new THREE.LatheGeometry(prof, 22); ty.rotateX(Math.PI / 2); ty.translate(wx, r, wz); add('tyre', ty);
    const disc = new THREE.CylinderGeometry(rr, rr, 0.02, 20); disc.rotateX(Math.PI / 2); disc.translate(wx, r, wz + s * (tw / 2 - 0.035)); add('trim', disc, 0x222222);
    const ring = new THREE.TorusGeometry(rr - 0.01, 0.018, 6, 22); ring.translate(wx, r, wz + s * (tw / 2 - 0.02)); add('rim', ring);
    const hub = new THREE.CylinderGeometry(0.055, 0.055, 0.05, 12); hub.rotateX(Math.PI / 2); hub.translate(wx, r, wz + s * (tw / 2 - 0.02)); add('rim', hub);
    for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5 + (wx > 0 ? 0.3 : 0); const sp = beam(V(wx, r, 0), V(wx + Math.cos(a) * (rr - 0.02), r + Math.sin(a) * (rr - 0.02), 0), 0.045, 0.025); sp.translate(0, 0, wz + s * (tw / 2 - 0.022)); add('rim', sp); }
    const well = new THREE.CylinderGeometry(ra - 0.01, ra - 0.01, W - 0.3, 16, 1, true); well.rotateX(Math.PI / 2); well.translate(wx, r, 0); // pasos de rueda oscuros
    add('trim', well, 0x0b0c0d);
  }
  return P;
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
    glass: new THREE.MeshPhysicalMaterial({ color: 0x0d1319, metalness: 0.2, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 }),
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
  const acc = {}; for (const { parts, m } of list) for (const [k, gs] of Object.entries(parts)) for (const g of gs) { const c = g.clone(); c.applyMatrix4(m); (acc[k] = acc[k] || []).push(c); }
  const G = new THREE.Group(); for (const [k, gs] of Object.entries(acc)) { if (!gs.length) continue; const me = new THREE.Mesh(mergeGeometries(gs, false), MAT[k]); me.castShadow = k !== 'glass'; me.receiveShadow = true; G.add(me); } return G;
}
