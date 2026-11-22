// Interiores fieles a PL_A002 (muros/vanos/puertas/ventanas/mobiliario del vector del PDF), lobby aproximado del piso 1,
// escaleras caminables y ascensor (pozo/cabina/puertas) — todo procedural, sin red.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { textTex } from './tex.js';
import { buildFur7 } from './fur7.js';
import { tropicalGeo, plantMats } from './style8.js';

export const H = 2.5, DOORH = 2.1, H1 = 2.5; // v4: piso 1 en N+1.00 (PL_A006) → altura libre 2.50
export const LEVY = { sot: -2.96, p1: 1.0, p2: 3.7, p3: 6.4, p4: 9.1, p5: 11.8, p6: 14.5, p7: 17.2 };
export const FLOORS = ['sot', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
export const FLABEL = { sot: 'S', p1: '1', p2: '2', p3: '3', p4: '4', p5: '5', p6: '6', p7: '7' };

// ---------- geometría con color por vértice y UV mundo (triplanar simple) ----------
class GB {
  constructor(sx = 1, sy = 1) { this.p = []; this.n = []; this.c = []; this.sx = sx; this.sy = sy; }
  tri(a, b, c, n, col) {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cr = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) { const t = b; b = c; c = t; }
    for (const v of [a, b, c]) { this.p.push(v[0], v[1], v[2]); this.n.push(n[0], n[1], n[2]); this.c.push(col.r, col.g, col.b); }
  }
  quad(a, b, c, d, n, col) { this.tri(a, b, c, n, col); this.tri(a, c, d, n, col); }
  // prisma vertical sobre un polígono convexo (xz) — tapas + lados
  prism(poly, y0, y1, col, { top = true, bot = true } = {}) {
    const k = poly.length; let ar = 0; for (let i = 0; i < k; i++) { const [x0, z0] = poly[i], [x1, z1] = poly[(i + 1) % k]; ar += x0 * z1 - x1 * z0; }
    const s = ar > 0 ? -1 : 1; // v7: normales hacia afuera (antes quedaban hacia adentro: cajas "al revés", se veía la cara del fondo → z-fighting en antepechos)
    for (let i = 0; i < k; i++) { const [x0, z0] = poly[i], [x1, z1] = poly[(i + 1) % k]; const L = Math.hypot(x1 - x0, z1 - z0) || 1; const n = [-(z1 - z0) / L * s, 0, (x1 - x0) / L * s];
      this.quad([x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], n, col); }
    for (let i = 1; i < k - 1; i++) { if (top) this.tri([poly[0][0], y1, poly[0][1]], [poly[i][0], y1, poly[i][1]], [poly[i + 1][0], y1, poly[i + 1][1]], [0, 1, 0], col);
      if (bot) this.tri([poly[0][0], y0, poly[0][1]], [poly[i][0], y0, poly[i][1]], [poly[i + 1][0], y0, poly[i + 1][1]], [0, -1, 0], col); }
  }
  box(x0, x1, y0, y1, z0, z1, col, o) { this.prism([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y0, y1, col, o); }
  // barra 3D entre dos puntos (sección cuadrada)
  bar(a, b, r, col) {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = d.length(); d.normalize();
    const up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(d, up).normalize().multiplyScalar(r), v = new THREE.Vector3().crossVectors(d, u).normalize().multiplyScalar(r);
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const cs = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([i, j]) => u.clone().multiplyScalar(i).add(v.clone().multiplyScalar(j)));
    for (let i = 0; i < 4; i++) { const p0 = cs[i], p1 = cs[(i + 1) % 4]; const n = p0.clone().add(p1).normalize();
      const q = [A.clone().add(p0), A.clone().add(p1), B.clone().add(p1), B.clone().add(p0)].map((w) => w.toArray()); this.quad(q[0], q[1], q[2], q[3], n.toArray(), col); }
  }
  geo() {
    if (!this.p.length) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    const uv = []; for (let i = 0; i < this.p.length; i += 3) { const [x, y, z] = [this.p[i], this.p[i + 1], this.p[i + 2]]; const [nx, ny, nz] = [Math.abs(this.n[i]), Math.abs(this.n[i + 1]), Math.abs(this.n[i + 2])];
      if (ny >= nx && ny >= nz) uv.push(x / this.sx, -z / this.sy); else if (nx >= nz) uv.push(z / this.sx, y / this.sy); else uv.push(x / this.sx, y / this.sy); }
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeBoundingSphere(); return g;
  }
}
const C = (h) => new THREE.Color(h);
function shapeOf(p) { const s = new THREE.Shape(p.o.map(([x, z]) => new THREE.Vector2(x, -z))); (p.h || []).forEach((h) => s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))))); return s; }
// suelo horizontal con UV en metros (según tamaño real de la textura) + uv1 para el mapa AO
function floorGeo(polys, y, tex, ao) {
  const gs = polys.map((p) => { const g = new THREE.ShapeGeometry(shapeOf(p)); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g.index ? g.toNonIndexed() : g; });
  if (!gs.length) return null; const g = mergeGeometries(gs); const pos = g.attributes.position; const uv = new Float32Array(pos.count * 2), uv1 = new Float32Array(pos.count * 2);
  const sx = tex?.userData?.sx || 1, sz = tex?.userData?.sz || 1;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); uv[i * 2] = x / sx; uv[i * 2 + 1] = -z / sz;
    if (ao) { uv1[i * 2] = (x - ao.x0) / (ao.x1 - ao.x0); uv1[i * 2 + 1] = 1 - (z - ao.z0) / (ao.z1 - ao.z0); } }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2)); return g;
}
export function pipRing(r, x, z) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; }
export function pipH(polys, x, z) { for (const p of polys) if (pipRing(p.o, x, z) && !(p.h || []).some((h) => pipRing(h, x, z))) return true; return false; }
const rect = (x0, z0, x1, z1) => ({ o: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], h: [] });
function segsOfPolys(polys) { const out = []; for (const p of polys) for (const ring of [p.o, ...(p.h || [])]) for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; out.push([a[0], a[1], b[0], b[1]]); } return out; }

// colores de muro por recinto (variación sutil para distinguir espacios)
// v8: muros blancos como en los renders interiores (ref_06/07/08/09); hall gris muy claro (ref_04/ref_10)
const WALLC = { alcoba: ['#f1efeb', '#eeeeeb', '#f0ede8'], sala: ['#f3f2ef'], circ: ['#f2f1ee'], cocina: ['#f4f3f1'], ropas: ['#eceeee'], bano: ['#f1f1ee'], hall: ['#e7e6e2'], balcon: ['#e3e1dc'], cabina: ['#555a60'], none: ['#cfcac2'] };

