import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const S = window.__SCENE__, TEX = window.__TEX__;
const $ = (q) => document.querySelector(q);
const isMobile = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
const fmt = (n) => n == null ? '—' : 'COP ' + n.toLocaleString('es-CO');

// ---------- renderer / scene ----------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 600);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.495; controls.minDistance = 2; controls.maxDistance = 160;
controls.screenSpacePanning = true;

scene.add(new THREE.HemisphereLight(0xcfdcff, 0x2a2f36, 0.9));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
sun.position.set(-34, 52, -26); sun.target.position.set(15, 6, 13);
sun.castShadow = true; sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 10, far: 140 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0x9fb8ff, 0.5); fill.position.set(40, 20, 40); scene.add(fill);

// ---------- textures ----------
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
const texListon = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#b8936a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) { const x = i * 32; g.fillStyle = `hsl(30,${32 + (i % 3) * 4}%,${56 + ((i * 7) % 5) * 2}%)`; g.fillRect(x + 3, 0, 26, h);
    g.fillStyle = 'rgba(70,45,25,.18)'; for (let k = 0; k < 6; k++) g.fillRect(x + 5 + k * 4, 0, 1, h); }
}, true);
const texHatch = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#9aa3ad'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3;
  for (let i = -w; i < w * 2; i += 22) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); }
}, true);
const texRoof = canvasTex(64, 64, (g, w, h) => {
  for (let x = 0; x < w; x++) { const v = 150 + 40 * Math.sin(x / w * Math.PI * 8); g.fillStyle = `rgb(${v - 10},${v},${v + 8})`; g.fillRect(x, 0, 1, h); }
}, true);
const texHalo = canvasTex(128, 128, (g, w, h) => {
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,.85)'); r.addColorStop(0.45, 'rgba(255,255,255,.22)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, h);
});
const texAsph = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#62666c'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) { const v = 75 + Math.random() * 45; g.fillStyle = `rgba(${v},${v},${v + 4},.5)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
}, true);
const loader = new THREE.TextureLoader();
const texDoor = loader.load(TEX.door); texDoor.colorSpace = THREE.SRGBColorSpace; texDoor.anisotropy = 8;
const texSign = loader.load(TEX.sign); texSign.colorSpace = THREE.SRGBColorSpace; texSign.anisotropy = 8;

// ---------- materials (cuadro de materiales PL_A006) ----------
const M = {
  wall: new THREE.MeshStandardMaterial({ color: 0xecebe6, roughness: 0.9 }),             // 1 mampostería revocada + coraza
  slab: new THREE.MeshStandardMaterial({ color: 0xb9b6ae, roughness: 0.85 }),            // 2 losa en concreto
  grey: new THREE.MeshStandardMaterial({ color: 0x8e9192, roughness: 0.85 }),            // 6 coraza gris
  white: new THREE.MeshStandardMaterial({ color: 0xe9e7e2, roughness: 0.85 }),           // 7 coraza blanco
  brown: new THREE.MeshStandardMaterial({ color: 0x4a3326, roughness: 0.7 }),            // 4/8 café oscuro / marcos
  liston: new THREE.MeshStandardMaterial({ color: 0xffffff, map: texListon, roughness: 0.75 }), // 5 listones café claro
  glass: new THREE.MeshStandardMaterial({ color: 0x3f5868, metalness: 0.75, roughness: 0.08, transparent: true, opacity: 0.78, depthWrite: false }), // 3 vidrio templado opaco
  alu: new THREE.MeshStandardMaterial({ color: 0x3a3e43, metalness: 0.8, roughness: 0.35 }), // 3 perfil aluminio anodizado
  drip: new THREE.MeshStandardMaterial({ color: 0xcfcac0, roughness: 0.6 }),             // 9 cortagoteras
  roof: new THREE.MeshStandardMaterial({ color: 0xffffff, map: texRoof, metalness: 0.4, roughness: 0.5 }), // 10 cubierta termoacústica
  conc: new THREE.MeshStandardMaterial({ color: 0x9c9a94, roughness: 0.95 }),
  asph: new THREE.MeshStandardMaterial({ color: 0xffffff, map: texAsph, roughness: 0.95 }),
  f1: new THREE.MeshStandardMaterial({ color: 0xffffff, map: texHatch, roughness: 0.9, transparent: true, opacity: 0.86 }),
  ground: new THREE.MeshStandardMaterial({ color: 0x1b2027, roughness: 1 }),
  side: new THREE.MeshStandardMaterial({ color: 0x5c6168, roughness: 1 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xe0b828, roughness: 0.6, emissive: 0x2a2000 }),
};
texRoof.repeat.set(2, 1);
const FACADE = [M.grey, M.white, M.liston, M.brown, M.glass, M.alu, M.drip, M.f1];
FACADE.forEach((m) => { m.userData.op = m.opacity; m.userData.tr = m.transparent; });

// ---------- geometry helpers ----------
function shapeOf(p) {
  const s = new THREE.Shape(p.o.map(([x, z]) => new THREE.Vector2(x, -z)));
  (p.h || []).forEach((h) => s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z)))));
  return s;
}
function extrude(list, y0, h) {
  const gs = list.map((p) => { const g = new THREE.ExtrudeGeometry(shapeOf(p), { depth: h, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); g.clearGroups(); return g.toNonIndexed ? (g.index ? g.toNonIndexed() : g) : g; });
  const m = mergeGeometries(gs, false); return m;
}
function seg(a, b, y0, y1, t, off, extend = 0) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
  const n = [(dz / L) * S.nflip, (-dx / L) * S.nflip];
  const g = new THREE.BoxGeometry(L + extend, y1 - y0, t);
  g.rotateY(-Math.atan2(dz, dx));
  g.translate((a[0] + b[0]) / 2 + n[0] * off, (y0 + y1) / 2, (a[1] + b[1]) / 2 + n[1] * off);
  return g.index ? g.toNonIndexed() : g;
}
function boxG(x0, x1, y0, y1, z0, z1) { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g.index ? g.toNonIndexed() : g; }
function meshOf(geos, mat, shadow = true) {
  const g = mergeGeometries(geos.filter(Boolean), false); const m = new THREE.Mesh(g, mat);
  m.castShadow = shadow; m.receiveShadow = true; return m;
}
function normOf(p) { const dx = p.b[0] - p.a[0], dz = p.b[1] - p.a[1], L = Math.hypot(dx, dz); return [(dz / L) * S.nflip, (-dx / L) * S.nflip, L]; }

// ---------- levels ----------
const LV = [
  { id: 'sot', name: 'Sótano', y: -2.96, k: -1.6 },
  { id: 'p1', name: 'Piso 1', y: 0, k: 0 },
  ...[2, 3, 4, 5, 6, 7].map((n, i) => ({ id: 'p' + n, name: 'Piso ' + n, y: 3.7 + i * 2.7, k: i + 1 })),
  { id: 'cub', name: 'Cubierta', y: 20.3, k: 7 },
];
const root = new THREE.Group(); scene.add(root);
LV.forEach((l) => { l.g = new THREE.Group(); l.g.name = l.id; root.add(l.g); l.on = true; });
const lv = (id) => LV.find((l) => l.id === id);

// ---------- typical floor (shared geometry, 2–7) ----------
function typicalFloor() {
  const G = new THREE.Group();
  const g = { wall: [], grey: [], white: [], liston: [], brown: [], glass: [], alu: [], drip: [] }; const solids = [];
  g.slab = [extrude(S.foot2, -0.2, 0.2)];
  g.wall.push(extrude(S.walls2, 0, 2.5));
  if (S.lint2.length) g.wall.push(extrude(S.lint2, 2.2, 0.3));
  g.brown.push(extrude(S.cols2, 0, 2.51));
  for (const p of S.skin) {
    const [nx, nz, L] = normOf(p);
    const fm = nx < -0.7 ? 'liston' : nz > 0.7 ? 'white' : 'grey';
    g.brown.push(seg(p.a, p.b, -0.22, 0.04, 0.07, 0.035, 0.07)); // marco/borde de losa café
    if (p.k === 'solid') { solids.push(p); continue; }
    if (p.k === 'open') { g.glass.push(seg(p.a, p.b, 0.04, 1.0, 0.02, 0.0)); g.alu.push(seg(p.a, p.b, 0.98, 1.04, 0.05, 0.0)); continue; }
    const sill = p.sill, head = p.head;
    if (sill > 0.04) g[fm].push(seg(p.a, p.b, 0.04, sill, 0.04, 0.02));
    g[fm].push(seg(p.a, p.b, head, 2.5, 0.04, 0.02));
    g.glass.push(seg(p.a, p.b, sill, head, 0.02, -0.05));
    g.alu.push(seg(p.a, p.b, head - 0.04, head, 0.07, -0.05), seg(p.a, p.b, Math.max(sill, 0.04), Math.max(sill, 0.04) + 0.04, 0.07, -0.05));
    const dx = p.b[0] - p.a[0], dz = p.b[1] - p.a[1];
    for (const f of [0, 0.5, 1]) { if (f === 0.5 && L < 1.4) continue; const c = [p.a[0] + dx * f, p.a[1] + dz * f]; const u = [dx / L * 0.025, dz / L * 0.025];
      g.alu.push(seg([c[0] - u[0], c[1] - u[1]], [c[0] + u[0], c[1] + u[1]], sill, head, 0.07, -0.05)); }
    if (sill > 0.04) g.drip.push(seg(p.a, p.b, sill - 0.05, sill, 0.1, 0.06, 0.1));
  }
  for (const [k, list] of Object.entries(g)) if (list.length) { const m = meshOf(list, M[k], k !== 'glass'); m.userData.kind = k; G.add(m); }
  G.userData.solids = solids;
  return G;
}
// paños ciegos: patrón de fachada (marcos café, franjas blancas, gris y listones beige escalonados) — interpretación aproximada de PL_A006
function solidSkin(solids, f) {
  const g = { grey: [], white: [], liston: [] }; let c = 0;
  for (const p of solids) {
    const [, , L] = normOf(p); const n = Math.max(1, Math.round(L / 1.25));
    for (let i = 0; i < n; i++, c++) {
      const a = [p.a[0] + (p.b[0] - p.a[0]) * i / n, p.a[1] + (p.b[1] - p.a[1]) * i / n], b = [p.a[0] + (p.b[0] - p.a[0]) * (i + 1) / n, p.a[1] + (p.b[1] - p.a[1]) * (i + 1) / n];
      const s0 = 2 + ((c * 3) % 4); let k = 'grey';
      if (c % 4 === 3) k = 'white'; else if (c % 2 === 0 && f >= s0 && f <= s0 + 2) k = 'liston';
      g[k].push(seg(a, b, 0.04, 2.5, 0.04, 0.02));
    }
  }
  const G = new THREE.Group(); for (const [k, l] of Object.entries(g)) if (l.length) G.add(meshOf(l, M[k])); return G;
}
const TF = typicalFloor();
LV.filter((l) => /^p[2-7]$/.test(l.id)).forEach((l) => { const c = TF.clone(); c.position.y = l.y; c.add(solidSkin(TF.userData.solids, +l.id.slice(1))); l.g.add(c); });

