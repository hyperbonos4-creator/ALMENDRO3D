// Interiores fieles a PL_A002 (muros/vanos/puertas/ventanas/mobiliario del vector del PDF), lobby aproximado del piso 1,
// escaleras caminables y ascensor (pozo/cabina/puertas) — todo procedural, sin red.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { textTex } from './tex.js';

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
    const s = ar > 0 ? 1 : -1;
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
const WALLC = { alcoba: ['#e6dac8', '#d9e2db', '#e6d8c6'], sala: ['#ece5d9'], circ: ['#e6e0d6'], cocina: ['#f0eee8'], ropas: ['#dfe4e3'], bano: ['#f1f1ee'], hall: ['#c9c0b2'], balcon: ['#d8d5ce'], cabina: ['#555a60'], none: ['#cfcac2'] };

export function buildWorld(ctx) {
  const { I, S, lv, T, M, isMobile } = ctx;
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
  };
  for (const k of ['lam', 'porc', 'porcD', 'cer', 'bath', 'terr']) MI[k].userData.floor = true;
  const FLOORMAT = { alcoba: 'lam', circ: 'lam', sala: 'porc', cocina: 'cer', ropas: 'cer', bano: 'bath', balcon: 'terr' };
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
    byMat.porcD = I.hallFloor;
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
  }

  // ---------- mobiliario ilustrativo (a partir de los bloques de mobiliario del plano) ----------
  const FUR = { coll: [] };
  {
    const fB = new GB(), wB2 = new GB(0.6, 0.6), faB = new GB(0.5, 0.5), glB = new GB(), stB = new GB(0.5, 0.5), wL = new GB(1.2, 1.2), grB = new GB(0.8, 0.8), glB2 = new GB(), scrB = new GB();
    const list = I.fur.slice();
    const sofas = list.filter((f) => f.k === 'sofa');
    const ov = (a, b) => { const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])), iz = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1])); return ix * iz / ((a[2] - a[0]) * (a[3] - a[1])); };
    const chairs = list.filter((f) => (f.k === 'sillon' || f.k === 'silla') && !sofas.some((s) => ov(f.b, s.b) > 0.4) && (f.b[2] - f.b[0]) < 0.75);
    const tables = list.filter((f) => f.k === 'mesa_comedor').map((f) => ({ x: (f.b[0] + f.b[2]) / 2, z: (f.b[1] + f.b[3]) / 2, b: f.b }));
    // mesas no detectadas (dibujadas como círculo): centro del grupo de sillas
    const used = new Set();
    for (const c of chairs) { if (used.has(c)) continue; const cx = (c.b[0] + c.b[2]) / 2, cz = (c.b[1] + c.b[3]) / 2; if (tables.some((t) => Math.hypot(t.x - cx, t.z - cz) < 1.3)) continue;
      const grp = chairs.filter((d) => Math.hypot((d.b[0] + d.b[2]) / 2 - cx, (d.b[1] + d.b[3]) / 2 - cz) < 1.6); if (grp.length < 3) continue; grp.forEach((d) => used.add(d));
      const tx = grp.reduce((s, d) => s + (d.b[0] + d.b[2]) / 2, 0) / grp.length, tz = grp.reduce((s, d) => s + (d.b[1] + d.b[3]) / 2, 0) / grp.length; tables.push({ x: tx, z: tz, round: true }); }
    const WOODC = C('#ffffff'), WHITE = C('#f3f1ec'), DARK = C('#2b2c2f');
    const side = (b, w) => w === 'x0' ? [-1, 0] : w === 'x1' ? [1, 0] : w === 'z0' ? [0, -1] : [0, 1];
    for (const f of list) {
      const [x0, z0, x1, z1] = f.b; const [sx, sz] = side(f.b, f.wall); const k = f.k;
      const coll = () => FUR.coll.push([x0 + 0.03, z0 + 0.03, x1 - 0.03, z1 - 0.03]);
      // franja junto al muro de un ancho t
      const strip = (t) => sx < 0 ? [x0, z0, x0 + t, z1] : sx > 0 ? [x1 - t, z0, x1, z1] : sz < 0 ? [x0, z0, x1, z0 + t] : [x0, z1 - t, x1, z1];
      if (k === 'cama') {
        wB2.box(x0 + 0.03, x1 - 0.03, 0.08, 0.32, z0 + 0.03, z1 - 0.03, WOODC);
        faB.box(x0 + 0.05, x1 - 0.05, 0.32, 0.52, z0 + 0.05, z1 - 0.05, C('#f4f2ee'));
        const hb = strip(0.06); faB.box(hb[0], hb[2], 0.0, 1.05, hb[1], hb[3], C('#6f665c'));
        // edredón (hacia los pies) y almohadas (junto al cabecero)
        const L = sx ? x1 - x0 : z1 - z0; const du = strip(L * 0.68); const foot = sx < 0 ? [x1 - L * 0.68, z0, x1, z1] : sx > 0 ? [x0, z0, x0 + L * 0.68, z1] : sz < 0 ? [x0, z1 - L * 0.68, x1, z1] : [x0, z0, x1, z0 + L * 0.68];
        void du; faB.box(foot[0] + 0.02, foot[2] - 0.02, 0.52, 0.57, foot[1] + 0.02, foot[3] - 0.02, C('#7d8ea0'));
        const pw = strip(0.42); const wide = sx ? (z1 - z0) : (x1 - x0); const np = wide > 1.2 ? 2 : 1;
        for (let i = 0; i < np; i++) { const a = i / np, b = (i + 1) / np; if (sx) faB.box(pw[0] + 0.08, pw[2] - 0.08, 0.52, 0.66, z0 + (z1 - z0) * a + 0.06, z0 + (z1 - z0) * b - 0.06, C('#ffffff')); else faB.box(x0 + (x1 - x0) * a + 0.06, x0 + (x1 - x0) * b - 0.06, 0.52, 0.66, pw[1] + 0.08, pw[3] - 0.08, C('#ffffff')); }
        coll();
      } else if (k === 'mesa_noche') { wB2.box(x0 + 0.01, x1 - 0.01, 0, 0.5, z0 + 0.01, z1 - 0.01, WOODC); fB.box(x0 + 0.08, x1 - 0.08, 0.5, 0.52, z0 + 0.08, z1 - 0.08, C('#d8d2c6')); }
      else if (k === 'closet') {
        wL.box(x0, x1, 0, 2.3, z0, z1, C('#ffffff'));
        const fr = sx ? (sx < 0 ? x1 + 0.002 : x0 - 0.002) : (sz < 0 ? z1 + 0.002 : z0 - 0.002); const len = sx ? z1 - z0 : x1 - x0; const n = Math.max(2, Math.round(len / 0.5));
        for (let i = 1; i < n; i++) { const u = (sx ? z0 : x0) + len * i / n; if (sx) fB.box(fr - 0.004, fr + 0.004, 0.05, 2.25, u - 0.005, u + 0.005, DARK); else fB.box(u - 0.005, u + 0.005, 0.05, 2.25, fr - 0.004, fr + 0.004, DARK); }
        coll();
      } else if (k === 'sofa') {
        const col = C('#8c8378'); faB.box(x0 + 0.02, x1 - 0.02, 0.1, 0.44, z0 + 0.02, z1 - 0.02, col);
        const bk = strip(0.2); faB.box(bk[0], bk[2], 0.1, 0.85, bk[1], bk[3], C('#7c7469'));
        if (sx) { faB.box(x0, x1, 0.1, 0.62, z0, z0 + 0.14, col); faB.box(x0, x1, 0.1, 0.62, z1 - 0.14, z1, col); } else { faB.box(x0, x0 + 0.14, 0.1, 0.62, z0, z1, col); faB.box(x1 - 0.14, x1, 0.1, 0.62, z0, z1, col); }
        fB.box(x0 + 0.06, x1 - 0.06, 0, 0.1, z0 + 0.06, z1 - 0.06, DARK); coll();
      } else if (k === 'mesa_comedor') { /* se dibuja con las mesas */ }
      else if (k === 'meson' || k === 'mueble_cocina') {
        fB.box(x0 + 0.03, x1 - 0.03, 0, 0.1, z0 + 0.06, z1 - 0.03, DARK);
        fB.box(x0, x1, 0.1, 0.86, z0, z1, C('#e9e6df')); grB.box(x0 - 0.01, x1 + 0.01, 0.86, 0.9, z0 - 0.01, z1 + 0.01, C('#ffffff'));
        const up = strip(0.34); fB.box(up[0], up[2], 1.48, 2.18, up[1], up[3], C('#e9e6df'));
        // estufa y lavaplatos (ubicación ilustrativa a lo largo del mesón)
        const L = sx ? z1 - z0 : x1 - x0; if (L > 1.4) { const a0 = (sx ? z0 : x0) + L * 0.25, a1 = (sx ? z0 : x0) + L * 0.72; const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
          if (sx) { fB.box(cx - 0.22, cx + 0.22, 0.9, 0.915, a0 - 0.3, a0 + 0.3, C('#141517')); stB.box(cx - 0.2, cx + 0.2, 0.9, 0.905, a1 - 0.25, a1 + 0.25, C('#c5cacf')); }
          else { fB.box(a0 - 0.3, a0 + 0.3, 0.9, 0.915, cz - 0.22, cz + 0.22, C('#141517')); stB.box(a1 - 0.25, a1 + 0.25, 0.9, 0.905, cz - 0.2, cz + 0.2, C('#c5cacf')); } }
        coll();
      } else if (k === 'lavadero') { fB.box(x0, x1, 0, 0.85, z0, z1, C('#cfd2d3')); coll(); }
      else if (k === 'lavamanos') { const big = Math.max(x1 - x0, z1 - z0) > 0.5; if (big) { fB.box(x0, x1, 0.3, 0.82, z0, z1, C('#e8e4dc')); fB.box(x0 + 0.08, x1 - 0.08, 0.82, 0.86, z0 + 0.03, z1 - 0.03, C('#ffffff')); } else fB.box(x0, x1, 0.75, 0.86, z0, z1, C('#ffffff')); const mr = strip(0.01); if (big) glB.box(mr[0], mr[2], 1.0, 1.7, mr[1], mr[3], C('#ffffff')); }
      else if (k === 'mueble') { wB2.box(x0, x1, 0, 0.48, z0, z1, WOODC); const tv = strip(0.04); fB.box(tv[0] + (sx ? 0 : 0.05), tv[2] - (sx ? 0 : 0.05), 0.95, 1.55, tv[1] + (sx ? 0.05 : 0), tv[3] - (sx ? 0.05 : 0), C('#101215')); coll(); }
    }
    // sanitarios y duchas (símbolos del plano dentro de cada baño)
    for (const b of I.bath || []) {
      const [x0, z0, x1, z1] = b.b;
      if (b.k === 'sanitario') { const [tx0, tz0, tx1, tz1] = b.tank; glB2.box(tx0, tx1, 0.38, 0.78, tz0, tz1, C('#ffffff'));
        const bx0 = Math.min(x0, tx0), bx1 = Math.max(x1, tx1); const [ux, uz] = b.dir; const ax = Math.abs(ux) > Math.abs(uz);
        const bowl = ax ? (ux > 0 ? [tx1, z0 + 0.04, x1, z1 - 0.04] : [x0, z0 + 0.04, tx0, z1 - 0.04]) : (uz > 0 ? [x0 + 0.04, tz1, x1 - 0.04, z1] : [x0 + 0.04, z0, x1 - 0.04, tz0]);
        glB2.box(bowl[0], bowl[2], 0, 0.4, bowl[1], bowl[3], C('#ffffff')); glB2.box(bowl[0] + 0.01, bowl[2] - 0.01, 0.4, 0.42, bowl[1] + 0.01, bowl[3] - 0.01, C('#eef0f1')); void bx0; void bx1;
        FUR.coll.push([x0 + 0.05, z0 + 0.05, x1 - 0.05, z1 - 0.05]); }
      else if (b.k === 'ducha') { glB2.box(x0 + 0.02, x1 - 0.02, 0, 0.025, z0 + 0.02, z1 - 0.02, C('#cfd3d6'));
        const r = R.get(b.room); const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const ax = (x1 - x0) > (z1 - z0);
        // división de vidrio en el lado que mira al resto del baño (ilustrativa)
        if (ax) { const z = Math.abs(z0 - r.lp[1]) < Math.abs(z1 - r.lp[1]) ? z0 : z1; scrB.box(x0 + 0.05, x1 - 0.35, 0.03, 2.0, z - 0.005, z + 0.005, C('#ffffff')); }
        else { const x = Math.abs(x0 - r.lp[0]) < Math.abs(x1 - r.lp[0]) ? x0 : x1; scrB.box(x - 0.005, x + 0.005, 0.03, 2.0, z0 + 0.05, z1 - 0.35, C('#ffffff')); }
        stB.box(cx - 0.1, cx + 0.1, 2.05, 2.07, cz - 0.1, cz + 0.1, C('#ffffff')); }
    }
    // sillas: respaldo hacia afuera de la mesa más cercana
    for (const c of chairs) { const [x0, z0, x1, z1] = c.b; const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; let t = null, dmin = 9; for (const q of tables) { const d = Math.hypot(q.x - cx, q.z - cz); if (d < dmin) { dmin = d; t = q; } }
      const s = 0.21; faB.box(cx - s, cx + s, 0.42, 0.47, cz - s, cz + s, C('#b9ad9c')); for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) fB.box(cx + a * s * 0.85 - 0.015, cx + a * s * 0.85 + 0.015, 0, 0.42, cz + b * s * 0.85 - 0.015, cz + b * s * 0.85 + 0.015, DARK);
      if (t) { const dx = cx - t.x, dz = cz - t.z; if (Math.abs(dx) > Math.abs(dz)) { const xx = cx + Math.sign(dx) * s; faB.box(xx - 0.015, xx + 0.015, 0.6, 0.88, cz - s + 0.03, cz + s - 0.03, C('#b9ad9c')); fB.box(xx - 0.012, xx + 0.012, 0.42, 0.6, cz - s + 0.03, cz - s + 0.06, DARK); fB.box(xx - 0.012, xx + 0.012, 0.42, 0.6, cz + s - 0.06, cz + s - 0.03, DARK); } else { const zz = cz + Math.sign(dz) * s; faB.box(cx - s + 0.03, cx + s - 0.03, 0.6, 0.88, zz - 0.015, zz + 0.015, C('#b9ad9c')); fB.box(cx - s + 0.03, cx - s + 0.06, 0.42, 0.6, zz - 0.012, zz + 0.012, DARK); fB.box(cx + s - 0.06, cx + s - 0.03, 0.42, 0.6, zz - 0.012, zz + 0.012, DARK); } } }
    for (const t of tables) {
      if (t.round) { const g = new THREE.CylinderGeometry(0.5, 0.5, 0.04, 28); g.translate(t.x, 0.74, t.z); FUR.round = (FUR.round || []).concat([g.toNonIndexed()]); const p = new THREE.CylinderGeometry(0.05, 0.05, 0.72, 10); p.translate(t.x, 0.36, t.z); FUR.round.push(p.toNonIndexed()); FUR.coll.push([t.x - 0.35, t.z - 0.35, t.x + 0.35, t.z + 0.35]); }
      else { const [x0, z0, x1, z1] = t.b; wB2.box(x0, x1, 0.72, 0.76, z0, z1, WOODC); for (const [a, b] of [[x0 + 0.05, z0 + 0.05], [x1 - 0.1, z0 + 0.05], [x1 - 0.1, z1 - 0.1], [x0 + 0.05, z1 - 0.1]]) fB.box(a, a + 0.05, 0, 0.72, b, b + 0.05, DARK); FUR.coll.push([x0 + 0.05, z0 + 0.05, x1 - 0.05, z1 - 0.05]); }
    }
    FUR.meshes = [mesh(fB.geo(), MI.furn), mesh(wB2.geo(), MI.furnW), mesh(faB.geo(), MI.fabric), mesh(stB.geo(), MI.steel), mesh(wL.geo(), MI.woodI), mesh(grB.geo(), MI.granV)];
    if (glB2.p.length) FUR.meshes.push(mesh(glB2.geo(), MI.gloss)); if (scrB.p.length) FUR.meshes.push(mesh(scrB.geo(), MI.glass, false));
    if (glB.p.length) FUR.meshes.push(mesh(glB.geo(), MI.mirror, false));
    if (FUR.round) { const g = mergeGeometries(FUR.round); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5, uv.getY(i) * 0.5); const cc = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(cc, 3)); FUR.meshes.push(mesh(g, MI.furnW)); }
  }

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
    const B = new GB(0.5, 0.5), L = w - 0.03, t = 0.042, wc = C('#ffffff'), hc = C(entry ? '#2a2a2a' : '#8d9399');
    B.box(0.015, 0.015 + L, 0.01, DOORH - 0.01, -t / 2, t / 2, wc);
    if (entry) { for (const z of [t / 2 + 0.002, -t / 2 - 0.004]) { B.box(0.12, L - 0.1, 0.25, 0.27, z, z + 0.002, C('#7a5638')); B.box(0.12, L - 0.1, 1.8, 1.82, z, z + 0.002, C('#7a5638')); } }
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
    const RB = new GB(), RG = new GB(); RB.box(bx - 0.03, bx + 0.03, 1.0, 1.05, bz0, bz1, w); for (let z = bz0 + 0.05; z < bz1; z += 0.8) RB.box(bx - 0.02, bx + 0.02, 0, 1.0, z, z + 0.04, w); RG.box(bx - 0.006, bx + 0.006, 0.05, 0.98, bz0, bz1, w);
    parent.add(mesh(RB.geo(), MI.rail), mesh(RG.geo(), MI.glass, false));
    const S2 = { lvl: levelId, g: sl, a: 0, tgt: 0, zc, x: xm, z0: V7.z0, z1: V7.z1, cx: xm, cz: (V7.z0 + V7.z1) / 2 };
    S2.set = (a) => { S2.a = a; sl.position.z = -(zc - V7.z0 - 0.04) * a; };
    S2.seg = () => [xm + 0.03, zc - (zc - V7.z0 - 0.04) * S2.a, xm + 0.03, V7.z1 - (zc - V7.z0 - 0.04) * S2.a];
    return S2;
  }
  const balSegs = [[Math.min(...BAL.o.map((p) => p[0])) + 0.03, Math.min(...BAL.o.map((p) => p[1])), Math.min(...BAL.o.map((p) => p[0])) + 0.03, Math.max(...BAL.o.map((p) => p[1]))], [V7.x0, V7.z0, V7.x1, V7.z0], [V7.x0 + 0.02, (V7.z0 + V7.z1) / 2, V7.x1 - 0.02, (V7.z0 + V7.z1) / 2], [(V7.x0 + V7.x1) / 2 - 0.03, V7.z0, (V7.x0 + V7.x1) / 2 - 0.03, (V7.z0 + V7.z1) / 2]];

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
    const B = new GB(1.2, 1.2), Rl = new GB(), tc = C('#ffffff'), rc = C('#ffffff');
    for (let k = 1; k <= NT; k++) { const xa = ST.x0 + (k - 1) * TW, xb = xa + TW, y = P.a + k * P.hr; B.box(xa, xb, y - P.hr - 0.16, y, ST.z0, ST.zm - 0.03, tc); }
    B.box(ST.x1, ST.xl, P.m - 0.16, P.m, ST.z0, ST.z1, tc);
    for (let kk = 1; kk <= NT; kk++) { const xb = ST.x1 - (kk - 1) * TW, xa = xb - TW, y = P.m + kk * P.hr; B.box(xa, xb, y - P.hr - 0.16, y, ST.zm + 0.03, ST.z1, tc); }
    // losa inclinada bajo cada tramo (intradós)
    const soffit = (xa, ya, xb, yb, z0, z1) => { const n = [-(yb - ya), (xb - xa), 0]; const L = Math.hypot(n[0], n[1]); n[0] /= L; n[1] /= L; B.quad([xa, ya, z0], [xb, yb, z0], [xb, yb, z1], [xa, ya, z1], [-n[0], -n[1], 0], tc);
      B.quad([xa, ya, z0], [xb, yb, z0], [xb, yb + 0.18, z0], [xa, ya + 0.18, z0], [0, 0, -1], tc); B.quad([xa, ya, z1], [xb, yb, z1], [xb, yb + 0.18, z1], [xa, ya + 0.18, z1], [0, 0, 1], tc); };
    soffit(ST.x0, P.a - 0.16, ST.x1, P.m - 0.16, ST.z0, ST.zm - 0.03); soffit(ST.x1, P.m - 0.16, ST.x0, P.b - 0.16 - P.hr, ST.zm + 0.03, ST.z1);
    // pasamanos en el ojo de la escalera (eje z = zm) + balaustres
    const hy = 0.9; const p0 = [ST.x0, P.a + P.hr + hy, ST.zm - 0.05], p1 = [ST.x1, P.m + hy, ST.zm - 0.05], q0 = [ST.x1, P.m + hy, ST.zm + 0.05], q1 = [ST.x0, P.b - P.hr + hy, ST.zm + 0.05];
    Rl.bar(p0, p1, 0.022, rc); Rl.bar(q0, q1, 0.022, rc); Rl.bar(p1, q0, 0.022, rc);
    for (let k = 1; k <= NT; k += 2) { const x = ST.x0 + (k - 0.5) * TW; Rl.bar([x, P.a + k * P.hr, ST.zm - 0.05], [x, P.a + k * P.hr + hy, ST.zm - 0.05], 0.012, rc); Rl.bar([ST.x1 - (k - 0.5) * TW, P.m + k * P.hr, ST.zm + 0.05], [ST.x1 - (k - 0.5) * TW, P.m + k * P.hr + hy, ST.zm + 0.05], 0.012, rc); }
    // baranda del descanso hacia el vacío
    Rl.bar([ST.x1, P.m + 1.0, ST.z1 - 0.03], [ST.xl, P.m + 1.0, ST.z1 - 0.03], 0.022, rc); Rl.bar([ST.xl - 0.03, P.m + 1.0, ST.z0], [ST.xl - 0.03, P.m + 1.0, ST.z1], 0.022, rc);
    for (const x of [ST.x1 + 0.3, ST.x1 + 0.7]) Rl.bar([x, P.m, ST.z1 - 0.03], [x, P.m + 1.0, ST.z1 - 0.03], 0.012, rc);
    return [mesh(B.geo(), MI.stair), mesh(Rl.geo(), MI.rail)];
  }
  // barandas de vidrio del hall hacia los tramos (en cada nivel)
  function stairGuards(parent, y0) {
    const B = new GB(), G = new GB(), w = C('#ffffff');
    for (const [z, xa, xb] of [[ST.z0, ST.x0, ST.xl], [ST.z1, ST.x0, ST.x1]]) { G.box(xa, xb, y0 + 0.05, y0 + 1.0, z - 0.006, z + 0.006, w); B.box(xa, xb, y0 + 1.0, y0 + 1.05, z - 0.025, z + 0.025, w); for (let x = xa; x <= xb + 0.01; x += (xb - xa) / 3) B.box(x - 0.02, x + 0.02, y0, y0 + 1.0, z - 0.02, z + 0.02, w); }
    parent.add(mesh(B.geo(), MI.rail), mesh(G.geo(), MI.glass, false));
  }
  const PAIRS = []; for (let i = 0; i < FLOORS.length - 1; i++) PAIRS.push({ lo: FLOORS[i], hi: FLOORS[i + 1], ...stairPair(LEVY[FLOORS[i]], LEVY[FLOORS[i + 1]]) });

  // ====================== ASCENSOR ======================
  const SH = I.shaft, CB = I.cab, ED = I.edoor; // pozo 2.45×1.70; cabina; vano de puerta x 19.207–19.355, z 10.192–11.192
  const CI = { x0: CB[0] + 0.06, x1: 19.15, z0: CB[1] + 0.05, z1: CB[3] - 0.05 };
  const EV = { y: LEVY.p1, fi: 1, target: null, state: 'idle', door: 0, timer: 0, t: 0, dur: 0, y0: 0, y1: 0, dir: 0, hold: false };
  // indicador digital (compartido por todos los pisos y la cabina)
  const indC = document.createElement('canvas'); indC.width = 256; indC.height = 96; const indT = new THREE.CanvasTexture(indC); indT.colorSpace = THREE.SRGBColorSpace;
  EV.drawInd = (lab, dir) => { const g = indC.getContext('2d'); g.fillStyle = '#07090c'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#ff5a36'; g.font = '700 70px "Segoe UI",Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lab, 150, 52);
    if (dir) { g.beginPath(); const y = 48; if (dir > 0) { g.moveTo(60, y - 22); g.lineTo(84, y + 14); g.lineTo(36, y + 14); } else { g.moveTo(60, y + 22); g.lineTo(84, y - 14); g.lineTo(36, y - 14); } g.fill(); } indT.needsUpdate = true; };
  EV.drawInd('1', 0);
  const indMat = new THREE.MeshBasicMaterial({ map: indT, toneMapped: false });
  // botonera de cabina (textura dinámica; las teclas se detectan por UV con el raycaster)
  const panC = document.createElement('canvas'); panC.width = 256; panC.height = 640; const panT = new THREE.CanvasTexture(panC); panT.colorSpace = THREE.SRGBColorSpace;
  const KEYS = [['p7', 0, 0], ['p6', 1, 0], ['p5', 0, 1], ['p4', 1, 1], ['p3', 0, 2], ['p2', 1, 2], ['p1', 0, 3], ['sot', 1, 3], ['open', 0, 4], ['close', 1, 4]];
  const keyRect = (c, r) => [40 + c * 100, 110 + r * 100, 76, 76];
  EV.drawPanel = (lit) => { const g = panC.getContext('2d'); const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, '#9aa0a6'); gr.addColorStop(0.5, '#d9dde1'); gr.addColorStop(1, '#9aa0a6'); g.fillStyle = gr; g.fillRect(0, 0, 256, 640);
    g.fillStyle = '#07090c'; g.fillRect(40, 20, 176, 64); g.fillStyle = '#ff5a36'; g.font = '700 46px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(FLABEL[FLOORS[EV.fi]] || '', 128, 54);
    for (const [k, c, r] of KEYS) { const [x, y, w] = keyRect(c, r); const on = lit === k || EV.target === k; g.beginPath(); g.arc(x + w / 2, y + w / 2, w / 2, 0, 6.29); g.fillStyle = '#2b2f34'; g.fill(); g.lineWidth = 5; g.strokeStyle = on ? '#ffb547' : '#5b6168'; g.stroke();
      g.fillStyle = on ? '#ffd27a' : '#eef1f4'; g.font = '700 38px Arial'; g.fillText(k === 'open' ? '◀▶' : k === 'close' ? '▶◀' : FLABEL[k], x + w / 2, y + w / 2 + 2); }
    panT.needsUpdate = true; };
  EV.keyAt = (uv) => { const px = uv.x * 256, py = (1 - uv.y) * 640; for (const [k, c, r] of KEYS) { const [x, y, w] = keyRect(c, r); if (Math.hypot(px - x - w / 2, py - y - w / 2) < w / 2 + 6) return k; } return null; };
  // cabina
  const cab = new THREE.Group(); cab.position.y = EV.y;
  {
    const B = new GB(1.6, 1.6), w = C('#ffffff');
    B.box(CI.x0, CI.x1, 0, H - 0.25, CI.z0 - 0.02, CI.z0, w); B.box(CI.x0, CI.x1, 0, H - 0.25, CI.z1, CI.z1 + 0.02, w);
    B.box(CI.x1, CI.x1 + 0.02, 0, H - 0.25, CI.z0, ED[2] + 0.01, w); B.box(CI.x1, CI.x1 + 0.02, 0, H - 0.25, ED[3] - 0.01, CI.z1, w); B.box(CI.x1, CI.x1 + 0.02, DOORH, H - 0.25, ED[2], ED[3], w);
    B.box(CI.x0 - 0.02, CI.x0, 0, 0.95, CI.z0, CI.z1, w); B.box(CI.x0 - 0.02, CI.x0, 2.05, H - 0.25, CI.z0, CI.z1, w);
    cab.add(mesh(B.geo(), MI.steel));
    const Mi = new GB(); Mi.box(CI.x0 - 0.015, CI.x0 - 0.005, 0.95, 2.05, CI.z0 + 0.02, CI.z1 - 0.02, w); cab.add(mesh(Mi.geo(), MI.mirror, false));
    const Fl = new GB(0.8, 0.8); Fl.box(CI.x0, CI.x1 + 0.02, -0.06, 0.005, CI.z0, CI.z1, w); cab.add(mesh(Fl.geo(), MI.gran));
    const Ce = new GB(); Ce.box(CI.x0, CI.x1 + 0.02, H - 0.25, H - 0.22, CI.z0 - 0.02, CI.z1 + 0.02, C('#2a2d31')); cab.add(mesh(Ce.geo(), MI.furn, false));
    const Lp = new GB(); Lp.box(CI.x0 + 0.25, CI.x1 - 0.25, H - 0.252, H - 0.25, CI.z0 + 0.3, CI.z1 - 0.3, w); cab.add(mesh(Lp.geo(), MI.lamp, false));
    const Hr = new GB(); Hr.bar([CI.x0 + 0.06, 0.9, CI.z0 + 0.15], [CI.x0 + 0.06, 0.9, CI.z1 - 0.15], 0.018, w); Hr.bar([CI.x0 + 0.2, 0.9, CI.z0 + 0.06], [CI.x1 - 0.3, 0.9, CI.z0 + 0.06], 0.018, w); cab.add(mesh(Hr.geo(), MI.steelD));
    // botonera (lado sur, junto a la puerta) e indicador sobre la puerta
    EV.drawPanel(null);
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.5), new THREE.MeshStandardMaterial({ map: panT, metalness: 0.5, roughness: 0.35, emissive: 0xffffff, emissiveMap: panT, emissiveIntensity: 0.25 }));
    pm.position.set(CI.x1 - 0.2, 1.2, CI.z1 - 0.002); pm.rotation.y = Math.PI; cab.add(pm); EV.panelMesh = pm;
    const im = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.11), indMat); im.position.set(CI.x1 - 0.002, 2.18, (ED[2] + ED[3]) / 2); im.rotation.y = -Math.PI / 2; cab.add(im);
    const pl = textTex([{ t: 'Capacidad · por definir (ascensor no especificado en planos)', s: 22, w: 500, c: '#2b2f34' }], { w: 640, h: 44 });
    const pq = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.029), new THREE.MeshBasicMaterial({ map: pl, transparent: true })); pq.position.set(CI.x1 - 0.2, 1.52, CI.z1 - 0.003); pq.rotation.y = Math.PI; cab.add(pq);
    // puertas de cabina (2 hojas centrales)
    const dl = new GB(1.6, 1.6), half = (ED[3] - ED[2]) / 2 + 0.01; dl.box(CI.x1 + 0.025, CI.x1 + 0.045, 0, DOORH, -half, 0, w); const dr = new GB(1.6, 1.6); dr.box(CI.x1 + 0.025, CI.x1 + 0.045, 0, DOORH, 0, half, w);
    EV.cdL = mesh(dl.geo(), MI.steel); EV.cdR = mesh(dr.geo(), MI.steel); cab.add(EV.cdL, EV.cdR);
    EV.light = new THREE.PointLight(0xfff3e0, 0, 4.5, 1.8); EV.light.position.set((CI.x0 + CI.x1) / 2, H - 0.45, (CI.z0 + CI.z1) / 2); cab.add(EV.light);
    // contrapeso (espacio x 16.755–17.5)
    const Cw = new GB(); Cw.box(SH[0] + 0.15, CB[0] - 0.1, 0.5, 1.6, SH[1] + 0.5, SH[3] - 0.5, C('#3a3d42')); cab.add(mesh(Cw.geo(), MI.furn));
  }
  // puertas de piso + marco + botón de llamada (en cada nivel)
  const LAND = {};
  function landing(levelId, parent) {
    const y0 = 0; const half = (ED[3] - ED[2]) / 2 + 0.01, zc = (ED[2] + ED[3]) / 2, xd = (ED[0] + ED[1]) / 2 + 0.02;
    const w = C('#ffffff');
    const dl = new GB(1.6, 1.6); dl.box(xd - 0.015, xd + 0.015, y0, y0 + DOORH, -half, 0, w); const dr = new GB(1.6, 1.6); dr.box(xd - 0.015, xd + 0.015, y0, y0 + DOORH, 0, half, w);
    const L = mesh(dl.geo(), MI.steel), Rr = mesh(dr.geo(), MI.steel); L.position.z = zc; Rr.position.z = zc; parent.add(L, Rr);
    const F = new GB(1.6, 1.6); const xf = ED[1];
    F.box(xf, xf + 0.025, y0, y0 + DOORH + 0.08, ED[2] - 0.07, ED[2], w); F.box(xf, xf + 0.025, y0, y0 + DOORH + 0.08, ED[3], ED[3] + 0.07, w); F.box(xf, xf + 0.025, y0 + DOORH, y0 + DOORH + 0.08, ED[2], ED[3], w);
    F.box(xf, xf + 0.012, y0 + 0.95, y0 + 1.25, ED[3] + 0.16, ED[3] + 0.26, w); // botonera de llamada
    parent.add(mesh(F.geo(), MI.steel));
    const btn = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), new THREE.MeshBasicMaterial({ color: 0xd8dde2, toneMapped: false })); btn.position.set(xf + 0.014, y0 + 1.1, ED[3] + 0.21); btn.rotation.y = Math.PI / 2; parent.add(btn);
    const im = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.095), indMat); im.position.set(xf + 0.013, y0 + DOORH + 0.2, zc); im.rotation.y = Math.PI / 2; parent.add(im);
    LAND[levelId] = { L, Rr, btn, zc, half };
  }
  EV.setDoorsVisual = () => {
    const o = EV.door * ((ED[3] - ED[2]) / 2 - 0.02);
    EV.cdL.position.z = (ED[2] + ED[3]) / 2 - o; EV.cdR.position.z = (ED[2] + ED[3]) / 2 + o;
    for (const id of FLOORS) { const Ld = LAND[id]; if (!Ld) continue; const oo = FLOORS[EV.fi] === id && EV.state !== 'moving' ? o : 0; Ld.L.position.z = Ld.zc - oo; Ld.Rr.position.z = Ld.zc + oo; }
  };

  // ====================== PISO 1: lobby aproximado (plancha 1/6 faltante) ======================
  function lobby(parent) {
    const B = new GB(1.5, 1.5); const col = C('#e4ded3');
    const wallsG = mergeGeometries(I.f1walls.map((p) => { const g = new THREE.ExtrudeGeometry(shapeOf(p), { depth: H1, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2); g.clearGroups(); return g.index ? g.toNonIndexed() : g; }));
    const pc = wallsG.attributes.position.count; const cc = new Float32Array(pc * 3); for (let i = 0; i < pc; i++) { cc[i * 3] = col.r; cc[i * 3 + 1] = col.g; cc[i * 3 + 2] = col.b; } wallsG.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    const uv = wallsG.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.5, uv.getY(i) / 1.5);
    parent.add(mesh(wallsG, MI.plaster));
    const fg = floorGeo(I.lobby, 0.006, MI.porc.map, null); parent.add(mesh(fg, std({ map: T.porc, roughness: 0.22 }), false));
    // puerta automática de vidrio (acceso desde el paso peatonal)
    const x = 7.86; const F = new GB(), Gf = new GB(), w = C('#ffffff');
    F.box(x - 0.04, x + 0.04, 2.3, 2.42, 4.069, 6.413, w); for (const z of [4.069, 4.7, 6.1, 6.373]) F.box(x - 0.04, x + 0.04, 0, 2.3, z, z + 0.04, w); F.box(x - 0.04, x + 0.04, 2.42, H1, 4.069, 6.413, C('#d9d6cf'));
    Gf.box(x - 0.006, x + 0.006, 0, 2.3, 4.109, 4.7, w); Gf.box(x - 0.006, x + 0.006, 0, 2.3, 6.14, 6.373, w);
    parent.add(mesh(F.geo(), MI.alu), mesh(Gf.geo(), MI.glass, false));
    const pL = new GB(), pR = new GB(); pL.box(x + 0.01, x + 0.03, 0.02, 2.29, 4.74, 5.42, w); pR.box(x + 0.01, x + 0.03, 0.02, 2.29, 5.38, 6.06, w);
    const gL = mesh(pL.geo(), MI.glass, false), gR = mesh(pR.geo(), MI.glass, false); parent.add(gL, gR);
    const ent = { g: [gL, gR], a: 0, cx: x, cz: 5.4 };
    ent.set = (a) => { ent.a = a; gL.position.z = -0.62 * a; gR.position.z = 0.62 * a; };
    ent.seg = () => (ent.a > 0.85 ? null : [x + 0.02, 4.7, x + 0.02, 6.1]);
    // letreros
    const t = textTex([{ t: 'EDIFICIO ALMENDRA', s: 46, w: 700, c: '#f4efe6', ls: 6 }, { t: 'LOBBY · PISO 1', s: 26, w: 600, c: '#c9a77c', ls: 6 }], { w: 640, h: 130, y0: 12, bg: '#1d1f23', r: 14 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.284), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 })); m.position.set(17.88, 2.1, 5.24); m.rotation.y = -Math.PI / 2; parent.add(m);
    const t2 = textTex([{ t: 'Piso 1 · distribución sin plano', s: 30, w: 700, c: '#ffd59a' }, { t: '(plancha 1/6 faltante: muros del lobby aproximados)', s: 22, w: 500, c: '#e8e2d6' }], { w: 640, h: 96, y0: 10, bg: 'rgba(29,31,35,0.92)', r: 12 });
    for (const [px, pz, ry] of [[12.3, 6.405, Math.PI], [12.3, 4.077, 0], [16.745, 7.6, Math.PI / 2], [17.905, 7.6, -Math.PI / 2]]) { const q = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.135), new THREE.MeshBasicMaterial({ map: t2, transparent: true })); q.position.set(px, 1.6, pz); q.rotation.y = ry; parent.add(q); }
    // cielo raso del lobby y luminarias
    const cg = floorGeo(I.lobbyAll, H1 - 0.005, null, null); const ce = mesh(cg, MI.ceil, true, true); parent.add(ce);
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
      FUR.meshes.forEach((m) => { const c = new THREE.Mesh(m.geometry, m.material); c.castShadow = true; c.receiveShadow = true; int.add(c); });
      signs.forEach((s) => int.add(s.clone()));
      const fr = mesh(DOORFRAME, MI.frame); int.add(fr);
      E.doors = makeDoors(id, int); plaques(id, int); E.bal = balcony(id, int); hallSigns(id, int); landing(id, int); stairGuards(int, 0);
      E.ceil = new THREE.Group(); E.ceil.add(mesh(TIP.ceil, MI.ceil, true, true), mesh(TIP.lamps, MI.lamp, false, false)); E.ceil.visible = false; int.add(E.ceil);
    } else if (id === 'p1') { const r = lobby(int); E.ent = r.ent; E.ceil = r.ceil; E.ceil.visible = false; hallSigns(id, int); landing(id, int); stairGuards(int, 0); }
    else if (id === 'sot') { hallSigns(id, int); landing(id, int); const g = new THREE.Group(); int.add(g); stairGuards(g, 0); g.children.forEach((c) => { c.visible = true; }); }
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
  const elevSegs = [[SH[0], SH[1], SH[2], SH[1]], [SH[0], SH[3], SH[2], SH[3]], [SH[0], SH[1], SH[0], SH[3]], [CB[0], SH[1], CB[0], SH[3]]];
  return {
    MI, LEV, EV, cab, PAIRS, stairY, ST, CI, ED, SH, CB, LAND, roomSign,
    seg: { tip: [...faceSegs, ...winSegs, ...skinSegs, ...furSegs, ...balSegs, ...voidSegs], stair: stairSegs, elev: elevSegs,
      p1: [...segsOfPolys(I.f1walls), ...voidSegs], sotExtra: [] },
    walk: { tip: [...I.slab, BAL], p1: I.lobby },
    TIP, FUR, rooms: I.rooms,
  };
}
