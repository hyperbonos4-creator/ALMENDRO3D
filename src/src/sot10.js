// ============================================================================================
// v10 · SÓTANO reconstruido con la geometría EXACTA del vector del PDF "planos_parqueadero_nuevos"
// (muros, columnas, celdas, topellantas, cuartos: extraídos del SVG del PDF → sot10data.js).
// Niveles (el PDF no trae cotas de nivel → supuestos documentados en QA_REPORT):
//   N±0.00 calle/portón · rampa de acceso → A = N-1.00 (plataforma, cuartos, punto fijo)
//   rampa oriente 13.6 % en 8.50 m (cotas del PDF) → B = N-2.16 (celdas 5-10, motos, pasillo sur 3.76)
// ============================================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SD } from './sot10data.js';
import { textTex } from './tex.js';
import { carParts, motoParts, mergeVehicles, CAR_TYPES } from './vehicles.js';

export const SL = { A: -1.0, B: -1.0 - 0.136 * 8.5, TOP: 1.5, SLAB: 1.7, BOT: -2.6, EARTH: -3.4 };
// curva vertical parabólica (longitud 2a centrada en cada PVI)
function vc(t, t1, t2, y1, y2, a) {
  const g = (y2 - y1) / (t2 - t1);
  if (t <= t1 - a) return y1; if (t < t1 + a) return y1 + g * (t - (t1 - a)) ** 2 / (4 * a);
  if (t <= t2 - a) return y1 + g * (t - t1); if (t < t2 + a) return y2 - g * ((t2 + a) - t) ** 2 / (4 * a); return y2;
}
export const R1 = { p1: 0.4, p2: 7.7, a: 0.4 }, R2 = { p1: 8.69, p2: 17.19, a: 0.4 };
R1.g = SL.A / (R1.p2 - R1.p1); R2.g = (SL.B - SL.A) / (R2.p2 - R2.p1);
export const ramp1Y = (x) => vc(x, R1.p1, R1.p2, 0, SL.A, R1.a);
export const ramp2Y = (z) => vc(z, R2.p1, R2.p2, SL.A, SL.B, R2.a);
function pipRing(r, x, z) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; }
export function inPoly(p, x, z) { if (!pipRing(p.o, x, z)) return false; for (const h of p.h || []) if (pipRing(h, x, z)) return false; return true; }
export const inSot = (x, z) => SD.ZINT.some((p) => inPoly(p, x, z));
export const inOuter = (x, z) => inPoly(SD.OUTER, x, z);
// altura de piso terminado (misma regla con que se construyen las losas)
export function floorY(x, z) {
  if (x < 0) return 0;
  if (x < 8.1 && z < 4.3 && z > 0.4) return ramp1Y(x);
  if ((x >= 24.39 && z >= 8.29 && z <= 17.59) || (x >= 23.457 && x < 24.39 && z >= 8.29 && z < 9.54)) return ramp2Y(z);
  if ((z >= 12.69 && x < 24.39) || z > 17.59) return SL.B;
  return SL.A;
}
// celdas (rectángulos del PDF) · frente del carro hacia el pasillo; topellantas del PDF en la cabecera contraria
export const SPOTS = [
  { n: 1, r: [8.115, 13.336, 3.886, 6.387], t: 'sedan', c: 0xeceae6, cx: 10.725, cz: 5.12, h: 0 },
  { n: 2, r: [17.105, 21.925, 0.368, 2.765], t: 'hatch', c: 0x2d3135, cx: 21.775 - 2.13, cz: 1.567, h: Math.PI },
  { n: 3, r: [22.326, 24.674, 0.311, 5.01], t: 'cuv', c: 0x6a1020, cx: 23.5, cz: 0.461 + 2.15, h: -Math.PI / 2 },
  { n: 4, r: [24.674, 27.024, 0.41, 5.41], t: 'suv', c: 0x16171a, cx: 25.849, cz: 0.56 + 2.25, h: -Math.PI / 2 },
  { n: 5, r: [21.889, 24.388, 12.692, 17.191], t: 'hatch', c: 0x8d9196, cx: 23.381, cz: 12.842 + 2.13, h: -Math.PI / 2 },
  { n: 6, r: [19.391, 21.889, 12.692, 17.191], t: 'hatch', c: 0x5e0d12, cx: 20.64, cz: 12.842 + 2.13, h: -Math.PI / 2 },
  { n: 7, r: [17.121, 19.622, 20.955, 25.452], t: 'hatch', c: 0xc8cbcf, cx: 18.3715, cz: 25.302 - 2.13, h: Math.PI / 2 },
  { n: 8, r: [19.622, 22.124, 20.955, 25.452], t: 'cuv', c: 0x111214, cx: 20.873, cz: 25.302 - 2.15, h: Math.PI / 2 },
  { n: 9, r: [22.124, 24.622, 20.955, 25.452], t: 'hatch', c: 0x3d4b5c, cx: 23.373, cz: 25.302 - 2.13, h: Math.PI / 2 },
  { n: 10, r: [24.622, 27.121, 20.955, 25.452], t: 'cuv', c: 0xd8d5ce, cx: 25.8715, cz: 25.302 - 2.15, h: Math.PI / 2 },
];
export const DEMO_SPOT = 9;
export const MOTOS = [13.4, 14.52, 15.64, 16.77].map((z, i) => ({ n: i + 1, x: 18.0, z, h: 0, c: [0x1f4fa0, 0xb3121c, 0x1b1c1e, 0xe8e6e1][i] }));
export const MOTO_CELLS = [12.692, 13.812, 14.932, 16.052, 17.192];
// ajuste por contacto de 4 ruedas sobre el piso real (alto, cabeceo, alabeo)
export function wheelLocal(t) { const T = CAR_TYPES[t]; const xf = T.L / 2 - T.fo, xr = xf - T.wb, wz = T.W / 2 - 0.1 - 0.035; return [[xf, wz], [xf, -wz], [xr, wz], [xr, -wz]]; }
export function fitPose(cx, cz, h, t, fy = floorY) {
  const T = CAR_TYPES[t]; const W4 = wheelLocal(t); const c = Math.cos(h), s = Math.sin(h);
  const ys = W4.map(([lx, lz]) => fy(cx + lx * c + lz * s, cz - lx * s + lz * c));
  const yF = (ys[0] + ys[1]) / 2, yR = (ys[2] + ys[3]) / 2, yP = (ys[0] + ys[2]) / 2, yN = (ys[1] + ys[3]) / 2;
  const pitch = Math.atan2(yF - yR, T.wb), roll = -Math.atan2(yP - yN, 2 * W4[0][1]);
  const xm = (W4[0][0] + W4[2][0]) / 2; // centro entre ejes (no coincide con el centro del carro)
  const y = (yF + yR) / 2 - Math.sin(pitch) * xm;
  return { y, pitch, roll };
}