// ---------- Piso 1 (esquemático) ----------
const GT = { leaves: [] };
{
  const L1 = lv('p1').g;
  const blk = new THREE.Mesh(extrude(S.f1, 0.0, 3.5), M.f1); blk.castShadow = true; blk.receiveShadow = true; L1.add(blk);
  texHatch.repeat.set(0.5, 0.5);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(blk.geometry, 20), new THREE.LineBasicMaterial({ color: 0xdfe6ee, transparent: true, opacity: 0.6 })); L1.add(e);
  const ceil = new THREE.Mesh(extrude(S.bas_ceil, -0.2, 0.2), M.slab); ceil.receiveShadow = true; ceil.castShadow = true; L1.add(ceil);
  // ================= PORTÓN COMPLETO EN BORDE DE CALLE (x = 0) =================
  // Cubre todo el acceso: franja de rampa (3.33 m) + franja peatonal, del muro norte de la rampa (z≈0.64) al lindero (z≈6.74).
  // Diseño del render escalado al ancho real: hojas grandes = portón vehicular (fase 2); hoja pequeña con manija = puerta peatonal (solo facial URBAN / app / PIN).
  GT.Z0 = 0.64; GT.Z1 = 6.74; GT.W = GT.Z1 - GT.Z0; GT.H = GT.W / (856 / 630);
  const g = new THREE.Group(); L1.add(g); GT.g = g;
  const gmat = new THREE.MeshStandardMaterial({ map: texDoor, metalness: 0.55, roughness: 0.42, color: 0xffffff, side: THREE.DoubleSide });
  const fmat = new THREE.MeshStandardMaterial({ color: 0x5a3f27, metalness: 0.6, roughness: 0.4 });
  const W = GT.W, H = GT.H;
  function panel(u0, u1, dir) {
    const w = (u1 - u0) * W; const geo = new THREE.PlaneGeometry(w, H); const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * (u1 - u0));
    geo.rotateY(-Math.PI / 2); geo.translate(0, H / 2, dir * w / 2);
    const m = new THREE.Mesh(geo, gmat); m.castShadow = true;
    const z0 = Math.min(0, dir * w), z1 = Math.max(0, dir * w);
    const fr = meshOf([boxG(-0.035, 0.035, 0, H, z0, z0 + 0.05), boxG(-0.035, 0.035, 0, H, z1 - 0.05, z1), boxG(-0.035, 0.035, H - 0.05, H, z0, z1), boxG(-0.035, 0.035, 0, 0.05, z0, z1)], fmat);
    return { m, fr, w };
  }
  function leaf(u0, u1, hz, dir, sgn, name) {
    const p = panel(u0, u1, dir); const piv = new THREE.Group(); piv.position.set(0, 0, hz); piv.add(p.m, p.fr); g.add(piv);
    const L = { piv, w: p.w, hz, dir, sgn, name, cur: 0, tgt: 0 }; GT.leaves.push(L); return L;
  }
  GT.v1 = leaf(0, 0.305, GT.Z0, 1, 1, 'veh');
  GT.v2 = leaf(0.305, 0.61, GT.Z0 + 0.61 * W, -1, -1, 'veh');
  GT.ped = leaf(0.61, 0.91, GT.Z0 + 0.91 * W, -1, -1, 'ped');
  const jb = panel(0.91, 1.0, 1); jb.m.position.z = GT.Z0 + 0.91 * W; jb.fr.position.z = GT.Z0 + 0.91 * W; g.add(jb.m, jb.fr);
  // franja de letrero en concreto + pilares extremos (se reubican según el alto elegido)
  const conc = new THREE.MeshStandardMaterial({ color: 0xc9c6bf, roughness: 0.9 });
  const sH = W * 114 / 904;
  const signM = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.3, sH), new THREE.MeshStandardMaterial({ map: texSign, roughness: 0.6, emissive: 0x332a20, emissiveIntensity: 0.25 }));
  signM.rotation.y = -Math.PI / 2; L1.add(signM);
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const band = new THREE.Mesh(unit, conc), postA = new THREE.Mesh(unit, conc), postB = new THREE.Mesh(unit, conc);
  [band, postA, postB].forEach((m) => { m.castShadow = true; m.receiveShadow = true; L1.add(m); });
  GT.layout = (hs) => {
    g.scale.y = hs; const top = H * hs + 0.04;
    signM.position.set(-0.13, top + sH / 2, (GT.Z0 + GT.Z1) / 2);
    band.scale.set(0.24, sH, W + 0.3); band.position.set(0, top + sH / 2, (GT.Z0 + GT.Z1) / 2);
    postA.scale.set(0.24, top + sH, 0.15); postA.position.set(0, (top + sH) / 2, GT.Z0 - 0.075);
    postB.scale.set(0.24, top + sH, 0.15); postB.position.set(0, (top + sH) / 2, GT.Z1 + 0.075);
    GT.hs = hs; GT.top = top + sH;
  };
  GT.layout(1);
  // kiosko URBAN en la jamba fija junto a la hoja peatonal, hacia la calle, con visera
  const kz = GT.Z0 + 0.955 * W, ky = 1.45; GT.kz = kz;
  L1.add(meshOf([boxG(-0.09, -0.035, ky - 0.2, ky + 0.2, kz - 0.13, kz + 0.13), boxG(-0.26, -0.035, ky + 0.2, ky + 0.23, kz - 0.15, kz + 0.15)], new THREE.MeshStandardMaterial({ color: 0x6b4a2c, metalness: 0.7, roughness: 0.35 })));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.3), new THREE.MeshStandardMaterial({ color: 0x0b1420, emissive: 0x2bd4ff, emissiveIntensity: 0.55 }));
  scr.rotation.y = -Math.PI / 2; scr.position.set(-0.092, ky - 0.01, kz); L1.add(scr);
  // paso peatonal (adentro), baranda sobre la rampa, bordillo/antepecho de la rampa a cielo abierto
  L1.add(meshOf([boxG(0.05, 7.84, 0, 0.03, 4.0, 6.74)], new THREE.MeshStandardMaterial({ color: 0x7b7f86, roughness: 0.9 })));
  L1.add(meshOf([boxG(1.2, 7.8, 0.95, 1.0, 3.98, 4.04), ...[1.2, 3.0, 4.8, 6.4, 7.8].map((x) => boxG(x - 0.025, x + 0.025, 0, 0.98, 3.99, 4.03))], M.alu));
  L1.add(meshOf([boxG(0.05, 7.8, -0.2, 0.08, 3.9, 4.1), boxG(0.05, 7.8, -0.2, 1.0, 0.5, 0.66)], conc));
  // acceso al edificio al final del paso (fachada eje 7) — genérico, aproximado
  L1.add(meshOf([boxG(7.83, 7.87, 0.02, 2.3, 4.7, 6.1)], M.glass, false));
  L1.add(meshOf([boxG(7.8, 7.86, 2.3, 2.38, 4.66, 6.14), boxG(7.8, 7.86, 0, 2.38, 4.66, 4.72), boxG(7.8, 7.86, 0, 2.38, 6.08, 6.14), boxG(7.8, 7.86, 0, 2.3, 5.37, 5.43)], M.alu));
}

