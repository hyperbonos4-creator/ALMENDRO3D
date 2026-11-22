// v8.1: carrocerías procedurales con secciones redondeadas (loft), pasos de rueda, habitáculo con caída lateral,
// pilares pintados, luces/rejilla/placas como parches que siguen la superficie. Geometría fusionada por material (afuera).
import * as THREE from 'three';

function mono(pts) { // interpolación cúbica monótona (Fritsch–Carlson) y(x)
  const n = pts.length, xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2]; for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
  return (x) => { if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1]; let i = 0; while (x > xs[i + 1]) i++; const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]; };
}
// malla de cuadrícula P[i][j] (i: estaciones, j: puntos de sección) con orientación hacia afuera por cuadro
function gridGeo(P, closed, C) {
  const ni = P.length, nj = P[0].length, pos = [], idx = []; for (const row of P) for (const p of row) pos.push(p.x, p.y, p.z);
  if (!C) { const cen = P.map((row) => { const c = new THREE.Vector3(); row.forEach((p) => c.add(p)); return c.multiplyScalar(1 / row.length); }); C = (x, i) => cen[i]; }
  const id = (i, j) => i * nj + (j % nj), A = new THREE.Vector3(), B = new THREE.Vector3(), N = new THREE.Vector3(), O = new THREE.Vector3();
  const jm = closed ? nj : nj - 1;
  for (let i = 0; i < ni - 1; i++) for (let j = 0; j < jm; j++) {
    const a = P[i][j], b = P[i + 1][j], c = P[i + 1][(j + 1) % nj], d = P[i][(j + 1) % nj];
    A.subVectors(c, a); B.subVectors(d, b); N.crossVectors(A, B); O.set((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2).sub(C((a.x + c.x) / 2, i));
    if (N.dot(O) >= 0) idx.push(id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j), id(i + 1, j + 1), id(i, j + 1)); else idx.push(id(i, j), id(i + 1, j + 1), id(i + 1, j), id(i, j), id(i, j + 1), id(i + 1, j + 1));
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// muestreo bilineal continuo de una cuadrícula: x real (por la lista de estaciones), j fraccional
function sampler(P, XS, closed) {
  const nj = P[0].length;
  const fi = (x) => { if (x <= XS[0]) return 0; if (x >= XS[XS.length - 1]) return XS.length - 1.0001; let i = 0; while (x > XS[i + 1]) i++; return i + (x - XS[i]) / (XS[i + 1] - XS[i]); };
  const at = (x, j) => { const f = Math.min(fi(x), XS.length - 1.0001), i = Math.floor(f), u = f - i; let jj = closed ? ((j % nj) + nj) % nj : Math.max(0, Math.min(nj - 1.0001, j)); const k = Math.floor(jj), v = jj - k, k2 = closed ? (k + 1) % nj : Math.min(nj - 1, k + 1);
    const p = new THREE.Vector3(); const q = (ii, kk, w) => p.addScaledVector(P[Math.min(ii, P.length - 1)][kk], w);
    q(i, k, (1 - u) * (1 - v)); q(i + 1, k, u * (1 - v)); q(i, k2, (1 - u) * v); q(i + 1, k2, u * v); return p; };
  return at;
}
// parche: superficie desplazada sobre la cuadrícula (x de xa→xb, j de ja→jb)
function patch(at, C, xa, xb, ja, jb, nx, nj, off) {
  const R = [], e = 1e-3;
  for (let a = 0; a <= nx; a++) { const x = xa + (xb - xa) * a / nx, row = [];
    for (let b = 0; b <= nj; b++) { const j = ja + (jb - ja) * b / nj, p = at(x, j);
      const dx = at(x + e, j).sub(at(x - e, j)), dj = at(x, j + 0.01).sub(at(x, j - 0.01)); const n = new THREE.Vector3().crossVectors(dx, dj); if (n.lengthSq() < 1e-14) n.subVectors(p, C(x)); n.normalize(); if (n.dot(new THREE.Vector3().subVectors(p, C(x))) < 0) n.negate();
      row.push(p.addScaledVector(n, off)); }
    R.push(row); }
  return gridGeo(R, false, C);
}
function ringRR(hw, top, bot, rt, rb, bulge) { // sección redondeada de 26 puntos (ver índices abajo)
  rt = Math.max(0.005, Math.min(rt, hw * 0.9, (top - bot) * 0.55)); rb = Math.max(0.004, Math.min(rb, hw * 0.5, (top - bot) * 0.3));
  const R = []; const half = [];
  for (const a of [-90, -60, -30, 0]) { const t = a * Math.PI / 180; half.push([hw - rb + rb * Math.cos(t), bot + rb + rb * Math.sin(t)]); }
  for (const f of [0.25, 0.5, 0.75]) { const y = bot + rb + (top - rt - bot - rb) * f; half.push([hw + bulge * Math.sin(Math.PI * f), y]); }
  for (const a of [0, 22.5, 45, 67.5, 90]) { const t = a * Math.PI / 180; half.push([hw - rt + rt * Math.cos(t), top - rt + rt * Math.sin(t)]); }
  R.push([0, bot]); for (const p of half) R.push(p); R.push([0, top]); for (let k = half.length - 1; k >= 0; k--) R.push([-half[k][0], half[k][1]]);
  return R; // 0 BC · 1-4 BR · 5-7 lado der · 8-12 TR · 13 TC · 14-18 TL · 19-21 lado izq · 22-25 BL
}
function ringGH(hwB, hwT, yb, h, crown) { // habitáculo: 21 puntos, abierto abajo (0 = abajo izq … 20 = abajo der)
  const rc = Math.max(0.004, Math.min(0.09, h * 0.45)), ys = yb + Math.max(0.001, h - rc), half = [];
  for (const f of [0, 0.25, 0.5, 0.75, 1]) half.push([hwB + (hwT - hwB) * f, yb + (ys - yb) * f]);
  for (const a of [22.5, 45, 67.5, 90]) { const t = a * Math.PI / 180; half.push([hwT - rc + rc * Math.cos(t), ys + rc * Math.sin(t)]); }
  half.push([(hwT - rc) * 0.5, yb + h + crown * 0.75]); half.push([0, yb + h + crown]);
  const R = []; for (let k = 0; k < half.length; k++) R.push([-half[k][0], half[k][1]]); for (let k = half.length - 2; k >= 0; k--) R.push([half[k][0], half[k][1]]);
  return R;
}
const TY = {
  sedan: { L: 4.55, W: 1.80, H: 1.45, wb: 2.70, r: 0.32, fo: 0.93, gc: 0.17, belt: 0.97, hood: 0.86, trunk: 1.0, nose: 0.62, tail: 0.74, ws: 0.80, roofL: 0.95, rw: 0.62, rear: 'notch' },
  hatch: { L: 4.26, W: 1.79, H: 1.47, wb: 2.63, r: 0.32, fo: 0.86, gc: 0.16, belt: 0.99, hood: 0.88, trunk: 1.0, nose: 0.64, tail: 0.90, ws: 0.86, roofL: 1.32, rw: 0.26, rear: 'hatch' },
  cuv: { L: 4.30, W: 1.80, H: 1.62, wb: 2.60, r: 0.34, fo: 0.86, gc: 0.21, belt: 1.06, hood: 0.98, trunk: 1.06, nose: 0.72, tail: 0.98, ws: 0.82, roofL: 1.55, rw: 0.30, rear: 'hatch' },
  suv: { L: 4.50, W: 1.86, H: 1.70, wb: 2.68, r: 0.37, fo: 0.90, gc: 0.24, belt: 1.12, hood: 1.04, trunk: 1.12, nose: 0.80, tail: 1.06, ws: 0.80, roofL: 1.95, rw: 0.20, rear: 'hatch' },
};
export const CAR_TYPES8 = TY;
// devuelve P {paint, glass, tyre, rim, trim, chrome, lightF, lightR, plate [, wheels]} usando add(k, geo, color)
export function buildCar8(type, add, opt, tools) {
  const T = TY[type] || TY.sedan; const { L, W, H, wb, r, fo, gc, belt, hood } = T; const x0 = -L / 2, x1 = L / 2, xf = x1 - fo, xr = xf - wb; const tall = type === 'suv' || type === 'cuv';
  const ra = r + 0.075; // radio del paso de rueda
  const xw = xf - (tall ? 0.50 : 0.62); const rf = xw - T.ws; let rb, xc; if (T.rear === 'notch') { rb = rf - T.roofL; xc = rb - T.rw; } else { xc = x0 + 0.10; rb = xc + T.rw; }
  const ymid = (gc + H) / 2; const C = (x) => new THREE.Vector3(Math.max(x0 + 0.9, Math.min(x1 - 0.9, x)), ymid * 0.7, 0);
  // ---- perfiles de la carrocería inferior
  const topP = T.rear === 'notch'
    ? [[x0, T.tail], [x0 + 0.16, T.trunk - 0.02], [x0 + 0.45, T.trunk], [xc, belt + 0.01], [xw, belt], [xw + 0.4, hood + 0.03], [x1 - 0.45, hood - 0.03], [x1 - 0.14, hood - 0.14], [x1, T.nose]]
    : [[x0, T.tail], [x0 + 0.08, belt - 0.01], [xc + 0.05, belt], [xw, belt], [xw + 0.4, hood + 0.03], [x1 - 0.45, hood - 0.03], [x1 - 0.14, hood - 0.14], [x1, T.nose]];
  const ytop = mono(topP);
  const ybot = (x) => { let y = gc; const dF = x1 - x, dR = x - x0; if (dF < 0.35) y = gc + 0.11 * Math.pow(1 - dF / 0.35, 2); if (dR < 0.3) y = gc + 0.09 * Math.pow(1 - dR / 0.3, 2);
    for (const xa of [xf, xr]) { const dx = Math.abs(x - xa); if (dx < ra) y = Math.max(y, r + Math.sqrt(ra * ra - dx * dx)); } return y; };
  const hwF = (x) => { const d = Math.min(x1 - x, x - x0), rp = 0.5; let hw = W / 2; if (d < rp) { const t = 1 - d / rp; hw -= 0.11 * (1 - Math.sqrt(Math.max(0, 1 - t * t))); } return hw; };
  // estaciones: uniforme + bordes de paso de rueda + cortes de puerta/manijas + anillos de cara frontal/trasera
  const XS0 = []; for (let x = x0; x <= x1 + 1e-6; x += 0.13) XS0.push(x); XS0.push(x1);
  for (const xa of [xf, xr]) { for (let k = 0; k <= 10; k++) XS0.push(xa + ra * Math.cos(Math.PI * k / 10)); XS0.push(xa - ra - 0.004, xa + ra + 0.004); }
  const xsF = xw - 0.06, xsB = (rf + rb) / 2 + (tall ? 0.05 : 0.0), xsR = Math.max(xr + ra + 0.05, xc + 0.1); [xsF, xsB, xsR].forEach((s) => XS0.push(s - 0.006, s, s + 0.006));
  const XSb = [...new Set(XS0.map((v) => Math.round(v * 2000) / 2000))].filter((v) => v >= x0 && v <= x1).sort((a, b) => a - b);
  const XS = []; for (const v of XSb) if (!XS.length || v - XS[XS.length - 1] > 0.0035) XS.push(v);
  const FR = [[0.012, 0.975], [0.026, 0.92], [0.038, 0.8], [0.046, 0.55], [0.05, 0.25], [0.052, 0.0]];
  const P = [], XL = [];
  const ringAt = (x) => { const top = ytop(x), bot = ybot(x); return ringRR(hwF(x), top, bot, tall ? 0.14 : 0.12, 0.06, 0.012).map(([z, y]) => new THREE.Vector3(x, y, z)); };
  { const base = ringAt(x0), yc = (ytop(x0) + ybot(x0)) / 2; for (let k = FR.length - 1; k >= 0; k--) { const [dx, s] = FR[k], x = x0 - dx; P.push(base.map((p) => new THREE.Vector3(x, yc + (p.y - yc) * s, p.z * s))); XL.push(x); } }
  for (const x of XS) { P.push(ringAt(x)); XL.push(x); }
  { const base = ringAt(x1), yc = (ytop(x1) + ybot(x1)) / 2; for (const [dx, s] of FR) { const x = x1 + dx; P.push(base.map((p) => new THREE.Vector3(x, yc + (p.y - yc) * s, p.z * s))); XL.push(x); } }
  add('paint', gridGeo(P, true, null));
  const atB = sampler(P, XL, true);
  // ---- habitáculo (vidrio) con caída lateral
  const roofP = T.rear === 'notch' ? [[xc, belt - 0.01], [xc + 0.25, belt + 0.16], [rb, H - 0.035], [(rb + rf) / 2, H], [rf, H - 0.035], [xw - 0.3, belt + 0.2], [xw, belt - 0.01]]
    : [[xc, belt - 0.01], [xc + 0.1, belt + 0.32], [rb, H - 0.03], [(rb + rf) / 2, H], [rf, H - 0.035], [xw - 0.3, belt + 0.2], [xw, belt - 0.01]];
  const yroof = mono(roofP);
  const hwB = W / 2 - (tall ? 0.15 : 0.13), hwT = W / 2 - (tall ? 0.27 : 0.30);
  const GX = []; for (let x = xc; x <= xw + 1e-6; x += 0.11) GX.push(x); GX.push(xw, rb, rf, xsB - 0.045, xsB + 0.045, xc + 0.003, xw - 0.003);
  const GXs = [...new Set(GX.map((v) => Math.round(v * 2000) / 2000))].filter((v) => v >= xc && v <= xw).sort((a, b) => a - b); const GXL = []; for (const v of GXs) if (!GXL.length || v - GXL[GXL.length - 1] > 0.003) GXL.push(v);
  const yb0 = belt - 0.012; const G = GXL.map((x) => { const h = Math.max(0.002, yroof(x) - yb0); const ends = Math.min(1, Math.min(x - xc, xw - x) / 0.25); return ringGH(hwB - 0.04 * (1 - ends), hwT, yb0, h, 0.025 * Math.min(1, h / 0.3)).map(([z, y]) => new THREE.Vector3(x, y, z)); });
  add('glass', gridGeo(G, false, null)); const atG = sampler(G, GXL, false);
  const pp = (k, xa, xb, ja, jb, nx, nj, off, c) => add(k, patch(k === 'glass' ? atG : atB, C, xa, xb, ja, jb, nx, nj, off), c);
  const pg = (k, xa, xb, ja, jb, nx, nj, off, c) => add(k, patch(atG, C, xa, xb, ja, jb, nx, nj, off), c);
  // techo y pilares (pintados): techo j 5..15 · A: estaciones rf→xw, j 4..6 / 14..16 · C/D: xc→rb(+) · B: negro
  pg('paint', rf - 0.02, rb + 0.02, 4.6, 15.4, 14, 10, 0.006);
  for (const [ja, jb] of [[3.4, 6.2], [13.8, 16.6]]) { pg('paint', rf - 0.03, xw - 0.02, ja, jb, 12, 3, 0.006); pg('paint', xc + 0.002, rb + (T.rear === 'notch' ? 0.30 : 0.16), T.rear === 'notch' ? (ja < 10 ? 0 : 14) : ja, T.rear === 'notch' ? (ja < 10 ? 6.2 : 20) : jb, 10, 6, 0.006); }
  if (T.rear !== 'notch') { pg('paint', xc + 0.001, xc + 0.085, 0, 20, 4, 20, 0.006); pg('lightR', xc + 0.085, xc + 0.095, 9.3, 10.7, 1, 2, 0.008); } // portón trasero pintado bajo la luneta + 3.ª luz de freno
  for (const [ja, jb] of [[0, 5.2], [14.8, 20]]) pg('trim', xsB - 0.04, xsB + 0.04, ja, jb, 2, 6, 0.007, 0x0c0d0f);
  // marco de ventanas (cromo fino a nivel de cintura) y canal del techo
  for (const s of [-1, 1]) add('chrome', tools.box(xw - xc - 0.25, 0.018, 0.012, (xw + xc) / 2 - 0.05, belt - 0.004, s * (hwB + 0.004)), 0x9a9ea3);
  // ---- sobre la carrocería: luces, rejilla, parachoques, faldones, cortes de puerta, manijas, placas
  const xF = x1 + 0.03, xR = x0 - 0.03; // dentro de los anillos de cara
  for (const [ja, jb] of [[7.0, 10.6], [15.4, 19.0]]) { pp('lightF', x1 - 0.24, xF, ja, jb, 8, 5, 0.004); pp('trim', x1 - 0.25, xF + 0.004, ja - 0.25, ja, 6, 1, 0.003, 0x15171a); }
  for (const [ja, jb] of [[7.2, 10.2], [15.8, 18.8]]) pp('lightR', xR, x0 + (T.rear === 'notch' ? 0.18 : 0.12), ja, jb, 8, 4, 0.004);
  pp('trim', x1 + 0.038, x1 + 0.049, 10.6, 15.4, 2, 8, 0.004, 0x101113); // rejilla superior entre faros
  pp('trim', x1 + 0.03, x1 + 0.047, 1.2, -1.2, 2, 6, 0.004, 0x0e0f10); // toma inferior
  pp('trim', x0 - 0.047, x0 - 0.03, 1.2, -1.2, 2, 6, 0.004, 0x0e0f10); // difusor trasero
  for (const [ja, jb] of [[2.6, 4.4], [21.6, 23.4]]) pp('trim', xr + ra + 0.02, xf - ra - 0.02, ja, jb, 6, 2, 0.003, 0x17191b); // faldones
  for (const xs of [xsF, xsB, xsR]) for (const [ja, jb] of [[4.6, 11.6], [14.4, 21.4]]) pp('trim', xs - 0.004, xs + 0.004, ja, jb, 1, 8, 0.0025, 0x0a0a0b);
  for (const xh of [xsB - 0.2, xsR - 0.22]) for (const j of [7.85, 18.15]) pp('chrome', xh - 0.07, xh + 0.07, j - 0.12, j + 0.12, 2, 1, 0.012, 0xb8bcc1);
  { const zc = 0, yF = (ytop(x1) + ybot(x1)) / 2 - 0.1, yRr = (ytop(x0) + ybot(x0)) / 2 - (T.rear === 'notch' ? 0.02 : 0.08);
    add('plate', tools.box(0.012, 0.11, 0.42, x1 + 0.049, yF, zc), 0xf5f1dc); add('trim', tools.box(0.006, 0.125, 0.44, x1 + 0.044, yF, zc), 0x111111);
    add('plate', tools.box(0.012, 0.11, 0.33, x0 - 0.049, yRr, zc), 0xf5f1dc); add('trim', tools.box(0.006, 0.125, 0.35, x0 - 0.044, yRr, zc), 0x111111); }
  // espejos (carcasa redondeada pintada + espejo)
  for (const s of [-1, 1]) { const mx = xw - 0.12, my = belt + 0.1, mz = s * (hwB + 0.13); const m = new THREE.SphereGeometry(1, 14, 10); m.scale(0.075, 0.06, 0.115); m.translate(mx, my, mz); add('paint', m);
    add('trim', tools.beam(new THREE.Vector3(mx + 0.02, my - 0.04, s * (hwB + 0.02)), new THREE.Vector3(mx, my - 0.02, mz), 0.03, 0.05), 0x111214);
    const gl = new THREE.CircleGeometry(1, 14); gl.scale(0.1, 0.05, 1); gl.rotateY(-Math.PI / 2); gl.translate(mx - 0.091, my, mz); add('glass', gl); }
  // antena / barras de techo
  if (tall) for (const s of [-1, 1]) add('trim', tools.box(T.roofL * 0.8, 0.03, 0.03, (rf + rb) / 2, H + 0.035, s * (hwT - 0.1)), 0x1b1c1e);
  else add('trim', tools.box(0.12, 0.04, 0.05, rb + 0.12, H + 0.01, 0), 0x111111);
  // ---- ruedas: llanta, rin de aleación de 5 radios dobles, disco de freno, paso de rueda oscuro
  const tw = tall ? 0.245 : 0.215, rr = r * 0.64; const wheels = [];
  const prof = [[rr, -tw / 2], [r - 0.045, -tw / 2], [r - 0.008, -tw / 2 + 0.03], [r, 0], [r - 0.008, tw / 2 - 0.03], [r - 0.045, tw / 2], [rr, tw / 2]].map(([a, b]) => new THREE.Vector2(a, b));
  for (const wx of [xf, xr]) for (const s of [-1, 1]) {
    const wz = s * (W / 2 - tw / 2 - 0.035);
    const WP = { tyre: [], rim: [], trim: [] }; const addW = (k, g, c) => { const q = tools.prep(g, c ?? 0xffffff); q.translate(-wx, -r, -wz); WP[k].push(q); };
    const addL = opt.wheels ? (k, g, c) => (k === 'tyre' || k === 'rim' || k === 'trimW' ? addW(k === 'trimW' ? 'trim' : k, g, c) : add(k, g, c)) : (k, g, c) => add(k === 'trimW' ? 'trim' : k, g, c);
    if (opt.wheels) wheels.push({ x: wx, y: r, z: wz, front: wx === xf, parts: WP });
    const fz = (o) => wz + s * o; // o>0: hacia afuera
    const ty = new THREE.LatheGeometry(prof, 22); ty.rotateX(Math.PI / 2); ty.translate(wx, r, wz); addL('tyre', ty);
    const dish = new THREE.LatheGeometry([[0.05, 0], [rr * 0.55, -0.012], [rr - 0.012, -0.03], [rr, -0.005], [rr + 0.006, 0.006]].map(([a, b]) => new THREE.Vector2(a, b)), 20); dish.rotateX(Math.PI / 2); if (s < 0) dish.scale(1, 1, -1); dish.translate(wx, r, fz(tw / 2 - 0.012)); addL('rim', dish);
    const bd = new THREE.CylinderGeometry(rr - 0.03, rr - 0.03, 0.02, 20); bd.rotateX(Math.PI / 2); bd.translate(wx, r, fz(tw / 2 - 0.06)); addL('trimW', bd, 0x2a2c2f);
    const cap = new THREE.CylinderGeometry(0.045, 0.05, 0.02, 14); cap.rotateX(Math.PI / 2); cap.translate(wx, r, fz(tw / 2 + 0.0)); addL('rim', cap);
    for (let k = 0; k < 10; k++) { const a = Math.floor(k / 2) * Math.PI * 2 / 5 + (k % 2 ? 0.16 : -0.16) + (wx > 0 ? 0.3 : 0);
      const sp = tools.beam(new THREE.Vector3(wx + Math.cos(a) * 0.05, r + Math.sin(a) * 0.05, 0), new THREE.Vector3(wx + Math.cos(a) * (rr - 0.008), r + Math.sin(a) * (rr - 0.008), 0), 0.028, 0.022); sp.translate(0, 0, fz(tw / 2 - 0.006 - 0.01 * (k % 2))); addL('rim', sp); }
    if (wz > 0 || true) { const well = new THREE.CylinderGeometry(ra - 0.006, ra - 0.006, W - 0.26, 10, 1, true, Math.PI - 1.3, 2.6); well.rotateX(Math.PI / 2); well.translate(wx, r, 0); add('trim', well, 0x070708); }
  }
  return { wheels, xw, xc, rf, rb };
}