export function buildWorld(ctx) {
  const { I, S, lv, T, M, isMobile, T8 } = ctx;
  const R = new Map(I.rooms.map((r) => [r.id, r]));
  const rtype = (id) => (id >= 0 && R.get(id) ? R.get(id).type : 'none');
  const wallCol = (id) => { const t = rtype(id); const arr = WALLC[t] || WALLC.none; const r = R.get(id); const k = r && t === 'alcoba' ? (r.name === 'Alcoba principal' ? 0 : r.name === 'Alcoba 2' ? 1 : 2) : 0; return C(arr[k % arr.length]); };
  const aoTex = new THREE.TextureLoader().load(I.ao.src); aoTex.channel = 1; aoTex.colorSpace = THREE.NoColorSpace;
  const ao = I.ao;

  // ---------- materiales ----------
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const MI = {
    plaster: std({ map: T.plaster, vertexColors: true, roughness: 0.92 }),
    wtile: std({ map: T.wtile, vertexColors: true, roughness: 0.25, metalness: 0.0 }),
    cap: new THREE.MeshBasicMaterial({ color: 0x2a2e35 }),
    lam: std({ map: T.lam, roughness: 0.55, aoMap: aoTex, aoMapIntensity: 1 }),
    porc: std({ map: T.porc, roughness: 0.22, aoMap: aoTex, aoMapIntensity: 1 }),
    porcD: std({ map: T.porcD, roughness: 0.25, aoMap: aoTex, aoMapIntensity: 1 }),
    cer: std({ map: T.cer, roughness: 0.4, aoMap: aoTex, aoMapIntensity: 1 }),
    bath: std({ map: T.bath, roughness: 0.35, aoMap: aoTex, aoMapIntensity: 1 }),
    terr: std({ map: T.terr, roughness: 0.7, aoMap: aoTex, aoMapIntensity: 1 }),
    ceil: std({ color: 0xf2f1ee, roughness: 0.95, side: THREE.DoubleSide }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xfff6e2 }),
    woodE: std({ map: T.wood, vertexColors: true, roughness: 0.5 }),
    woodI: std({ map: T.woodL, vertexColors: true, roughness: 0.55 }),
    frame: std({ map: T.woodL, color: 0xe8e2d6, roughness: 0.6 }),
    furn: std({ vertexColors: true, roughness: 0.6 }),
    furnW: std({ map: T.wood, vertexColors: true, roughness: 0.55 }),
    fabric: std({ map: T.fabric, vertexColors: true, roughness: 0.95 }),
    gloss: std({ vertexColors: true, roughness: 0.15, metalness: 0.1 }),
    steel: std({ map: T.steel, color: 0xd5d9dd, metalness: 0.7, roughness: 0.42 }),
    steelD: std({ map: T.steel, color: 0x9aa0a6, metalness: 0.85, roughness: 0.38 }),
    mirror: std({ color: 0xc8d0d8, metalness: 1, roughness: 0.04 }),
    gran: std({ map: T.gran, roughness: 0.18, metalness: 0.1 }),
    granV: std({ map: T.gran, vertexColors: true, roughness: 0.2, metalness: 0.05 }),
    glass: std({ color: 0x9fb8c6, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
    alu: std({ color: 0x3a3e43, metalness: 0.8, roughness: 0.35 }),
    rail: std({ color: 0x8e959c, metalness: 0.9, roughness: 0.3 }),
    stair: std({ map: T.porc, vertexColors: true, roughness: 0.3 }),
    conc: std({ map: T.conc, roughness: 0.95 }),
    // v8: acabados de los renders
    marble: std({ map: T8.marble, roughness: 0.16, metalness: 0.02, aoMap: aoTex, aoMapIntensity: 1 }),
    tileG: std({ map: T8.tileG, roughness: 0.3, aoMap: aoTex, aoMapIntensity: 1 }),
    tileL: std({ map: T8.tileL, roughness: 0.22, aoMap: aoTex, aoMapIntensity: 1 }),
    tileB: std({ map: T8.tileB, roughness: 0.55, aoMap: aoTex, aoMapIntensity: 1 }),
    stairD: std({ color: 0x2b2c2e, roughness: 0.55, metalness: 0.3 }),
    cove: new THREE.MeshBasicMaterial({ color: 0xfff1d8 }),
    art: T8.art.map((t) => std({ map: t, roughness: 0.6 })),
    artF: std({ color: 0x1c1c1d, roughness: 0.45, metalness: 0.2 }),
    cable: std({ color: 0xc9ced3, metalness: 0.9, roughness: 0.25 }),
    yrail: std({ color: 0xe0a526, roughness: 0.45, metalness: 0.2 }),
    railVC: std({ vertexColors: true, metalness: 0.45, roughness: 0.35 }),
    wpost: std({ color: 0xf2f1ee, roughness: 0.5, metalness: 0.1 }),
    v7ext: std({ color: 0x2d3236, metalness: 0.9, roughness: 0.06 }),
  };
  const PL8 = plantMats(T8);
  MI.stair.map = T8.concFine; MI.stair.roughness = 0.75;
  MI.rail.color.set(0x1d1e20); MI.rail.metalness = 0.5; MI.rail.roughness = 0.4; // barandas negras (ref_04/ref_10)
  MI.alu.color.set(0x1b1c1e); MI.alu.metalness = 0.55; MI.alu.roughness = 0.4;    // perfilería negra
  MI.glass.color.set(0xdbe6ea); MI.glass.opacity = 0.22;
  MI.woodE.map = T8.oak; MI.woodI.map = T8.oak; MI.frame.map = T8.oak; MI.frame.color.set(0xf4ece0); // puertas y marcos de roble
  for (const k of ['lam', 'porc', 'porcD', 'cer', 'bath', 'terr', 'marble', 'tileG', 'tileL', 'tileB']) MI[k].userData.floor = true;
  const FLOORMAT = { alcoba: 'tileG', circ: 'marble', sala: 'marble', cocina: 'marble', ropas: 'cer', bano: 'bath', balcon: 'tileB' };
  const mesh = (g, m, cast = true, recv = true) => { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = recv; return o; };

  // ====================== PLANTA TÍPICA (2–7): geometría compartida ======================
  const TIP = { meshes: [], ceil: null, lamps: null };
  {
    const wB = new GB(1.5, 1.5), tB = new GB(1.2, 1.2), skB = new GB(1, 1);
    const kitchenFur = I.fur.filter((f) => ['meson', 'mueble_cocina'].includes(f.k));
    const nearKitchen = (x, z) => kitchenFur.some((f) => x > f.b[0] - 0.6 && x < f.b[2] + 0.6 && z > f.b[1] - 0.6 && z < f.b[3] + 0.6);
    const ring = S.foot2[0].o; const dRing = (x, z) => { let d = 1e9; for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; const dx = b[0] - a[0], dz = b[1] - a[1]; const L = dx * dx + dz * dz || 1e-9; let t = ((x - a[0]) * dx + (z - a[1]) * dz) / L; t = Math.max(0, Math.min(1, t)); d = Math.min(d, Math.hypot(a[0] + t * dx - x, a[1] + t * dz - z)); } return d; };
    for (const [x0, z0, x1, z1, nx, nz, rid] of I.faces) {
      const L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.005) continue;
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (rid < 0 && dRing(mx, mz) < 0.06) continue; // cara exterior: la cubre la piel de fachada
      const t = rtype(rid), col = wallCol(rid), n = [nx, 0, nz];
      const q = (B, ya, yb, c) => B.quad([x0, ya, z0], [x1, ya, z1], [x1, yb, z1], [x0, yb, z0], n, c);
      if (t === 'bano') { q(tB, 0, 2.1, C('#ffffff')); q(wB, 2.1, H, col); }
      else if (t === 'cocina' && nearKitchen(mx, mz)) { q(wB, 0, 0.9, col); q(tB, 0.9, 1.5, C('#f3efe6')); q(wB, 1.5, H, col); }
      else q(wB, 0, H, col);
      if (L > 0.25 && ['alcoba', 'sala', 'circ', 'hall'].includes(t)) { // guardaescoba
        const o = 0.012, ox = nx * o, oz = nz * o, kc = t === 'hall' ? C('#2c2d30') : C('#e9e4da');
        skB.quad([x0 + ox, 0, z0 + oz], [x1 + ox, 0, z1 + oz], [x1 + ox, 0.08, z1 + oz], [x0 + ox, 0.08, z0 + oz], n, kc);
        skB.quad([x0 + ox, 0.08, z0 + oz], [x1 + ox, 0.08, z1 + oz], [x1, 0.08, z1], [x0, 0.08, z0], [0, 1, 0], kc);
      }
    }
    // dinteles de puertas y antepechos/dinteles de ventanas
    const white = C('#f1efea');
    for (const d of I.doors) {
      const h = d.h, c = d.c, n = d.n; const P = (p, t) => [p[0] + n[0] * t, p[1] + n[1] * t];
      wB.prism([P(h, d.t0), P(c, d.t0), P(c, d.t1), P(h, d.t1)], DOORH + 0.04, H, white, { top: false });
    }
    for (const w of I.wins) {
      if (w.code === 'V-7' || w.code === 'V-8') { wB.box(w.x0, w.x1, w.head, H, w.z0, w.z1, white, { top: false }); continue; }
      if (w.sill > 0.02) wB.box(w.x0, w.x1, 0, w.sill, w.z0, w.z1, white, { bot: false });
      wB.box(w.x0, w.x1, w.head, H, w.z0, w.z1, white, { top: false });
    }
    TIP.meshes.push(mesh(wB.geo(), MI.plaster), mesh(tB.geo(), MI.wtile), mesh(skB.geo(), MI.furn, false));
    // tapas de muros (poché oscuro para la vista en corte)
    const capG = mergeGeometries(I.caps.map((p) => { const g = new THREE.ShapeGeometry(shapeOf(p)); g.rotateX(-Math.PI / 2); g.translate(0, H + 0.002, 0); return g.index ? g.toNonIndexed() : g; }));
    TIP.meshes.push(mesh(capG, MI.cap, false, false));
    // ventanas interiores (hacia hall / patios) — vidrio + marco; las de fachada usan la piel
    const gB = new GB(), aB = new GB(), sillB = new GB();
    for (const w of I.wins) {
      if (w.code === 'V-7' || w.code === 'V-8') continue;
      const ax = (w.x1 - w.x0) > (w.z1 - w.z0); const mx = (w.x0 + w.x1) / 2, mz = (w.z0 + w.z1) / 2;
      if (!w.ext) {
        if (ax) { gB.box(w.x0, w.x1, w.sill, w.head, mz - 0.006, mz + 0.006, white); aB.box(w.x0, w.x1, w.sill, w.sill + 0.04, mz - 0.03, mz + 0.03, white); aB.box(w.x0, w.x1, w.head - 0.04, w.head, mz - 0.03, mz + 0.03, white); for (const x of [w.x0, mx, w.x1 - 0.04]) aB.box(x, x + 0.04, w.sill, w.head, mz - 0.03, mz + 0.03, white); }
        else { gB.box(mx - 0.006, mx + 0.006, w.sill, w.head, w.z0, w.z1, white); aB.box(mx - 0.03, mx + 0.03, w.sill, w.sill + 0.04, w.z0, w.z1, white); aB.box(mx - 0.03, mx + 0.03, w.head - 0.04, w.head, w.z0, w.z1, white); for (const z of [w.z0, mz, w.z1 - 0.04]) aB.box(mx - 0.03, mx + 0.03, w.sill, w.head, z, z + 0.04, white); }
      }
      if (w.sill > 0.3) { if (ax) sillB.box(w.x0 - 0.03, w.x1 + 0.03, w.sill, w.sill + 0.025, w.z0 - 0.02, w.z1 + 0.02, C('#e7e3dc')); else sillB.box(w.x0 - 0.02, w.x1 + 0.02, w.sill, w.sill + 0.025, w.z0 - 0.03, w.z1 + 0.03, C('#e7e3dc')); }
    }
    if (gB.p.length) TIP.meshes.push(mesh(gB.geo(), MI.glass, false));
    if (aB.p.length) TIP.meshes.push(mesh(aB.geo(), MI.alu));
    TIP.meshes.push(mesh(sillB.geo(), MI.gloss));
    // pisos por tipo de recinto + hall
    const byMat = {};
    for (const r of I.rooms) { const k = FLOORMAT[r.type]; if (!k) continue; (byMat[k] = byMat[k] || []).push({ o: r.o, h: r.h || [] }); }
    byMat.tileL = I.hallFloor;
    { const g = floorGeo(I.slab, 0.003, MI.porc.map, ao); TIP.meshes.push(mesh(g, MI.porc, false)); } // umbrales / zonas bajo vanos
    for (const [k, polys] of Object.entries(byMat)) { const tex = MI[k].map; const g = floorGeo(polys, 0.006, tex, ao); if (g) TIP.meshes.push(mesh(g, MI[k], false)); }
    // losa típica con huecos (pozo, escalera, vacíos)
    TIP.slab = mergeGeometries([...I.slab, ...I.rooms.filter((r) => r.type === 'balcon')].map((p) => { const g = new THREE.ExtrudeGeometry(shapeOf(p), { depth: 0.2, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2); g.translate(0, -0.2, 0); g.clearGroups(); return g.index ? g.toNonIndexed() : g; }));
    // cielo raso + luminarias por recinto
    TIP.ceil = floorGeo(I.slab.concat(I.rooms.filter((r) => r.type === 'balcon')), H - 0.005, null, null);
    const lampG = [];
    for (const r of I.rooms) { if (['cabina'].includes(r.type)) continue; const pts = r.type === 'hall' ? [[20.4, 10.7], [17.3, 7.6], [22.3, 12.2], [20.5, 9.2]] : [r.lp]; for (const [x, z] of pts) { const c = new THREE.CircleGeometry(r.type === 'bano' ? 0.09 : 0.13, 20); c.rotateX(Math.PI / 2); c.translate(x, H - 0.012, z); lampG.push(c.index ? c.toNonIndexed() : c); } }
    TIP.lamps = mergeGeometries(lampG);
    TIP.lampPts = I.rooms.filter((r) => r.type !== 'cabina').map((r) => ({ x: r.lp[0], z: r.lp[1], id: r.id, t: r.type }));
    // v8: tira LED perimetral en el cielo raso de sala/comedor, cocina y circulación (ref_06/07/09) — solo visible en el recorrido
    { const cv = []; const IN = 0.16;
      for (const r of I.rooms) { if (!['sala', 'circ', 'cocina'].includes(r.type)) continue; const ring = r.o;
        for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 0.9) continue;
          const ux = dx / L, uz = dz / L; let nx = -uz, nz = ux; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; if (!pipRing(ring, mx + nx * 0.3, mz + nz * 0.3)) { nx = -nx; nz = -nz; }
          if (!pipRing(ring, mx + nx * 0.3, mz + nz * 0.3)) continue;
          const s0 = IN + 0.05, s1 = L - IN - 0.05; if (s1 - s0 < 0.5) continue;
          const g = new THREE.BoxGeometry(s1 - s0, 0.008, 0.035); g.rotateY(Math.atan2(-uz, ux)); g.translate(a[0] + ux * (s0 + s1) / 2 + nx * IN, H - 0.0105, a[1] + uz * (s0 + s1) / 2 + nz * IN); cv.push(g.toNonIndexed()); } }
      TIP.cove = cv.length ? mergeGeometries(cv) : null; }
    // v8: cuadros abstractos enmarcados en muros libres de la circulación y el hall (ref_06)
    { const A = [[], [], []], F = new GB(); let n = 0; const fcol = C('#ffffff');
      const blocked = (x0, z0, x1, z1, s0, s1) => { const L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L; const proj = (x, z) => [(x - x0) * ux + (z - z0) * uz, Math.abs(-(x - x0) * uz + (z - z0) * ux)];
        for (const d of I.doors) for (const q of [d.h, d.c]) { const [t, o] = proj(q[0], q[1]); if (o < 0.3 && t > s0 - 0.25 && t < s1 + 0.25) return true; }
        for (const w of I.wins) { const [t, o] = proj((w.x0 + w.x1) / 2, (w.z0 + w.z1) / 2); const hw = Math.max(w.x1 - w.x0, w.z1 - w.z0) / 2; if (o < 0.3 && t + hw > s0 - 0.1 && t - hw < s1 + 0.1) return true; }
        { const [t, o] = proj((I.edoor[0] + I.edoor[1]) / 2, (I.edoor[2] + I.edoor[3]) / 2); if (o < 0.4 && t + 1.0 > s0 && t - 1.0 < s1) return true; }
        for (const f of I.fur) { const cx = (f.b[0] + f.b[2]) / 2, cz = (f.b[1] + f.b[3]) / 2; const [t, o] = proj(cx, cz); const hw = Math.max(f.b[2] - f.b[0], f.b[3] - f.b[1]) / 2; if (o < 0.7 && t + hw > s0 && t - hw < s1) return true; }
        return false; };
      for (const [x0, z0, x1, z1, nx, nz, rid] of I.faces) { const t = rtype(rid); if (!['circ', 'hall'].includes(t)) continue; const L = Math.hypot(x1 - x0, z1 - z0); if (L < 1.3) continue;
        const w = L > 2.2 ? 0.9 : 0.6, h = L > 2.2 ? 0.65 : 0.8, s0 = L / 2 - w / 2, s1 = L / 2 + w / 2; if (blocked(x0, z0, x1, z1, s0, s1)) continue;
        const ux = (x1 - x0) / L, uz = (z1 - z0) / L, cx = x0 + ux * L / 2 + nx * 0.014, cz = z0 + uz * L / 2 + nz * 0.014;
        const pg = new THREE.PlaneGeometry(w - 0.06, h - 0.06); pg.rotateY(Math.atan2(nx, nz)); pg.translate(cx + nx * 0.006, 1.5, cz + nz * 0.006); A[n % 3].push(pg.toNonIndexed()); n++;
        const P = (s, d) => [x0 + ux * s + nx * d, z0 + uz * s + nz * d]; const q0 = P(s0, 0.002), q1 = P(s1, 0.002), q2 = P(s1, 0.028), q3 = P(s0, 0.028);
        F.prism([q0, q1, q2, q3], 1.5 - h / 2, 1.5 - h / 2 + 0.03, fcol); F.prism([q0, q1, q2, q3], 1.5 + h / 2 - 0.03, 1.5 + h / 2, fcol);
        const e0 = [P(s0, 0.002), P(s0 + 0.03, 0.002), P(s0 + 0.03, 0.028), P(s0, 0.028)], e1 = [P(s1 - 0.03, 0.002), P(s1, 0.002), P(s1, 0.028), P(s1 - 0.03, 0.028)];
        F.prism(e0, 1.5 - h / 2 + 0.03, 1.5 + h / 2 - 0.03, fcol); F.prism(e1, 1.5 - h / 2 + 0.03, 1.5 + h / 2 - 0.03, fcol);
        const bk = [P(s0 + 0.03, 0.002), P(s1 - 0.03, 0.002), P(s1 - 0.03, 0.012), P(s0 + 0.03, 0.012)]; F.prism(bk, 1.5 - h / 2 + 0.03, 1.5 + h / 2 - 0.03, C('#f4f2ee')); }
      A.forEach((gs, i) => { if (gs.length) TIP.meshes.push(mesh(mergeGeometries(gs), MI.art[i], false)); }); if (F.p.length) TIP.meshes.push(mesh(F.geo(), MI.artF)); TIP.artN = n; }
  }

  // ---------- mobiliario ilustrativo (a partir de los bloques de mobiliario del plano) ----------
  // v7: mobiliario y aparatos ilustrativos detallados (src/fur7.js)
  const FUR = (() => { const r = buildFur7({ I, T, R, pipRing, T8 }); return { coll: r.coll, meshes: r.meshes, setQuality: r.setQuality, register: r.register, sinks: r.sinks }; })();

  // ---------- letreros de recintos (adhesivo sutil en el piso, legible en planta y en el recorrido) ----------
  const roomSign = new Map();
  const signGeo = new THREE.PlaneGeometry(1, 1); signGeo.rotateX(-Math.PI / 2);
  const signs = [];
  for (const r of I.rooms) {
    if (['hall', 'cabina'].includes(r.type)) continue;
    const t = textTex([{ t: r.name.toUpperCase(), s: 44, w: 700, ls: 4 }, { t: (r.area ? r.area.toFixed(2).replace('.', ',') + ' m²' : ''), s: 34, w: 500 }], { w: 640, h: 140, y0: 10, color: 'rgba(40,36,30,0.75)' });
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.62, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const o = new THREE.Mesh(signGeo, m); const wdt = r.type === 'bano' || r.type === 'ropas' ? 0.95 : 1.35; o.scale.set(wdt, 1, wdt * 140 / 640); o.position.set(r.lp[0], 0.012, r.lp[1] + 0.25); o.renderOrder = 2;
    signs.push(o); roomSign.set(r.id, o);
  }

  // ---------- puertas (hojas en madera, giran según el arco del plano) ----------
  const leafCache = new Map();
  function leafGeo(w, entry) {
    const key = w.toFixed(3) + entry; if (leafCache.has(key)) return leafCache.get(key);
    const B = new GB(1.0, 2.1), L = w - 0.03, t = 0.042, wc = C(entry ? '#d9c3a6' : '#ffffff'), hc = C('#b9bec3');
    B.box(0.015, 0.015 + L, 0.01, DOORH - 0.01, -t / 2, t / 2, wc);
    if (entry) { for (const z of [t / 2 + 0.002, -t / 2 - 0.004]) { B.box(0.12, L - 0.1, 0.25, 0.27, z, z + 0.002, C('#9a7a58')); B.box(0.12, L - 0.1, 1.8, 1.82, z, z + 0.002, C('#9a7a58')); } }
    // v7: bisagras (3) en el canto de giro y rosetas de la manija
    for (const y of [0.2, 1.05, 1.86]) B.box(0.002, 0.016, y, y + 0.1, -t / 2 - 0.003, t / 2 + 0.003, C('#9aa0a6'));
    for (const s of [1, -1]) B.box(L - 0.105, L - 0.055, 0.995, 1.045, s > 0 ? t / 2 : -t / 2 - 0.007, s > 0 ? t / 2 + 0.007 : -t / 2, hc);
    // manija (lado de cierre)
    for (const s of [1, -1]) { B.box(L - 0.09, L - 0.07, 0.98, 1.06, s * t / 2, s * (t / 2 + 0.05), hc); B.box(L - 0.2, L - 0.07, 1.01, 1.03, s * (t / 2 + 0.035), s * (t / 2 + 0.055), hc); }
    const g = B.geo(); leafCache.set(key, g); return g;
  }
  function frameGeo() {
    const B = new GB(0.5, 0.5), fc = C('#ffffff');
    for (const d of I.doors) {
      const h = d.h, c = d.c, n = d.n, u = [(c[0] - h[0]) / d.w, (c[1] - h[1]) / d.w]; const W = Math.hypot(c[0] - h[0], c[1] - h[1]);
      const ta = Math.min(d.t0, d.t1) - 0.012, tb = Math.max(d.t0, d.t1) + 0.012; const P = (s, t) => [h[0] + u[0] * s + n[0] * t, h[1] + u[1] * s + n[1] * t];
      B.prism([P(-0.05, ta), P(0.0, ta), P(0.0, tb), P(-0.05, tb)], 0, DOORH + 0.05, fc); B.prism([P(W, ta), P(W + 0.05, ta), P(W + 0.05, tb), P(W, tb)], 0, DOORH + 0.05, fc);
      B.prism([P(-0.05, ta), P(W + 0.05, ta), P(W + 0.05, tb), P(-0.05, tb)], DOORH, DOORH + 0.05, fc);
    }
    return B.geo();
  }
  const DOORFRAME = frameGeo();
  function makeDoors(levelId, parent) {
    const out = [];
    for (const d of I.doors) {
      const n = d.n, u = [(d.c[0] - d.h[0]) / Math.hypot(d.c[0] - d.h[0], d.c[1] - d.h[1]), (d.c[1] - d.h[1]) / Math.hypot(d.c[0] - d.h[0], d.c[1] - d.h[1])];
      const off = Math.max(d.t0, d.t1) - 0.026; const hx = d.h[0] + n[0] * off, hz = d.h[1] + n[1] * off; const W = Math.hypot(d.c[0] - d.h[0], d.c[1] - d.h[1]);
      const piv = new THREE.Group(); piv.position.set(hx, 0, hz); const m = mesh(leafGeo(W, d.entry), d.entry ? MI.woodE : MI.woodI); piv.add(m); parent.add(piv);
      const mid = (d.t0 + d.t1) / 2; const cx = d.h[0] + u[0] * W / 2 + n[0] * mid, cz = d.h[1] + u[1] * W / 2 + n[1] * mid;
      const D = { lvl: levelId, piv, hx, hz, u, n, w: W - 0.02, a: 0, tgt: 0, max: 1.52, entry: d.entry, ra: d.ra, rb: d.rb, cx, cz };
      D.set = (a) => { D.a = a; const dx = Math.cos(a) * u[0] + Math.sin(a) * n[0], dz = Math.cos(a) * u[1] + Math.sin(a) * n[1]; piv.rotation.y = -Math.atan2(dz, dx); };
      D.seg = () => { const dx = Math.cos(D.a) * u[0] + Math.sin(D.a) * n[0], dz = Math.cos(D.a) * u[1] + Math.sin(D.a) * n[1]; return [hx, hz, hx + dx * D.w, hz + dz * D.w]; };
      D.set(0); out.push(D);
    }
    return out;
  }
  // placas de apartamento (lado hall de cada puerta de acceso)
  const APTN = { '01': 1, '02': 2, '03': 3, '04': 4 };
  const APTTYPE = { '01': 'Tipo 1', '02': 'Tipo 1', '03': 'Tipo 2', '04': 'Tipo 3' };
  const aptOfDoor = (d) => { const r = R.get(d.ra)?.apt ? R.get(d.ra) : R.get(d.rb); return r?.apt; };
  function plaques(levelId, parent) {
    const fl = +levelId.slice(1);
    for (const d of I.doors.filter((q) => q.entry)) {
      const apt = aptOfDoor(d); if (!apt) continue;
      const t = textTex([{ t: String(fl * 100 + APTN[apt]), s: 88, w: 700, c: '#f4efe6' }, { t: 'APTO · ' + APTTYPE[apt].toUpperCase(), s: 26, w: 600, c: '#c9a77c', ls: 3 }], { w: 300, h: 200, y0: 22, bg: '#1d1f23', r: 14 });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.133), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, metalness: 0.2 }));
      const u = [(d.c[0] - d.h[0]) / d.w, (d.c[1] - d.h[1]) / d.w]; const W = Math.hypot(d.c[0] - d.h[0], d.c[1] - d.h[1]); const off = Math.min(d.t0, d.t1) - 0.006;
      const x = d.h[0] + u[0] * (W + 0.2) + d.n[0] * off, z = d.h[1] + u[1] * (W + 0.2) + d.n[1] * off;
      m.position.set(x, 1.55, z); m.lookAt(x - d.n[0], 1.55, z - d.n[1]); parent.add(m);
    }
  }

  // ---------- balcón (apto x04): puerta-ventana corrediza V-7, fijo V-8, baranda ----------
  const V7 = I.wins.find((w) => w.code === 'V-7'), V8 = I.wins.find((w) => w.code === 'V-8');
  const BAL = I.rooms.find((r) => r.type === 'balcon');
  const EXT = { v7: {} };
  function balcony(levelId, parent) {
    const B = new GB(), Gl = new GB(); const xm = (V7.x0 + V7.x1) / 2; const w = C('#ffffff');
    // marco fijo
    B.box(xm - 0.05, xm + 0.05, V7.head - 0.05, V7.head, V7.z0, V8.z1, w); B.box(xm - 0.05, xm + 0.05, 0, 0.03, V7.z0, V7.z1, w);
    const zc = (V7.z0 + V7.z1) / 2; B.box(xm - 0.05, xm - 0.005, 0.03, V7.head - 0.05, zc - 0.025, zc + 0.025, w);
    Gl.box(xm - 0.04, xm - 0.03, 0.03, V7.head - 0.05, V7.z0, zc, w); B.box(xm - 0.05, xm - 0.02, 0.03, V7.head - 0.05, V7.z0, V7.z0 + 0.04, w);
    // V-8 fijo
    Gl.box(xm - 0.006, xm + 0.006, 0.0, V8.head, V8.z0, V8.z1, w); B.box(xm - 0.03, xm + 0.03, 0, 0.04, V8.z0, V8.z1, w); B.box(xm - 0.03, xm + 0.03, V8.head - 0.04, V8.head, V8.z0, V8.z1, w);
    parent.add(mesh(B.geo(), MI.alu), mesh(Gl.geo(), MI.glass, false));
    // hoja corrediza (riel interior)
    const sl = new THREE.Group(); const SB = new GB(), SG = new GB();
    SB.box(xm + 0.005, xm + 0.045, 0.03, V7.head - 0.05, zc, zc + 0.045, w); SB.box(xm + 0.005, xm + 0.045, 0.03, V7.head - 0.05, V7.z1 - 0.045, V7.z1, w); SB.box(xm + 0.005, xm + 0.045, 0.03, 0.09, zc, V7.z1, w); SB.box(xm + 0.005, xm + 0.045, V7.head - 0.11, V7.head - 0.05, zc, V7.z1, w);
    SB.box(xm + 0.045, xm + 0.06, 0.95, 1.15, zc + 0.05, zc + 0.07, C('#222'));
    SG.box(xm + 0.02, xm + 0.03, 0.09, V7.head - 0.11, zc, V7.z1, w);
    sl.add(mesh(SB.geo(), MI.alu), mesh(SG.geo(), MI.glass, false)); parent.add(sl);
    // baranda de vidrio en el borde del balcón
    const bx = Math.min(...BAL.o.map((p) => p[0])) + 0.03, bz0 = Math.min(...BAL.o.map((p) => p[1])), bz1 = Math.max(...BAL.o.map((p) => p[1]));
    // Fotos: parales blancos, 4 cables y pasamanos plano amarillo-oro (el video pide cobre; mandan las fotos).
    // Van en el grupo exterior del nivel (no en el interior) para que el balcón se vea también desde la vista orbital.
    const ext = new THREE.Group(); ext.name = 'balExt'; ext.position.y = LEVY[levelId]; lv(levelId).g.add(ext); const parent0 = parent; parent = ext;
    // vano V-7 visto desde afuera (solo cuando el interior está oculto): vidrio oscuro + marco negro
    { const VG = new GB(), VF = new GB(); VG.box(xm - 0.006, xm + 0.006, 0.03, V7.head - 0.05, V7.z0, V7.z1, w); VG.box(xm - 0.006, xm + 0.006, 0.03, V8.head, V8.z0, V8.z1, w);
      VF.box(xm - 0.05, xm + 0.05, 0, 0.03, V7.z0, V8.z1, w); VF.box(xm - 0.05, xm + 0.05, V7.head - 0.05, V7.head, V7.z0, V8.z1, w); VF.box(xm - 0.05, xm + 0.0, 0.03, V7.head - 0.05, zc - 0.025, zc + 0.025, w); VF.box(xm - 0.05, xm + 0.0, 0.03, V7.head - 0.05, V7.z1 - 0.02, V7.z1 + 0.02, w);
      const vx = new THREE.Group(); vx.name = 'v7ext'; vx.add(mesh(VF.geo(), MI.alu), mesh(VG.geo(), MI.v7ext, false)); ext.add(vx); EXT.v7[levelId] = vx; }
    { const n = Math.max(2, Math.round((bz1 - bz0) / 1.05)); const posts = [];
      for (let i = 0; i <= n; i++) { const z = bz0 + 0.04 + (bz1 - bz0 - 0.08) * i / n; const c = new THREE.CylinderGeometry(0.021, 0.021, 0.985, 14); c.translate(bx, 0.4925, z); posts.push(c.toNonIndexed()); }
      parent.add(mesh(mergeGeometries(posts), MI.wpost));
      const CB = new GB(); for (const y of [0.22, 0.40, 0.58, 0.76]) CB.box(bx - 0.003, bx + 0.003, y - 0.003, y + 0.003, bz0 + 0.02, bz1 - 0.02, C('#c9ced3'));
      CB.box(bx - 0.035, bx + 0.035, 0.985, 1.015, bz0, bz1, C('#e0b04a')); parent.add(mesh(CB.geo(), MI.railVC)); // 4 cables + pasamanos amarillo-oro (fotos)
      // matera con planta tropical y silla blanca (ilustrativas, como en los renders)
      const px = bx + 0.3, pz = bz0 + 0.32, PB = new GB(1, 1), oct = (r) => [...Array(10)].map((_, i) => [px + r * Math.cos(i * Math.PI / 5), pz + r * Math.sin(i * Math.PI / 5)]);
      PB.prism(oct(0.15), 0, 0.12, C('#d68f4f')); PB.prism(oct(0.152), 0.12, 0.2, C('#f1ece2')); PB.prism(oct(0.154), 0.2, 0.3, C('#2f6b5a')); PB.prism(oct(0.14), 0.3, 0.31, C('#3a2c20'));
      const pl = mesh(tropicalGeo(px, 0.3, pz, 0.6, 0.62, 0.4), PL8.trop); parent.add(pl);
      const cx = bx + 0.5, cz = bz1 - 0.5, CH = PB, wc = C('#f4f3f0'), lc = C('#222222');
      CH.box(cx - 0.22, cx + 0.22, 0.42, 0.46, cz - 0.22, cz + 0.22, wc); CH.box(cx + 0.18, cx + 0.23, 0.46, 0.86, cz - 0.21, cz + 0.21, wc);
      for (const [dx, dz] of [[-0.18, -0.18], [-0.18, 0.18], [0.18, -0.18], [0.18, 0.18]]) CH.box(cx + dx - 0.012, cx + dx + 0.012, 0, 0.42, cz + dz - 0.012, cz + dz + 0.012, lc);
      parent.add(mesh(CH.geo(), MI.furn)); }
    parent = parent0;
    const S2 = { lvl: levelId, g: sl, a: 0, tgt: 0, zc, x: xm, z0: V7.z0, z1: V7.z1, cx: xm, cz: (V7.z0 + V7.z1) / 2 };
    S2.set = (a) => { S2.a = a; sl.position.z = -(zc - V7.z0 - 0.04) * a; };
    S2.seg = () => [xm + 0.03, zc - (zc - V7.z0 - 0.04) * S2.a, xm + 0.03, V7.z1 - (zc - V7.z0 - 0.04) * S2.a];
    return S2;
  }
  const BX0 = Math.min(...BAL.o.map((p) => p[0])) + 0.03, BZ0 = Math.min(...BAL.o.map((p) => p[1])), BZ1 = Math.max(...BAL.o.map((p) => p[1]));
  const balProps = [[BX0 + 0.13, BZ0 + 0.15, BX0 + 0.47, BZ0 + 0.49], [BX0 + 0.26, BZ1 - 0.74, BX0 + 0.75, BZ1 - 0.26]].flatMap(([x0, z0, x1, z1]) => [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]]);
  const balSegs = [...balProps, [Math.min(...BAL.o.map((p) => p[0])) + 0.03, Math.min(...BAL.o.map((p) => p[1])), Math.min(...BAL.o.map((p) => p[0])) + 0.03, Math.max(...BAL.o.map((p) => p[1]))], [V7.x0, V7.z0, V7.x1, V7.z0], [V7.x0 + 0.02, (V7.z0 + V7.z1) / 2, V7.x1 - 0.02, (V7.z0 + V7.z1) / 2], [(V7.x0 + V7.x1) / 2 - 0.03, V7.z0, (V7.x0 + V7.x1) / 2 - 0.03, (V7.z0 + V7.z1) / 2]];

  // ---------- señalización de hall/escalera por piso ----------
  function hallSigns(levelId, parent) {
    const fl = levelId === 'p1' ? 1 : levelId === 'sot' ? 0 : +levelId.slice(1); const y0 = LEVY[levelId] - LEVY[levelId];
    const name = levelId === 'sot' ? 'SÓTANO' : 'PISO ' + fl;
    const add = (tex, w, h, x, y, z, nx, nz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.1, transparent: true })); m.position.set(x, y0 + y, z); m.lookAt(x + nx, y0 + y, z + nz); parent.add(m); return m; };
    if (/^p[2-7]$/.test(levelId)) {
      const t = textTex([{ t: String(fl), s: 150, w: 300, c: '#f4efe6' }, { t: 'PISO', s: 34, w: 600, c: '#c9a77c', ls: 10 }, { t: `APTOS ${fl}01 · ${fl}02 · ${fl}03 · ${fl}04`, s: 24, w: 500, c: '#d8d2c6', ls: 2 }], { w: 400, h: 330, y0: 14, bg: '#1d1f23', r: 18 });
      add(t, 0.48, 0.4, 21.92, 1.35, 8.705, 0, 1); // muro norte de la franja superior del hall, entre las ventanas altas
      const d1 = textTex([{ t: `← ${fl}04   ·   ${fl}03 ↑`, s: 40, w: 600, c: '#f4efe6' }], { w: 512, h: 72, bg: '#1d1f23', r: 10 });
      add(d1, 0.6, 0.085, 19.34, 2.0, 7.6, 1, 0);
      const d2 = textTex([{ t: `${fl}01 · ${fl}02 ↓`, s: 40, w: 600, c: '#f4efe6' }], { w: 360, h: 72, bg: '#1d1f23', r: 10 });
      add(d2, 0.42, 0.085, 21.92, 1.85, 8.705, 0, 1);
    }
    // escalera
    const up = levelId === 'p7' ? 'Cubierta: fuera del recorrido' : `↑ ${levelId === 'sot' ? 'Piso 1' : 'Piso ' + (fl + 1)}`;
    const dn = levelId === 'sot' ? '' : `↓ ${fl === 1 ? 'Sótano' : 'Piso ' + (fl - 1)}`;
    const ts = textTex([{ t: 'ESCALERA · ' + name, s: 34, w: 700, c: '#f4efe6', ls: 2 }, { t: up + (dn ? '    ' + dn : ''), s: 28, w: 500, c: '#c9a77c' }], { w: 600, h: 110, y0: 8, bg: '#1d1f23', r: 12 });
    add(ts, 0.62, 0.115, 21.0, 2.2, 9.71, 0, 1);
    // ascensor: rótulo de piso junto a la puerta
    const te = textTex([{ t: name, s: 46, w: 700, c: '#f4efe6', ls: 3 }], { w: 300, h: 80, bg: '#1d1f23', r: 10 });
    add(te, 0.36, 0.096, 19.37, 1.62, 9.92, 1, 0);
  }

  // ====================== ESCALERA EN U (PL_A002: 2 tramos × 7 huellas 0,30 + descanso 1,00) ======================
  const ST = I.stair; const NT = 7, TW = 0.3;
  function stairPair(a, b) { // y(a) → y(b), 16 contrahuellas
    const hr = (b - a) / 16, m = a + 8 * hr; return { a, b, hr, m };
  }
  function stairY(P, x, z) { // altura de pisada en la escalera del par P (o null)
    if (x < ST.x0 || x > ST.xl || z < ST.z0 || z > ST.z1) return null;
    if (x >= ST.x1) return P.m;
    if (z < ST.zm) { const k = Math.min(NT, Math.floor((x - ST.x0) / TW) + 1); return P.a + k * P.hr; }
    const kk = Math.min(NT, Math.floor((ST.x1 - x) / TW) + 1); return P.m + kk * P.hr;
  }
  function stairGeo(P) {
    const B = new GB(1.2, 1.2); const Rl = new GB(), tc = C('#d8d6d0'), rc = C('#1a1a1a'), D = new GB(), sc = C('#333333');
    // Huella abierta: concreto claro de 5 cm en la cota de la planta (7 × 0,30 m) y zanca de acero #333.
    // La escalera sigue siendo la U del plano, no la zanca única del video.
    const TT = 0.05;
    for (let k = 1; k <= NT; k++) { const xa = ST.x0 + (k - 1) * TW, xb = xa + TW, y = P.a + k * P.hr; B.box(xa, xb + 0.015, y - TT, y, ST.z0, ST.zm - 0.04, tc); }
    B.box(ST.x1, ST.xl, P.m - TT, P.m, ST.z0, ST.z1, tc);
    for (let kk = 1; kk <= NT; kk++) { const xb = ST.x1 - (kk - 1) * TW, xa = xb - TW, y = P.m + kk * P.hr; B.box(xa - 0.015, xb, y - TT, y, ST.zm + 0.04, ST.z1, tc); }
    const yA0 = P.a + P.hr - 0.1, yA1 = P.m - 0.1, yB1 = P.b - P.hr - 0.1;
    D.bar([ST.x0, yA0, ST.z0 + 0.08], [ST.x1, yA1, ST.z0 + 0.08], 0.042, sc);
    D.bar([ST.x0, yA0, ST.zm - 0.1], [ST.x1, yA1, ST.zm - 0.1], 0.042, sc);
    D.bar([ST.x1, yA1, ST.zm + 0.1], [ST.x0 + TW, yB1, ST.zm + 0.1], 0.042, sc);
    D.bar([ST.x1, yA1, ST.z1 - 0.08], [ST.x0 + TW, yB1, ST.z1 - 0.08], 0.042, sc);
    D.bar([ST.x1, P.m - 0.1, ST.z0 + 0.08], [ST.xl - 0.05, P.m - 0.1, ST.z0 + 0.08], 0.042, sc);
    D.bar([ST.x1, P.m - 0.1, ST.z1 - 0.08], [ST.xl - 0.05, P.m - 0.1, ST.z1 - 0.08], 0.042, sc);
    D.bar([ST.xl - 0.06, P.m - 0.1, ST.z0 + 0.08], [ST.xl - 0.06, P.m - 0.1, ST.z1 - 0.08], 0.042, sc);
    // pasamanos en el ojo de la escalera (eje z = zm) + balaustres anclados a cada huella
    const hy = 0.9; const p0 = [ST.x0, P.a + P.hr + hy, ST.zm - 0.05], p1 = [ST.x1, P.m + hy, ST.zm - 0.05], q0 = [ST.x1, P.m + hy, ST.zm + 0.05], q1 = [ST.x0, P.b - P.hr + hy, ST.zm + 0.05];
    Rl.bar(p0, p1, 0.022, rc); Rl.bar(q0, q1, 0.022, rc); Rl.bar(p1, q0, 0.022, rc);
    for (let k = 1; k <= NT; k += 2) { const x = ST.x0 + (k - 0.5) * TW; Rl.bar([x, P.a + k * P.hr, ST.zm - 0.05], [x, P.a + k * P.hr + hy, ST.zm - 0.05], 0.012, rc); Rl.bar([ST.x1 - (k - 0.5) * TW, P.m + k * P.hr, ST.zm + 0.05], [ST.x1 - (k - 0.5) * TW, P.m + k * P.hr + hy, ST.zm + 0.05], 0.012, rc); }
    Rl.bar([ST.x1 - 0.02, P.m, ST.zm - 0.05], [ST.x1 - 0.02, P.m + hy, ST.zm - 0.05], 0.014, rc); Rl.bar([ST.x1 - 0.02, P.m, ST.zm + 0.05], [ST.x1 - 0.02, P.m + hy, ST.zm + 0.05], 0.014, rc);
    // v7: barandas perimetrales continuas y ancladas (vidrio templado + pasamanos + parales), sin piezas sueltas
    const Gl = new GB(), gw = C('#ffffff');
    const glassRun = (xa, ya, xb, yb, z, posts) => { // panel de vidrio que sigue la pendiente (ya/yb = nivel de pisada en cada extremo)
      Gl.quad([xa, ya + 0.06, z], [xb, yb + 0.06, z], [xb, yb + 0.92, z], [xa, ya + 0.92, z], [0, 0, 1], gw);
      Rl.bar([xa, ya + 0.96, z], [xb, yb + 0.96, z], 0.022, rc); Rl.bar([xa, ya + 0.04, z], [xb, yb + 0.04, z], 0.012, rc);
      for (const t of posts) { const x = xa + (xb - xa) * t, y = ya + (yb - ya) * t; Rl.bar([x, y - 0.02, z], [x, y + 0.96, z], 0.016, rc); } };
    const zo = ST.z0 + 0.03, zi = ST.z1 - 0.03;
    glassRun(ST.x0 + 0.02, P.a + P.hr, ST.x1, P.m, zo, [0, 0.5, 1]); // tramo 1, lado del hall (z0)
    glassRun(ST.x1, P.m, ST.xl - 0.02, P.m, zo, [0, 1]); // descanso, lado del hall
    glassRun(ST.x1, P.m, ST.xl - 0.02, P.m, zi, [0, 1]); // descanso, lado del vacío técnico
    glassRun(ST.x1, P.m, ST.x0 + 0.02, P.b - P.hr, zi, [0, 0.5, 1]); // tramo 2, lado del hall inferior (z1)
    // muro de cierre bajo el tramo 1 y el descanso (lado del hall): tapa el hueco bajo la escalera, de la losa al intradós
    const CW = new GB(1.5, 1.5), pc = C('#f1efea'); const ys = (x) => P.a - 0.16 + (P.m - P.a) * (x - ST.x0) / (ST.x1 - ST.x0);
    const xs = ST.x0 + (0.16) * (ST.x1 - ST.x0) / (P.m - P.a); // donde el intradós cruza el nivel del hall
    for (const z of [ST.z0 - 0.025, ST.z0 + 0.005]) { const nz = z < ST.z0 ? -1 : 1;
      CW.quad([xs, P.a, z], [ST.x1, P.a, z], [ST.x1, ys(ST.x1), z], [xs, ys(xs), z], [0, 0, nz], pc);
      CW.quad([ST.x1, P.a, z], [ST.xl, P.a, z], [ST.xl, P.m - 0.16, z], [ST.x1, P.m - 0.16, z], [0, 0, nz], pc); }
    CW.quad([xs, ys(xs), ST.z0 - 0.025], [ST.x1, ys(ST.x1), ST.z0 - 0.025], [ST.x1, ys(ST.x1), ST.z0 + 0.005], [xs, ys(xs), ST.z0 + 0.005], (() => { const L = Math.hypot(P.m - P.a, ST.x1 - ST.x0); return [-(P.m - P.a) / L, (ST.x1 - ST.x0) / L, 0]; })(), pc);
    return [mesh(B.geo(), MI.stair), mesh(D.geo(), MI.stairD), mesh(Rl.geo(), MI.rail), mesh(Gl.geo(), MI.glass, false), mesh(CW.geo(), MI.plaster)];
  }
  // barandas de vidrio del hall hacia los tramos (en cada nivel)
  // v7: cerramiento de la caja de escalera en sótano y piso 1 (allí no hay muros de apartamento al oriente; antes se veía el exterior)
  function stairEncl(parent, h) { const W = new GB(1.5, 1.5), pc = C('#f1efea'); W.box(ST.xl + 0.005, ST.xl + 0.155, 0.01, h, ST.z0 - 0.15, 12.75, pc); parent.add(mesh(W.geo(), MI.plaster)); }
  function stairGuards(parent, y0, top = false) { // v7: en z0 solo donde no sube otro tramo (piso 7); en z1 protege la bajada del tramo inferior
    const B = new GB(), G = new GB(), w = C('#ffffff');
    for (const [z, xa, xb] of (top ? [[ST.z0 - 0.02, ST.x0, ST.xl], [ST.z1, ST.x0, ST.x1]] : [[ST.z1, ST.x0, ST.x1]])) { G.box(xa, xb, y0 + 0.05, y0 + 1.0, z - 0.006, z + 0.006, w); B.box(xa, xb, y0 + 1.0, y0 + 1.05, z - 0.025, z + 0.025, w); for (let x = xa; x <= xb + 0.01; x += (xb - xa) / 3) B.box(x - 0.02, x + 0.02, y0, y0 + 1.0, z - 0.02, z + 0.02, w); }
    parent.add(mesh(B.geo(), MI.rail), mesh(G.geo(), MI.glass, false));
  }
  const PAIRS = []; for (let i = 0; i < FLOORS.length - 1; i++) PAIRS.push({ lo: FLOORS[i], hi: FLOORS[i + 1], ...stairPair(LEVY[FLOORS[i]], LEVY[FLOORS[i + 1]]) });

  // ====================== ASCENSOR (v7: cabina física, pozo con revestimiento, puertas de piso en cada nivel) ======================
  const SH = I.shaft, CB = I.cab, ED = I.edoor; // pozo 2.45×1.70; cabina; vano de puerta x 19.207–19.355, z 10.192–11.192
  const CI = { x0: CB[0] + 0.06, x1: 19.13, z0: SH[1] + 0.1, z1: SH[3] - 0.1 }; // v7: holgura de 6 cm con el pozo para el revestimiento
  const HC = 2.3; // altura libre de cabina
  const EZC = (ED[2] + ED[3]) / 2, EHW = (ED[3] - ED[2]) / 2 - 0.02; // centro y semiancho libre del vano (con retornos de 2 cm)
  const EV = { y: LEVY.p1, fi: 1, target: null, q: [], state: 'idle', door: 0, timer: 0, t: 0, dur: 0, y0: 0, y1: 0, dir: 0, v: 0, curLabel: '1' };
  const MV = {
    sat: std({ vertexColors: true, metalness: 0.6, roughness: 0.36 }), // acero satinado (sin textura rayada → sin moiré)
    door: std({ color: 0xd5d8dc, metalness: 0.78, roughness: 0.28 }), // acero inoxidable cepillado
    matte: std({ vertexColors: true, roughness: 0.85 }),
    shaft: std({ color: 0x8c8e8f, roughness: 0.95 }),
    led: new THREE.MeshBasicMaterial({ color: 0xfff7ea, toneMapped: false }),
  };
  // indicador digital (compartido por todos los pisos y la cabina): piso actual + flecha de dirección
  const indC = document.createElement('canvas'); indC.width = 256; indC.height = 96; const indT = new THREE.CanvasTexture(indC); indT.colorSpace = THREE.SRGBColorSpace;
  EV.drawInd = (lab, dir) => { const g = indC.getContext('2d'); g.fillStyle = '#07090c'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#ff5a36'; g.font = '700 70px "Segoe UI",Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lab, 150, 52);
    if (dir) { g.beginPath(); const y = 48; if (dir > 0) { g.moveTo(60, y - 22); g.lineTo(84, y + 14); g.lineTo(36, y + 14); } else { g.moveTo(60, y + 22); g.lineTo(84, y - 14); g.lineTo(36, y - 14); } g.fill(); } indT.needsUpdate = true; };
  EV.drawInd('1', 0);
  const indMat = new THREE.MeshBasicMaterial({ map: indT, toneMapped: false });
  // botonera de cabina (textura dinámica; las teclas se detectan por UV con el raycaster)
  const panC = document.createElement('canvas'); panC.width = 256; panC.height = 704; const panT = new THREE.CanvasTexture(panC); panT.colorSpace = THREE.SRGBColorSpace;
  const KEYS = [['p7', 0, 0], ['p6', 1, 0], ['p5', 0, 1], ['p4', 1, 1], ['p3', 0, 2], ['p2', 1, 2], ['p1', 0, 3], ['sot', 1, 3], ['open', 0, 4], ['close', 1, 4]];
  const keyRect = (c, r) => [40 + c * 100, 120 + r * 104, 76, 76];
  EV.drawPanel = (lit) => { const g = panC.getContext('2d'); const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, '#8f969c'); gr.addColorStop(0.5, '#cfd4d8'); gr.addColorStop(1, '#8f969c'); g.fillStyle = gr; g.fillRect(0, 0, 256, 704);
    g.fillStyle = '#07090c'; g.fillRect(36, 18, 184, 76); g.fillStyle = '#ff5a36'; g.font = '700 52px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText((EV.dir > 0 ? '▲ ' : EV.dir < 0 ? '▼ ' : '') + (EV.curLabel || ''), 128, 58);
    for (const [k, c, r] of KEYS) { const [x, y, w] = keyRect(c, r); const on = lit === k || EV.target === k || EV.q.includes(k); g.beginPath(); g.arc(x + w / 2, y + w / 2, w / 2, 0, 6.29); g.fillStyle = '#23272c'; g.fill(); g.lineWidth = 6; g.strokeStyle = on ? '#ffb547' : '#646a71'; g.stroke();
      if (on) { g.shadowColor = '#ffb547'; g.shadowBlur = 16; }
      g.fillStyle = on ? '#ffd27a' : '#eef1f4'; g.font = '700 38px Arial'; g.fillText(k === 'open' ? '◀▶' : k === 'close' ? '▶◀' : FLABEL[k], x + w / 2, y + w / 2 + 2); g.shadowBlur = 0; }
    g.fillStyle = '#2b2f34'; g.font = '600 18px Arial'; g.fillText('ED. ALMENDRA', 128, 676);
    panT.needsUpdate = true; };
  EV.keyAt = (uv) => { const px = uv.x * 256, py = (1 - uv.y) * 704; for (const [k, c, r] of KEYS) { const [x, y, w] = keyRect(c, r); if (Math.hypot(px - x - w / 2, py - y - w / 2) < w / 2 + 8) return k; } return null; };
  // ---------- cabina (cuerpo sólido: muros con ambas caras, techo, piso, pasamanos, panel posterior) ----------
  const cab = new THREE.Group(); cab.position.y = EV.y;
  {
    const S = new GB(1, 1), Mt = new GB(1, 1), T = 0.04;
    const cW = C('#c9ced3'), cK = C('#5a5f65'), cB = C('#6e5640'), cR = C('#b9bfc5'), cF = C('#2a2d31'), cA = C('#9aa0a6');
    const xo0 = CI.x0 - T, xo1 = CI.x1 + T, zo0 = CI.z0 - T, zo1 = CI.z1 + T;
    // muros laterales y posterior (cajas cerradas)
    S.box(xo0, xo1, 0, HC, zo0, CI.z0, cW); S.box(xo0, xo1, 0, HC, CI.z1, zo1, cW); S.box(xo0, CI.x0, 0, HC, CI.z0, CI.z1, cW);
    // frente con vano (jambas + dintel), mismo ancho libre que el vano de piso
    S.box(CI.x1, xo1, 0, HC, CI.z0, EZC - EHW, cW); S.box(CI.x1, xo1, 0, HC, EZC + EHW, CI.z1, cW); S.box(CI.x1, xo1, DOORH, HC, EZC - EHW, EZC + EHW, cW);
    // zócalos oscuros y panel posterior bronce satinado
    S.box(CI.x0, CI.x0 + 0.006, 0, 0.12, CI.z0, CI.z1, cK); S.box(CI.x0, CI.x1, 0, 0.12, CI.z0, CI.z0 + 0.006, cK); S.box(CI.x0, CI.x1, 0, 0.12, CI.z1 - 0.006, CI.z1, cK);
    const Bp = new GB(); Bp.box(CI.x0, CI.x0 + 0.008, 0.95, 2.05, CI.z0 + 0.22, CI.z1 - 0.22, cB); cab.add(mesh(Bp.geo(), std({ vertexColors: true, metalness: 0.1, roughness: 0.62 }), false, true));
    for (const z of [CI.z0, CI.z1]) S.box(CI.x0 + 0.35, CI.x1 - 0.25, 0.95, 2.05, z === CI.z0 ? z : z - 0.006, z === CI.z0 ? z + 0.006 : z, C('#b3b9bf'));
    // pasamanos (posterior y laterales) con soportes
    const hy = 0.9, ho = 0.055;
    S.bar([CI.x0 + ho, hy, CI.z0 + 0.15], [CI.x0 + ho, hy, CI.z1 - 0.15], 0.016, cR);
    S.bar([CI.x0 + 0.15, hy, CI.z0 + ho], [CI.x1 - 0.35, hy, CI.z0 + ho], 0.016, cR); S.bar([CI.x0 + 0.15, hy, CI.z1 - ho], [CI.x1 - 0.45, hy, CI.z1 - ho], 0.016, cR);
    for (const z of [CI.z0 + 0.25, CI.z1 - 0.25]) S.bar([CI.x0, hy, z], [CI.x0 + ho, hy, z], 0.01, cR);
    for (const x of [CI.x0 + 0.3, CI.x1 - 0.45]) { S.bar([x, hy, CI.z0], [x, hy, CI.z0 + ho], 0.01, cR); S.bar([x, hy, CI.z1], [x, hy, CI.z1 - ho], 0.01, cR); }
    // techo (cielo oscuro) + cubierta exterior de la cabina + umbral de aluminio
    Mt.box(xo0, xo1, HC, HC + 0.05, zo0, zo1, cF); Mt.box(xo0 + 0.1, xo1 - 0.1, HC + 0.05, HC + 0.2, zo0 + 0.1, zo1 - 0.1, C('#3a3d42'));
    S.box(CI.x1 - 0.02, ED[0] - 0.004, -0.004, 0.004, EZC - EHW - 0.02, EZC + EHW + 0.02, cA);
    cab.add(mesh(S.geo(), MV.sat), mesh(Mt.geo(), MV.matte, true, false));
    // piso de granito (losa de 12 cm; cubre hasta la cara del pozo → sin hueco entre cabina y piso)
    const Fl = new GB(0.8, 0.8); Fl.box(xo0, CI.x1 - 0.02, -0.12, 0.0, zo0, zo1, C('#ffffff')); Fl.box(CI.x1 - 0.02, ED[0] - 0.004, -0.12, -0.004, EZC - EHW - 0.02, EZC + EHW + 0.02, C('#ffffff')); cab.add(mesh(Fl.geo(), MI.gran, false, true));
    // luminaria LED del techo (emisiva, sin luz dinámica extra)
    const Lp = new GB(); Lp.box(CI.x0 + 0.2, CI.x1 - 0.2, HC - 0.006, HC - 0.001, CI.z0 + 0.25, CI.z1 - 0.25, C('#ffffff')); cab.add(mesh(Lp.geo(), MV.led, false, false));
    // botonera (lado sur del frente, cara interior del muro lateral z1) + indicador sobre la puerta
    EV.drawPanel(null);
    const pb = new GB(); pb.box(CI.x1 - 0.36, CI.x1 - 0.08, 0.86, 1.62, CI.z1 - 0.012, CI.z1, C('#7d838a')); cab.add(mesh(pb.geo(), MV.sat, false, false));
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.66), new THREE.MeshStandardMaterial({ map: panT, metalness: 0.4, roughness: 0.4, emissive: 0xffffff, emissiveMap: panT, emissiveIntensity: 0.35 }));
    pm.position.set(CI.x1 - 0.22, 1.24, CI.z1 - 0.0135); pm.rotation.y = Math.PI; cab.add(pm); EV.panelMesh = pm;
    const im = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.11), indMat); im.position.set(CI.x1 - 0.003, DOORH + 0.1, EZC); im.rotation.y = -Math.PI / 2; cab.add(im);
    const pl = textTex([{ t: 'Capacidad · por definir (ascensor no especificado en planos)', s: 22, w: 500, c: '#2b2f34' }], { w: 640, h: 44 });
    const pq = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.029), new THREE.MeshBasicMaterial({ map: pl, transparent: true })); pq.position.set(CI.x1 - 0.6, 1.7, CI.z1 - 0.007); pq.rotation.y = Math.PI; cab.add(pq);
    // puertas de cabina (2 hojas de apertura central, corren por el lado del pozo)
    const hw = EHW + 0.015; const dl = new GB(), dr = new GB(), wd = C('#ffffff');
    dl.box(xo1 + 0.002, xo1 + 0.022, 0.004, DOORH - 0.004, -hw, 0, wd); dr.box(xo1 + 0.002, xo1 + 0.022, 0.004, DOORH - 0.004, 0, hw, wd);
    EV.cdL = mesh(dl.geo(), MV.door); EV.cdR = mesh(dr.geo(), MV.door); EV.cdL.position.z = EZC; EV.cdR.position.z = EZC; cab.add(EV.cdL, EV.cdR);
    EV.light = { position: new THREE.Vector3((CI.x0 + CI.x1) / 2, HC - 0.4, (CI.z0 + CI.z1) / 2), intensity: 0 }; // la luz real la aporta FPL (v7: sin PointLight propia)
    // contrapeso (espacio x 16.755–17.5) con guías
    const Cw = new GB(); Cw.box(SH[0] + 0.15, CB[0] - 0.12, 0.5, 1.6, SH[1] + 0.5, SH[3] - 0.5, C('#3a3d42')); cab.add(mesh(Cw.geo(), MV.matte));
  }
  // ---------- pozo: revestimiento interior por nivel + puertas de piso, marco, umbral, botonera de llamada ----------
  const LAND = {};
  function landing(levelId, parent) {
    const i = FLOORS.indexOf(levelId), yTop = i < FLOORS.length - 1 ? LEVY[FLOORS[i + 1]] - LEVY[levelId] : H + 1.4, yBot = i === 0 ? -1.3 : 0;
    const g = new THREE.Group(); g.name = 'land_' + levelId; parent.add(g);
    // revestimiento del pozo (cajas delgadas = dos caras; 1 cm hacia dentro de los muros del plano → sin z-fighting)
    const Sh = new GB(), k = C('#ffffff'), e = 0.01, t = 0.03;
    Sh.box(SH[0] + e, SH[0] + e + t, yBot, yTop, SH[1] + e, SH[3] - e, k);
    Sh.box(SH[0] + e, ED[0] - e, yBot, yTop, SH[1] + e, SH[1] + e + t, k); Sh.box(SH[0] + e, ED[0] - e, yBot, yTop, SH[3] - e - t, SH[3] - e, k);
    if (i === 0) Sh.box(SH[0] + e, ED[0] - e, yBot - 0.05, yBot, SH[1] + e, SH[3] - e, k); // fondo del foso
    if (i === FLOORS.length - 1) Sh.box(SH[0] + e, ED[0] - e, yTop, yTop + 0.1, SH[1] + e, SH[3] - e, k); // losa de sala de máquinas
    g.add(mesh(Sh.geo(), MV.shaft, false, true));
    // marco (retornos que cubren el espesor del muro, arquitrabe a ras de la cara del hall), umbral y botonera
    const F = new GB(), cS = C('#1a1a1a'), cD = C('#3a3e43'), xa = ED[0] - 0.002, xb = ED[1], ja = 0.09;
    F.box(xa, xb, 0, DOORH, ED[2] - 0.0, ED[2] + 0.02, cS); F.box(xa, xb, 0, DOORH, ED[3] - 0.02, ED[3], cS); F.box(xa, xb, DOORH, DOORH + 0.02, ED[2], ED[3], cS);
    F.box(xb, xb + 0.018, 0, DOORH + 0.02 + ja, ED[2] - ja, ED[2] + 0.02, cS); F.box(xb, xb + 0.018, 0, DOORH + 0.02 + ja, ED[3] - 0.02, ED[3] + ja, cS); F.box(xb, xb + 0.018, DOORH + 0.02, DOORH + 0.02 + ja, ED[2] - ja, ED[3] + ja, cS);
    F.box(xa, xb + 0.03, -0.01, 0.004, ED[2] + 0.02, ED[3] - 0.02, cD); // umbral de aluminio
    F.box(xb, xb + 0.012, 0.98, 1.3, ED[3] + 0.17, ED[3] + 0.29, cS); // placa de llamada
    F.box(xb, xb + 0.01, DOORH + 0.16, DOORH + 0.32, EZC - 0.16, EZC + 0.16, cD); // marco del indicador
    g.add(mesh(F.geo(), MV.sat, false, true));
    // hojas de piso (2, apertura central) — dentro del espesor del muro
    const hw = EHW + 0.015; const dl = new GB(), dr = new GB(), wd = C('#ffffff'), xd = ED[0] + 0.03;
    dl.box(xd, xd + 0.022, 0.004, DOORH - 0.002, -hw, 0, wd); dr.box(xd, xd + 0.022, 0.004, DOORH - 0.002, 0, hw, wd);
    const L = mesh(dl.geo(), MV.door), Rr = mesh(dr.geo(), MV.door); L.position.z = EZC; Rr.position.z = EZC; g.add(L, Rr);
    // botón de llamada (se ilumina en ámbar cuando hay llamada registrada) e indicador de piso/dirección
    const bm = new THREE.MeshBasicMaterial({ color: 0xd8dde2, toneMapped: false });
    const btn = new THREE.Mesh(new THREE.CircleGeometry(0.024, 24), bm); btn.position.set(xb + 0.0135, 1.14, ED[3] + 0.23); btn.rotation.y = Math.PI / 2; g.add(btn);
    const im = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.11), indMat); im.position.set(xb + 0.0115, DOORH + 0.24, EZC); im.rotation.y = Math.PI / 2; g.add(im);
    LAND[levelId] = { L, Rr, btn, bm, zc: EZC, half: hw, g };
  }
  EV.setDoorsVisual = () => {
    const o = EV.door * (EHW * 2 - 0.02) / 2 * 1.0; const oc = EV.door * EHW;
    EV.cdL.position.z = EZC - oc; EV.cdR.position.z = EZC + oc;
    for (const id of FLOORS) { const Ld = LAND[id]; if (!Ld) continue; const oo = FLOORS[EV.fi] === id && EV.state !== 'moving' ? oc : 0; Ld.L.position.z = Ld.zc - oo; Ld.Rr.position.z = Ld.zc + oo; void o; }
  };
  EV.setCallLamp = (id, on) => { const Ld = LAND[id]; if (Ld) Ld.bm.color.set(on ? 0xffb547 : 0xd8dde2); };

  // ====================== PISO 1: lobby aproximado (plancha 1/6 faltante) ======================
  function lobby(parent) {
    const B = new GB(1.5, 1.5); const col = C('#eeece8');
    const wallsG = mergeGeometries(I.f1walls.map((p) => { const g = new THREE.ExtrudeGeometry(shapeOf(p), { depth: H1, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2); g.clearGroups(); return g.index ? g.toNonIndexed() : g; }));
    const pc = wallsG.attributes.position.count; const cc = new Float32Array(pc * 3); for (let i = 0; i < pc; i++) { cc[i * 3] = col.r; cc[i * 3 + 1] = col.g; cc[i * 3 + 2] = col.b; } wallsG.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    const uv = wallsG.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.5, uv.getY(i) / 1.5);
    parent.add(mesh(wallsG, MI.plaster));
    const fg = floorGeo(I.lobby, 0.006, T8.tileL, null); parent.add(mesh(fg, std({ map: T8.tileL, roughness: 0.22 }), false)); // v8: porcelanato claro como el hall de los renders
    // puerta automática de vidrio (acceso desde el paso peatonal)
    const x = 7.86; const F = new GB(), Gf = new GB(), w = C('#ffffff');
    F.box(x - 0.04, x + 0.04, 2.3, 2.42, 4.069, 6.413, w); for (const z of [4.069, 4.7, 6.1, 6.373]) F.box(x - 0.04, x + 0.04, 0, 2.3, z, z + 0.04, w); F.box(x - 0.04, x + 0.04, 2.42, H1, 4.069, 6.413, C('#d9d6cf'));
    Gf.box(x - 0.006, x + 0.006, 0, 2.3, 4.109, 4.7, w); Gf.box(x - 0.006, x + 0.006, 0, 2.3, 6.14, 6.373, w);
    parent.add(mesh(F.geo(), MI.alu), mesh(Gf.geo(), MI.glass, false));
    const pL = new GB(), pR = new GB(); pL.box(x + 0.01, x + 0.03, 0.02, 2.29, 4.74, 5.42, w); pR.box(x + 0.01, x + 0.03, 0.02, 2.29, 5.38, 6.06, w);
    const gL = mesh(pL.geo(), MI.glass, false), gR = mesh(pR.geo(), MI.glass, false); gL.userData.dyn = gR.userData.dyn = true; parent.add(gL, gR);
    const ent = { g: [gL, gR], a: 0, tgt: 0, cx: x, cz: 5.4 };
    ent.set = (a) => { ent.a = a; gL.position.z = -0.62 * a; gR.position.z = 0.62 * a; };
    ent.seg = () => (ent.a > 0.85 ? null : [x + 0.02, 4.7, x + 0.02, 6.1]);
    // letreros
    const t = textTex([{ t: 'EDIFICIO ALMENDRA', s: 46, w: 700, c: '#f4efe6', ls: 6 }, { t: 'LOBBY · PISO 1', s: 26, w: 600, c: '#c9a77c', ls: 6 }], { w: 640, h: 130, y0: 12, bg: '#1d1f23', r: 14 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.284), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 })); m.position.set(17.88, 2.1, 5.24); m.rotation.y = -Math.PI / 2; parent.add(m);
    const t2 = textTex([{ t: 'Piso 1 · distribución sin plano', s: 30, w: 700, c: '#ffd59a' }, { t: '(plancha 1/6 faltante: muros del lobby aproximados)', s: 22, w: 500, c: '#e8e2d6' }], { w: 640, h: 96, y0: 10, bg: 'rgba(29,31,35,0.92)', r: 12 });
    for (const [px, pz, ry] of [[12.3, 6.405, Math.PI], [12.3, 4.077, 0], [16.745, 7.6, Math.PI / 2], [17.905, 7.6, -Math.PI / 2]]) { const q = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.135), new THREE.MeshBasicMaterial({ map: t2, transparent: true })); q.position.set(px, 1.6, pz); q.rotation.y = ry; parent.add(q); }
    // cielo raso del lobby y luminarias
    /* v7: cielo raso sin cubrir el hueco de la escalera (antes I.lobbyAll tapaba la vista al subir) */ const cg = floorGeo(I.lobby, H1 - 0.005, null, null); const ce = mesh(cg, MI.ceil, true, true); parent.add(ce);
    const lg = []; for (const [lx, lz] of [[9.5, 5.24], [11.8, 5.24], [14.1, 5.24], [16.4, 5.24], [17.3, 7.6], [20.4, 10.7], [20.5, 9.2], [22.3, 12.2]]) { const c = new THREE.CircleGeometry(0.14, 20); c.rotateX(Math.PI / 2); c.translate(lx, H1 - 0.012, lz); lg.push(c.toNonIndexed()); }
    parent.add(mesh(mergeGeometries(lg), MI.lamp, false, false));
    // buzones (ilustrativo)
    const Bx = new GB(); Bx.box(16.62, 16.745, 0.9, 1.6, 4.6, 6.1, C('#3b3d42')); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) Bx.box(16.6, 16.62, 0.95 + j * 0.16, 1.07 + j * 0.16, 4.65 + i * 0.36, 4.97 + i * 0.36, C('#9aa0a6'));
    parent.add(mesh(Bx.geo(), MI.furn));
    return { ent, ceil: ce };
  }

  // ====================== ensamblar por nivel ======================
  const LEV = {};
  for (const id of FLOORS) {
    const l = lv(id); const int = new THREE.Group(); int.name = 'int_' + id; int.position.y = LEVY[id]; l.g.add(int);
    const E = { id, int, doors: [], y: LEVY[id] };
    if (/^p[2-7]$/.test(id)) {
      TIP.meshes.forEach((m) => { const c = new THREE.Mesh(m.geometry, m.material); c.castShadow = m.castShadow; c.receiveShadow = m.receiveShadow; int.add(c); });
      { const fg = new THREE.Group(); fg.name = 'fur'; int.add(fg); FUR.meshes.forEach((m) => { const c = new THREE.Mesh(m.geometry, m.material); c.castShadow = m.castShadow; c.receiveShadow = m.receiveShadow; c.userData = { ...m.userData }; fg.add(c); FUR.register(c); }); }
      signs.forEach((s) => int.add(s.clone()));
      const fr = mesh(DOORFRAME, MI.frame); int.add(fr);
      E.doors = makeDoors(id, int); plaques(id, int); E.bal = balcony(id, int); hallSigns(id, int); landing(id, int); stairGuards(int, 0, id === 'p7');
      E.ceil = new THREE.Group(); E.ceil.add(mesh(TIP.ceil, MI.ceil, true, true), mesh(TIP.lamps, MI.lamp, false, false)); if (TIP.cove) E.ceil.add(mesh(TIP.cove, MI.cove, false, false)); E.ceil.visible = false; int.add(E.ceil);
    } else if (id === 'p1') { const r = lobby(int); E.ent = r.ent; E.ceil = r.ceil; E.ceil.visible = false; hallSigns(id, int); landing(id, int); stairGuards(int, 0); stairEncl(int, LEVY.p2 - LEVY.p1 - 0.2); }
    else if (id === 'sot') { hallSigns(id, int); landing(id, int); stairEncl(int, LEVY.p1 - LEVY.sot - 0.2); const g = new THREE.Group(); int.add(g); stairGuards(g, 0); g.children.forEach((c) => { c.visible = true; }); }
    // escalera hacia el nivel superior (pertenece a este nivel)
    const P = PAIRS.find((p) => p.lo === id); if (P) stairGeo(P).forEach((m) => { m.position.y = -LEVY[id]; int.add(m); });
    LEV[id] = E;
  }
  // tope de escalera en piso 7 (hacia cubierta) y bajo la escalera del sótano
  {
    const t = textTex([{ t: 'ACCESO A CUBIERTA', s: 34, w: 700, c: '#f4efe6', ls: 3 }, { t: 'fuera del recorrido', s: 26, w: 500, c: '#c9a77c' }], { w: 512, h: 100, y0: 10, bg: '#1d1f23', r: 10 });
    const B = new GB(), w = C('#ffffff'); B.box(ST.x0 - 0.02, ST.x0 + 0.02, 0, 1.0, ST.z0, ST.zm, w); B.box(ST.x0 - 0.03, ST.x0 + 0.03, 1.0, 1.05, ST.z0, ST.zm, w);
    LEV.p7.int.add(mesh(B.geo(), MI.rail)); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.098), new THREE.MeshBasicMaterial({ map: t })); m.position.set(ST.x0 - 0.035, 0.8, (ST.z0 + ST.zm) / 2); m.rotation.y = -Math.PI / 2; LEV.p7.int.add(m);
    const B2 = new GB(); B2.box(ST.x0 - 0.02, ST.x0 + 0.02, 0, 1.0, ST.zm, ST.z1, w); LEV.sot.int.add(mesh(B2.geo(), MI.rail));
  }

  // ====================== datos para el recorrido ======================
  const faceSegs = I.faces.map((f) => [f[0], f[1], f[2], f[3]]);
  const winSegs = []; for (const w of I.wins) { if (w.code === 'V-7') continue; const ax = (w.x1 - w.x0) > (w.z1 - w.z0); if (ax) winSegs.push([w.x0, (w.z0 + w.z1) / 2, w.x1, (w.z0 + w.z1) / 2]); else winSegs.push([(w.x0 + w.x1) / 2, w.z0, (w.x0 + w.x1) / 2, w.z1]); }
  const skinSegs = S.skin.filter((p) => p.code !== 'V-7').map((p) => [p.a[0], p.a[1], p.b[0], p.b[1]]);
  const furSegs = FUR.coll.flatMap(([x0, z0, x1, z1]) => [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]]);
  const stairSegs = [[ST.x0, ST.z0, ST.xl, ST.z0], [ST.x0, ST.z1, ST.xl, ST.z1], [ST.x0, ST.zm, ST.x1, ST.zm], [ST.xl, ST.z0, ST.xl, ST.z1]];
  const voidSegs = []; for (const v of I.voids) { const r = v.o; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; voidSegs.push([a[0], a[1], b[0], b[1]]); } }
  // barandas de vacíos (bordes no cubiertos por muro) — visual por nivel
  const vB = new GB(), vG = new GB();
  for (const s of voidSegs) { const mx = (s[0] + s[2]) / 2, mz = (s[1] + s[3]) / 2; const near = I.faces.some((f) => { const fx = (f[0] + f[2]) / 2, fz = (f[1] + f[3]) / 2; return Math.hypot(fx - mx, fz - mz) < 0.25 && Math.hypot(f[2] - f[0], f[3] - f[1]) > 0.3; }); if (near) continue;
    if (s[0] > ST.x1 - 0.01 && Math.abs(s[1] - ST.z1) < 0.02 && Math.abs(s[3] - ST.z1) < 0.02) continue;
    const w = C('#ffffff'); const ax = Math.abs(s[2] - s[0]) > Math.abs(s[3] - s[1]); const [a0, a1] = ax ? [Math.min(s[0], s[2]), Math.max(s[0], s[2])] : [Math.min(s[1], s[3]), Math.max(s[1], s[3])];
    if (ax) { vG.box(a0, a1, 0.05, 1.0, mz - 0.006, mz + 0.006, w); vB.box(a0, a1, 1.0, 1.05, mz - 0.025, mz + 0.025, w); } else { vG.box(mx - 0.006, mx + 0.006, 0.05, 1.0, a0, a1, w); vB.box(mx - 0.025, mx + 0.025, 1.0, 1.05, a0, a1, w); } }
  if (vB.p.length) for (const id of ['p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p1']) { LEV[id].int.add(mesh(vB.geo(), MI.rail), mesh(vG.geo(), MI.glass, false)); }
  const elevSegs = [[SH[0], CI.z0, SH[2], CI.z0], [SH[0], CI.z1, SH[2], CI.z1], [SH[0], SH[1], SH[0], SH[3]], [CI.x0, SH[1], CI.x0, SH[3]]];
  return {
    MI, LEV, EV, cab, EXT, PAIRS, stairY, ST, CI, ED, SH, CB, LAND, roomSign,
    seg: { tip: [...faceSegs, ...winSegs, ...skinSegs, ...furSegs, ...balSegs, ...voidSegs], stair: stairSegs, elev: elevSegs,
      p1: [...segsOfPolys(I.f1walls), ...voidSegs], sotExtra: [] },
    walk: { tip: [...I.slab, BAL], p1: I.lobby },
    TIP, FUR, rooms: I.rooms,
  };
}