// ---------- Sótano (PL_A004): rampa real 10.9 % (21.79 m) → plataforma → 13.6 % → N-2.96 ----------
const RAMP = { x1: 21.79, s1: 0.109, s2: 0.136, deck: -0.109 * 21.79, low: -2.96, lz0: 8.3 };
const rampY = (x) => -RAMP.s1 * Math.max(0, Math.min(x, RAMP.x1));
const laneY = (z) => Math.max(RAMP.low, RAMP.deck - RAMP.s2 * Math.max(0, z - RAMP.lz0));
function surfaceGeo(polys, fy) {
  const gs = polys.map((p) => { const g = new THREE.ShapeGeometry(shapeOf(p)); g.rotateX(-Math.PI / 2); const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, fy(pos.getX(i), pos.getZ(i))); g.computeVertexNormals(); return g.index ? g.toNonIndexed() : g; });
  return mergeGeometries(gs);
}
function skirt(pts, fy, yb) { // pared vertical bajo un borde de rampa
  const v = []; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const ya = fy(ax, az), yb2 = fy(bx, bz);
    v.push(ax, yb, az, bx, yb, bz, bx, yb2, bz, ax, yb, az, bx, yb2, bz, ax, ya, az); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g;
}
const PARK = { deck: [[18.13, 6.1], [20.72, 6.1], [23.26, 6.1]], low: [[20.72, 15.05], [23.26, 15.05], [18.13, 23.25], [20.72, 23.25], [23.33, 23.25], [25.86, 23.25]] };
function carMesh(color) {
  const G = new THREE.Group();
  const body = new THREE.Mesh(mergeGeometries([boxG(-2.1, 2.1, 0.18, 0.82, -0.86, 0.86), boxG(-1.0, 0.9, 0.82, 1.38, -0.74, 0.74)]), new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.4 }));
  const win = new THREE.Mesh(boxG(-1.02, 0.92, 0.86, 1.32, -0.75, 0.75), new THREE.MeshStandardMaterial({ color: 0x11161c, metalness: 0.9, roughness: 0.1 }));
  const wh = new THREE.Mesh(mergeGeometries([-1.35, 1.35].flatMap((x) => [-0.8, 0.8].map((z) => { const c = new THREE.CylinderGeometry(0.32, 0.32, 0.2, 14); c.rotateX(Math.PI / 2); c.translate(x, 0.32, z * 1.04); return c; }))), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }));
  body.castShadow = true; G.add(body, win, wh); return G;
}
{
  const B = lv('sot').g, y0 = RAMP.low, yd = RAMP.deck;
  B.add(meshOf([extrude(S.lower, y0 - 0.25, 0.25)], M.conc));
  B.add(meshOf([extrude(S.deck, y0 - 0.25, yd - y0 + 0.25)], M.conc));
  B.add(meshOf([extrude(S.walls4, y0, -0.2 - y0)], M.side));
  B.add(meshOf([extrude(S.cols4, y0, -0.2 - y0)], M.brown));
  const r1 = new THREE.Mesh(surfaceGeo(S.band1, (x) => rampY(x) + 0.01), M.asph); r1.receiveShadow = true; B.add(r1);
  const r2 = new THREE.Mesh(surfaceGeo(S.lane2, (x, z) => laneY(z) + 0.01), M.asph); r2.receiveShadow = true; B.add(r2);
  B.add(new THREE.Mesh(mergeGeometries([skirt([[16.5, 3.97], [21.79, 3.97]], (x) => rampY(x), yd), skirt([[24.55, 8.3], [24.55, 12.6]], (x, z) => laneY(z), y0)]), M.side));
  texAsph.repeat.set(0.15, 0.15);
  const arrows = []; for (const x of [3, 9, 15]) { const g = new THREE.PlaneGeometry(1.6, 0.35); g.rotateX(-Math.PI / 2); g.rotateZ(-Math.atan(RAMP.s1)); g.translate(x, rampY(x) + 0.03, 2.3); arrows.push(g.index ? g.toNonIndexed() : g); }
  { const g = new THREE.PlaneGeometry(1.6, 0.35); g.rotateX(-Math.PI / 2); g.rotateY(-Math.PI / 2); g.rotateX(-Math.atan(RAMP.s2)); g.translate(25.95, laneY(10.4) + 0.03, 10.4); arrows.push(g.index ? g.toNonIndexed() : g); }
  B.add(meshOf(arrows, new THREE.MeshBasicMaterial({ color: 0xd8dde3 }), false));
  // baranda del desnivel plataforma (≈N-2.37) / nivel bajo (N-2.96)
  B.add(meshOf([boxG(16.6, 24.55, yd + 0.95, yd + 1.0, 8.27, 8.33), ...[16.7, 18.7, 20.7, 22.7, 24.5].map((x) => boxG(x - 0.025, x + 0.025, yd, yd + 0.98, 8.28, 8.32))], M.alu));
  const st = [];
  const lines = (xs, za, zb, yy) => xs.forEach((x) => st.push(boxG(x - 0.06, x + 0.06, yy, yy + 0.02, za, zb)));
  lines([16.86, 19.41, 22.03, 24.49], 3.97, 8.3, yd); lines([19.41, 22.03, 24.49], 12.8, 17.3, y0); lines([16.86, 19.41, 22.03, 24.63, 27.1], 20.9, 25.6, y0);
  B.add(meshOf(st, M.yellow, false));
  const cols = [0x8a95a3, 0x2f3540, 0xb8bcc2, 0x6b2e2e, 0x3d4b5c, 0xd6d6d2, 0x404448, 0x5a6b55, 0x9aa0a8]; let ci = 0;
  for (const [k, yy] of [['deck', yd], ['low', y0]]) for (const [x, z] of PARK[k]) { const c = carMesh(cols[ci++]); c.rotation.y = Math.PI / 2; c.position.set(x, yy, z); B.add(c); }
  const mot = []; [13.4, 14.5, 15.6, 16.7].forEach((z) => mot.push(boxG(17.4, 19.1, y0 + 0.3, y0 + 1.0, z - 0.15, z + 0.15)));
  B.add(meshOf(mot, new THREE.MeshStandardMaterial({ color: 0x2b2f35, metalness: 0.5, roughness: 0.5 })));
  // cuarto técnico (en la plataforma): rack 7UR + UPS + equipos
  const rx = 11.45, rz = 6.3, yr = yd;
  B.add(meshOf([boxG(rx - 0.26, rx + 0.26, yr + 1.3, yr + 1.68, rz - 0.15, rz + 0.15)], new THREE.MeshStandardMaterial({ color: 0x15181c, metalness: 0.6, roughness: 0.4 })));
  const eq = [boxG(rx - 0.22, rx + 0.22, yr + 1.6, yr + 1.64, rz - 0.16, rz - 0.1), boxG(rx - 0.22, rx + 0.22, yr + 1.5, yr + 1.55, rz - 0.16, rz - 0.1), boxG(rx - 0.22, rx + 0.22, yr + 1.38, yr + 1.45, rz - 0.16, rz - 0.1)];
  B.add(meshOf(eq, new THREE.MeshStandardMaterial({ color: 0x223040, emissive: 0x22c6ff, emissiveIntensity: 0.6 }), false));
  B.add(meshOf([boxG(10.85, 11.0, yr, yr + 0.24, 5.9, 6.32)], new THREE.MeshStandardMaterial({ color: 0x1d2024, roughness: 0.5 })));
}
// cielos rasos solo para el recorrido (no proyectan sombra, para que el interior quede iluminado)
const ceilMat = new THREE.MeshStandardMaterial({ color: 0xe9e7e2, roughness: 0.95, side: THREE.DoubleSide });
const FPC = { sot: new THREE.Mesh(extrude(S.bas_ceil, -0.24, 0.04), ceilMat), floor: new THREE.Mesh(extrude(S.foot2, 2.49, 0.02), ceilMat) };
FPC.sot.visible = FPC.floor.visible = false; FPC.sot.receiveShadow = FPC.floor.receiveShadow = false; lv('sot').g.add(FPC.sot); scene.add(FPC.floor);
// carro animado (entra por el portón y baja la rampa)
const CAR = { m: carMesh(0xb03a2e), t: -1 }; CAR.m.visible = false; scene.add(CAR.m);

// ---------- Cubierta ----------
{
  const R = lv('cub').g, y = 20.3;
  R.add(meshOf([extrude(S.foot2, y - 0.2, 0.2)], M.slab));
  const par = [], br = [];
  for (const p of S.skin) { par.push(seg(p.a, p.b, y, y + 0.6, 0.12, -0.04, 0.12)); br.push(seg(p.a, p.b, y - 0.22, y + 0.04, 0.07, 0.035, 0.07)); }
  R.add(meshOf(par, M.white)); R.add(meshOf(br, M.brown));
  // volumen punto fijo sobre cubierta (aproximado, ≈N+24.4)
  R.add(meshOf([boxG(16.75, 23.8, y, 24.2, 9.4, 12.6)], M.grey));
  const rf = new THREE.BoxGeometry(7.45, 0.08, 3.6); rf.rotateZ(0.05); rf.translate(20.27, 24.3, 11.0);
  R.add(meshOf([rf], M.roof));
}

