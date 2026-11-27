// v7: mobiliario y aparatos ILUSTRATIVOS procedurales (no especificados en planos).
// Cada pieza se modela en un marco local: x a lo largo del muro, y arriba, z desde el muro (z=0) hacia el recinto.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export function buildFur7({ I, T, R, pipRing, T8, skin = [] }) {
  const std = (o) => new THREE.MeshStandardMaterial(o), phy = (o) => new THREE.MeshPhysicalMaterial(o);
  const fabT = T.fabric;
  const M = {
    cer: phy({ color: 0xf7f7f4, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.06, side: THREE.DoubleSide }),
    seat: phy({ color: 0xfbfbf9, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.1 }),
    chrome: std({ color: 0xf4f6f8, metalness: 1, roughness: 0.07 }),
    steel: std({ color: 0xc9ccd0, metalness: 0.9, roughness: 0.3 }),
    blackM: std({ color: 0x1e1f21, metalness: 0.55, roughness: 0.42 }),
    mirror: std({ color: 0xeef3f6, metalness: 1, roughness: 0.02 }),
    lacW: std({ color: 0xf1efea, roughness: 0.34 }),
    lacG: std({ color: 0x3a3c3f, roughness: 0.42 }),
    oak: std({ map: T.woodL, color: 0xffffff, roughness: 0.55 }),
    walnut: std({ map: T.wood, color: 0xd9c4b0, roughness: 0.5 }),
    quartz: std({ map: T.gran, color: 0xffffff, roughness: 0.16, metalness: 0.05 }),
    bglass: std({ color: 0x0a0b0d, metalness: 0.25, roughness: 0.05 }),
    sofa: std({ map: fabT, color: 0x8b8781, roughness: 0.96 }),
    beige: std({ map: fabT, color: 0xc9bba3, roughness: 0.95 }),
    linen: std({ map: fabT, color: 0xf4f2ed, roughness: 0.9 }),
    duvet: std({ map: fabT, color: 0xe6e1d6, roughness: 0.93 }),
    throwB: std({ map: fabT, color: 0x4d667a, roughness: 0.95 }),
    accent: std({ map: fabT, color: 0xb5774b, roughness: 0.95 }),
    rug: std({ map: fabT, color: 0xb7ab98, roughness: 1 }),
    tray: std({ color: 0xeeede9, roughness: 0.32 }),
    water: std({ color: 0xa9c6d1, metalness: 0.1, roughness: 0.02 }),
    shade: std({ color: 0xf4ecdd, emissive: 0xffe2b8, emissiveIntensity: 0.55, roughness: 0.9, side: THREE.DoubleSide }),
    led: new THREE.MeshBasicMaterial({ color: 0xfff4e2 }),
    tileAcc: std({ map: T.tileAcc, roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    leaf: std({ color: 0x5f7d4f, roughness: 0.8, side: THREE.DoubleSide }),
    pot: std({ color: 0xd8d2c8, roughness: 0.7 }),
    // v8: paleta de los renders interiores (ref_06…ref_09)
    lwood: std({ map: T8.lwood, color: 0xffffff, roughness: 0.5 }),
    bedG: std({ map: fabT, color: 0xc4c3c0, roughness: 0.95 }),
    cream: std({ map: fabT, color: 0xebe6dc, roughness: 0.92 }),
    armG: std({ map: fabT, color: 0x9b9995, roughness: 0.95 }),
    rose: std({ color: 0xc38c7c, roughness: 0.45 }),
  };
  M.sofa.color.set(0x8e8d8a); M.accent.color.set(0xc3d4e2); M.throwB.color.set(0x9fb3c4); M.duvet.color.set(0xefeeeb); M.rug.color.set(0xd2cfc8);
  M.quartz.map = T8.quartz; M.quartz.roughness = 0.2;
  // vidrio templado de la ducha: transmisión física en Alta; translúcido estándar en Media/Baja
  const GLASS_HI = phy({ color: 0xffffff, transmission: 1, roughness: 0.03, thickness: 0.008, ior: 1.5, metalness: 0, attenuationColor: new THREE.Color(0xd8ece6), attenuationDistance: 0.6, side: THREE.DoubleSide });
  const GLASS_LO = std({ color: 0xd6e7ec, metalness: 0.15, roughness: 0.04, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
  M.glass = GLASS_LO;
  M.tileAcc.map.wrapS = M.tileAcc.map.wrapT = THREE.RepeatWrapping;

  const G = {}; // clave material|detalle → geometrías
  const coll = [];
  const push = (key, geo, mat, detail) => { let g = geo.index ? geo.toNonIndexed() : geo; for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(mat); const k = key + (detail ? '|d' : ''); (G[k] = G[k] || []).push(g); };
  // marco local → mundo
  class F {
    constructor(ox, oz, nx, nz) { this.m = new THREE.Matrix4().makeRotationY(Math.atan2(nx, nz)).premultiply(new THREE.Matrix4().makeTranslation(ox, 0, oz)); this.ox = ox; this.oz = oz; this.nx = nx; this.nz = nz; }
    w(x, z) { return [this.ox + x * this.nz + z * this.nx, this.oz - x * this.nx + z * this.nz]; } // local→mundo (xz)
    put(key, g, d, lm) { push(key, g, lm ? this.m.clone().multiply(lm) : this.m, d); return this; }
    // caja por límites locales con UV a escala real (≈0.6 m por repetición)
    bx(key, x0, x1, y0, y1, z0, z1, d) { const w = x1 - x0, h = y1 - y0, dp = z1 - z0; if (w <= 0 || h <= 0 || dp <= 0) return this; const g = new THREE.BoxGeometry(w, h, dp); const uv = g.attributes.uv; const dims = [[dp, h], [dp, h], [w, dp], [w, dp], [w, h], [w, h]];
      for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / 0.6, uv.getY(i) * dims[f][1] / 0.6); }
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return this.put(key, g, d); }
    rb(key, x0, x1, y0, y1, z0, z1, r, d, seg = 2) { const w = x1 - x0, h = y1 - y0, dp = z1 - z0; if (w <= 0 || h <= 0 || dp <= 0) return this; const g = new RoundedBoxGeometry(w, h, dp, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, dp / 2 - 1e-3)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return this.put(key, g, d); }
    cy(key, rt, rb, h, x, y0, z, seg = 24, d, open = false) { const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open); g.translate(x, y0 + h / 2, z); return this.put(key, g, d); }
    // tubo entre dos puntos locales
    tube(key, a, b, r, d, seg = 12) { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const L = A.distanceTo(B); const g = new THREE.CylinderGeometry(r, r, L, seg); g.translate(0, L / 2, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); g.applyQuaternion(q); g.translate(A.x, A.y, A.z); return this.put(key, g, d); }
    geo(key, g, d, lm) { return this.put(key, g, d, lm); }
  }
  const T4 = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
  const S4 = (x, y, z) => new THREE.Matrix4().makeScale(x, y, z);
  const RX = (a) => new THREE.Matrix4().makeRotationX(a), RY = (a) => new THREE.Matrix4().makeRotationY(a);
  const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

  // ---------- utilidades de planta ----------
  const faces = I.faces;
  // longitud de muro (caras) que corre pegada a un lado de un rectángulo, con la normal mirando hacia el rectángulo
  function wallOn(b, side, tol = 0.09) {
    const [x0, z0, x1, z1] = b; let L = 0;
    for (const [fx0, fz0, fx1, fz1, nx, nz] of faces) {
      if (side === 'x0' || side === 'x1') { if (Math.abs(fx0 - fx1) > 0.01) continue; const X = side === 'x0' ? x0 : x1; if (Math.abs(fx0 - X) > tol || (side === 'x0' ? nx < 0.5 : nx > -0.5)) continue; L += Math.max(0, Math.min(z1, Math.max(fz0, fz1)) - Math.max(z0, Math.min(fz0, fz1))); }
      else { if (Math.abs(fz0 - fz1) > 0.01) continue; const Z = side === 'z0' ? z0 : z1; if (Math.abs(fz0 - Z) > tol || (side === 'z0' ? nz < 0.5 : nz > -0.5)) continue; L += Math.max(0, Math.min(x1, Math.max(fx0, fx1)) - Math.max(x0, Math.min(fx0, fx1))); }
    }
    return L;
  }
  const sideLen = (b, s) => (s === 'x0' || s === 'x1') ? b[3] - b[1] : b[2] - b[0];
  const NRM = { x0: [1, 0], x1: [-1, 0], z0: [0, 1], z1: [0, -1] };
  // marco desde un rectángulo y el lado pegado al muro → {F, w, d}
  function frameOf(b, side) { const [x0, z0, x1, z1] = b; const [nx, nz] = NRM[side]; const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const o = side === 'x0' ? [x0, cz] : side === 'x1' ? [x1, cz] : side === 'z0' ? [cx, z0] : [cx, z1];
    return { f: new F(o[0], o[1], nx, nz), w: sideLen(b, side), d: (side[0] === 'x') ? x1 - x0 : z1 - z0 }; }
  const bestWall = (b, prefLong = true) => { let best = null, bl = -1; const lng = Math.max(b[2] - b[0], b[3] - b[1]); for (const s of ['x0', 'x1', 'z0', 'z1']) { if (prefLong && sideLen(b, s) < lng - 1e-3) continue; const L = wallOn(b, s) / sideLen(b, s) + (prefLong && sideLen(b, s) >= Math.max(b[2] - b[0], b[3] - b[1]) - 1e-3 ? 0.3 : 0); if (L > bl) { bl = L; best = s; } } return best; };
  const roomOf = (x, z) => I.rooms.find((r) => pipRing(r.o, x, z) && !(r.h || []).some((h) => pipRing(h, x, z)));
  const inRoom = (r, x, z) => pipRing(r.o, x, z) && !(r.h || []).some((h) => pipRing(h, x, z));
  const rectIn = (r, b, e = 0.01) => [[b[0] + e, b[1] + e], [b[2] - e, b[1] + e], [b[2] - e, b[3] - e], [b[0] + e, b[3] - e], [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]].every(([x, z]) => inRoom(r, x, z));
  const ovl = (a, b, e = 0) => a[0] < b[2] + e && a[2] > b[0] - e && a[1] < b[3] + e && a[3] > b[1] - e;
  const doorZones = (rid, e = 0.75) => I.doors.filter((d) => d.ra === rid || d.rb === rid).map((d) => { const xs = [d.h[0], d.c[0]], zs = [d.h[1], d.c[1]]; return [Math.min(...xs) - (Math.abs(d.n[0]) > 0.5 ? e : 0.05), Math.min(...zs) - (Math.abs(d.n[1]) > 0.5 ? e : 0.05), Math.max(...xs) + (Math.abs(d.n[0]) > 0.5 ? e : 0.05), Math.max(...zs) + (Math.abs(d.n[1]) > 0.5 ? e : 0.05)]; });
  const winZones = (hiOk = false) => I.wins.filter((w) => !hiOk || w.sill < 1.5).map((w) => [w.x0 - 0.05, w.z0 - 0.05, w.x1 + 0.05, w.z1 + 0.05]);
  // rayo 2D contra caras de muro (para ubicar TV frente al sofá)
  function rayWall(px, pz, dx, dz, maxT = 6) { let best = null; for (const [x0, z0, x1, z1, nx, nz] of faces) { if (nx * dx + nz * dz > -0.7) continue; const ex = x1 - x0, ez = z1 - z0; const den = dx * ez - dz * ex; if (Math.abs(den) < 1e-9) continue;
      const t = ((x0 - px) * ez - (z0 - pz) * ex) / den, u = ((x0 - px) * dz - (z0 - pz) * dx) / den; if (t > 0.05 && t < maxT && u >= 0 && u <= 1 && (!best || t < best.t)) best = { t, f: [x0, z0, x1, z1, nx, nz] }; } return best; }

  // v10.1: lado de respaldo de un aparato del plano: un lado pegado a muro (≤0.25 m) cuyo frente opuesto tenga más espacio libre
  // (cuenta muros y otros muebles); así la lavadora y la nevera miran hacia el espacio de uso y no contra el muro o el lavadero.
  // rayo 2D contra caras de muro (cualquier sentido) y la fachada (skin); para aparatos pegados a la fachada
  const wallSegs = [...faces.map((f) => [f[0], f[1], f[2], f[3]]), ...skin.map((p) => [p.a[0], p.a[1], p.b[0], p.b[1]])];
  function ray2(px, pz, dx, dz, maxT = 8) { let best = maxT; for (const [x0, z0, x1, z1] of wallSegs) { const ex = x1 - x0, ez = z1 - z0; const den = dx * ez - dz * ex; if (Math.abs(den) < 1e-9) continue;
      const t = ((x0 - px) * ez - (z0 - pz) * ex) / den, u = ((x0 - px) * dz - (z0 - pz) * dx) / den; if (t > 0 && t < best && u >= -1e-6 && u <= 1 + 1e-6) best = t; } return best; }
  function backSide(b) {
    const others = [...(I.fur || []), ...(I.bath || [])].map((q) => q.b).filter((q) => !(q[0] === b[0] && q[1] === b[1] && q[2] === b[2] && q[3] === b[3]));
    const cx = (b[0] + b[2]) / 2, cz = (b[1] + b[3]) / 2;
    const out = { x0: [-1, 0, b[0], cz], x1: [1, 0, b[2], cz], z0: [0, -1, cx, b[1]], z1: [0, 1, cx, b[3]] };
    const clear = (s) => { const [dx, dz, px, pz] = out[s]; let t = ray2(px - dx * 0.04, pz - dz * 0.04, dx, dz) - 0.04;
      for (const q of others) { if (dx) { if (cz < q[1] || cz > q[3]) continue; const e = dx > 0 ? q[0] - px : px - q[2]; if (e > -0.02 && e < t) t = Math.max(0, e); } else { if (cx < q[0] || cx > q[2]) continue; const e = dz > 0 ? q[1] - pz : pz - q[3]; if (e > -0.02 && e < t) t = Math.max(0, e); } }
      return t; };
    const opp = { x0: 'x1', x1: 'x0', z0: 'z1', z1: 'z0' };
    const cand = Object.keys(out).filter((s) => { const [dx, dz, px, pz] = out[s]; return ray2(px - dx * 0.04, pz - dz * 0.04, dx, dz, 1) - 0.04 <= 0.25; });
    if (!cand.length) return bestWall(b, false);
    return cand.sort((p, q) => clear(opp[q]) - clear(opp[p]))[0];
  }

  // ====================== BAÑOS ======================
  const bathItems = I.bath || [];
  for (const b of bathItems.filter((q) => q.k === 'sanitario')) {
    const [ux, uz] = b.dir; const ax = Math.abs(ux) > Math.abs(uz); const n = ax ? [Math.sign(ux), 0] : [0, Math.sign(uz)];
    const [bx0, bz0, bx1, bz1] = b.b, [tx0, tz0, tx1, tz1] = b.tank;
    const ox = ax ? (n[0] > 0 ? bx0 : bx1) : (tx0 + tx1) / 2, oz = ax ? (tz0 + tz1) / 2 : (n[1] > 0 ? bz0 : bz1);
    const depth = ax ? bx1 - bx0 : bz1 - bz0; const s = Math.max(0.86, Math.min(1, (depth + 0.1) / 0.66));
    const f = new F(ox, oz, n[0], n[1]); const Z = (z) => z * s;
    // cuerpo (faldón) elíptico + unión al tanque
    f.geo('cer', new THREE.CylinderGeometry(0.15, 0.165, 0.36, 40), false, T4(0, 0.18, Z(0.42)).multiply(S4(1, 1, 1.42 * s)));
    f.rb('cer', -0.15, 0.15, 0, 0.37, Z(0.17), Z(0.42), 0.03);
    // taza (perfil torneado) y agua
    f.geo('cer', lathe([[0.16, 0.355], [0.18, 0.385], [0.188, 0.402], [0.176, 0.412], [0.158, 0.408], [0.13, 0.385], [0.095, 0.34], [0.06, 0.305], [0.0, 0.295]], 36), false, T4(0, 0, Z(0.43)).multiply(S4(1, 1, 1.3 * s)));
    f.geo('water', new THREE.CircleGeometry(0.075, 28).rotateX(-Math.PI / 2), true, T4(0, 0.31, Z(0.45)).multiply(S4(1, 1, 1.25 * s)));
    // asiento (aro) y tapa levantada
    f.geo('seat', new THREE.TorusGeometry(0.148, 0.021, 8, 36).rotateX(Math.PI / 2), false, T4(0, 0.423, Z(0.44)).multiply(S4(1, 0.55, 1.3 * s)));
    f.geo('seat', new THREE.CylinderGeometry(0.168, 0.168, 0.018, 40), false, T4(0, 0.635, Z(0.222)).multiply(RX(Math.PI / 2 - 0.13)).multiply(S4(1, 1, 1.28)));
    f.cy('chrome', 0.012, 0.012, 0.03, -0.09, 0.415, Z(0.23), 12, true).cy('chrome', 0.012, 0.012, 0.03, 0.09, 0.415, Z(0.23), 12, true);
    // tanque, tapa del tanque y pulsador
    f.rb('cer', -0.19, 0.19, 0.37, 0.78, 0.012, 0.205, 0.035);
    f.rb('cer', -0.2, 0.2, 0.775, 0.805, 0.006, 0.212, 0.012);
    f.cy('chrome', 0.026, 0.026, 0.01, 0, 0.805, 0.11, 24, true);
    f.cy('chrome', 0.01, 0.01, 0.07, 0.13, 0.12, 0.03, 10, true); // llave de paso
    coll.push(ax ? [Math.min(bx0, bx1) + 0.04, bz0 + 0.02, Math.max(bx0, bx1) - 0.04, bz1 - 0.02] : [bx0 + 0.02, bz0 + 0.04, bx1 - 0.02, bz1 - 0.04]);
  }
  const showers = bathItems.filter((q) => q.k === 'ducha');
  for (const sh of showers) {
    const b = sh.b; const [x0, z0, x1, z1] = b; const r = R.get(sh.room);
    // bandeja con sifón
    const fz = new F((x0 + x1) / 2, (z0 + z1) / 2, 0, 1);
    const w = x1 - x0, d = z1 - z0;
    fz.rb('tray', -w / 2 + 0.005, w / 2 - 0.005, 0.0, 0.045, -d / 2 + 0.005, d / 2 - 0.005, 0.01);
    fz.cy('chrome', 0.045, 0.045, 0.004, 0, 0.045, 0, 28, false).cy('blackM', 0.03, 0.03, 0.003, 0, 0.047, 0, 20, true);
    // lados con muro / abiertos
    // lado abierto = justo afuera del lado sigue siendo el mismo baño; si no, hay muro/fachada
    const outP = (sd) => { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, e = 0.14; return sd === 'x0' ? [x0 - e, cz] : sd === 'x1' ? [x1 + e, cz] : sd === 'z0' ? [cx, z0 - e] : [cx, z1 + e]; };
    const sides = ['x0', 'x1', 'z0', 'z1'].map((s) => ({ s, wall: !(r && inRoom(r, ...outP(s))), L: sideLen(b, s) }));
    const open = sides.filter((q) => !q.wall).sort((a, c) => c.L - a.L), walls = sides.filter((q) => q.wall);
    open.forEach((o, i) => { const fr = frameOf(b, o.s); const f = fr.f; const L = fr.w, D = fr.d; // marco con z=0 en el lado abierto, hacia adentro de la ducha
      const zz = 0.02; // vidrio 8 mm ligeramente dentro de la bandeja
      const doorGap = i === 0 ? Math.min(0.6, L * 0.42) : 0; const gx0 = -L / 2 + 0.015, gx1 = L / 2 - 0.015 - doorGap;
      // el vano (puerta) va en el extremo que NO toca un muro lateral de la ducha
      const pe = f.w(L / 2, D / 2); const plusSide = Math.abs(pe[0] - x0) < 1e-3 ? 'x0' : Math.abs(pe[0] - x1) < 1e-3 ? 'x1' : Math.abs(pe[1] - z0) < 1e-3 ? 'z0' : 'z1';
      const endWallPlus = walls.some((q) => q.s === plusSide);
      const flip = doorGap > 0 && endWallPlus; const a0 = flip ? -gx1 : gx0, a1 = flip ? -gx0 : gx1;
      f.bx('glass', a0, a1, 0.05, 2.0, zz - 0.004, zz + 0.004, false);
      // perfiles cromados: zócalo, perfil de muro y barra estabilizadora
      f.bx('chrome', a0, a1, 0.045, 0.06, zz - 0.009, zz + 0.009, false);
      const wallEnd = flip ? a1 : a0, freeEnd = flip ? a0 : a1;
      if (doorGap > 0 || open.length === 1) f.bx('chrome', wallEnd - (flip ? 0 : 0.012), wallEnd + (flip ? 0.012 : 0), 0.045, 2.0, zz - 0.012, zz + 0.012, false);
      if (doorGap > 0) { f.tube('chrome', [freeEnd, 1.96, zz], [freeEnd, 1.96, D - 0.005], 0.009, true); f.cy('chrome', 0.022, 0.022, 0.012, freeEnd, 1.955, zz, 16, true);
        f.bx('chrome', freeEnd - (flip ? 0 : 0.01), freeEnd + (flip ? 0.01 : 0), 0.05, 2.0, zz - 0.006, zz + 0.006, true); }
      const p0 = f.w(a0, zz), p1 = f.w(a1, zz); coll.push([Math.min(p0[0], p1[0]) - 0.02, Math.min(p0[1], p1[1]) - 0.02, Math.max(p0[0], p1[0]) + 0.02, Math.max(p0[1], p1[1]) + 0.02]);
    });
    // enchape de acento en los muros de la ducha
    for (const q of walls) { const fr = frameOf(b, q.s); fr.f.bx('tileAcc', -fr.w / 2 + 0.001, fr.w / 2 - 0.001, 0.045, 2.1, 0.0005, 0.003, false); }
    // grifería: columna termostática con regadera tipo lluvia + mezclador en el muro del fondo
    const back = walls.find((q) => open[0] && q.s[0] === open[0].s[0] && q.s !== open[0].s) || walls.sort((a, c) => c.L - a.L)[0];
    if (back) { const fr = frameOf(b, back.s); const f = fr.f; const D = fr.d;
      f.rb('chrome', -0.07, 0.07, 1.0, 1.12, 0.003, 0.05, 0.02, true); // cuerpo mezclador
      f.tube('chrome', [-0.03, 1.06, 0.05], [-0.03, 1.06, 0.085], 0.009, true).cy('chrome', 0.022, 0.022, 0.03, 0.035, 1.045, 0.065, 20, true);
      f.tube('chrome', [0, 1.12, 0.03], [0, 2.02, 0.03], 0.012, true, 16); // columna
      f.tube('chrome', [0, 2.02, 0.03], [0, 2.02, Math.min(0.36, D * 0.55)], 0.011, true, 16); // brazo
      f.cy('chrome', 0.115, 0.115, 0.014, 0, 1.995, Math.min(0.36, D * 0.55), 40, true); // regadera
      f.cy('blackM', 0.1, 0.1, 0.002, 0, 1.993, Math.min(0.36, D * 0.55), 40, true);
      f.tube('chrome', [0.1, 1.15, 0.03], [0.1, 1.42, 0.055], 0.014, true); // ducha de mano
      f.bx('chrome', 0.07, 0.13, 1.42, 1.44, 0.01, 0.06, true);
      // nicho / repisa con frascos
      f.bx('tileAcc', 0.2, 0.42, 1.2, 1.215, 0.003, 0.11, false); }
    void r;
  }
  // lavamanos: se ubican automáticamente en cada baño (los bloques del plano quedaron dentro de muros)
  const baths = I.rooms.filter((r) => r.type === 'bano'); const sinks = [];
  for (const r of baths) {
    let best = null;
    for (const [tm, de, Ws, D, hiOk] of [[0.12, 0.75, [0.6, 0.5], 0.46], [0.06, 0.45, [0.5, 0.45], 0.42], [0.03, 0.3, [0.45, 0.4, 0.36], 0.36, true]]) {
    const obs = [...bathItems.filter((q) => q.room === r.id).map((q) => q.k === 'ducha' ? [q.b[0] - 0.04, q.b[1] - 0.04, q.b[2] + 0.04, q.b[3] + 0.04] : [q.b[0] - tm, q.b[1] - tm, q.b[2] + tm, q.b[3] + tm]), ...doorZones(r.id, de), ...winZones(hiOk)];
    for (const W of Ws) {
      for (let i = 0; i < r.o.length; i++) { const a = r.o[i], c = r.o[(i + 1) % r.o.length]; const vert = Math.abs(a[0] - c[0]) < 0.01, hor = Math.abs(a[1] - c[1]) < 0.01; if (!vert && !hor) continue; const L = vert ? Math.abs(c[1] - a[1]) : Math.abs(c[0] - a[0]); if (L < W + 0.04) continue;
        const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2]; let n = vert ? [1, 0] : [0, 1]; if (!inRoom(r, mid[0] + n[0] * 0.1, mid[1] + n[1] * 0.1)) n = [-n[0], -n[1]];
        for (let t = W / 2 + 0.02; t <= L - W / 2 - 0.02 + 1e-6; t += 0.05) { const p = vert ? [a[0], Math.min(a[1], c[1]) + t] : [Math.min(a[0], c[0]) + t, a[1]];
          const bb = n[0] ? [Math.min(p[0], p[0] + n[0] * D), p[1] - W / 2, Math.max(p[0], p[0] + n[0] * D), p[1] + W / 2] : [p[0] - W / 2, Math.min(p[1], p[1] + n[1] * D), p[0] + W / 2, Math.max(p[1], p[1] + n[1] * D)];
          if (!rectIn(r, bb, 0.012) || obs.some((o) => ovl(bb, o))) continue;
          const clr = Math.min(...obs.map((o) => Math.max(0, Math.max(o[0] - bb[2], bb[0] - o[2], o[1] - bb[3], bb[1] - o[3]))), 1); const sc = W * 2 + clr - Math.abs(t - L / 2) * 0.05;
          if (!best || sc > best.sc) best = { sc, p, n, W, D, noMirror: !!hiOk && winZones().some((o) => ovl(bb, o, 0.02)) }; } } if (best) break; }
    if (best) break; }
    if (!best) { sinks.push({ room: r.id, none: true }); continue; }
    sinks.push({ room: r.id, p: best.p, n: best.n, W: best.W });
    const { p, n, W, D, noMirror } = best; const f = new F(p[0], p[1], n[0], n[1]);
    // mueble flotante en nogal con cajón, mesón y lavamanos sobreponer
    f.bx('walnut', -W / 2, W / 2, 0.38, 0.82, 0.0, D - 0.01, false);
    f.bx('blackM', -W / 2 + 0.01, W / 2 - 0.01, 0.6, 0.604, D - 0.012, D - 0.006, true); // dilatación cajón
    f.bx('chrome', -0.12, 0.12, 0.735, 0.748, D - 0.01, D + 0.012, true); // tirador
    f.bx('quartz', -W / 2 - 0.005, W / 2 + 0.005, 0.82, 0.85, 0.0, D + 0.01, false);
    f.geo('cer', lathe([[0.0, 0.852], [0.15, 0.856], [0.19, 0.88], [0.2, 0.965], [0.193, 0.968], [0.183, 0.905], [0.15, 0.875], [0.0, 0.868]], 36), false, T4(0, 0, D * 0.56).multiply(S4(Math.min(1, (W - 0.12) / 0.4), 1, 0.85)));
    f.cy('chrome', 0.018, 0.018, 0.004, 0, 0.869, D * 0.56, 16, true); // desagüe
    f.cy('chrome', 0.022, 0.026, 0.03, 0, 0.85, 0.07, 24, true).tube('chrome', [0, 0.85, 0.07], [0, 1.08, 0.07], 0.014, true, 16).tube('chrome', [0, 1.075, 0.07], [0, 1.075, 0.2], 0.012, true, 16);
    f.tube('chrome', [0, 1.08, 0.07], [0, 1.1, 0.03], 0.008, true); // palanca
    // espejo con retroiluminación LED
    if (!noMirror) { f.bx('blackM', -W / 2 + 0.02, W / 2 - 0.02, 1.08, 1.88, 0.0, 0.012, false);
    f.bx('led', -W / 2 + 0.025, W / 2 - 0.025, 1.085, 1.875, 0.012, 0.0135, false);
    f.bx('mirror', -W / 2 + 0.04, W / 2 - 0.04, 1.1, 1.86, 0.012, 0.018, false); }
    const pa = f.w(-W / 2, 0), pb = f.w(W / 2, D); coll.push([Math.min(pa[0], pb[0]) + 0.02, Math.min(pa[1], pb[1]) + 0.02, Math.max(pa[0], pb[0]) - 0.02, Math.max(pa[1], pb[1]) - 0.02]);
    // toallero
    const tw = new F(p[0], p[1], n[0], n[1]); void tw;
  }

  // ====================== MOBILIARIO DESDE EL PLANO ======================
  const list = I.fur.slice();
  const sofas = list.filter((f) => f.k === 'sofa');
  const ovr = (a, b) => { const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])), iz = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1])); return ix * iz / ((a[2] - a[0]) * (a[3] - a[1])); };
  const inAnyRoom = (b) => !!roomOf((b[0] + b[2]) / 2, (b[1] + b[3]) / 2);
  const chairs = list.filter((f) => (f.k === 'sillon' || f.k === 'silla') && inAnyRoom(f.b) && !sofas.some((s) => ovr(f.b, s.b) > 0.4) && (f.b[2] - f.b[0]) < 0.75);
  const armchairs = list.filter((f) => f.k === 'sillon' && inAnyRoom(f.b) && !chairs.includes(f) && !sofas.some((s) => ovr(f.b, s.b) > 0.2));
  const tables = list.filter((f) => f.k === 'mesa_comedor').map((f) => ({ x: (f.b[0] + f.b[2]) / 2, z: (f.b[1] + f.b[3]) / 2, b: f.b }));
  const used = new Set();
  for (const c of chairs) { if (used.has(c)) continue; const cx = (c.b[0] + c.b[2]) / 2, cz = (c.b[1] + c.b[3]) / 2; if (tables.some((t) => Math.hypot(t.x - cx, t.z - cz) < 1.3)) continue;
    const grp = chairs.filter((d) => Math.hypot((d.b[0] + d.b[2]) / 2 - cx, (d.b[1] + d.b[3]) / 2 - cz) < 1.6); if (grp.length < 3) continue; grp.forEach((d) => used.add(d));
    tables.push({ x: grp.reduce((s, d) => s + (d.b[0] + d.b[2]) / 2, 0) / grp.length, z: grp.reduce((s, d) => s + (d.b[1] + d.b[3]) / 2, 0) / grp.length, round: true }); }
  const occupied = list.filter((f) => !['sillon', 'silla'].includes(f.k) || chairs.includes(f)).map((f) => f.b);
  const kitchenRuns = [];
  for (const it of list) {
    const k = it.k; const b = it.b;
    if (k === 'cama') {
      const { f, w, d } = frameOf(b, it.wall); const W = w - 0.04, L = d - 0.03;
      f.rb('bedG', -W / 2 - 0.02, W / 2 + 0.02, 0.0, 1.12, 0.0, 0.09, 0.03); // cabecero tapizado
      for (let i = 0; i < 4; i++) { const x = -W / 2 + 0.04 + i * (W - 0.08) / 3; f.bx('lacG', x - 0.003, x + 0.003, 0.3, 1.08, 0.09, 0.092, true); }
      f.rb('bedG', -W / 2, W / 2, 0.08, 0.32, 0.09, L, 0.025); // base
      for (const [x, z] of [[-W / 2 + 0.06, 0.15], [W / 2 - 0.06, 0.15], [-W / 2 + 0.06, L - 0.06], [W / 2 - 0.06, L - 0.06]]) f.cy('walnut', 0.025, 0.02, 0.08, x, 0, z, 12, true);
      f.rb('linen', -W / 2 + 0.02, W / 2 - 0.02, 0.32, 0.54, 0.1, L - 0.01, 0.05); // colchón
      const dz0 = 0.1 + (L - 0.1) * 0.3; f.rb('duvet', -W / 2 - 0.015, W / 2 + 0.015, 0.4, 0.585, dz0, L + 0.015, 0.04); // edredón
      f.rb('throwB', -W / 2 - 0.02, W / 2 + 0.02, 0.43, 0.6, L - 0.42, L - 0.12, 0.03); // pie de cama
      const np = W > 1.2 ? 2 : 1; for (let i = 0; i < np; i++) { const xa = -W / 2 + 0.05 + i * (W - 0.1) / np, xb = xa + (W - 0.1) / np - 0.04;
        f.geo('linen', new RoundedBoxGeometry(xb - xa, 0.13, 0.36, 2, 0.06), false, T4((xa + xb) / 2, 0.62, 0.3).multiply(RX(-0.28))); }
      f.geo('accent', new RoundedBoxGeometry(Math.min(0.42, W * 0.4), 0.11, 0.3, 2, 0.05), true, T4(0, 0.62, 0.52).multiply(RX(-0.45)));
      const pa = f.w(-W / 2, 0), pb = f.w(W / 2, L); coll.push([Math.min(pa[0], pb[0]) + 0.03, Math.min(pa[1], pb[1]) + 0.03, Math.max(pa[0], pb[0]) - 0.03, Math.max(pa[1], pb[1]) - 0.03]);
    } else if (k === 'mesa_noche') {
      const { f, w, d } = frameOf(b, it.wall || backSide(b)); const W = w - 0.02, D = d - 0.02;
      f.bx('lacW', -W / 2, W / 2, 0.1, 0.52, 0.0, D, false); // v8: mesa de noche blanca
      for (const [x, z] of [[-W / 2 + 0.03, 0.03], [W / 2 - 0.03, 0.03], [-W / 2 + 0.03, D - 0.03], [W / 2 - 0.03, D - 0.03]]) f.cy('blackM', 0.012, 0.012, 0.1, x, 0, z, 10, true);
      f.bx('lacG', -W / 2 + 0.01, W / 2 - 0.01, 0.33, 0.336, D, D + 0.002, true);
      f.cy('chrome', 0.01, 0.01, 0.02, 0, 0.42, D + 0.01, 10, true, false);
      // lámpara de mesa
      f.cy('pot', 0.06, 0.07, 0.06, 0, 0.52, D / 2, 24, true).tube('chrome', [0, 0.58, D / 2], [0, 0.8, D / 2], 0.006, true).cy('shade', 0.1, 0.13, 0.18, 0, 0.74, D / 2, 32, true, true);
      coll.push([b[0] + 0.02, b[1] + 0.02, b[2] - 0.02, b[3] - 0.02]);
    } else if (k === 'closet') {
      const { f, w, d } = frameOf(b, it.wall); const W = w, D = d;
      f.bx('lacW', -W / 2, W / 2, 0.07, 2.32, 0.0, D - 0.02, false);
      f.bx('lacG', -W / 2 + 0.01, W / 2 - 0.01, 0.0, 0.07, 0.0, D - 0.045, false);
      const n = Math.max(2, Math.round(W / 0.5)); const dw = W / n;
      for (let i = 0; i < n; i++) { const xa = -W / 2 + i * dw + 0.002, xb = xa + dw - 0.004; f.bx('oak', xa, xb, 0.075, 2.31, D - 0.02, D, false);
        const hx = (i % 2 === 0) ? xb - 0.05 : xa + 0.05; f.bx('blackM', hx - 0.008, hx + 0.008, 0.85, 1.3, D + 0.012, D + 0.026, true); f.bx('blackM', hx - 0.006, hx + 0.006, 0.88, 0.89, D, D + 0.014, true).bx('blackM', hx - 0.006, hx + 0.006, 1.26, 1.27, D, D + 0.014, true); }
      coll.push([b[0] + 0.01, b[1] + 0.01, b[2] - 0.01, b[3] - 0.01]);
    } else if (k === 'sofa') {
      const { f, w, d } = frameOf(b, it.wall); const W = w - 0.02, D = Math.min(d, 0.95);
      const arm = 0.17;
      f.rb('sofa', -W / 2, W / 2, 0.08, 0.4, 0.02, D, 0.03); // base
      for (const s of [-1, 1]) f.rb('sofa', s < 0 ? -W / 2 : W / 2 - arm, s < 0 ? -W / 2 + arm : W / 2, 0.08, 0.64, 0.02, D, 0.06); // brazos
      f.rb('sofa', -W / 2 + 0.02, W / 2 - 0.02, 0.38, 0.86, 0.02, 0.2, 0.06); // espaldar
      const nc = W - 2 * arm > 1.7 ? 3 : 2; const cw = (W - 2 * arm) / nc;
      for (let i = 0; i < nc; i++) { const xa = -W / 2 + arm + i * cw + 0.006, xb = xa + cw - 0.012; f.rb('sofa', xa, xb, 0.4, 0.52, 0.2, D - 0.005, 0.05); // cojín asiento
        f.geo('sofa', new RoundedBoxGeometry(xb - xa, 0.42, 0.16, 2, 0.06), false, T4((xa + xb) / 2, 0.73, 0.29).multiply(RX(-0.16))); }
      f.geo('accent', new RoundedBoxGeometry(0.42, 0.42, 0.13, 2, 0.06), true, T4(-W / 2 + arm + 0.26, 0.72, 0.42).multiply(RX(-0.3)).multiply(RY(0.2)));
      f.geo('throwB', new RoundedBoxGeometry(0.4, 0.4, 0.12, 2, 0.06), true, T4(W / 2 - arm - 0.25, 0.72, 0.42).multiply(RX(-0.3)).multiply(RY(-0.15)));
      for (const [x, z] of [[-W / 2 + 0.06, 0.08], [W / 2 - 0.06, 0.08], [-W / 2 + 0.06, D - 0.06], [W / 2 - 0.06, D - 0.06]]) f.cy('blackM', 0.018, 0.014, 0.08, x, 0, z, 10, true);
      const pa = f.w(-W / 2, 0), pb = f.w(W / 2, D); coll.push([Math.min(pa[0], pb[0]) + 0.03, Math.min(pa[1], pb[1]) + 0.03, Math.max(pa[0], pb[0]) - 0.03, Math.max(pa[1], pb[1]) - 0.03]);
      // tapete + mesa de centro si cabe dentro del recinto
      const r = R.get(it.room) || roomOf((b[0] + b[2]) / 2, (b[1] + b[3]) / 2);
      if (r) { for (const [RW, RD] of [[Math.min(2.0, W + 0.3), 1.6], [Math.min(1.7, W), 1.3], [1.4, 1.0]]) { const za = D + 0.05, zb = za + RD; const c1 = f.w(-RW / 2, za), c2 = f.w(RW / 2, zb); const rb = [Math.min(c1[0], c2[0]), Math.min(c1[1], c2[1]), Math.max(c1[0], c2[0]), Math.max(c1[1], c2[1])];
          if (!rectIn(r, rb, 0.02) || occupied.some((o) => o !== b && ovl(rb, o, -0.05))) continue;
          f.rb('rug', -RW / 2, RW / 2, 0.006, 0.016, za - 0.25, zb, 0.004);
          const tz = za + RD * 0.45, TW = Math.min(1.0, RW * 0.55), TD = 0.5; f.rb('lwood', -TW / 2, TW / 2, 0.36, 0.4, tz - TD / 2, tz + TD / 2, 0.012);
          f.bx('blackM', -TW / 2 + 0.05, TW / 2 - 0.05, 0.08, 0.09, tz - TD / 2 + 0.05, tz + TD / 2 - 0.05, false);
          for (const [x, z] of [[-TW / 2 + 0.05, tz - TD / 2 + 0.05], [TW / 2 - 0.05, tz - TD / 2 + 0.05], [-TW / 2 + 0.05, tz + TD / 2 - 0.05], [TW / 2 - 0.05, tz + TD / 2 - 0.05]]) f.bx('blackM', x - 0.012, x + 0.012, 0, 0.36, z - 0.012, z + 0.012, false);
          f.rb('pot', -0.1, 0.12, 0.4, 0.43, tz - 0.08, tz + 0.06, 0.01, true); // libro / bandeja
          const q1 = f.w(-TW / 2, tz - TD / 2), q2 = f.w(TW / 2, tz + TD / 2); coll.push([Math.min(q1[0], q2[0]), Math.min(q1[1], q2[1]), Math.max(q1[0], q2[0]), Math.max(q1[1], q2[1])]); break; }
        // TV en el muro de enfrente (si hay un paño libre)
        if (!list.some((m) => m.k === 'mueble' && (R.get(m.room) === r))) { const c = f.w(0, D); const hit = rayWall(c[0], c[1], f.nx, f.nz, 5.5);
          if (hit && hit.t > 1.9) { const [fx0, fz0, fx1, fz1, nx, nz] = hit.f; const hp = [c[0] + f.nx * (hit.t + D * 0), c[1] + f.nz * (hit.t)]; const segL = Math.hypot(fx1 - fx0, fz1 - fz0);
            const along = Math.abs(nx) > 0.5 ? [Math.min(fz0, fz1), Math.max(fz0, fz1), hp[1]] : [Math.min(fx0, fx1), Math.max(fx0, fx1), hp[0]];
            const cen = Math.max(along[0] + 0.85, Math.min(along[1] - 0.85, along[2]));
            if (segL > 1.75) { const tp = Math.abs(nx) > 0.5 ? [fx0, cen] : [cen, fz0]; const tb = [tp[0] - 0.9, tp[1] - 0.9, tp[0] + 0.9, tp[1] + 0.9];
              if (!winZones().some((o) => ovl(tb, o, -0.3)) && !doorZones(r.id).some((o) => ovl([tp[0] - (Math.abs(nx) > 0.5 ? 0.4 : 0.8), tp[1] - (Math.abs(nx) > 0.5 ? 0.8 : 0.4), tp[0] + (Math.abs(nx) > 0.5 ? 0.4 : 0.8), tp[1] + (Math.abs(nx) > 0.5 ? 0.8 : 0.4)], o))) tvUnit(new F(tp[0], tp[1], nx, nz), 1.6, 0.38); } } } }
    } else if (k === 'mueble') { let side = bestWall(b); const free = wallOn(b, side) / sideLen(b, side) < 0.5;
      if (free && sofas.length) { const cx = (b[0] + b[2]) / 2, cz = (b[1] + b[3]) / 2; const so = sofas.slice().sort((p, q) => Math.hypot((p.b[0] + p.b[2]) / 2 - cx, (p.b[1] + p.b[3]) / 2 - cz) - Math.hypot((q.b[0] + q.b[2]) / 2 - cx, (q.b[1] + q.b[3]) / 2 - cz))[0];
        const dx = (so.b[0] + so.b[2]) / 2 - cx, dz = (so.b[1] + so.b[3]) / 2 - cz; side = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'x0' : 'x1') : (dz > 0 ? 'z0' : 'z1'); }
      const { f, w, d } = frameOf(b, side); tvUnit(f, w, Math.min(d, 0.75), free); }
    else if (k === 'meson' || k === 'mueble_cocina') kitchenRuns.push(it);
    else if (k === 'lavadero') { const side = it.wall || bestWall(b, false); const { f, w, d } = frameOf(b, side); const W = w - 0.012, D = d - 0.006; // holgura: sin caras coplanares con los muros
      f.bx('lacW', -W / 2, W / 2, 0.08, 0.82, 0, D - 0.02, false).bx('lacG', -W / 2 + 0.01, W / 2 - 0.01, 0, 0.08, 0, D - 0.06, false);
      f.bx('steel', -W / 2, W / 2, 0.82, 0.86, 0, D, false); f.bx('blackM', -W / 2 + 0.06, W / 2 - 0.06, 0.861, 0.863, 0.06, D - 0.05, false);
      // v10.2: llave de pared (muro de respaldo, h 1.05) con caño corto sobre la poceta; antes era un tubo vertical desde el borde que se veía flotando
      f.bx('chrome', -0.035, 0.035, 1.015, 1.085, 0, 0.012, true).tube('chrome', [0, 1.05, 0.012], [0, 1.05, 0.15], 0.011, true).tube('chrome', [0, 1.05, 0.15], [0, 1.0, 0.17], 0.01, true);
      f.tube('chrome', [-0.02, 1.08, 0.04], [0.02, 1.12, 0.04], 0.006, true);
      const pa = f.w(-W / 2, 0), pb = f.w(W / 2, D); coll.push([Math.min(pa[0], pb[0]) + 0.02, Math.min(pa[1], pb[1]) + 0.02, Math.max(pa[0], pb[0]) - 0.02, Math.max(pa[1], pb[1]) - 0.02]); }
    // v10.1: aparatos del plano (antes se extraían como columnas de muro a toda altura)
    else if (k === 'lavadora') { const side = it.wall || backSide(b); const { f, w, d } = frameOf(b, side); const W = Math.min(w, 0.62) - 0.02, D = Math.min(d, 0.62) - 0.03;
      f.rb('lacW', -W / 2, W / 2, 0.02, 0.85, 0.03, D, 0.02); // cuerpo blanco de carga frontal (≈0.85 m)
      f.bx('lacG', -W / 2 + 0.03, W / 2 - 0.03, 0.0, 0.03, 0.06, D - 0.04, false); // zócalo
      f.bx('blackM', -W / 2 + 0.04, W / 2 - 0.04, 0.74, 0.82, D, D + 0.004, true); // panel de mando
      f.cy('chrome', 0.022, 0.022, 0.02, W / 2 - 0.1, 0.78, D + 0.01, 20, true);
      f.geo('chrome', new THREE.TorusGeometry(0.19, 0.022, 12, 40), false, T4(0, 0.42, D + 0.012)); // aro de la puerta redonda
      f.geo('bglass', new THREE.CircleGeometry(0.175, 40), false, T4(0, 0.42, D + 0.006));
      const pa = f.w(-W / 2, 0), pb = f.w(W / 2, D + 0.03); coll.push([Math.min(pa[0], pb[0]), Math.min(pa[1], pb[1]), Math.max(pa[0], pb[0]), Math.max(pa[1], pb[1])]); }
    else if (k === 'nevera') { const side = backSide(b); const { f, w, d } = frameOf(b, side); const W = w - 0.02, D = d - 0.02, H = 1.78;
      f.rb('steel', -W / 2, W / 2, 0.03, H, 0.02, D, 0.015); // nevera ≈1.78 m, acero
      f.bx('blackM', -W / 2 + 0.02, W / 2 - 0.02, 0.0, 0.03, 0.05, D - 0.03, false);
      f.bx('blackM', -W / 2 + 0.005, W / 2 - 0.005, 1.14, 1.15, D, D + 0.003, true); // junta congelador/refrigerador
      f.tube('chrome', [W / 2 - 0.05, 1.2, D + 0.03], [W / 2 - 0.05, 1.6, D + 0.03], 0.009, true).tube('chrome', [W / 2 - 0.05, 0.55, D + 0.03], [W / 2 - 0.05, 1.08, D + 0.03], 0.009, true);
      const pa = f.w(-W / 2, 0), pb = f.w(W / 2, D + 0.03); coll.push([Math.min(pa[0], pb[0]), Math.min(pa[1], pb[1]), Math.max(pa[0], pb[0]), Math.max(pa[1], pb[1])]); }
    else if (k === 'corrediza') { // v10.1: puerta corrediza 0.70 del ropas (plano), mostrada abierta sobre el muro contiguo
      const s0 = it.ax === 'z' ? 'x0' : 'z0'; const { f, w, d } = frameOf(b, s0);
      f.bx('lacW', -w / 2 + 0.005, w / 2 - 0.005, 0.012, 2.05, 0.004, d - 0.004, false);
      f.bx('steel', -w / 2 + 0.06, -w / 2 + 0.075, 0.95, 1.15, d - 0.004, d + 0.012, true); // tirador embutido
      const o = it.open || b; const ub = [Math.min(b[0], o[0]), Math.min(b[1], o[1]), Math.max(b[2], o[2]), Math.max(b[3], o[3])];
      const ur = it.ax === 'z' ? [b[0], ub[1], b[2], ub[3]] : [ub[0], b[1], ub[2], b[3]]; const R2 = frameOf(ur, s0);
      R2.f.bx('steel', -R2.w / 2, R2.w / 2, 2.06, 2.1, 0, R2.d, false); // riel superior
      coll.push([b[0], b[1], b[2], b[3]]); }
  }
  function tvUnit(f, W, D, free = false) {
    f.bx('rose', -W / 2, W / 2, 0.12, 0.5, 0.0, D, false); // v8: credenza laqueada rosa/terracota
    const n = W > 1.4 ? 3 : 2; for (let i = 1; i < n; i++) { const x = -W / 2 + W * i / n; f.bx('blackM', x - 0.002, x + 0.002, 0.13, 0.49, D, D + 0.002, true); }
    for (const [x, z] of [[-W / 2 + 0.05, 0.05], [W / 2 - 0.05, 0.05], [-W / 2 + 0.05, D - 0.05], [W / 2 - 0.05, D - 0.05]]) f.cy('blackM', 0.013, 0.011, 0.12, x, 0, z, 10, true);
    if (free) { // mueble exento: TV 43" sobre base, mirando al recinto (lado +z)
      const TW = Math.min(0.97, W + 0.2), TH = TW * 9 / 16, zt = D * 0.45; f.bx('blackM', -0.12, 0.12, 0.5, 0.51, zt - 0.09, zt + 0.09, false).bx('blackM', -0.025, 0.025, 0.51, 0.62, zt - 0.02, zt + 0.0, false);
      f.bx('blackM', -TW / 2, TW / 2, 0.6, 0.6 + TH, zt - 0.03, zt, false); f.bx('bglass', -TW / 2 + 0.008, TW / 2 - 0.008, 0.608, 0.6 + TH - 0.008, zt, zt + 0.003, false);
    } else { const TW = Math.min(1.24, W - 0.1), TH = TW * 9 / 16; // TV 55" en soporte de muro
    f.bx('blackM', -TW / 2, TW / 2, 1.0, 1.0 + TH, 0.03, 0.055, false); f.bx('bglass', -TW / 2 + 0.008, TW / 2 - 0.008, 1.008, 1.0 + TH - 0.008, 0.055, 0.058, false);
    f.bx('blackM', -0.15, 0.15, 1.1, 1.4, 0.0, 0.03, true);
    f.rb('blackM', -0.45, 0.45, 0.52, 0.6, 0.12, 0.22, 0.02, true); } // barra de sonido
    if (!free) { f.cy('pot', 0.09, 0.07, 0.2, W / 2 - 0.16, 0.5, D / 2, 24, true); // matera
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const g = new THREE.PlaneGeometry(0.08, 0.34); g.translate(0, 0.17, 0); f.geo('leaf', g, true, T4(W / 2 - 0.16, 0.68, D / 2).multiply(RY(a)).multiply(RX(-0.35))); } }
    const pa = f.w(-W / 2, 0), pb = f.w(W / 2, D); coll.push([Math.min(pa[0], pb[0]) + 0.02, Math.min(pa[1], pb[1]) + 0.02, Math.max(pa[0], pb[0]) - 0.02, Math.max(pa[1], pb[1]) - 0.02]);
  }
  // ---------- cocinas ----------
  for (const it of kitchenRuns) {
    const b = it.b; const isl = it.k === 'mueble_cocina';
    const side = isl ? it.wall : bestWall(b); const { f, w, d } = frameOf(b, side); const L = w, D = Math.max(0.55, Math.min(0.62, d + 0.08));
    const winsOn = winZones().filter((o) => ovl(o, b, 0.25));
    const winX = winsOn.map((o) => { const p = [f.w(0, 0)]; void p; const a = toLocalX(f, o[0], o[1]), c = toLocalX(f, o[2], o[3]); return [Math.min(a, c), Math.max(a, c)]; });
    // refrigerador en el extremo con muro lateral (si el mesón es largo)
    let x0 = -L / 2, x1 = L / 2; let fridge = null;
    const planFridge = list.some((q) => q.k === 'nevera' && (q.room === it.room || Math.hypot((q.b[0] + q.b[2]) / 2 - (b[0] + b[2]) / 2, (q.b[1] + q.b[3]) / 2 - (b[1] + b[3]) / 2) < 2.5)); // v10.1: si el plano dibuja la nevera, no se inventa otra
    if (!isl && !planFridge && L >= 2.15) { const endP = f.w(L / 2 + 0.05, D / 2), endM = f.w(-L / 2 - 0.05, D / 2); const r = roomOf(...f.w(0, D / 2)); const plusFree = r && inRoom(r, endP[0], endP[1]); const minusFree = r && inRoom(r, endM[0], endM[1]);
      fridge = plusFree && !minusFree ? 'm' : 'p'; if (fridge === 'p') x1 = L / 2 - 0.72; else x0 = -L / 2 + 0.72; }
    // muebles bajos con puertas y tiradores
    f.bx('lacG', x0 + 0.01, x1 - 0.01, 0, 0.1, 0, D - 0.07, false);
    f.bx('lacW', x0, x1, 0.1, 0.86, 0, D - 0.04, false);
    const nd = Math.max(1, Math.round((x1 - x0) / 0.5)); const dw = (x1 - x0) / nd;
    for (let i = 0; i < nd; i++) { const xa = x0 + i * dw + 0.002, xb = xa + dw - 0.004; f.bx('lwood', xa, xb, 0.1, 0.705, D - 0.04, D - 0.022, false); f.bx('lacW', xa, xb, 0.71, 0.855, D - 0.04, D - 0.022, false); // puerta + cajón
      f.bx('blackM', (xa + xb) / 2 - 0.08, (xa + xb) / 2 + 0.08, 0.81, 0.82, D - 0.022, D - 0.004, true); }
    // mesón en cuarzo con hueco del lavaplatos
    const sinkC = isl ? null : x0 + Math.max(0.38, (x1 - x0) * 0.3), cookC = isl ? null : x1 - Math.max(0.42, (x1 - x0) * 0.24); const SW = 0.5, SD = 0.4, sz0 = (D - SD) / 2 + 0.02;
    if (sinkC !== null) { f.bx('quartz', x0, sinkC - SW / 2, 0.86, 0.9, 0, D, false).bx('quartz', sinkC + SW / 2, x1, 0.86, 0.9, 0, D, false).bx('quartz', sinkC - SW / 2, sinkC + SW / 2, 0.86, 0.9, 0, sz0, false).bx('quartz', sinkC - SW / 2, sinkC + SW / 2, 0.86, 0.9, sz0 + SD, D, false);
      // poceta en acero
      f.bx('steel', sinkC - SW / 2, sinkC + SW / 2, 0.7, 0.71, sz0, sz0 + SD, false); for (const [a, c, e, g] of [[sinkC - SW / 2, sinkC - SW / 2 + 0.01, sz0, sz0 + SD], [sinkC + SW / 2 - 0.01, sinkC + SW / 2, sz0, sz0 + SD], [sinkC - SW / 2, sinkC + SW / 2, sz0, sz0 + 0.01], [sinkC - SW / 2, sinkC + SW / 2, sz0 + SD - 0.01, sz0 + SD]]) f.bx('steel', a, c, 0.7, 0.9, e, g, false);
      f.cy('chrome', 0.03, 0.03, 0.004, sinkC, 0.71, sz0 + SD / 2, 20, true);
      // grifo cuello de cisne (v8: negro mate, ref_09)
      const gz = sz0 - 0.06 < 0.04 ? 0.05 : sz0 - 0.05; f.cy('blackM', 0.025, 0.028, 0.03, sinkC, 0.9, gz, 24, true).tube('blackM', [sinkC, 0.9, gz], [sinkC, 1.2, gz], 0.013, true, 16);
      f.geo('blackM', new THREE.TorusGeometry(0.09, 0.013, 10, 24, Math.PI), true, T4(sinkC, 1.2, gz + 0.09).multiply(RY(Math.PI / 2)));
      f.tube('blackM', [sinkC, 1.2, gz + 0.18], [sinkC, 1.12, gz + 0.18], 0.012, true, 16); f.tube('blackM', [sinkC + 0.03, 1.0, gz], [sinkC + 0.09, 1.04, gz], 0.007, true);
    } else f.bx('quartz', x0 - 0.02, x1 + 0.02, 0.86, 0.9, -0.02, D + 0.25, false);
    if (cookC !== null) { f.bx('bglass', cookC - 0.29, cookC + 0.29, 0.9, 0.906, sz0 - 0.02, sz0 + 0.48, false);
      for (const [dx, dz, rr] of [[-0.14, 0.11, 0.075], [0.14, 0.11, 0.06], [-0.14, 0.34, 0.06], [0.14, 0.34, 0.085]]) f.geo('blackM', new THREE.TorusGeometry(rr, 0.004, 6, 32).rotateX(Math.PI / 2), true, T4(cookC + dx, 0.907, sz0 - 0.02 + dz));
      for (const [dx, dz, rr] of [[-0.14, 0.11, 0.075], [0.14, 0.11, 0.06], [-0.14, 0.34, 0.06], [0.14, 0.34, 0.085]]) f.geo('steel', new THREE.TorusGeometry(rr * 0.55, 0.003, 6, 24).rotateX(Math.PI / 2), true, T4(cookC + dx, 0.907, sz0 - 0.02 + dz));
      // campana extractora en acero
      f.bx('steel', cookC - 0.3, cookC + 0.3, 1.55, 1.62, 0.0, 0.5, false).bx('blackM', cookC - 0.27, cookC + 0.27, 1.548, 1.55, 0.03, 0.47, true).bx('steel', cookC - 0.14, cookC + 0.14, 1.62, 2.48, 0.0, 0.26, false); }
    // alacenas superiores (en roble) salvo campana y ventanas
    if (!isl) { const segs = [[x0, x1]]; const cut = (a, c) => { for (let i = segs.length - 1; i >= 0; i--) { const [s0, s1] = segs[i]; if (c <= s0 || a >= s1) continue; segs.splice(i, 1, ...[[s0, a], [c, s1]].filter(([u, v]) => v - u > 0.28)); } };
      if (cookC !== null) cut(cookC - 0.31, cookC + 0.31); winX.forEach(([a, c]) => cut(a - 0.02, c + 0.02));
      for (const [s0, s1] of segs) { f.bx('lacW', s0, s1, 1.5, 2.2, 0, 0.34, false); const n = Math.max(1, Math.round((s1 - s0) / 0.45)); const ww = (s1 - s0) / n;
        for (let i = 1; i < n; i++) f.bx('blackM', s0 + i * ww - 0.002, s0 + i * ww + 0.002, 1.5, 2.2, 0.34, 0.342, true);
        for (let i = 0; i < n; i++) f.bx('blackM', s0 + i * ww + 0.06, s0 + (i + 1) * ww - 0.06, 1.525, 1.533, 0.342, 0.356, true);
        f.bx('led', s0 + 0.02, s1 - 0.02, 1.495, 1.5, 0.05, 0.08, true); } }
    if (fridge) { const fx0 = fridge === 'p' ? L / 2 - 0.7 : -L / 2 + 0.01, fx1 = fx0 + 0.69; const FD = Math.max(D, 0.66);
      f.rb('steel', fx0, fx1, 0.02, 1.86, 0.02, FD, 0.02); f.bx('blackM', fx0 + 0.01, fx1 - 0.01, 1.2, 1.206, FD - 0.004, FD + 0.001, false);
      const hx = fridge === 'p' ? fx0 + 0.05 : fx1 - 0.05; f.tube('steel', [hx, 1.25, FD + 0.035], [hx, 1.7, FD + 0.035], 0.011, true).tube('steel', [hx, 0.6, FD + 0.035], [hx, 1.12, FD + 0.035], 0.011, true);
      for (const y of [1.25, 1.7, 0.6, 1.12]) f.tube('steel', [hx, y, FD], [hx, y, FD + 0.035], 0.008, true);
      f.bx('lacW', fx0, fx1, 1.9, 2.2, 0, 0.5, false); }
    if (isl) { // isla/barra: mueble bajo + mesón con voladizo y dos bancos
      for (let i = 0; i < 2; i++) { const x = -L / 4 + i * L / 2; const z = D + 0.45; f.cy('blackM', 0.17, 0.17, 0.05, x, 0.0, z, 24, true).tube('blackM', [x, 0.05, z], [x, 0.62, z], 0.022, false).cy('beige', 0.19, 0.19, 0.06, x, 0.62, z, 28, false); } }
    const pa = f.w(-L / 2, 0), pb = f.w(L / 2, isl ? D + 0.25 : (fridge ? Math.max(D, 0.66) : D)); coll.push([Math.min(pa[0], pb[0]) + 0.02, Math.min(pa[1], pb[1]) + 0.02, Math.max(pa[0], pb[0]) - 0.02, Math.max(pa[1], pb[1]) - 0.02]);
  }
  function toLocalX(f, x, z) { return (x - f.ox) * f.nz - (z - f.oz) * f.nx; }
  // ---------- comedor ----------
  for (const c of chairs) { const [x0, z0, x1, z1] = c.b; const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; let t = null, dmin = 9; for (const q of tables) { const dd = Math.hypot(q.x - cx, q.z - cz); if (dd < dmin) { dmin = dd; t = q; } }
    let n = [0, 1]; if (t) { const dx = t.x - cx, dz = t.z - cz; n = Math.abs(dx) > Math.abs(dz) ? [Math.sign(dx), 0] : [0, Math.sign(dz)]; }
    const f = new F(cx, cz, n[0], n[1]); const s = 0.22;
    for (const [a, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) f.bx('lwood', a * (s - 0.025) - 0.014, a * (s - 0.025) + 0.014, 0, 0.44, z * (s - 0.025) - 0.014, z * (s - 0.025) + 0.014, false);
    f.rb('cream', -s, s, 0.43, 0.48, -s, s, 0.02);
    for (const a of [-1, 1]) f.bx('lwood', a * (s - 0.025) - 0.013, a * (s - 0.025) + 0.013, 0.48, 0.9, -s + 0.012, -s + 0.04, false);
    f.geo('cream', new RoundedBoxGeometry(2 * s - 0.03, 0.26, 0.04, 2, 0.015), false, T4(0, 0.74, -s + 0.04).multiply(RX(0.1)));
    f.bx('lwood', -s + 0.02, s - 0.02, 0.36, 0.4, -s + 0.02, -s + 0.04, true).bx('lwood', -s + 0.02, s - 0.02, 0.36, 0.4, s - 0.04, s - 0.02, true);
    coll.push([cx - 0.18, cz - 0.18, cx + 0.18, cz + 0.18]); }
  for (const t of tables) { const f = new F(t.x, t.z, 0, 1);
    if (t.round) { f.cy('lwood', 0.5, 0.5, 0.035, 0, 0.72, 0, 48, false).cy('blackM', 0.045, 0.045, 0.66, 0, 0.06, 0, 20, false).cy('blackM', 0.26, 0.28, 0.06, 0, 0, 0, 36, false);
      f.cy('pot', 0.07, 0.05, 0.16, 0.12, 0.755, -0.05, 24, true); coll.push([t.x - 0.35, t.z - 0.35, t.x + 0.35, t.z + 0.35]); }
    else { const [x0, z0, x1, z1] = t.b; const W = x1 - x0, D = z1 - z0; f.rb('lwood', -W / 2, W / 2, 0.72, 0.76, -D / 2, D / 2, 0.012);
      for (const [a, c] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) f.geo('blackM', new THREE.CylinderGeometry(0.02, 0.014, 0.72, 12), false, T4(a * (W / 2 - 0.08), 0.36, c * (D / 2 - 0.08)));
      f.bx('blackM', -W / 2 + 0.08, W / 2 - 0.08, 0.66, 0.72, -D / 2 + 0.07, -D / 2 + 0.09, false).bx('blackM', -W / 2 + 0.08, W / 2 - 0.08, 0.66, 0.72, D / 2 - 0.09, D / 2 - 0.07, false);
      f.cy('pot', 0.07, 0.05, 0.16, 0, 0.76, 0, 24, true); coll.push([x0 + 0.05, z0 + 0.05, x1 - 0.05, z1 - 0.05]); } }
  for (const a of armchairs) { const { f, w, d } = frameOf(a.b, a.wall); const W = Math.min(w, 0.85), D = Math.min(d, 0.85); const arm = 0.13;
    f.rb('armG', -W / 2, W / 2, 0.1, 0.4, 0.02, D, 0.03); for (const s of [-1, 1]) f.rb('armG', s < 0 ? -W / 2 : W / 2 - arm, s < 0 ? -W / 2 + arm : W / 2, 0.1, 0.62, 0.02, D, 0.05);
    f.rb('armG', -W / 2 + 0.02, W / 2 - 0.02, 0.38, 0.85, 0.02, 0.18, 0.05); f.rb('armG', -W / 2 + arm + 0.005, W / 2 - arm - 0.005, 0.4, 0.5, 0.18, D - 0.01, 0.04);
    for (const [x, z] of [[-W / 2 + 0.05, 0.06], [W / 2 - 0.05, 0.06], [-W / 2 + 0.05, D - 0.05], [W / 2 - 0.05, D - 0.05]]) f.cy('walnut', 0.016, 0.012, 0.1, x, 0, z, 10, true);
    const pa = f.w(-W / 2, 0), pb = f.w(W / 2, D); coll.push([Math.min(pa[0], pb[0]) + 0.03, Math.min(pa[1], pb[1]) + 0.03, Math.max(pa[0], pb[0]) - 0.03, Math.max(pa[1], pb[1]) - 0.03]); }

  // ---------- ensamblar mallas (una por material; detalle aparte para degradar en Baja) ----------
  const meshes = [];
  for (const [k, arr] of Object.entries(G)) { const [mk, d] = k.split('|'); const g = mergeGeometries(arr, false); if (!g) continue; g.computeBoundingSphere();
    const m = new THREE.Mesh(g, M[mk]); const transp = mk === 'glass' || mk === 'led'; m.castShadow = !transp && mk !== 'tileAcc' && mk !== 'rug'; m.receiveShadow = mk !== 'led'; m.userData.fur = mk; if (d) m.userData.furDetail = true; meshes.push(m); }
  const all = [];
  function setQuality(lv) { const hi = lv >= 2; const gm = hi ? GLASS_HI : GLASS_LO; for (const m of all) { if (m.userData.fur === 'glass') m.material = gm; if (m.userData.furDetail) m.visible = lv >= 1; } }
  return { meshes, coll, M, setQuality, sinks, register: (m) => all.push(m) };
}