export function buildSotano(ctx) {
  const { lv, T8, PM8, tropicalGeo, shapeOf, VMAT } = ctx;
  const G = lv('sot').g, G1 = lv('p1').g;
  const OUT = { floorMeshes: [], segs: [], doors: [], rooms: [], dims: null, earth: [], lights: [] };
  const st = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
  const cloneT = (t, rx, ry) => { const q = t.clone(); q.wrapS = q.wrapT = THREE.RepeatWrapping; q.repeat.set(rx, ry); q.needsUpdate = true; return q; };
  const cvsT = (w, h, draw, rx = 1, ry = 1) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t; };
  // ---------- materiales ----------
  const MAT = {
    wall: st(0xd8d5cf, { map: cloneT(T8.concTie, 1 / 2.4, 1 / 1.2), roughness: 0.93 }),
    wallTop: st(0x8f8b85, { roughness: 0.95 }),
    floor: st(0xc4c2bd, { map: cloneT(T8.concFloor, 1 / 4, 1 / 4), roughness: 0.78 }),
    ramp: st(0xb9b7b1, { map: cvsT(256, 256, (g, w, h) => { g.fillStyle = '#9d9b96'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const v = 120 + Math.random() * 60; g.fillStyle = `rgba(${v},${v},${v - 4},.35)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } g.fillStyle = 'rgba(60,60,58,.55)'; for (let k = 0; k < 8; k++) g.fillRect(k * 32 + 13, 0, 5, h); }, 1 / 1.2, 1 / 1.2), roughness: 0.95 }),
    col: st(0xd9d7d2, { map: cloneT(T8.concFine, 1 / 1.2, 1 / 1.2), roughness: 0.85 }),
    earth: st(0xffffff, { map: cvsT(512, 512, (g, w, h) => { const L = [['#6b4f36', 0], ['#5c432d', 0.18], ['#7a5a3b', 0.42], ['#4f3a28', 0.7]]; L.forEach(([c, y], i) => { g.fillStyle = c; g.fillRect(0, y * h, w, h - y * h); });
      for (let i = 0; i < 900; i++) { const v = 60 + Math.random() * 70; g.fillStyle = `rgba(${v + 30},${v + 10},${v - 10},.55)`; const r = 1 + Math.random() * 4; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, r, 0, 6.3); g.fill(); } }, 1 / 3.4, 1 / 3.4), roughness: 1 }),
    earthTop: st(0x5a4a38, { roughness: 1 }),
    slabTop: st(0xffffff, { map: cloneT(T8.pebble, 1, 1), roughness: 0.95 }),
    slab: st(0xd2d0ca, { roughness: 0.85 }),
    paint: new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xe8b81e, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    ped: new THREE.MeshStandardMaterial({ color: 0x4f8a62, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    stop: st(0xe0b21c, { roughness: 0.6 }),
    stopK: st(0x222326, { roughness: 0.6 }),
    steel: st(0x3a3e43, { metalness: 0.6, roughness: 0.4 }),
    galv: st(0xa9adb1, { metalness: 0.7, roughness: 0.35 }),
    door: st(0x6f767c, { metalness: 0.45, roughness: 0.45 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xfafcff }),
    hazard: st(0xffffff, { map: cvsT(64, 64, (g, w, h) => { g.fillStyle = '#e8b81e'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d1e20'; for (let i = -2; i < 4; i++) { g.beginPath(); g.moveTo(i * 22, 0); g.lineTo(i * 22 + 11, 0); g.lineTo(i * 22 + 11 + h, h); g.lineTo(i * 22 + h, h); g.fill(); } }, 4, 2), roughness: 0.6 }),
  };
  MAT.floor.userData.sotFloor = true;
  // ---------- utilidades geométricas ----------
  function uvWorld(g) { const p = g.attributes.position, n = p.count, uv = new Float32Array(n * 2); const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nn = new THREE.Vector3();
    for (let i = 0; i < n; i += 3) { a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2); nn.subVectors(c, b).cross(a.clone().sub(b)).normalize();
      for (let k = 0; k < 3; k++) { const v = [a, b, c][k]; let u, w; if (Math.abs(nn.y) > 0.7) { u = v.x; w = -v.z; } else if (Math.abs(nn.x) > Math.abs(nn.z)) { u = v.z; w = v.y; } else { u = v.x; w = v.y; } uv[(i + k) * 2] = u; uv[(i + k) * 2 + 1] = w; } }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; }
  function solid(polys, fTop, yBot) {
    const gs = polys.map((p) => { const g0 = new THREE.ExtrudeGeometry(shapeOf(p), { depth: 1, bevelEnabled: false, curveSegments: 1 }); g0.rotateX(-Math.PI / 2); const g = g0.index ? g0.toNonIndexed() : g0; const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, pos.getY(i) > 0.5 ? fTop(x, z) : yBot); } g.deleteAttribute('normal'); g.deleteAttribute('uv'); g.clearGroups(); return g; });
    const m = mergeGeometries(gs, false); uvWorld(m); m.computeVertexNormals(); return m;
  }
  const box = (x0, x1, y0, y1, z0, z1) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); const q = g.index ? g.toNonIndexed() : g; return q; };
  const wbox = (...a) => uvWorld(box(...a));
  const mesh = (geo, mat, cast = true, recv = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; };
  const merged = (list, mat, cast = true) => mesh(mergeGeometries(list.map((g) => { if (g.index) g = g.toNonIndexed(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k); if (!g.attributes.uv) uvWorld(g); return g; }), false), mat, cast);
  // cinta pintada que se adapta al piso (subdividida cada 0.2 m)
  function ribbon(ax, az, bx, bz, w, dy = 0.004) { const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 0.2)); const ux = (bx - ax) / L, uz = (bz - az) / L, px = -uz * w / 2, pz = ux * w / 2; const v = [];
    for (let i = 0; i < n; i++) { const t0 = i / n * L, t1 = (i + 1) / n * L; const P = (t, s) => { const x = ax + ux * t + px * s, z = az + uz * t + pz * s; return [x, floorY(x, z) + dy, z]; };
      const a = P(t0, -1), b = P(t1, -1), c = P(t1, 1), d = P(t0, 1); v.push(...a, ...c, ...b, ...a, ...d, ...c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); if (g.attributes.normal.getY(0) < 0) { const p = g.attributes.position; for (let i = 0; i < p.count; i += 3) { const t = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)]; p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)); p.setXYZ(i + 2, ...t); } g.computeVertexNormals(); } return g; }
  function rect(x0, x1, z0, z1, dy = 0.004) { return (x1 - x0) >= (z1 - z0) ? ribbon(x0, (z0 + z1) / 2, x1, (z0 + z1) / 2, z1 - z0, dy) : ribbon((x0 + x1) / 2, z0, (x0 + x1) / 2, z1, x1 - x0, dy); }
  function floorText(lines, x, z, w, h, rot = 0, o = {}) { const t = textTex(lines, { w: o.pw || 512, h: o.ph || Math.round(512 * h / w), y0: o.y0 ?? 8, bg: o.bg }); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false })); m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(x, floorY(x, z) + 0.006, z); m.renderOrder = 2; return m; }
  const segRect = (x0, x1, z0, z1) => [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]];
  const segsPoly = (p) => { const out = []; for (const r of [p.o, ...(p.h || [])]) for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; out.push([a[0], a[1], b[0], b[1]]); } return out; };
  const { A, B, TOP, BOT } = SL;

  // ================= 1. losas de piso (rellenas hasta la cimentación: sin huecos ni piezas colgando) =================
  const FZ = SD.ZONES;
  const fA = solid(FZ.A, () => A, BOT), fB = solid(FZ.B, () => B, BOT), fR1 = solid(FZ.R1, (x) => ramp1Y(x), BOT), fR2 = solid(FZ.R2, (x, z) => ramp2Y(z), BOT);
  for (const [g, m, n] of [[fA, MAT.floor, 'pisoA'], [fB, MAT.floor, 'pisoB'], [fR1, MAT.ramp, 'rampa1'], [fR2, MAT.ramp, 'rampa2']]) { const me = mesh(g, m, false, true); me.name = n; G.add(me); OUT.floorMeshes.push(me); }
  // foso del ascensor: losa de fondo (el revestimiento lo pone interior.js)
  G.add(mesh(wbox(16.755, 19.205, BOT, -2.35, 9.842, 11.543), MAT.floor, false));
  // caras de contención en los cambios de nivel (concreto a la vista)
  G.add(mesh(mergeGeometries([wbox(16.5, 24.39, B - 0.01, A - 0.001, 12.69, 12.692), (() => { const v = []; const n = 45; for (let i = 0; i < n; i++) { const z0 = 12.69 + i * 4.5 / n, z1 = 12.69 + (i + 1) * 4.5 / n; const y0 = ramp2Y(z0), y1 = ramp2Y(z1); v.push(24.388, B, z0, 24.388, y1, z1, 24.388, y0, z0, 24.388, B, z0, 24.388, B, z1, 24.388, y1, z1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return uvWorld(g); })()]), MAT.wall, false));

  // ================= 2. muros de contención y particiones (polígonos del PDF) + columnas =================
  const walls = mesh(solid(SD.WALL, () => TOP, BOT), MAT.wall); walls.name = 'muros'; G.add(walls); OUT.walls = walls;
  for (const p of SD.WALL) OUT.segs.push(...segsPoly(p));
  G.add(mesh(solid(SD.COPING, () => TOP + 0.05, TOP), MAT.wallTop)); // remate de los muros de la rampa a cielo abierto
  const cg = SD.COLS.map(([x0, x1, z0, z1]) => wbox(x0, x1, BOT, TOP, z0, z1)); G.add(merged(cg, MAT.col));
  const hz = SD.COLS.map(([x0, x1, z0, z1]) => { const fy = floorY((x0 + x1) / 2, (z0 + z1) / 2); return wbox(x0 - 0.004, x1 + 0.004, fy + 0.0, fy + 0.9, z0 - 0.004, z1 + 0.004); }); G.add(merged(hz, MAT.hazard, false));
  for (const [x0, x1, z0, z1] of SD.COLS) OUT.segs.push(...segRect(x0, x1, z0, z1));
  // cerramiento de la caja de escalera (la escalera es la de la torre, PL_A002) — muro norte y muro hacia la rampa
  const SW = [[21.36, 24.58, 9.57, 9.69], [24.46, 24.58, 9.57, 12.69]];
  G.add(merged(SW.map(([a, b, c, d]) => wbox(a, b, BOT, TOP, c, d)), MAT.wall)); for (const [a, b, c, d] of SW) OUT.segs.push(...segRect(a, b, c, d));
  // bordillo pequeño hall / remate de rampa
  G.add(merged([wbox(23.40, 23.457, A - 0.1, A + 0.1, 8.69, 9.57)], MAT.wall)); OUT.segs.push([23.43, 8.69, 23.43, 9.57]);

  // ================= 3. barandas en los bordes de cambio de nivel =================
  { const post = [], rail = [], curb = [];
    curb.push(wbox(16.75, 24.39, A, A + 0.15, 12.54, 12.69));
    for (let x = 16.85; x <= 24.33; x += 1.2) post.push(box(x - 0.025, x + 0.025, A + 0.15, A + 1.05, 12.59, 12.64));
    rail.push(box(16.8, 24.36, A + 1.02, A + 1.07, 12.585, 12.645), box(16.8, 24.36, A + 0.58, A + 0.61, 12.6, 12.63));
    // borde oriente de la celda 5 (rampa más alta que la celda): postes sobre la rampa, pasamanos inclinado
    const zs = []; for (let z = 12.78; z <= 17.1; z += 1.08) zs.push(z);
    for (const z of zs) { const y = ramp2Y(z); post.push(box(24.395, 24.445, y, y + 1.05, z - 0.025, z + 0.025)); }
    const railZ = (y0) => { const v = []; for (let i = 0; i < 30; i++) { const z0 = 12.75 + i * (17.15 - 12.75) / 30, z1 = 12.75 + (i + 1) * (17.15 - 12.75) / 30; const g = box(24.39, 24.45, ramp2Y(z0) + y0, ramp2Y(z0) + y0 + 0.045, z0, z1); v.push(g); } return v; };
    rail.push(...railZ(1.0), ...railZ(0.5));
    G.add(merged(post, MAT.galv), merged(rail, MAT.galv), merged(curb, MAT.wall));
    OUT.segs.push([16.6, 12.64, 24.42, 12.64], [24.42, 12.64, 24.42, 17.19]);
  }

  // ================= 4. demarcación: celdas, números, topellantas, motos, flechas, paso peatonal =================
  const white = [], yel = [], ped = [];
  const L = 0.1; // línea de 10 cm
  for (const s of SPOTS) { const [x0, x1, z0, z1] = s.r; const ax = (x1 - x0) > (z1 - z0) ? 'x' : 'z';
    // líneas laterales (las que separan celdas) + cabecera
    if (s.n === 1 || s.n === 2) { white.push(rect(x0, x1, z0 - L / 2, z0 + L / 2), rect(x0, x1, z1 - L / 2, z1 + L / 2), rect(x0 - L / 2, x0 + L / 2, z0, z1), rect(x1 - L / 2, x1 + L / 2, z0, z1)); }
    else { white.push(rect(x0 - L / 2, x0 + L / 2, z0, z1), rect(x1 - L / 2, x1 + L / 2, z0, z1)); void ax; }
  }
  // líneas de cabecera hacia el pasillo
  white.push(rect(22.326, 27.024, 5.36, 5.46), rect(19.391, 24.388, 17.141, 17.241), rect(17.121, 27.121, 20.905, 21.005));
  // celdas de motos (2.71 × 1.12/1.14, PDF)
  for (const z of MOTO_CELLS) white.push(rect(16.62, 19.39, z - 0.05, z + 0.05)); white.push(rect(19.34, 19.44, 12.692, 17.192));
  // topellantas (posición y tamaño del PDF: 0.60 × 0.25), concreto prefabricado h = 0.10 con franjas
  const stopG = [], stopK = [];
  for (const [x0, x1, z0, z1] of SD.STOPS) { const fy = floorY((x0 + x1) / 2, (z0 + z1) / 2); stopG.push(wbox(x0, x1, fy, fy + 0.1, z0, z1)); const ax = (x1 - x0) > (z1 - z0);
    for (const f of [0.25, 0.65]) stopK.push(ax ? wbox(x0 + (x1 - x0) * f, x0 + (x1 - x0) * (f + 0.1), fy + 0.0005, fy + 0.1005, z0 - 0.0005, z1 + 0.0005) : wbox(x0 - 0.0005, x1 + 0.0005, fy + 0.0005, fy + 0.1005, z0 + (z1 - z0) * f, z0 + (z1 - z0) * (f + 0.1))); }
  G.add(merged(stopG, MAT.stop), merged(stopK, MAT.stopK, false));
  // paso peatonal pintado 0.90 m: puerta peatonal → escalera / ascensor (no reduce ninguna medida: va pintado sobre el carril)
  const PED = { z0: 2.8, z1: 3.7, x0: 0.05, xs: 19.45, xe: 20.35, zEnd: 11.2 };
  ped.push(rect(PED.x0, PED.xe, PED.z0, PED.z1), rect(PED.xs, PED.xe, PED.z1, PED.zEnd), rect(PED.xe, 21.36, 9.79, 10.69));
  yel.push(rect(PED.x0, PED.xe, PED.z0 - 0.04, PED.z0), rect(PED.x0, PED.xs, PED.z1, PED.z1 + 0.04), rect(PED.xs - 0.04, PED.xs, PED.z1, PED.zEnd), rect(PED.xe, PED.xe + 0.04, PED.z0, 9.79));
  for (let z = 4.0; z < 6.85; z += 0.6) white.push(rect(PED.xs + 0.08, PED.xe - 0.08, z, z + 0.3, 0.006)); // cebra en el cruce del pasillo
  G.add(merged(white, MAT.paint, false), merged(yel, MAT.yellow, false), merged(ped, MAT.ped, false));
  OUT.ped = PED;
  // pictogramas y textos pintados (planos, sin etiquetas flotantes)
  const iconMat = (draw, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false }); };
  const icon = (mat, x, z, w, h, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(x, floorY(x, z) + 0.006, z); m.renderOrder = 2; return m; };
  const walkerM = iconMat((g, w, h) => { g.fillStyle = '#f4f4f0'; g.strokeStyle = '#f4f4f0'; g.lineCap = 'round'; g.lineWidth = w * 0.09; g.beginPath(); g.arc(w * 0.52, h * 0.16, w * 0.09, 0, 6.3); g.fill();
    const L = (a, b, c, d) => { g.beginPath(); g.moveTo(a * w, b * h); g.lineTo(c * w, d * h); g.stroke(); }; L(0.5, 0.3, 0.45, 0.6); L(0.45, 0.6, 0.62, 0.92); L(0.45, 0.6, 0.3, 0.9); L(0.49, 0.36, 0.68, 0.5); L(0.49, 0.36, 0.3, 0.48); }, 256, 256);
  const arrowM = iconMat((g, w, h) => { g.fillStyle = '#f4f4f0'; g.beginPath(); g.moveTo(0.04 * w, 0.38 * h); g.lineTo(0.62 * w, 0.38 * h); g.lineTo(0.62 * w, 0.14 * h); g.lineTo(0.97 * w, 0.5 * h); g.lineTo(0.62 * w, 0.86 * h); g.lineTo(0.62 * w, 0.62 * h); g.lineTo(0.04 * w, 0.62 * h); g.closePath(); g.fill(); }, 512, 256);
  const pic = (x, z, rot) => icon(walkerM, x, z, 0.62, 0.62, rot);
  for (const x of [2.0, 6.0, 10.0, 14.0, 17.6]) G.add(pic(x, 3.25, -Math.PI / 2));
  for (const z of [7.6, 9.9]) G.add(pic(19.9, z, Math.PI));
  for (const s of SPOTS) { const [x0, x1, z0, z1] = s.r; let x = (x0 + x1) / 2, z = (z0 + z1) / 2, rot = 0;
    if (s.n === 1) { x = x1 - 0.55; rot = Math.PI / 2; } else if (s.n === 2) { x = x0 + 0.55; rot = -Math.PI / 2; } else if (s.h === -Math.PI / 2) { z = z1 - 0.5; rot = Math.PI; } else { z = z0 + 0.5; }
    if (s.n !== 1 && s.n !== 2) x = s.cx;
    G.add(floorText([{ t: String(s.n), s: 300, w: 800, c: '#f4f4f0' }], x, z, 0.6, 0.6, rot, { pw: 256, ph: 256, y0: -20 })); }
  MOTOS.forEach((m, i) => G.add(floorText([{ t: 'M' + m.n, s: 200, w: 800, c: '#f4f4f0' }], 19.05, (MOTO_CELLS[i] + MOTO_CELLS[i + 1]) / 2, 0.42, 0.42, -Math.PI / 2, { pw: 256, ph: 256, y0: 10 })));
  const arrow = (x, z, rot) => G.add(icon(arrowM, x, z, 1.5, 0.75, rot));
  arrow(5.3, 1.75, 0); arrow(14.2, 1.85, 0); arrow(25.75, 7.2, -Math.PI / 2); arrow(20.5, 19.07, 0);
  G.add(floorText([{ t: 'RAMPA 13.6 %', s: 64, w: 800, c: '#f4f4f0' }], 25.75, 12.9, 2.0, 0.42, -Math.PI / 2, { pw: 512, ph: 108, y0: 12 }));
  G.add(floorText([{ t: 'RAMPA 13.7 %', s: 64, w: 800, c: '#f4f4f0' }], 3.9, 1.55, 2.0, 0.42, 0, { pw: 512, ph: 108, y0: 12 }));
  G.add(floorText([{ t: 'PASO PEATONAL', s: 52, w: 800, c: '#f4f4f0' }], 9.0, 3.25, 1.6, 0.26, 0, { pw: 640, ph: 104, y0: 20 }));
  // cotas de nivel (símbolo de nivel pintado)
  const lvlMark = (t, x, z, rot = 0) => G.add(floorText([{ t, s: 60, w: 700, c: '#1d1f23' }], x, z, 1.15, 0.3, rot, { pw: 512, ph: 134, y0: 30, bg: '#f2c230' }));
  lvlMark('NPT -1.00', 15.0, 5.6); lvlMark('NPT -2.16', 20.5, 18.0); lvlMark('N ±0.00', 0.75, 1.3, 0);

  // ================= 5. cuartos: puertas, rótulos en el piso (nombre + área), dotación =================
  const RM = Object.fromEntries(SD.ROOMS.map((r) => [r.id, r]));
  for (const r of SD.ROOMS) { const xs = r.poly.o.map((p) => p[0]), zs = r.poly.o.map((p) => p[1]); const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const w = Math.max(...xs) - Math.min(...xs);
    OUT.rooms.push({ id: r.id, name: r.name, plan: r.name, area: r.area, cx, cz, fy: A, clear: TOP - A, poly: r.poly });
    const lines = r.id === 'elec' ? [{ t: 'C. ELÉCTRICO', s: 46, w: 700, c: '#23262b' }, { t: '/ TELEC.', s: 46, w: 700, c: '#23262b' }, { t: r.area.toFixed(2) + ' m²', s: 40, w: 500, c: '#5b6068' }] : [{ t: r.name, s: 50, w: 700, c: '#23262b' }, { t: r.area.toFixed(2) + ' m²', s: 42, w: 500, c: '#5b6068' }];
    G.add(floorText(lines, cx, cz + (r.id === 'aseo' || r.id === 'elec' ? 0.1 : 0.35), Math.min(1.05, w - 0.15), Math.min(1.05, w - 0.15) * (lines.length > 2 ? 0.62 : 0.45), r.id.startsWith('util') ? 0 : Math.PI, { pw: 512, ph: lines.length > 2 ? 318 : 230, y0: 14 })); }
  G.add(floorText([{ t: 'MEDIDORES AGUA', s: 46, w: 800, c: '#23262b' }], 18.0, 12.15, 1.7, 0.26, 0, { pw: 640, ph: 98, y0: 18 }));
  G.add(floorText([{ t: 'MOTOS', s: 60, w: 800, c: '#f4f4f0' }], 16.95, 14.95, 1.1, 0.3, Math.PI / 2, { pw: 512, ph: 140, y0: 30 }));
  // puertas batientes (hojas metálicas), abren hacia adentro del cuarto
  const doorDefs = [
    { id: 'util1', hx: 17.13, hz: 6.983, w: 0.8, dir: 1, open: 1, label: 'C. ÚTIL 1' }, { id: 'util2', hx: 18.83, hz: 6.983, w: 0.8, dir: -1, open: 1, label: 'C. ÚTIL 2' },
    { id: 'aseo', hx: 9.75, hz: 0.555, w: 0.525, dir: 1, open: -1, label: 'C. ASEO' }, { id: 'aseo', hx: 10.8, hz: 0.555, w: 0.525, dir: -1, open: -1, label: 'C. ASEO' },
    { id: 'elec', hx: 11.1, hz: 0.555, w: 0.575, dir: 1, open: -1, label: 'C. ELÉCTRICO / TELEC.' }, { id: 'elec', hx: 12.25, hz: 0.555, w: 0.575, dir: -1, open: -1, label: 'C. ELÉCTRICO / TELEC.' },
  ];
  const DH = 2.1;
  for (const d of doorDefs) { const piv = new THREE.Group(); piv.position.set(d.hx, A, d.hz); G.add(piv);
    const lg = box(d.dir > 0 ? 0.01 : -d.w + 0.01, d.dir > 0 ? d.w - 0.01 : -0.01, 0.01, DH, -0.02, 0.02); const leaf = mesh(lg, MAT.door); piv.add(leaf);
    piv.add(mesh(box(d.dir > 0 ? d.w - 0.12 : -d.w + 0.06, d.dir > 0 ? d.w - 0.06 : -d.w + 0.12, 1.0, 1.03, -0.045, 0.045), MAT.galv, false));
    if (doorDefs.findIndex((q) => q.id === d.id) === doorDefs.indexOf(d)) { const sg = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(0.44, d.w - 0.08), 0.12), new THREE.MeshBasicMaterial({ map: textTex([{ t: d.label, s: 30, w: 800, c: '#f4efe6' }], { w: 400, h: 108, y0: 30, bg: '#1d1f23', r: 8 }) }));
    sg.position.set(d.dir > 0 ? d.w / 2 : -d.w / 2, 1.6, -d.open * 0.021); if (d.open > 0) sg.rotation.y = Math.PI; piv.add(sg); }
    const D = { cx: d.hx + d.dir * d.w / 2, cz: d.hz, fy: A, tgt: 0, a: 0, max: 1.45, manual: 0, svc: true, label: d.label, piv,
      set(a) { this.a = a; piv.rotation.y = -d.dir * d.open * a; },
      seg() { const ang = piv.rotation.y; return [d.hx, d.hz, d.hx + d.dir * d.w * Math.cos(ang), d.hz - d.dir * d.w * Math.sin(ang)]; } };
    OUT.doors.push(D); }
  // dotación ilustrativa: C. ASEO, C. ÚTIL y medidores. v10.2: el rack y los equipos del sistema de acceso se modelan en acceso.js
  // (rack 19" abierto con sus unidades, fuente 12 V, breaker, DPS, toma); aquí solo queda el tablero eléctrico EXISTENTE del edificio.
  { const tb = st(0xb9bec4, { metalness: 0.45, roughness: 0.45 }), tbd = st(0x9aa0a7, { metalness: 0.5, roughness: 0.4 });
    G.add(merged([box(12.23, 12.345, A + 0.9, A + 1.7, -0.62, -0.02)], tb)); // gabinete del tablero existente (muro oriente)
    G.add(merged([box(12.222, 12.232, A + 0.93, A + 1.67, -0.6, -0.04), box(12.214, 12.222, A + 1.25, A + 1.35, -0.1, -0.07)], tbd)); // puerta + manija
    { const t = textTex([{ t: 'TABLERO EXISTENTE', s: 30, w: 800, c: '#1d1f23' }, { t: 'servicios comunes', s: 22, w: 600, c: '#333' }], { w: 320, h: 96, y0: 12, bg: '#f2c230', r: 6 }); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.078), new THREE.MeshBasicMaterial({ map: t })); m.position.set(12.2125, A + 1.55, -0.32); m.rotation.y = -Math.PI / 2; G.add(m); OUT.tabSign = m; }
    G.add(merged([box(9.7, 10.3, A, A + 0.5, -0.84, -0.42), box(10.35, 10.86, A, A + 1.6, -0.84, -0.5)], st(0xe8e6e1)));
    const sh = []; for (const [x0, x1] of [[16.85, 17.85], [18.1, 19.2]]) { for (const y of [0.05, 0.5, 0.95, 1.4]) sh.push(box(x0, x1, A + y, A + y + 0.025, 9.25, 9.64)); for (const x of [x0, x1 - 0.03]) for (const z of [9.25, 9.61]) sh.push(box(x, x + 0.03, A, A + 1.5, z, z + 0.03)); }
    G.add(merged(sh, st(0x7c848c, { metalness: 0.6, roughness: 0.45 })));
    const md = []; for (let x = 16.95; x < 19.0; x += 0.42) md.push(box(x, x + 0.3, A + 0.5, A + 0.9, 11.693, 11.86)); md.push(box(16.8, 19.2, A + 0.32, A + 0.38, 11.70, 11.76)); G.add(merged(md, st(0x2f6fb0, { roughness: 0.5 })));
    OUT.segs.push(...segRect(11.1, 11.7, -0.862, -0.412), ...segRect(9.7, 10.86, -0.84, -0.42), [16.85, 9.25, 19.2, 9.25], [16.8, 11.86, 19.2, 11.86]);
    OUT.rack = { x: 11.4, y: A, z: -0.64 }; }
  // pozo (.44 en el PDF) y registro junto a la escalera: rejillas a ras de piso
  { const gr = st(0x4a4e53, { metalness: 0.6, roughness: 0.5 }); const fr = st(0x9a9893);
    for (const [x0, x1, z0, z1] of [[13.336, 13.935, 4.6, 6.014], [21.924, 22.725, 8.616, 9.075]]) { const fy = floorY((x0 + x1) / 2, (z0 + z1) / 2); G.add(merged([box(x0, x1, fy - 0.04, fy + 0.004, z0, z1)], fr, false));
      const bars = []; for (let x = x0 + 0.08; x < x1 - 0.06; x += 0.05) bars.push(box(x, x + 0.012, fy - 0.03, fy + 0.006, z0 + 0.08, z1 - 0.08)); G.add(merged(bars, gr, false)); } }

  // ================= 6. luminarias LED lineales (cielo = losa del piso 1, N+1.50) =================
  { const L1 = []; const pts = [[3, 2.3], [6.5, 2.3], [10.5, 2.3], [14.5, 2.3], [19.5, 4.6], [24.6, 7.0], [10.7, 5.1], [25.8, 11.5], [25.8, 15.5], [20.4, 10.9], [18.0, 15.0], [20.6, 15.0], [23.1, 15.0], [18.4, 19.0], [22.0, 19.0], [25.6, 19.0], [18.4, 23.2], [20.9, 23.2], [23.4, 23.2], [25.9, 23.2], [23.6, 2.7], [25.9, 2.7], [19.5, 1.6]];
    for (const [x, z] of pts) { if (x < 6.9) continue; const along = z < 6 && x < 16 ? 'x' : 'z'; L1.push(along === 'x' ? box(x - 0.6, x + 0.6, TOP - 0.06, TOP - 0.02, z - 0.05, z + 0.05) : box(x - 0.05, x + 0.05, TOP - 0.06, TOP - 0.02, z - 0.6, z + 0.6)); }
    G.add(merged(L1, MAT.lamp, false)); OUT.lampPts = pts.filter(([x]) => x >= 6.9); }

  // ================= 7. vehículos con contacto real de llantas =================
  const list = []; const q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YZX');
  const poseM = (x, z, h, t) => { const P = fitPose(x, z, h, t); e.set(P.roll, h, P.pitch, 'YZX'); q.setFromEuler(e); return { m: new THREE.Matrix4().compose(new THREE.Vector3(x, P.y, z), q.clone(), new THREE.Vector3(1, 1, 1)), P }; };
  for (const s of SPOTS) { const T = CAR_TYPES[s.t]; s.L = T.L; s.Wd = T.W; const { m, P } = poseM(s.cx, s.cz, s.h, s.t); s.y = P.y; s.pose = P; s.mat = m; if (s.n === DEMO_SPOT) continue; list.push({ parts: carParts(s.t, s.c), m }); }
  for (const mo of MOTOS) { mo.y = floorY(mo.x, mo.z); mo.mat = new THREE.Matrix4().compose(new THREE.Vector3(mo.x, mo.y, mo.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), mo.h), new THREE.Vector3(1, 1, 1)); list.push({ parts: motoParts(mo.c), m: mo.mat }); }
  const VG = mergeVehicles(list, VMAT); VG.name = 'vehiculos'; G.add(VG); OUT.vehGroup = VG;
  for (const s of SPOTS) if (s.n !== DEMO_SPOT) OUT.segs.push(...obbSegs(s.cx, s.cz, s.h, s.L / 2 + 0.03, s.Wd / 2 + 0.05));
  for (const mo of MOTOS) OUT.segs.push(...obbSegs(mo.x, mo.z, mo.h, 1.05, 0.4));

  // ================= 8. envolvente exterior: losa del podio (N+1.50/+1.70), zócalo, terreno =================
  { const slab = mesh(solid(SD.PODIUM, () => SL.SLAB, TOP), MAT.slab); G1.add(slab);
    const top = mesh(solid(SD.PODIUM, () => SL.SLAB + 0.012, SL.SLAB), MAT.slabTop, false); G1.add(top);
    const pl = mesh(solid(SD.PLINTH, () => TOP, -0.06), MAT.wall); G1.add(pl);
    OUT.podium = [slab, top, pl]; }
  { const ring = { o: SD.EARTH[0].o, h: [SD.OUTER.o] };
    const e1 = mesh(solid([ring], () => -0.06, SL.EARTH), MAT.earth, false); const e2 = mesh(solid([SD.OUTER], () => BOT, SL.EARTH), MAT.earth, false);
    e1.name = 'terreno'; G.add(e1, e2); OUT.earth.push(e1, e2); }
  // jardín de la franja frente al balcón (fuera del sótano, N±0.00)
  { const gm = st(0x4f6b3a, { roughness: 1 }); G1.add(mesh(box(0.05, 6.86, 0, 0.06, 4.15, 6.74), gm, false)); G1.add(mesh(box(6.86, 7.9, 0, 0.06, 4.15, 4.62), gm, false));
    if (tropicalGeo && PM8) { const pl = []; for (const [x, z, h] of [[0.9, 5.4, 1.1], [2.4, 5.1, 1.4], [3.9, 5.6, 1.0], [5.3, 5.2, 1.3], [6.4, 5.8, 0.9]]) pl.push(tropicalGeo(x, 0.06, z, h)); const pm = new THREE.Mesh(mergeGeometries(pl), PM8.trop); pm.castShadow = true; G1.add(pm); }
    G1.add(merged([box(0.05, 7.9, 0, 0.35, 6.62, 6.74)], MAT.wall)); }

  // ================= 9. cotas para la vista "Planta sótano (plano)" =================
  OUT.dims = buildDims();
  G.add(OUT.dims); OUT.dims.visible = false;
  function buildDims() {
    const D = new THREE.Group(); D.name = 'cotas'; const y = TOP + 0.08; const ln = [], tk = [];
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x0b6fd1 }), txtW = (t) => 0.16 * t.length + 0.12;
    const dim = (ax, az, bx, bz, t, off = 0, tsz = 0.34) => { const dx = bx - ax, dz = bz - az, Lg = Math.hypot(dx, dz), ux = dx / Lg, uz = dz / Lg, nx = -uz, nz = ux;
      const a = [ax + nx * off, az + nz * off], b = [bx + nx * off, bz + nz * off];
      const seg = (p, q, w) => { const l = Math.hypot(q[0] - p[0], q[1] - p[1]); const g = new THREE.PlaneGeometry(l, w); g.rotateX(-Math.PI / 2); g.rotateY(-Math.atan2(q[1] - p[1], q[0] - p[0])); g.translate((p[0] + q[0]) / 2, y, (p[1] + q[1]) / 2); return g; };
      ln.push(seg(a, b, 0.03)); for (const p of [a, b]) { const c = [p[0] + (ux + nx) * 0.12, p[1] + (uz + nz) * 0.12], d = [p[0] - (ux + nx) * 0.12, p[1] - (uz + nz) * 0.12]; tk.push(seg(d, c, 0.045)); if (off) tk.push(seg([p[0] - nx * off, p[1] - nz * off], p, 0.015)); }
      if (!t) return;
      const tx = textTex([{ t, s: 120, w: 800, c: '#0b6fd1' }], { w: 128 * Math.max(3, t.length), h: 170, y0: 10, bg: 'rgba(255,255,255,0.92)', r: 14 }); const w = txtW(t) * tsz / 0.34 * 1.4, h = tsz;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthTest: false })); m.renderOrder = 40;
      let ang = Math.atan2(dz, dx); if (ang > Math.PI / 2 + 0.01 || ang < -Math.PI / 2 - 0.01) ang += Math.PI; m.rotation.set(-Math.PI / 2, 0, -ang); m.position.set((a[0] + b[0]) / 2 + nx * 0.3, y + 0.01, (a[1] + b[1]) / 2 + nz * 0.3); D.add(m); };
    dim(0.6, 0.634, 0.6, 3.968, '3.33', 0); // acceso (entre caras exteriores de muros, como el PDF)
    dim(8.115, 6.75, 13.336, 6.75, '5.22'); dim(13.75, 3.886, 13.75, 6.387, '2.50');
    dim(17.105, 3.05, 21.925, 3.05, '4.82'); dim(16.85, 0.368, 16.85, 2.765, '2.40');
    dim(22.326, 5.75, 24.674, 5.75, '2.35'); dim(24.674, 5.75, 27.024, 5.75, '2.35'); dim(22.15, 0.311, 22.15, 5.01, '4.70'); dim(27.75, 0.41, 27.75, 5.41, '5.00');
    dim(23.457, 9.21, 27.26, 9.21, '3.80'); dim(24.8, 8.69, 24.8, 12.69, '8.50 (13.6 %)', 0, 0.3); dim(24.8, 12.69, 24.8, 17.19, '', 0);
    dim(24.388, 12.52, 27.025, 12.52, '2.64'); dim(24.8, 17.191, 24.8, 20.955, '3.76');
    dim(19.391, 12.35, 21.889, 12.35, '2.50'); dim(21.889, 12.35, 24.388, 12.35, '2.50'); dim(22.1, 12.692, 22.1, 17.191, '4.50');
    for (const [a, b] of [[17.121, 19.622], [19.622, 22.124], [22.124, 24.622], [24.622, 27.121]]) dim(a, 20.6, b, 20.6, '2.50'); dim(27.75, 20.955, 27.75, 25.452, '4.50');
    dim(16.68, 17.55, 19.39, 17.55, '2.71'); for (let i = 0; i < 4; i++) dim(19.75, MOTO_CELLS[i], 19.75, MOTO_CELLS[i + 1], i === 3 ? '1.14' : '1.12', 0, 0.26);
    dim(16.755, 9.5, 19.205, 9.5, '2.45', 0, 0.26); dim(16.4, 9.842, 16.4, 11.543, '1.70', 0, 0.26); dim(19.6, 7.032, 19.6, 9.694, '2.66', 0, 0.26); dim(21.1, 9.69, 21.1, 11.69, '2.00', 0, 0.26);
    D.add(new THREE.Mesh(mergeGeometries(ln), lineMat), new THREE.Mesh(mergeGeometries(tk), lineMat));
    D.children.forEach((c) => { if (!c.renderOrder) c.renderOrder = 39; c.material.depthTest = false; });
    return D; }
  function obbSegs(cx, cz, h, hl, hw) { const c = Math.cos(h), s = Math.sin(h); const P = [[hl, hw], [hl, -hw], [-hl, -hw], [-hl, hw]].map(([a, b]) => [cx + a * c + b * s, cz - a * s + b * c]); return P.map((p, i) => [p[0], p[1], P[(i + 1) % 4][0], P[(i + 1) % 4][1]]); }
  OUT.obbSegs = obbSegs;
  OUT.at = (x, z) => OUT.rooms.find((r) => inPoly(r.poly, x, z)) || null;
  return OUT;
}