// ---------- entorno ----------
{
  const big = new THREE.Shape([new THREE.Vector2(-60, 60), new THREE.Vector2(90, 60), new THREE.Vector2(90, -90), new THREE.Vector2(-60, -90)]);
  const f4 = S.foot4[0]; big.holes.push(new THREE.Path(f4.o.map(([x, z]) => new THREE.Vector2(x, -z))));
  const gg = new THREE.ShapeGeometry(big); gg.rotateX(-Math.PI / 2);
  const gm = new THREE.Mesh(gg, M.ground); gm.receiveShadow = true; gm.position.y = -0.005; scene.add(gm);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(9, 70), new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 1 }));
  street.rotation.x = -Math.PI / 2; street.position.set(-5.6, 0.0, 13); street.receiveShadow = true; scene.add(street);
  const sw = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.15, 70), new THREE.MeshStandardMaterial({ color: 0x6d7178, roughness: 1 }));
  sw.position.set(-0.6, 0.075, 13); sw.receiveShadow = true; scene.add(sw);
  const dash = []; for (let z = -20; z < 48; z += 3) dash.push(boxG(-5.68, -5.52, 0.005, 0.01, z, z + 1.5));
  scene.add(meshOf(dash, new THREE.MeshBasicMaterial({ color: 0xbfc4ca }), false));
  const grid = new THREE.GridHelper(160, 80, 0x2a3440, 0x222a33); grid.position.set(15, 0.002, 13); grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid);
}

// ---------- apartamentos (hover) ----------
const APT = [
  { n: 4, x0: 7.85, x1: 18.0, z0: 0.65, z1: 6.4, t: 'Tipo 3', a: '62.06' },
  { n: 3, x0: 18.05, x1: 27.3, z0: 2.13, z1: 8.69, t: 'Tipo 2', a: '60.95' },
  { n: 2, x0: 16.7, x1: 22.0, z0: 12.64, z1: 23.73, t: 'Tipo 1', a: '60.85' },
  { n: 1, x0: 22.0, x1: 27.3, z0: 12.64, z1: 23.73, t: 'Tipo 1', a: '60.85' },
];
const aptMat = new THREE.MeshBasicMaterial({ color: 0x35d3ff, transparent: true, opacity: 0, depthWrite: false });
const aptBoxes = [];
LV.filter((l) => /^p[2-7]$/.test(l.id)).forEach((l) => {
  const fl = +l.id.slice(1);
  APT.forEach((a) => {
    const m = new THREE.Mesh(boxG(a.x0, a.x1, l.y + 0.05, l.y + 2.45, a.z0, a.z1), aptMat.clone());
    m.userData = { num: fl * 100 + a.n, ...a, lv: l }; m.renderOrder = 5; l.g.add(m); aptBoxes.push(m);
  });
});

// ---------- URBAN ----------
const urban = new THREE.Group(); scene.add(urban);
const C_URB = 0x35d3ff, C_CAM = 0x7cf7c5, C_CAB = 0xffb547;
const PED_LOCK_Y = () => GT.H * GT.hs * 0.47;
const MK = [
  { id: 'kiosk', lv: 'p1', p: [-0.14, 1.45, GT.kz], c: C_URB, t: 'Kiosko URBAN', s: 'Propuesta', loc: 'Jamba fija derecha del portón, junto a la puerta peatonal, hacia la calle, con visera.', bom: [0, 1, 2, 3, 4],
    why: 'Único punto que abre la puerta peatonal: reconocimiento facial (y PIN como respaldo; también la app URBAN). Va en la jamba fija para no someter la tablet a los golpes de la hoja; la visera la protege del sol y la lluvia.' },
  { id: 'esp', lv: 'p1', p: [0.2, 2.0, 6.82], c: C_URB, t: 'ESP32 en caja con llave', s: 'Propuesta', loc: 'Cara interior del pilar derecho del portón, adentro (alternativa: dentro del edificio, en el acceso).', bom: [11, 12, 13, 14, 16, 17, 19],
    why: 'Controlador local que acciona la cerradura de la puerta peatonal y lee botón de salida y sensor. Va del lado seguro, en caja IP66 con llave, junto a la fuente de respaldo 12 V.' },
  { id: 'lock', lv: 'p1', p: [-0.06, 2.1, GT.Z0 + 0.638 * GT.W], c: C_URB, t: 'Cerradura fail-secure (puerta peatonal)', s: 'Propuesta', loc: 'Hoja peatonal (la pequeña, con manija), junto a la manija del render, con contraplaca.', bom: [5, 9, 10, 6],
    why: 'Sin energía permanece cerrada y abre con llave mecánica. Solo se libera con una orden válida de URBAN (facial, app o PIN). El cierrapuertas asegura que la hoja vuelva y enganche.' },
  { id: 'rex', lv: 'p1', p: [0.12, 1.2, 6.62], c: C_URB, t: 'Botón de salida', s: 'Propuesta', loc: 'Cara interior de la jamba fija, junto a la hoja peatonal, h≈1.20 m.', bom: [7],
    why: 'Salida libre desde adentro sin app ni PIN; queda registrada como solicitud de salida.' },
  { id: 'sens', lv: 'p1', p: [0.1, 2.3, 4.6], c: C_URB, t: 'Sensor de puerta', s: 'Propuesta', loc: 'Cara interior de la hoja peatonal, lado de la manija.', bom: [8],
    why: 'Informa puerta abierta, cerrada o forzada para alarmas y bitácora.' },
  { id: 'c1', lv: 'p1', p: [-0.2, 2.8, 6.9], aim: [-5.2, 0.6, 3.6], c: C_CAM, t: 'C1 · Cámara exterior ingreso', s: 'Propuesta', loc: 'Pilar derecho del portón (exterior), mirando el kiosko, el andén y la entrada de carros.', bom: [25],
    why: 'Registra quién se acerca desde la calle y usa el kiosko (rostro y evento).' },
  { id: 'c2', lv: 'p1', p: [7.7, 2.9, 6.45], aim: [0.3, 1.0, 4.6], c: C_CAM, t: 'C2 · Cámara interior (paso peatonal)', s: 'Propuesta', loc: 'Adentro, en la fachada del edificio, mirando el paso peatonal y la puerta.', bom: [26],
    why: 'Confirma quién entró realmente después de cada apertura.' },
  { id: 'c3', lv: 'p1', p: [7.7, 3.2, 1.0], aim: [0.0, -0.3, 2.4], c: C_CAM, t: 'C3 · Cámara rampa', s: 'Propuesta', loc: 'Boca de la rampa vehicular, bajo el letrero ED. ALMENDRA de la fachada.', bom: [27],
    why: 'Registra vehículos que entran y salen por la rampa al sótano.' },
  { id: 'rack', lv: 'sot', p: [11.45, RAMP.deck + 1.75, 6.2], c: C_URB, t: 'Cuarto técnico (C. Eléctrico/Telecom 3.67 m²)', s: 'Hecho', s2: 'Propuesta (equipos)', loc: 'Sótano, cuarto C. ELÉCTRICO / TELEC según PL_A004.', bom: [22, 20, 21, 23, 24, 28, 29, 18],
    why: 'Concentra router VPN, switch PoE, NVR y UPS en un espacio cerrado del sótano. El cuarto existe en el plano; los equipos son propuesta.' },
  { id: 'door', lv: 'p1', p: [-0.25, 3.2, 2.5], c: 0xc9a77c, t: 'Portón ED. ALMENDRA (vehicular + peatonal)', s: 'Aproximado', s2: 'Fase 2: motor del portón', loc: 'Borde de calle, sobre el paramento, cubriendo todo el acceso: franja de rampa (3.33 m) + franja peatonal. Ancho ≈6.1 m (muro norte de la rampa → lindero); alto por proporción del render. Medidas por tomar en sitio.', bom: [43, 44],
    why: 'Un solo portón según el render: las hojas grandes son el portón vehicular (abre para carros; motor y control por definir en fase 2) y la hoja pequeña con manija, junto a la jamba del kiosko, es la puerta peatonal, que solo abre con URBAN (facial, app o PIN).' },
];
const MAJOR = new Set(['kiosk', 'rack', 'c1', 'door']);
const CABLE = [
  ['p1', -0.14, 1.45, GT.kz], ['p1', 0.12, 1.45, 6.6], ['p1', 0.2, 2.0, 6.82], ['p1', 0.3, -0.45, 6.6],
  ['p1', 7.85, -0.45, 6.4], ['sot', 11.45, -0.45, 6.4], ['sot', 11.45, RAMP.deck + 1.5, 6.2],
];
const haloMat = (c) => new THREE.SpriteMaterial({ map: texHalo, color: c, transparent: true, sizeAttenuation: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
const labels = $('#labels');
MK.forEach((m) => {
  const g = new THREE.Group(); g.position.set(...m.p);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: m.c, depthTest: false, transparent: true }));
  core.renderOrder = 20; g.add(core);
  const halo = new THREE.Sprite(haloMat(m.c)); halo.scale.setScalar(0.05); halo.renderOrder = 19; g.add(halo);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.mk = m; g.add(hit);
  m.g = g; m.halo = halo; m.core = core; m.hit = hit; lv(m.lv).g.add(g);
  const el = document.createElement('button'); el.className = 'tag'; el.style.setProperty('--c', '#' + m.c.toString(16).padStart(6, '0'));
  el.innerHTML = `<i></i><span>${m.t}</span>${m.s === 'Aproximado' ? '<em>≈</em>' : ''}`;
  el.onclick = (e) => { e.stopPropagation(); openPanel(m); };
  labels.appendChild(el); m.el = el;
  if (m.aim) {
    const dir = new THREE.Vector3(...m.aim).sub(new THREE.Vector3(...m.p)); const R = 5.0, hf = THREE.MathUtils.degToRad(50), vf = THREE.MathUtils.degToRad(30);
    const w = Math.tan(hf) * R, h = Math.tan(vf) * R;
    const v = [0, 0, 0, -w, -h, -R, w, -h, -R, w, h, -R, -w, h, -R];
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    geo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
    const fr = new THREE.Group();
    fr.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: m.c, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })));
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -w, -h, -R, 0, 0, 0, w, -h, -R, 0, 0, 0, w, h, -R, 0, 0, 0, -w, h, -R, -w, -h, -R, w, -h, -R, w, -h, -R, w, h, -R, w, h, -R, -w, h, -R, -w, h, -R, -w, -h, -R], 3));
    fr.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: m.c, transparent: true, opacity: 0.45 })));
    fr.lookAt(dir.clone().negate()); // -Z toward aim
    fr.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), dir, new THREE.Vector3(0, 1, 0)));
    g.add(fr); m.fr = fr;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.26), new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.4 }));
    body.quaternion.copy(fr.quaternion); g.add(body);
  }
});
// cable (tubo con trazos animados)
const cableMat = new THREE.ShaderMaterial({
  uniforms: { t: { value: 0 }, len: { value: 30 }, c: { value: new THREE.Color(C_CAB) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader: 'uniform float t; uniform float len; uniform vec3 c; varying vec2 vUv; void main(){ float d=fract(vUv.x*len/0.45 - t*1.6); if(d>0.55) discard; gl_FragColor=vec4(c*1.25,0.95);} ',
  transparent: true, depthTest: false, depthWrite: false,
});
let cableMesh = null; const cableLabel = document.createElement('div'); cableLabel.className = 'tag cab'; cableLabel.innerHTML = '<i></i><span>Ruta de cable · PROPUESTA — medir en sitio</span>';
cableLabel.onclick = () => openPanel(CAB_MK); labels.appendChild(cableLabel);
const CAB_MK = { t: 'Ruta de cable (propuesta)', s: 'Propuesta', c: C_CAB, loc: 'Kiosko (jamba del portón) → caja ESP32 en el pilar → ducto enterrado bajo el paso peatonal → pasamuro al sótano → cielo raso de C. Útil 1 y 2 (validar) → cuarto técnico. Recorrido ≈15 m (estimado sobre el modelo); con holguras ≈18–20 m de cable. Trazado indicativo: medir en sitio.', bom: [30, 31, 32, 33, 34, 35, 36, 37],
  why: 'UTP Cat 6 exterior para datos/PoE y 2×18 AWG para cerradura, sensor y botón, en conduit PVC enterrado bajo el paso y EMT dentro del sótano.' };
function cablePts() { return CABLE.map(([l, x, y, z]) => new THREE.Vector3(x, y + lv(l).g.position.y, z)); }
function rebuildCable() {
  const pts = cablePts(); const path = new THREE.CurvePath(); let L = 0;
  for (let i = 0; i < pts.length - 1; i++) { path.add(new THREE.LineCurve3(pts[i], pts[i + 1])); L += pts[i].distanceTo(pts[i + 1]); }
  if (cableMesh) { cableMesh.geometry.dispose(); urban.remove(cableMesh); }
  cableMesh = new THREE.Mesh(new THREE.TubeGeometry(path, 400, 0.035, 6, false), cableMat); cableMesh.renderOrder = 18; urban.add(cableMesh);
  cableMat.uniforms.len.value = L; CAB_MK.mid = path.getPointAt(0.45); CAB_MK.len = L;
}
rebuildCable();

// ---------- UI state ----------
const st = { urban: true, xray: false, explode: 0, cut: null, flow: null };
function applyVis() {
  const ci = st.cut == null ? 99 : LV.findIndex((l) => l.id === st.cut);
  LV.forEach((l, i) => { l.g.visible = l.on && i <= ci; });
  urban.visible = st.urban;
  MK.forEach((m) => { m.g.visible = st.urban; });
  FACADE.forEach((m) => {
    if (st.xray) { m.transparent = true; m.opacity = Math.min(m.userData.op, 0.16); m.depthWrite = false; }
    else { m.transparent = m.userData.tr; m.opacity = m.userData.op; m.depthWrite = !m.userData.tr; }
    m.needsUpdate = true;
  });
}
function applyExplode() { LV.forEach((l) => { l.g.position.y = st.explode * l.k * 2.6; }); rebuildCable(); }

// floors list
const fl = $('#floors');
[...LV].reverse().forEach((l) => {
  const b = document.createElement('label'); b.className = 'chk';
  b.innerHTML = `<input type="checkbox" checked><span>${l.name}${l.id === 'p1' ? ' <small>esquemático</small>' : ''}</span>`;
  b.querySelector('input').onchange = (e) => { l.on = e.target.checked; applyVis(); }; fl.appendChild(b);
});
const cutSel = $('#cut'); LV.forEach((l) => { const o = document.createElement('option'); o.value = l.id; o.textContent = 'Cortar sobre ' + l.name; cutSel.appendChild(o); });
cutSel.onchange = () => { st.cut = cutSel.value || null; applyVis(); };
$('#tUrban').onchange = (e) => { st.urban = e.target.checked; applyVis(); };
$('#tXray').onchange = (e) => { st.xray = e.target.checked; applyVis(); };
$('#explode').oninput = (e) => { st.explode = +e.target.value; applyExplode(); };
$('#menuBtn').onclick = () => document.body.classList.toggle('menu-open');
$('#infoBtn').onclick = () => $('#approx').classList.toggle('show');
$('#approxClose').onclick = () => $('#approx').classList.remove('show');

// ---------- side panel ----------
const panel = $('#panel');
function chip(s) { const c = s.startsWith('Hecho') ? 'ok' : s.startsWith('Aprox') ? 'ap' : 'pr'; return `<span class="chip ${c}">${s}</span>`; }
function openPanel(m) {
  const rows = (m.bom || []).map((i) => S.bom[i]).map((b) => `<div class="bom"><div class="bt">${b.it}<span>×${b.q}</span></div><div class="bm">${b.m}</div><div class="bp">${b.st === 'H' ? fmt(b.p) + ' <small>c/u · precio verificado</small>' : b.st === 'E' ? '<small>Estimado — sin precio verificado</small>' : '<small>Por cotizar</small>'}</div></div>`).join('');
  panel.innerHTML = `<button class="x" aria-label="Cerrar">×</button><div class="ph" style="--c:#${m.c.toString(16).padStart(6, '0')}"><i></i>${m.t}</div>
  <div class="chips">${chip(m.s)}${m.s2 ? chip(m.s2) : ''}</div>
  <h4>Qué es / por qué</h4><p>${m.why}</p><h4>Ubicación</h4><p>${m.loc}</p>
  ${rows ? `<h4>Modelo (lista de hardware URBAN)</h4>${rows}` : ''}
  <p class="fine">Ubicación de elementos URBAN: propuesta, sujeta a visita técnica.</p>`;
  panel.querySelector('.x').onclick = closePanel; panel.classList.add('show');
  MK.forEach((k) => k.el.classList.toggle('sel', k === m)); cableLabel.classList.toggle('sel', m === CAB_MK);
}
function closePanel() { panel.classList.remove('show'); MK.forEach((k) => k.el.classList.remove('sel')); cableLabel.classList.remove('sel'); }

// ---------- camera presets ----------
const VIEWS = {
  general: { p: [-25, 20, -12], t: [13, 5.5, 11], cut: null },
  fachada: { p: [-36, 8.5, 11], t: [11, 8.6, 11], cut: null },
  ingreso: { p: [-12.5, 2.4, 3.0], t: [0, 2.5, 3.7], cut: null },
  rampa: { p: [-6, 10, -5.5], t: [9, -1.4, 2.4], cut: null },
  sotano: { p: [1, 21, -9], t: [16, -3, 12], cut: 'sot' },
  tipo: { p: [3, 36, 31], t: [18.5, 14.5, 12.5], cut: 'p6' },
};
let tween = null;
function goView(k, instant) {
  if (FP.on) fpExit();
  const v = VIEWS[k]; st.cut = v.cut; cutSel.value = v.cut || ''; applyVis();
  document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === k));
  const p1 = new THREE.Vector3(...v.p), t1 = new THREE.Vector3(...v.t);
  if (k === 'tipo' || k === 'sotano') { const off = lv(v.cut).g.position.y; p1.y += off; t1.y += off; }
  if (instant) { camera.position.copy(p1); controls.target.copy(t1); controls.update(); return; }
  tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1, t1, s: performance.now(), d: 1100 };
}
document.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => goView(b.dataset.view)));

// ---------- flows ----------
const FLOWS = {
  rostro: { n: 'Con internet · rostro', steps: [['kiosk', 'El residente se para frente al kiosko: la tablet capta el rostro.'], ['rack', 'La solicitud viaja por la red del edificio (switch → router) a la plataforma URBAN, que valida.'], ['esp', 'La autorización llega al ESP32 por la red local.'], ['lock', 'El relé del ESP32 da el pulso a la cerradura: la puerta abre.'], ['sens', 'El sensor confirma apertura y cierre; C1 y C2 graban el evento en el NVR.']] },
  app: { n: 'Con internet · app', steps: [['door', 'El residente pide la apertura desde la app URBAN en su celular.'], ['rack', 'La orden llega por internet al router del edificio.'], ['esp', 'El router la entrega al ESP32.'], ['lock', 'Cerradura abre (pulso).'], ['c2', 'Sensor y cámaras dejan registro del ingreso.']] },
  pin: { n: 'Sin internet · PIN', steps: [['kiosk', 'Sin internet, el kiosko pide un PIN.'], ['esp', 'Validación en la red local del edificio (lógica exacta a confirmar en el firmware URBAN).'], ['lock', 'Cerradura abre.'], ['rack', 'El evento queda en registro local; sincronización al volver internet (a confirmar).']] },
  luz: { n: 'Sin luz · UPS / batería / llave', steps: [['rack', 'Corte de energía: la UPS del rack mantiene router, switch y NVR.'], ['esp', 'La fuente con batería 12 V mantiene ESP32, cerradura y kiosko (USB-C PD).'], ['lock', 'Si la batería se agota, la cerradura fail-secure queda CERRADA y abre con llave mecánica.'], ['rex', 'Salida desde adentro: botón de salida (con energía) o herraje mecánico (validar en sitio).']] },
};
const dot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false })); dot.renderOrder = 30;
const dotHalo = new THREE.Sprite(haloMat(0xffffff)); dotHalo.scale.setScalar(0.08); dot.add(dotHalo); dot.visible = false; scene.add(dot);
const cap = $('#caption');
function mkWorld(id) { const m = MK.find((k) => k.id === id); return m.g.getWorldPosition(new THREE.Vector3()); }
function startFlow(k) {
  if (!st.urban) { st.urban = true; $('#tUrban').checked = true; applyVis(); }
  st.flow = { k, i: 0, s: performance.now() }; dot.visible = true;
  document.querySelectorAll('[data-flow]').forEach((b) => b.classList.toggle('on', b.dataset.flow === k));
}
function stopFlow() { st.flow = null; dot.visible = false; cap.classList.remove('show'); MK.forEach((m) => m.el.classList.remove('hl')); document.querySelectorAll('[data-flow]').forEach((b) => b.classList.remove('on')); }
document.querySelectorAll('[data-flow]').forEach((b) => (b.onclick = () => (st.flow && st.flow.k === b.dataset.flow ? stopFlow() : startFlow(b.dataset.flow))));
$('#capClose').onclick = stopFlow;
const STEP = 2600;
function tickFlow(now) {
  const f = st.flow; if (!f) return; const F = FLOWS[f.k];
  let e = now - f.s; if (e > STEP) { f.i++; f.s = now; e = 0; if (f.i >= F.steps.length) { f.i = 0; }
    if (F.steps[f.i][0] === 'lock' && f.k !== 'luz') { openPed(true); setTimeout(() => openPed(false), 3200); } }
  const [id, txt] = F.steps[f.i]; const prev = F.steps[(f.i - 1 + F.steps.length) % F.steps.length][0];
  const a = mkWorld(f.i === 0 ? id : prev), b = mkWorld(id); const u = Math.min(1, e / 900);
  dot.position.lerpVectors(a, b, u * u * (3 - 2 * u));
  MK.forEach((m) => m.el.classList.toggle('hl', m.id === id));
  cap.innerHTML = `<b>${F.n}</b><span class="stp">Paso ${f.i + 1}/${F.steps.length}</span><p>${txt}</p><small>Flujo propuesto, ilustrativo.</small><button id="capClose2">Detener</button>`;
  cap.querySelector('#capClose2').onclick = stopFlow; cap.classList.add('show');
}

// ---------- picking / hover ----------
const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); const tip = $('#tip'); let hovered = null;
function setNdc(e) { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
function visibleObj(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' || FP.on) return; setNdc(e); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(aptBoxes.filter((b) => b.userData.lv.g.visible), false);
  const h = hits[0] && hits[0].object;
  if (hovered && hovered !== h) hovered.material.opacity = 0;
  hovered = h || null;
  if (h) { h.material.opacity = 0.13; const d = h.userData; tip.innerHTML = `<b>Apto ${d.num}</b><span>${d.t} · ${d.a} m²</span><small>Piso ${Math.floor(d.num / 100)} · área según cuadro PL_A002</small>`; tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 14 + 'px'; tip.classList.add('show'); }
  else tip.classList.remove('show');
});
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return; setNdc(e); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(MK.filter((m) => visibleObj(m.g)).map((m) => m.hit), false);
  if (hits.length) { openPanel(hits[0].object.userData.mk); return; }
  const ah = ray.intersectObjects(aptBoxes.filter((b) => b.userData.lv.g.visible), false)[0];
  if (ah && e.pointerType === 'touch') { const d = ah.object.userData; tip.innerHTML = `<b>Apto ${d.num}</b><span>${d.t} · ${d.a} m²</span>`; tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY - 60 + 'px'; tip.classList.add('show'); setTimeout(() => tip.classList.remove('show'), 2200); }
});

// ---------- apt labels for cut floor ----------
const aptLbl = APT.map((a) => { const el = document.createElement('div'); el.className = 'apt'; labels.appendChild(el); return { a, el }; });
const floatLbl = [
  { t: 'PISO 1 · ESQUEMÁTICO — falta plancha 1/6', p: [16.7, 2.2, 20], l: 'p1', cls: 'note' },
  { t: 'Paso peatonal', p: [4.2, 0.25, 5.4], l: 'p1', cls: 'note sm' },
  { t: 'Portón en borde de calle · medidas aprox.', p: [0, 0.4, -0.3], l: 'p1', cls: 'note sm' },
  { t: 'Acceso al edificio (aprox.)', p: [7.8, 2.6, 5.4], l: 'p1', cls: 'note sm' },
  { t: 'Rampa 10.9 % · 21.79 m (PL_A004)', p: [6, 0.1, 2.3], l: 'sot', cls: 'note sm' },
  { t: 'Plataforma ≈N-2.37 (por verificar)', p: [23, -1.6, 2.3], l: 'sot', cls: 'note sm', only: 'sot' },
  { t: 'Sótano N-2.96 · 9 carros + 4 motos', p: [22, -1.2, 26.4], l: 'sot', cls: 'note sm', only: 'sot' },
  { t: 'Rampa 13.6 % → N-2.96', p: [26, -1.6, 10.4], l: 'sot', cls: 'note sm', only: 'sot' },
  { t: 'Volumen punto fijo ≈ (aprox.)', p: [20.3, 24.6, 11], l: 'cub', cls: 'note sm' },
].map((f) => { const el = document.createElement('div'); el.className = f.cls; el.textContent = f.t; labels.appendChild(el); return { ...f, el }; });


// ================= portón: animación =================
function openPed(o) { GT.ped.tgt = o ? 1 : 0; }
function openVeh(o) { GT.v1.tgt = GT.v2.tgt = o ? 1 : 0; $('#bVeh') && $('#bVeh').classList.toggle('on', !!o); if (o && (CAR.t < 0 || CAR.t >= 1)) { CAR.t = 0; CAR.closed = false; CAR.m.visible = true; } }
function gateUpdate(dt) {
  for (const L of GT.leaves) { const sp = L.name === 'ped' ? 1.2 : 0.35; L.cur += Math.sign(L.tgt - L.cur) * Math.min(Math.abs(L.tgt - L.cur), sp * dt);
    L.piv.rotation.y = L.sgn * L.cur * Math.PI / 2 * (L.name === 'ped' ? 0.95 : 0.92); }
}
function leafSeg(L) { const th = L.piv.rotation.y; return [0, L.hz, L.w * L.dir * Math.sin(th), L.hz + L.w * L.dir * Math.cos(th)]; }
function setGateH(k) {
  GT.layout(k === 'std' ? 2.6 / GT.H : 1);
  const lk = MK.find((m) => m.id === 'lock'); lk.g.position.y = Math.max(1.0, PED_LOCK_Y());
  const sn = MK.find((m) => m.id === 'sens'); sn.g.position.y = Math.min(2.3, GT.H * GT.hs - 0.15);
}
// carro que entra: calle → portón → rampa 10.9 % → plataforma
function carUpdate(dt) {
  if (CAR.t < 0) return; const G = CAR.m;
  if (GT.v1.cur < 0.9 && CAR.t < 0.05) { G.position.set(-11, 0, 2.3); G.rotation.set(0, 0, 0); return; }
  CAR.t = Math.min(1, CAR.t + dt / 11); const x = -11 + CAR.t * 35.5;
  const y = x < 0 ? 0 : rampY(x); G.position.set(x, y + 0.01, 2.3); G.rotation.set(0, 0, x > 0.5 && x < RAMP.x1 - 0.5 ? -Math.atan(RAMP.s1) : 0);
  G.visible = st.explode < 0.01 && (FP.on || lv('sot').g.visible);
  if (x > 6 && !CAR.closed) { CAR.closed = true; setTimeout(() => openVeh(false), 600); }
  if (CAR.t >= 1) CAR.t = 1.0001;
}

// ================= recorrido en primera persona =================
const FP = { on: false, x: -5.4, z: 4.4, y: 0, yaw: -Math.PI / 2, pitch: 0, mode: 'ground', floor: null, keys: {}, joy: { x: 0, y: 0 }, prevCut: null };
const EYE = 1.6, RAD = 0.24;
function segsOf(polys) { const out = []; for (const p of polys) for (const ring of [p.o, ...(p.h || [])]) for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; out.push([a[0], a[1], b[0], b[1]]); } return out; }
const SEG = {
  floor: [...segsOf(S.walls2), ...segsOf(S.cols2), ...S.skin.map((p) => [p.a[0], p.a[1], p.b[0], p.b[1]])],
  sot: [...segsOf(S.walls4).filter((g) => !(Math.max(g[0], g[2]) < 7.7 && Math.min(g[1], g[3]) > 3.75 && Math.max(g[1], g[3]) < 4.25)), ...segsOf(S.cols4),
    [1.2, 3.97, 7.8, 3.97], [16.4, 8.3, 24.55, 8.3], [16.5, 3.97, 21.79, 3.97], [24.55, 8.3, 24.55, 12.6],
    ...[...PARK.deck, ...PARK.low].flatMap(([x, z]) => segsOf([{ o: [[x - 0.9, z - 2.15], [x + 0.9, z - 2.15], [x + 0.9, z + 2.15], [x - 0.9, z + 2.15]] }])),
    [17.3, 13.0, 19.2, 13.0], [19.2, 13.0, 19.2, 17.0], [17.3, 17.0, 19.2, 17.0]],
  ground: [[1.2, 3.97, 27.3, 3.97], [0, 0.49, 0, 0.64], [0, 6.74, 0, 6.89], [-0.12, 0.49, 0.12, 0.49], [-0.12, 6.89, 0.12, 6.89]],
};
function pip(polys, x, z) { for (const p of polys) { let c = false; const r = p.o; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } if (c) return true; } return false; }
function dSeg(px, pz, s) { const [ax, az, bx, bz] = s; const dx = bx - ax, dz = bz - az; const L = dx * dx + dz * dz || 1e-9; let t = ((px - ax) * dx + (pz - az) * dz) / L; t = Math.max(0, Math.min(1, t)); const qx = ax + t * dx - px, qz = az + t * dz - pz; return Math.sqrt(qx * qx + qz * qz); }
function segsFor(mode) { const gs = GT.leaves.map(leafSeg).concat([[0, GT.Z0 + 0.91 * GT.W, 0, GT.Z1]]); return mode === 'floor' ? SEG.floor : mode === 'ground' ? SEG.ground.concat(gs) : SEG.sot.concat(gs); }
function blocked(x, z, mode, r = RAD) { for (const s of segsFor(mode)) if (dSeg(x, z, s) < r) return true; return false; }
function hAt(x, z, mode) {
  if (mode === 'floor') return lv(FP.floor).y;
  if (mode === 'ramp') return rampY(x);
  if (mode === 'sot') return pip(S.deck, x, z) ? RAMP.deck : pip(S.lane2, x, z) ? laneY(z) : RAMP.low;
  return 0;
}
function modeAfter(x, z) {
  if (FP.mode === 'floor') return 'floor';
  if (x >= 0 && pip(S.band1, x, z)) return 'ramp';
  if (FP.mode === 'ramp') return rampY(x) < -1 ? 'sot' : 'ground';
  return FP.mode;
}
function findFree(mode, x, z) { for (let r = 0; r < 4; r += 0.15) for (let a = 0; a < 6.28; a += 0.4) { const px = x + r * Math.cos(a), pz = z + r * Math.sin(a); if (!blocked(px, pz, mode, 0.4)) return [px, pz]; } return [x, z]; }
const TP = { inicio: ['ground', -5.4, 4.4, -Math.PI / 2], acceso: ['ground', 6.2, 5.4, -Math.PI / 2], sot: ['sot', 20.0, 12.2, Math.PI / 2] };
function fpTeleport(k) {
  if (/^p[2-7]$/.test(k)) { FP.mode = 'floor'; FP.floor = k; const [x, z] = findFree('floor', 20.0, 9.2); FP.x = x; FP.z = z; FP.yaw = Math.PI; }
  else { const [m, x, z, yaw] = TP[k]; FP.mode = m; FP.floor = null; const [fx, fz] = m === 'ground' ? [x, z] : findFree(m, x, z); FP.x = fx; FP.z = fz; FP.yaw = yaw; }
  FP.pitch = 0; fpCut(true); fpHudFloor();
}
function fpPose(x, z, yaw, pitch, mode, floor) { FP.x = x; FP.z = z; FP.yaw = yaw; FP.pitch = pitch || 0; FP.mode = mode || 'ground'; FP.floor = floor || null; fpCut(true); fpHudFloor(); }
let lastCut = '';
function fpCut(force) {
  let c = null;
  if (FP.mode === 'floor') c = FP.floor;
  else if ((FP.mode === 'sot' || FP.mode === 'ramp') && FP.x > 7.4) c = 'sot';
  else if (FP.mode === 'ground' && pip(S.foot2, FP.x, FP.z)) c = 'p1';
  const key = String(c); if (!force && key === lastCut) return; lastCut = key; st.cut = c; cutSel.value = c || ''; applyVis();
}
function fpEnter() {
  if (FP.on) return; FP.on = true; FP.prevCut = st.cut; stopFlow(); closePanel(); tween = null;
  if (st.explode) { st.explode = 0; $('#explode').value = 0; applyExplode(); }
  controls.enabled = false; camera.near = 0.05; camera.fov = innerWidth < innerHeight ? 75 : 68; camera.updateProjectionMatrix();
  document.body.classList.add('fp'); $('#bFP').classList.add('on'); $('#bFP').textContent = 'Salir del recorrido';
  fpTeleport('inicio'); tip.classList.remove('show');
}
function fpExit() {
  if (!FP.on) return; FP.on = false; if (document.pointerLockElement) document.exitPointerLock();
  FPC.sot.visible = FPC.floor.visible = false; controls.enabled = true; camera.near = 0.1; camera.rotation.set(0, 0, 0); resize();
  document.body.classList.remove('fp'); $('#bFP').classList.remove('on'); $('#bFP').textContent = 'Recorrer por dentro';
  st.cut = FP.prevCut; cutSel.value = st.cut || ''; applyVis(); lastCut = '';
  camera.position.set(-25, 20, -12); controls.target.set(13, 5.5, 11); controls.update();
}
function fpHudFloor() {
  const n = FP.mode === 'floor' ? 'Piso ' + FP.floor.slice(1) : FP.mode === 'sot' ? 'Sótano' : FP.mode === 'ramp' ? 'Rampa' : (FP.x < 0 ? 'Andén / calle' : 'Piso 1 · acceso');
  $('#fpWhere').textContent = n;
  document.querySelectorAll('[data-tp]').forEach((b) => b.classList.toggle('on', b.dataset.tp === (FP.floor || (FP.mode === 'sot' ? 'sot' : ''))));
}
function fpUpdate(dt) {
  const k = FP.keys; let f = 0, r = 0;
  if (k.KeyW || k.ArrowUp) f += 1; if (k.KeyS || k.ArrowDown) f -= 1; if (k.KeyD) r += 1; if (k.KeyA) r -= 1;
  if (k.ArrowLeft) FP.yaw += 1.8 * dt; if (k.ArrowRight) FP.yaw -= 1.8 * dt;
  f += -FP.joy.y; r += FP.joy.x;
  const sp = (k.ShiftLeft || k.ShiftRight ? 3.4 : 1.6) * dt; const n = Math.hypot(f, r); if (n > 1) { f /= n; r /= n; }
  const fx = -Math.sin(FP.yaw), fz = -Math.cos(FP.yaw), rx = Math.cos(FP.yaw), rz = -Math.sin(FP.yaw);
  const dx = (fx * f + rx * r) * sp, dz = (fz * f + rz * r) * sp;
  if (dx || dz) {
    const m0 = FP.mode;
    const tryMove = (nx, nz) => { const m = modeAfter(nx, nz); const prev = FP.mode; FP.mode = m; const ok = !blocked(nx, nz, m === 'ramp' ? 'sot' : m) && Math.abs(hAt(nx, nz, m) - hAt(FP.x, FP.z, prev)) < 0.5; if (!ok) FP.mode = prev; return ok; };
    if (tryMove(FP.x + dx, FP.z + dz)) { FP.x += dx; FP.z += dz; } else if (tryMove(FP.x + dx, FP.z)) FP.x += dx; else if (tryMove(FP.x, FP.z + dz)) FP.z += dz;
    if (FP.mode !== m0) fpHudFloor();
  }
  const ty = hAt(FP.x, FP.z, FP.mode); FP.y += (ty - FP.y) * Math.min(1, dt * 12);
  camera.position.set(FP.x, FP.y + EYE, FP.z); camera.rotation.order = 'YXZ'; camera.rotation.set(FP.pitch, FP.yaw, 0);
  fpCut(false); if (FP.mode === 'ground') fpHudFloor();
  FPC.sot.visible = FP.mode === 'sot' || (FP.mode === 'ramp' && FP.x > 7.8); FPC.floor.visible = FP.mode === 'floor'; if (FP.floor) FPC.floor.position.y = lv(FP.floor).y;
  const nearPed = FP.mode === 'ground' && Math.abs(FP.x) < 3.2 && FP.z > GT.ped.hz - GT.ped.w - 0.6 && FP.z < GT.Z1 + 0.8;
  const nearVeh = Math.abs(FP.x) < 4 && FP.z < GT.v2.hz + 0.3 && FP.z > GT.Z0 - 1;
  $('#fpPrompt').innerHTML = nearPed ? '<b>E</b> · Abrir puerta peatonal con URBAN (facial — simulado)' : nearVeh ? '<b>V</b> · Abrir portón vehicular (fase 2 — motor/control por definir)' : '';
}
// entradas
addEventListener('keydown', (e) => { if (!FP.on) return; FP.keys[e.code] = true;
  if (e.code === 'KeyE') { openPed(true); setTimeout(() => openPed(false), 4500); }
  if (e.code === 'KeyV') openVeh(!GT.v1.tgt);
  if (e.code === 'Escape' && !document.pointerLockElement) fpExit();
  if (/Arrow|Space/.test(e.code)) e.preventDefault(); });
addEventListener('keyup', (e) => { FP.keys[e.code] = false; });
let look = null;
canvas.addEventListener('pointerdown', (e) => { if (!FP.on) return; look = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: 0 }; });
addEventListener('pointermove', (e) => {
  if (!FP.on) return;
  if (document.pointerLockElement === canvas) { FP.yaw -= e.movementX * 0.0025; FP.pitch -= e.movementY * 0.0025; }
  else if (look && e.pointerId === look.id) { const dx = e.clientX - look.x, dy = e.clientY - look.y; look.moved += Math.abs(dx) + Math.abs(dy); FP.yaw -= dx * 0.005; FP.pitch -= dy * 0.005; look.x = e.clientX; look.y = e.clientY; }
  FP.pitch = Math.max(-1.3, Math.min(1.3, FP.pitch));
});
addEventListener('pointerup', (e) => { if (!FP.on || !look || e.pointerId !== look.id) return; if (look.moved < 4 && e.pointerType === 'mouse' && canvas.requestPointerLock) { try { canvas.requestPointerLock(); } catch (_) {} } look = null; });
{
  const joy = $('#joy'), knob = $('#joy i'); let jid = null, c0 = null;
  joy.addEventListener('pointerdown', (e) => { jid = e.pointerId; const r = joy.getBoundingClientRect(); c0 = [r.left + r.width / 2, r.top + r.height / 2]; joy.setPointerCapture(e.pointerId); e.stopPropagation(); });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId !== jid) return; let dx = (e.clientX - c0[0]) / 50, dy = (e.clientY - c0[1]) / 50; const n = Math.hypot(dx, dy); if (n > 1) { dx /= n; dy /= n; } FP.joy.x = dx; FP.joy.y = dy; knob.style.transform = `translate(${dx * 38}px,${dy * 38}px)`; });
  const end = (e) => { if (e.pointerId !== jid) return; jid = null; FP.joy.x = FP.joy.y = 0; knob.style.transform = ''; };
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
}
$('#bFP').onclick = () => (FP.on ? fpExit() : fpEnter());
$('#fpExit').onclick = fpExit;
document.querySelectorAll('[data-tp]').forEach((b) => (b.onclick = () => fpTeleport(b.dataset.tp)));
$('#fpOpen').onclick = () => { openPed(true); setTimeout(() => openPed(false), 4500); };
$('#fpVeh').onclick = () => openVeh(!GT.v1.tgt);
$('#bVeh').onclick = () => openVeh(!GT.v1.tgt);
$('#gateH').onchange = (e) => setGateH(e.target.value);
// minimapa
const mini = $('#mini'), mctx = mini.getContext('2d');
const MM = { s: 5.4, ox: 3.5, oz: 1.2 };
function path(polys) { const p = new Path2D(); for (const q of polys) for (const ring of [q.o, ...(q.h || [])]) { ring.forEach(([x, z], i) => { const X = (x + MM.ox) * MM.s, Y = (z + MM.oz) * MM.s; i ? p.lineTo(X, Y) : p.moveTo(X, Y); }); p.closePath(); } return p; }
const MP = { foot2: path(S.foot2), walls2: path(S.walls2), foot4: path(S.foot4), walls4: path(S.walls4), band: path(S.band1), f1: path(S.f1) };
function drawMini() {
  const W = mini.width, H = mini.height; mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.clearRect(0, 0, W, H);
  mctx.fillStyle = 'rgba(8,12,18,.85)'; mctx.fillRect(0, 0, W, H);
  mctx.save(); mctx.scale(W / 180, H / 180);
  mctx.fillStyle = '#2a2e34'; mctx.fillRect(0, 0, MM.ox * MM.s - 0.6 * MM.s, 180);
  if (FP.mode === 'floor') { mctx.fillStyle = '#1d2733'; mctx.fill(MP.foot2, 'evenodd'); mctx.fillStyle = '#cfd8e3'; mctx.fill(MP.walls2, 'evenodd'); }
  else if (FP.mode === 'ground') { mctx.fillStyle = '#1d2733'; mctx.fill(MP.f1); mctx.fillStyle = '#3a3f46'; mctx.fill(MP.band); mctx.strokeStyle = '#8a95a3'; mctx.lineWidth = 0.6; mctx.stroke(MP.f1); }
  else { mctx.fillStyle = '#1d2733'; mctx.fill(MP.foot4, 'evenodd'); mctx.fillStyle = '#3a3f46'; mctx.fill(MP.band); mctx.fillStyle = '#cfd8e3'; mctx.fill(MP.walls4, 'evenodd'); }
  mctx.strokeStyle = '#c9a77c'; mctx.lineWidth = 1.4; mctx.beginPath(); mctx.moveTo(MM.ox * MM.s, (GT.Z0 + MM.oz) * MM.s); mctx.lineTo(MM.ox * MM.s, (GT.Z1 + MM.oz) * MM.s); mctx.stroke();
  const px = (FP.x + MM.ox) * MM.s, pz = (FP.z + MM.oz) * MM.s; const a = -FP.yaw - Math.PI / 2;
  mctx.fillStyle = 'rgba(53,211,255,.25)'; mctx.beginPath(); mctx.moveTo(px, pz); mctx.arc(px, pz, 16, a - 0.6, a + 0.6); mctx.closePath(); mctx.fill();
  mctx.fillStyle = '#35d3ff'; mctx.beginPath(); mctx.arc(px, pz, 2.6, 0, 6.29); mctx.fill();
  mctx.restore();
}

// ---------- loop ----------
const v3 = new THREE.Vector3();
function place(el, wp, show) {
  if (!show) { el.style.display = 'none'; return; }
  v3.copy(wp).project(camera);
  if (v3.z > 1 || v3.z < -1) { el.style.display = 'none'; return; }
  const r = canvas.getBoundingClientRect();
  el.style.display = ''; el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * r.width}px,${(-v3.y * 0.5 + 0.5) * r.height}px)`;
}
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w < h ? 55 : 40; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
goView('general', true); applyVis();
const clock = new THREE.Clock();
function loop(now) {
  requestAnimationFrame(loop);
  const t = clock.getElapsedTime();
  if (tween) { const u = Math.min(1, (now - tween.s) / tween.d), k = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    camera.position.lerpVectors(tween.p0, tween.p1, k); controls.target.lerpVectors(tween.t0, tween.t1, k); if (u >= 1) tween = null; }
  const dt = Math.min(0.1, (now - (loop.last || now)) / 1000); loop.last = now;
  if (FP.on) fpUpdate(dt); else controls.update();
  gateUpdate(dt); carUpdate(dt);
  cableMat.uniforms.t.value = t;
  MK.forEach((m, i) => { const s = 0.75 + 0.25 * Math.sin(t * 3 + i); m.halo.scale.setScalar((m.el.classList.contains('hl') || m.el.classList.contains('sel') ? 0.09 : 0.05) * s); });
  tickFlow(now);
  renderer.render(scene, camera);
  const wp = new THREE.Vector3();
  MK.forEach((m) => { m.g.getWorldPosition(wp); const far = camera.position.distanceTo(wp) > 16 && (isMobile ? !['kiosk', 'rack'].includes(m.id) : !MAJOR.has(m.id)) && !m.el.classList.contains('hl') && !m.el.classList.contains('sel'); m.el.classList.toggle('min', far); const fpOk = !FP.on || (FP.mode !== 'floor' && camera.position.distanceTo(wp) < (FP.mode === 'ground' ? 8 : 14)); wp.y += 0.22; place(m.el, wp, fpOk && st.urban && visibleObj(m.g)); });
  place(cableLabel, CAB_MK.mid, !FP.on && st.urban && lv('sot').g.visible && lv('p1').g.visible);
  const cl = !FP.on && st.cut && /^p[2-7]$/.test(st.cut) ? lv(st.cut) : null;
  if (FP.on) drawMini();
  aptLbl.forEach(({ a, el }) => { if (!cl) { el.style.display = 'none'; return; } el.textContent = 'APTO ' + (+cl.id.slice(1) * 100 + a.n); wp.set((a.x0 + a.x1) / 2, cl.y + cl.g.position.y + 1.2, (a.z0 + a.z1) / 2); place(el, wp, true); });
  floatLbl.forEach((f) => { wp.set(...f.p); wp.y += lv(f.l).g.position.y; place(f.el, wp, lv(f.l).g.visible && (!f.only || st.cut === f.only) && (f.only || !f.cls.includes('sm') || camera.position.distanceTo(wp) < 20) && (!FP.on || (FP.mode !== 'floor' && camera.position.distanceTo(wp) < 14))); });
}
requestAnimationFrame(loop);
window.__app = { carAt: (t) => { openVeh(true); GT.v1.cur = GT.v2.cur = 1; CAR.t = t; CAR.closed = true; }, CAR, GT, FP, fpEnter, fpExit, fpTeleport, fpPose, openPed, openVeh, setGateH: (k) => setGateH(k), goView, startFlow, stopFlow, openPanel: (id) => openPanel(id === 'cable' ? CAB_MK : MK.find((m) => m.id === id)), closePanel, st, applyVis, applyExplode, setCut: (c) => { st.cut = c; cutSel.value = c || ''; applyVis(); } };
document.body.classList.add('ready');
