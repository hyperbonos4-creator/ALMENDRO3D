import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeTextures } from './tex.js';
import { buildWorld, LEVY, FLOORS, FLABEL, pipH } from './interior.js';
import { carParts, motoParts, vehicleMaterials, mergeVehicles, CAR_TYPES } from './vehicles.js';
import { textTex } from './tex.js';

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

const HEMI = new THREE.HemisphereLight(0xcfdcff, 0x2a2f36, 0.9); scene.add(HEMI);
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
  { id: 'p1', name: 'Piso 1', y: 1.0, k: 0 }, // N+1.00 según PL_A006
  ...[2, 3, 4, 5, 6, 7].map((n, i) => ({ id: 'p' + n, name: 'Piso ' + n, y: 3.7 + i * 2.7, k: i + 1 })),
  { id: 'cub', name: 'Cubierta', y: 20.3, k: 7 },
];
const root = new THREE.Group(); scene.add(root);
LV.forEach((l) => { l.g = new THREE.Group(); l.g.name = l.id; root.add(l.g); l.on = true; });
const lv = (id) => LV.find((l) => l.id === id);
const I = window.__INT__;
const W = buildWorld({ I, S, lv, T: makeTextures(), M, isMobile });
scene.add(W.cab);
const CORE_HOLES = [[[21.36, 9.69], [24.46, 9.69], [24.46, 11.69], [21.36, 11.69]], [[16.755, 9.841], [19.207, 9.841], [19.207, 11.541], [16.755, 11.541]]];
const withHoles = (polys) => polys.map((p) => ({ o: p.o, h: [...(p.h || []), ...CORE_HOLES] }));

// ---------- typical floor (shared geometry, 2–7) ----------
function typicalFloor() {
  const G = new THREE.Group();
  const g = { wall: [], grey: [], white: [], liston: [], brown: [], glass: [], alu: [], drip: [] }; const solids = [];
  g.slab = [W.TIP.slab];
  for (const p of S.skin) {
    const [nx, nz, L] = normOf(p);
    const fm = nx < -0.7 ? 'liston' : nz > 0.7 ? 'white' : 'grey';
    g.brown.push(seg(p.a, p.b, -0.22, 0.04, 0.07, 0.035, 0.07)); // marco/borde de losa café
    if (p.k === 'solid') { solids.push(p); continue; }
    if (p.code === 'V-7') { g[fm].push(seg(p.a, p.b, p.head, 2.5, 0.04, 0.02)); continue; } // puerta-ventana del balcón: se modela en interior.js
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
// escalones paso peatonal (N+0.00) → lobby (N+1.00, PL_A006): 6 contrahuellas de 0.167 m (supuesto: falta plancha 1/6)
const STEPS = { x0: 6.084, x1: 7.884, z0: 4.07, z1: 6.41, n: 6 };
function stepY(x) { const k = Math.min(STEPS.n, Math.max(0, Math.floor((x - STEPS.x0) / 0.3) + 1)); return (k / STEPS.n) * LEVY.p1; }
const GT = { leaves: [] };
{
  const L1 = lv('p1').g;
  const blk = new THREE.Mesh(extrude(S.f1, LEVY.p1 - 0.2, 3.7 - LEVY.p1), M.f1); blk.castShadow = true; blk.receiveShadow = true; L1.add(blk); GT.blk = [blk];
  texHatch.repeat.set(0.5, 0.5);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(blk.geometry, 20), new THREE.LineBasicMaterial({ color: 0xdfe6ee, transparent: true, opacity: 0.6 })); L1.add(e); GT.blk.push(e);
  const ceil = new THREE.Mesh(mergeGeometries([extrude(withHoles(I.sotx.ceil_in), LEVY.p1 - 0.2, 0.2), extrude(I.sotx.ceil_out, -0.2, 0.2)]), M.slab); ceil.receiveShadow = true; ceil.castShadow = true; L1.add(ceil);
  // ================= PORTÓN COMPLETO EN BORDE DE CALLE (x = 0) =================
  // Cubre todo el acceso: franja de rampa (3.33 m) + franja peatonal, del muro norte de la rampa (z≈0.64) al lindero (z≈6.74).
  // v5: UN SOLO portón de 2 hojas (según render). Hoja izquierda = panel grande con travesaño + panel angosto.
  // Hoja derecha = panel angosto + PUERTA PEATONAL INTEGRADA (con manija y cerradura) que viaja con su hoja.
  // Jamba fija a la derecha: kiosko URBAN (Galaxy Tab Active5 en carcasa con visera, sobre submarco metálico).
  // Cortes medidos sobre la imagen del render (768 px): eje central u=0.4975, peatonal u=0.613–0.912, jamba u=0.918–1.
  GT.Z0 = 0.64; GT.Z1 = 6.74; GT.W = GT.Z1 - GT.Z0; GT.H = GT.W / (856 / 630);
  const g = new THREE.Group(); L1.add(g); GT.g = g;
  const gmat = new THREE.MeshStandardMaterial({ map: texDoor, metalness: 0.55, roughness: 0.42, color: 0xffffff, side: THREE.DoubleSide });
  const fmat = new THREE.MeshStandardMaterial({ color: 0x5a3f27, metalness: 0.6, roughness: 0.4 });
  const hmat = new THREE.MeshStandardMaterial({ color: 0x3a2818, metalness: 0.75, roughness: 0.32 });
  const W = GT.W, H = GT.H;
  const U = { mid: 0.4975, p0: 0.613, p1: 0.912, jb: 0.918 }; GT.U = U;
  // panel texturizado u0..u1 que arranca en z = zs (local) y crece hacia dir
  function panelAt(u0, u1, zs, dir, frame = true) {
    const w = (u1 - u0) * W; const geo = new THREE.PlaneGeometry(w, H); const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * (u1 - u0));
    geo.rotateY(-Math.PI / 2); geo.translate(0, H / 2, zs + dir * w / 2);
    const m = new THREE.Mesh(geo, gmat); m.castShadow = true;
    const grp = new THREE.Group(); grp.add(m);
    if (frame) { const z0 = Math.min(zs, zs + dir * w), z1 = Math.max(zs, zs + dir * w);
      grp.add(meshOf([boxG(-0.035, 0.035, 0, H, z0, z0 + 0.04), boxG(-0.035, 0.035, 0, H, z1 - 0.04, z1), boxG(-0.035, 0.035, H - 0.05, H, z0, z1), boxG(-0.035, 0.035, 0, 0.05, z0, z1)], fmat)); }
    return grp;
  }
  // bisagras de pivote visibles (cilindros) en el canto de giro
  function hinges(parent, z, n = 4) { const geo = new THREE.CylinderGeometry(0.024, 0.024, 0.16, 12); for (let i = 0; i < n; i++) { const y = 0.25 + (H - 0.5) * i / (n - 1); const c = new THREE.Mesh(geo, hmat); c.position.set(0, y, z); c.castShadow = true; parent.add(c); } }
  function mkLeaf(hz, dir, sgn, name, w) { const piv = new THREE.Group(); piv.position.set(0, 0, hz); g.add(piv); const L = { piv, w, hz, dir, sgn, name, cur: 0, tgt: 0 }; GT.leaves.push(L); return L; }
  // hoja izquierda (bisagra en el muro norte de la rampa)
  GT.v1 = mkLeaf(GT.Z0, 1, 1, 'veh', U.mid * W);
  GT.v1.piv.add(panelAt(0, U.mid, 0, 1)); hinges(g, GT.Z0 - 0.01);
  // hoja derecha (bisagra contra la jamba fija); la peatonal es hija de esta hoja
  const hzR = GT.Z0 + U.jb * W;
  GT.v2 = mkLeaf(hzR, -1, -1, 'veh', (U.jb - U.mid) * W);
  GT.v2.piv.add(panelAt(U.mid, U.p0, -(U.jb - U.p0) * W, -1), panelAt(U.p1, U.jb, 0, -1, false)); hinges(g, hzR + 0.012);
  // marco perimetral de la hoja derecha alrededor del vano peatonal (travesaños sup./inf.)
  GT.v2.piv.add(meshOf([boxG(-0.04, 0.04, H - 0.035, H, -(U.jb - U.mid) * W, 0), boxG(-0.04, 0.04, 0, 0.035, -(U.jb - U.mid) * W, 0)], fmat));
  // puerta peatonal integrada: pivote dentro de la hoja derecha
  const pedHd = (U.jb - U.p1) * W, pedW = (U.p1 - U.p0) * W;
  const pedPiv = new THREE.Group(); pedPiv.position.set(0, 0, -pedHd); GT.v2.piv.add(pedPiv);
  pedPiv.add(panelAt(U.p0, U.p1, 0, -1)); hinges(pedPiv, 0.012, 3);
  GT.ped = { piv: pedPiv, w: pedW, hd: pedHd, cur: 0, tgt: 0, name: 'ped', sgn: -1 };
  // manija de barra vertical (como el render) en ambas caras + cilindro de llave; cerradura de sobreponer adentro
  { const zH = -(U.p1 - 0.662) * W, y0 = 0.33 * H, y1 = 0.56 * H; const parts = [];
    for (const s of [-1, 1]) { parts.push(boxG(s * 0.075 - 0.012, s * 0.075 + 0.012, y0, y1, zH - 0.012, zH + 0.012), boxG(Math.min(s * 0.035, s * 0.075), Math.max(s * 0.035, s * 0.075), y0 + 0.03, y0 + 0.055, zH - 0.008, zH + 0.008), boxG(Math.min(s * 0.035, s * 0.075), Math.max(s * 0.035, s * 0.075), y1 - 0.055, y1 - 0.03, zH - 0.008, zH + 0.008)); }
    pedPiv.add(meshOf(parts, hmat));
    const zl = -(U.p1 - 0.638) * W, yl = 0.443 * H; const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 16), hmat); cyl.rotation.z = Math.PI / 2; cyl.position.set(-0.045, yl, zl); pedPiv.add(cyl);
    // cerradura fail-secure de sobreponer (cara interior, canto de cierre) + LED de estado
    const zr = -pedW + 0.09; pedPiv.add(meshOf([boxG(0.035, 0.085, yl - 0.08, yl + 0.08, zr - 0.06, zr + 0.06)], new THREE.MeshStandardMaterial({ color: 0x2c2f33, metalness: 0.5, roughness: 0.4 })));
    GT.lockLed = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3b30 })); GT.lockLed.position.set(0.087, yl + 0.05, zr); pedPiv.add(GT.lockLed);
    // contraplaca en el panel angosto de la hoja derecha
    GT.v2.piv.add(meshOf([boxG(0.035, 0.075, yl - 0.07, yl + 0.07, -pedHd - pedW - 0.07, -pedHd - pedW + 0.005)], hmat));
  }
  // jamba fija (lado lindero)
  g.add(panelAt(U.jb, 1.0, GT.Z0 + U.jb * W, 1));
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
  // ===== KIOSKO URBAN: Samsung Galaxy Tab Active5 (126.8 × 213.8 × 10.1 mm, vertical) en carcasa metálica con visera =====
  const kz = GT.Z0 + 0.957 * W, ky = 1.50; GT.kz = kz; GT.ky = ky;
  { const K = new THREE.Group(); L1.add(K); GT.kiosk = K;
    const steel = new THREE.MeshStandardMaterial({ color: 0x24282d, metalness: 0.7, roughness: 0.38 });
    const bronze = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, metalness: 0.75, roughness: 0.3 });
    const rub = new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0.1, roughness: 0.75 });
    const tw = 0.1268, th = 0.2138, td = 0.0101; // tablet
    const ew = 0.185, eh = 0.29, ex0 = -0.068, ex1 = -0.118; // carcasa (x hacia la calle es negativo)
    // submarco metálico (tubo 20×20) atornillado a la jamba
    const sf = [], fw = 0.36, fh = 0.62, fx0 = -0.038, fx1 = -0.058;
    sf.push(boxG(fx1, fx0, ky - fh / 2, ky + fh / 2, kz - fw / 2, kz - fw / 2 + 0.02), boxG(fx1, fx0, ky - fh / 2, ky + fh / 2, kz + fw / 2 - 0.02, kz + fw / 2), boxG(fx1, fx0, ky + fh / 2 - 0.02, ky + fh / 2, kz - fw / 2, kz + fw / 2), boxG(fx1, fx0, ky - fh / 2, ky - fh / 2 + 0.02, kz - fw / 2, kz + fw / 2), boxG(fx1 + 0.004, fx0, ky - 0.17, ky + 0.17, kz - 0.13, kz + 0.13));
    K.add(meshOf(sf, steel));
    // carcasa: caja con marco frontal (bisel) y ventana para la pantalla
    const bz = [ boxG(ex1 + 0.004, fx1, ky - eh / 2, ky + eh / 2, kz - ew / 2, kz + ew / 2) ];
    K.add(meshOf(bz, bronze));
    const bez = 0.022; K.add(meshOf([boxG(ex1 - 0.004, ex1 + 0.004, ky + th / 2 + 0.004, ky + eh / 2, kz - ew / 2, kz + ew / 2), boxG(ex1 - 0.004, ex1 + 0.004, ky - eh / 2, ky - th / 2 - 0.004, kz - ew / 2, kz + ew / 2), boxG(ex1 - 0.004, ex1 + 0.004, ky - th / 2 - 0.004, ky + th / 2 + 0.004, kz - ew / 2, kz - tw / 2 - 0.004), boxG(ex1 - 0.004, ex1 + 0.004, ky - th / 2 - 0.004, ky + th / 2 + 0.004, kz + tw / 2 + 0.004, kz + ew / 2)], bronze)); void bez;
    // tablet rugerizada (cuerpo negro con esquinas reforzadas)
    K.add(meshOf([boxG(ex1 - 0.001, ex1 - 0.001 + td, ky - th / 2, ky + th / 2, kz - tw / 2, kz + tw / 2)], rub));
    // pantalla 8" (≈108 × 172 mm activa) — textura canvas con la UI simulada
    const cv = document.createElement('canvas'); cv.width = 320; cv.height = 512; GT.kcv = cv;
    const kt = new THREE.CanvasTexture(cv); kt.colorSpace = THREE.SRGBColorSpace; kt.anisotropy = 4; GT.ktex = kt;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.108, 0.1728), new THREE.MeshBasicMaterial({ map: kt, toneMapped: false }));
    scr.rotation.y = -Math.PI / 2; scr.position.set(ex1 - 0.0025, ky - 0.004, kz); K.add(scr); GT.kscr = scr;
    // cámara frontal (arriba, en vertical) + logo URBAN en el bisel inferior
    const camD = new THREE.Mesh(new THREE.CircleGeometry(0.0035, 14), new THREE.MeshBasicMaterial({ color: 0x0a0a0a })); camD.rotation.y = -Math.PI / 2; camD.position.set(ex1 - 0.0025, ky + th / 2 - 0.011, kz); K.add(camD);
    const lg = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.016), new THREE.MeshBasicMaterial({ map: textTex([{ t: 'URBAN', s: 40, w: 700, c: '#e8d2b0', ls: 6 }], { w: 256, h: 58, y0: 4 }), transparent: true }));
    lg.rotation.y = -Math.PI / 2; lg.position.set(ex1 - 0.0045, ky - eh / 2 + 0.018, kz); K.add(lg);
    // visera / techo (aprobada por Darwin) con mejillas laterales, inclinada para escurrir
    const vis = new THREE.Group(); vis.position.set(fx1, ky + eh / 2 + 0.014, kz); K.add(vis);
    const vt = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.005, 0.25), bronze); vt.position.set(-0.085, 0, 0); vt.rotation.z = 0.12; vt.castShadow = true; vis.add(vt);
    for (const s of [-1, 1]) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(-0.165, -0.02); sh.lineTo(0, -0.2); sh.closePath(); const cg = new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: false }); const ch = new THREE.Mesh(cg, bronze); ch.position.set(0, 0, s * 0.123 - 0.002); vis.add(ch); }
    // luz frontal (LED cálido bajo la visera) — emisiva (reflector LED real: ver BOM)
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.18), new THREE.MeshBasicMaterial({ color: 0xfff2d6 })); led.position.set(-0.15, -0.025, 0); vis.add(led);
    // alimentación USB‑C PD: conduit metálico desde la carcasa hacia la jamba (bajo, a la caja ESP32 interior)
    const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, ky - eh / 2 - 0.35, 10), steel); cd.position.set(-0.05, (ky - eh / 2 + 0.35) / 2, kz + 0.06); K.add(cd);
    K.add(meshOf([boxG(-0.062, -0.036, 0.31, 0.37, kz + 0.04, kz + 0.08)], steel));
  }
  // paso peatonal (adentro), baranda sobre la rampa, bordillo/antepecho de la rampa a cielo abierto
  L1.add(meshOf([boxG(0.05, 7.84, 0, 0.03, 4.0, 6.74)], new THREE.MeshStandardMaterial({ color: 0x7b7f86, roughness: 0.9 })));
  { const st = []; for (let k = 1; k <= STEPS.n; k++) { const xa = STEPS.x0 + (k - 1) * 0.3; st.push(boxG(xa, STEPS.x1, 0, (k / STEPS.n) * LEVY.p1, STEPS.z0, STEPS.z1)); }
    L1.add(meshOf(st, new THREE.MeshStandardMaterial({ color: 0xb9b3a8, roughness: 0.7 })));
    const rl = []; for (const z of [STEPS.z0 + 0.05, STEPS.z1 - 0.05]) { rl.push(boxG(STEPS.x0 - 0.02, STEPS.x0 + 0.02, 0, 0.95, z - 0.02, z + 0.02), boxG(STEPS.x1 - 0.04, STEPS.x1, LEVY.p1, LEVY.p1 + 0.95, z - 0.02, z + 0.02));
      const a = new THREE.Vector3(STEPS.x0, 0.95, z), b = new THREE.Vector3(STEPS.x1 - 0.3, LEVY.p1 + 0.95, z); const d = b.clone().sub(a); const g = new THREE.BoxGeometry(d.length(), 0.04, 0.04); g.rotateZ(Math.atan2(d.y, d.x)); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, z); rl.push(g.index ? g.toNonIndexed() : g); }
    L1.add(meshOf(rl, M.alu)); }
  L1.add(meshOf([boxG(1.2, 7.8, 0.95, 1.0, 3.98, 4.04), ...[1.2, 3.0, 4.8, 6.4, 7.8].map((x) => boxG(x - 0.025, x + 0.025, 0, 0.98, 3.99, 4.03))], M.alu));
  L1.add(meshOf([boxG(0.05, 7.8, -0.2, 0.08, 3.9, 4.1), boxG(0.05, 7.8, -0.2, 1.0, 0.5, 0.66)], conc));
  // acceso al edificio al final del paso (fachada eje 7) — genérico, aproximado
  // (v3) puerta automática de vidrio del lobby: ver interior.js
}

// ---------- Sótano (PL_A004): rampa real 10.9 % (21.79 m) → plataforma → 13.6 % → N-2.96 ----------
const RAMP = { x1: 21.79, s1: 0.109, s2: 0.136, deck: -0.109 * 21.79, low: -2.96, lz0: 8.3 };
const rampY = (x) => -RAMP.s1 * Math.max(0, Math.min(x, RAMP.x1));
// tramo exterior de la rampa (portón → fachada, x 0–7.88): en scene.json band1 solo trae el borde; se completa aquí
const onRamp = (x, z) => (x >= 0 && pip(S.band1, x, z)) || (x >= 0 && x <= 7.9 && z >= 0.7 && z <= 3.9);
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
// ---------- v4: vehículos procedurales en las plazas medidas de PL_A004 ----------
const VMAT = vehicleMaterials(); VMAT.trim.side = THREE.DoubleSide;
function carMesh(color, type = 'sedan', lit = false) { const G = mergeVehicles([{ parts: carParts(type, color), m: new THREE.Matrix4() }], VMAT); if (lit) G.children.forEach((m) => { if (m.material === VMAT.lightF) { m.material = VMAT.lightF.clone(); m.material.emissiveIntensity = 1.4; } }); return G; }
// plazas (rectángulo de la plaza en el vector): x0,x1,z0,z1 · cabecera (frente del carro) en z0 (f=-1) o z1 (f=+1)
const SPOTS = [
  { n: 1, r: [16.86, 19.35, 3.87, 8.37], f: -1, t: 'hatch', c: 0xe4e4e1 }, { n: 2, r: [19.35, 21.85, 3.87, 8.37], f: -1, t: 'cuv', c: 0x2d3135 }, { n: 3, r: [21.85, 24.35, 3.87, 8.37], f: -1, t: 'hatch', c: 0x7a1219 },
  { n: 4, r: [19.29, 21.79, 12.69, 17.19], f: -1, t: 'suv', c: 0xa5a9af }, { n: 5, r: [21.85, 24.35, 12.69, 17.19], f: -1, t: 'sedan', c: 0x1b2c4e },
  { n: 6, r: [17.02, 19.52, 20.95, 25.44], f: 1, t: 'hatch', c: 0xc8cbcf }, { n: 7, r: [19.52, 22.02, 20.95, 25.44], f: 1, t: 'sedan', c: 0x111214 }, { n: 8, r: [22.02, 24.52, 20.95, 25.44], f: 1, t: 'suv', c: 0x2a3a30 }, { n: 9, r: [24.52, 27.02, 20.95, 25.44], f: 1, t: 'sedan', c: 0xb3a586 },
];
const MOTO_Z = [[12.69, 13.81], [13.81, 14.93], [14.93, 16.05], [16.05, 17.19]]; // 1.12 / 1.12 / 1.12 / 1.14 (PL_A004)
const MOTO_C = [0x141414, 0x9b1c1c, 0x1c3e88, 0xe6e6e6];
const floorAt = (x, z) => (pip(S.deck, x, z) ? RAMP.deck : pip(S.lane2, x, z) ? laneY(z) : RAMP.low);
const VEH = { cars: [], motos: [] };
SPOTS.forEach((p) => { const L = CAR_TYPES[p.t].L, Wd = CAR_TYPES[p.t].W; const cx = (p.r[0] + p.r[1]) / 2; const cz = p.f < 0 ? p.r[2] + 0.06 + L / 2 : p.r[3] - 0.22 - L / 2; p.y = floorAt(cx, (p.r[2] + p.r[3]) / 2); p.cx = cx; p.cz = cz; p.L = L; p.Wd = Wd; VEH.cars.push(p); });
MOTO_Z.forEach(([z0, z1], i) => VEH.motos.push({ n: i + 1, x: 17.08 + 1.02, z: (z0 + z1) / 2, y: RAMP.low, c: MOTO_C[i] }));
// pintura del piso y señalización con funciones simples
function decalGeo(pts, fy, dy = 0.014) { const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, fy(p.getX(i), p.getZ(i)) + dy); g.computeVertexNormals(); return g.index ? g.toNonIndexed() : g; }
const paintMat = new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.7, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
{
  const B = lv('sot').g, y0 = RAMP.low, yd = RAMP.deck, CEIL = LEVY.p1 - 0.2;
  const sotWall = new THREE.MeshStandardMaterial({ color: 0xd3d1ca, roughness: 0.92 }); M.sotWall = sotWall;
  B.add(meshOf([extrude(S.lower, y0 - 0.25, 0.25)], M.conc));
  B.add(meshOf([extrude(S.deck, y0 - 0.25, yd - y0 + 0.25)], M.conc));
  B.add(meshOf([extrude(I.sotx.walls_in, y0, CEIL - y0)], sotWall)); B.add(meshOf([extrude(I.sotx.walls_out, y0, -0.2 - y0)], M.side));
  B.add(meshOf([extrude(I.sotx.cols_in, y0, CEIL - y0)], new THREE.MeshStandardMaterial({ color: 0xbdbab3, roughness: 0.9 })));
  const r1 = new THREE.Mesh(surfaceGeo(S.band1, (x) => rampY(x) + 0.01), M.asph); r1.receiveShadow = true; B.add(r1);
  const r2 = new THREE.Mesh(surfaceGeo(S.lane2, (x, z) => laneY(z) + 0.01), M.asph); r2.receiveShadow = true; B.add(r2);
  B.add(new THREE.Mesh(mergeGeometries([skirt([[16.5, 3.97], [21.79, 3.97]], (x) => rampY(x), yd), skirt([[24.55, 8.3], [24.55, 12.6]], (x, z) => laneY(z), y0)]), M.side));
  texAsph.repeat.set(0.15, 0.15);
  // flechas de circulación y pendientes, tal como en PL_A004 (vector)
  const AR = [
    [[[10.505, 2.278], [10.509, 2.466], [14.256, 2.406], [14.253, 2.219]], (x) => rampY(x)], [[[14.261, 2.781], [14.248, 1.844], [16.754, 2.273]], (x) => rampY(x)],
    [[[18.927, 19.137], [18.93, 19.324], [22.678, 19.265], [22.676, 19.077]], () => y0], [[[22.684, 19.64], [22.669, 18.703], [25.175, 19.131]], () => y0],
    [[[25.643, 9.036], [25.831, 9.033], [25.89, 12.6], [25.70, 12.6]], (x, z) => laneY(z)], [[[25.70, 12.6], [25.89, 12.6], [25.89, 12.782], [25.702, 12.784]], () => y0],
    [[[25.327, 12.79], [26.265, 12.775], [25.836, 15.281]], () => y0], [[[26.205, 9.028], [25.268, 9.041], [25.697, 6.537]], (x, z) => laneY(z)],
  ];
  B.add(meshOf(AR.map(([p, f]) => decalGeo(p, f, 0.02)), paintMat, false));
  const txt = (t, w, h) => new THREE.MeshStandardMaterial({ map: textTex([{ t, s: 92, w: 700, c: '#f3f3f0' }], { w: 640, h: 128, y0: 6 }), transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -3 });
  { const g = new THREE.PlaneGeometry(1.7, 0.34); g.rotateX(-Math.PI / 2); g.rotateZ(-Math.atan(RAMP.s1)); g.translate(12.56, rampY(12.56) + 0.03, 2.95); B.add(new THREE.Mesh(g, txt('pend. 10.9%'))); }
  { const g = new THREE.PlaneGeometry(1.7, 0.34); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 2); g.rotateX(Math.atan(RAMP.s2)); g.translate(26.2, laneY(10.9) + 0.03, 10.9); B.add(new THREE.Mesh(g, txt('pend. 13.6%'))); }
  // bordillos amarillos entre plazas (posición y largo del vector: 0.14 × 4.49 m)
  const YC = [[16.79, 3.88, 16.93, 8.37], [19.28, 3.88, 19.42, 8.37], [21.78, 3.88, 21.92, 8.37], [24.28, 3.88, 24.42, 8.37], [19.22, 12.69, 19.36, 17.19], [21.72, 12.69, 21.86, 17.19], [24.21, 12.69, 24.36, 17.19],
    [16.95, 20.95, 17.09, 25.44], [19.45, 20.95, 19.59, 25.44], [21.95, 20.95, 22.09, 25.44], [24.45, 20.95, 24.59, 25.44], [26.95, 20.95, 27.09, 25.44]];
  B.add(meshOf(YC.map(([a, b, c, d]) => { const fy = floorAt((a + c) / 2, (b + d) / 2); return boxG(a, c, fy, fy + 0.1, b, d); }), M.yellow));
  // números de plaza: pintados en el piso (como en el plano) y placa colgante sobre la cabecera
  const numMat = (t, bg) => new THREE.MeshStandardMaterial({ map: textTex([{ t, s: 150, w: 800, c: bg ? '#1d1f23' : '#f3f3f0' }], { w: 256, h: 256, y0: 30, bg: bg || undefined, r: bg ? 28 : 0 }), transparent: !bg, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3 });
  const ring = []; const numG = [];
  for (const p of VEH.cars) {
    const zn = p.f < 0 ? p.r[3] - 0.55 : p.r[2] + 0.55; const g = new THREE.PlaneGeometry(0.62, 0.62); g.rotateX(-Math.PI / 2); if (p.f > 0) g.rotateY(Math.PI); g.translate(p.cx, p.y + 0.016, zn); B.add(new THREE.Mesh(g, numMat(String(p.n))));
    const rg = new THREE.RingGeometry(0.33, 0.37, 32); rg.rotateX(-Math.PI / 2); rg.translate(p.cx, p.y + 0.015, zn); ring.push(rg.index ? rg.toNonIndexed() : rg);
    const zh = p.f < 0 ? p.r[2] + 0.35 : p.r[3] - 0.35; const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), numMat(String(p.n), '#f2c230')); pl.position.set(p.cx, Math.min(CEIL - 0.45, p.y + 2.3), zh); if (p.f > 0) pl.rotation.y = Math.PI; B.add(pl);
    numG.push(boxG(p.cx - 0.008, p.cx + 0.008, Math.min(CEIL - 0.45, p.y + 2.3) + 0.21, CEIL, zh - 0.008, zh + 0.008));
  }
  for (const m of VEH.motos) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), numMat('M' + m.n, '#f2c230')); pl.position.set(16.62, m.y + 1.55, m.z); pl.rotation.y = Math.PI / 2; B.add(pl); }
  B.add(meshOf(ring, paintMat, false)); B.add(meshOf(numG, M.alu, false));
  // líneas blancas de las plazas de motos (divisiones 1.12 m del plano)
  B.add(meshOf([12.69, 13.81, 14.93, 16.05, 17.19].map((z) => boxG(16.62, 19.2, y0 + 0.005, y0 + 0.012, z - 0.04, z + 0.04)), paintMat, false));
  // franjas de seguridad en columnas del parqueadero (ilustrativo)
  const texHaz = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b1c1e'; for (let i = -w; i < w * 2; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 16 + h, h); g.lineTo(i + h, h); g.fill(); } }, true); texHaz.repeat.set(3, 1.6);
  const haz = []; for (const c of I.sotx.cols_in) { const xs = c.o.map((p) => p[0]), zs = c.o.map((p) => p[1]); const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2; if (cx < 16.3 && cz < 6.8) continue; if (!pip(S.foot4, cx, cz)) continue;
    const fy = floorAt(cx, cz); haz.push(boxG(Math.min(...xs) - 0.012, Math.max(...xs) + 0.012, fy, fy + 0.9, Math.min(...zs) - 0.012, Math.max(...zs) + 0.012)); }
  if (haz.length) B.add(meshOf(haz, new THREE.MeshStandardMaterial({ map: texHaz, roughness: 0.7 })));
  // medidores de agua (3 cajas en el muro sur del ascensor, PL_A004 "medidores agua")
  B.add(meshOf([[17.103, 17.789], [17.809, 18.483], [18.503, 19.177]].map(([a, b]) => boxG(a, b, y0 + 0.75, y0 + 1.35, 11.74, 11.94)), new THREE.MeshStandardMaterial({ color: 0xd9dcdf, metalness: 0.3, roughness: 0.5 })));
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.16), new THREE.MeshBasicMaterial({ map: textTex([{ t: 'MEDIDORES DE AGUA', s: 40, w: 700, c: '#1d1f23' }], { w: 512, h: 72, y0: 6, bg: '#eef0f2', r: 8 }) })); m.position.set(18.14, y0 + 1.5, 11.70); B.add(m); }
  // luminarias LED del parqueadero (ilustrativas) en el cielo raso
  const tubes = []; for (const [x, z] of [[18.1, 6.1], [23.1, 6.1], [20.6, 10.0], [26.0, 8.0], [26.0, 14.0], [18.0, 15.0], [22.6, 15.0], [20.0, 19.2], [24.0, 19.2], [19.5, 23.2], [24.5, 23.2], [14.5, 2.3], [9.5, 2.3]]) tubes.push(boxG(x - 0.6, x + 0.6, CEIL - 0.05, CEIL - 0.01, z - 0.06, z + 0.06));
  const tm = meshOf(tubes, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6e8, emissiveIntensity: 1.1 }), false); B.add(tm);
  // carros y motos: geometría fusionada por material (≈9 llamadas de dibujo para todos)
  const list = []; const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (const p of VEH.cars) { q.setFromAxisAngle(up, p.f < 0 ? Math.PI / 2 : -Math.PI / 2); list.push({ parts: carParts(p.t, p.c), m: new THREE.Matrix4().compose(new THREE.Vector3(p.cx, p.y, p.cz), q.clone(), new THREE.Vector3(1, 1, 1)) }); }
  for (const m of VEH.motos) { q.setFromAxisAngle(up, Math.PI); list.push({ parts: motoParts(m.c), m: new THREE.Matrix4().compose(new THREE.Vector3(m.x, m.y, m.z), q.clone(), new THREE.Vector3(1, 1, 1)) }); }
  const VG = mergeVehicles(list, VMAT); VG.name = 'vehiculos'; B.add(VG); VEH.group = VG;
}
// ---------- v4: cuartos de servicio bajo la rampa (PL_A004, vector) ----------
const SV = { rooms: I.sotx.rooms, doors: [], ceil: LEVY.p1 - 0.2 };
{
  const B = lv('sot').g, yd = RAMP.deck, CEIL = SV.ceil, ZF = 3.924, ZF0 = 3.874, ZF1 = 3.974;
  const FY = { util1: rampY(8.787), util2: rampY(9.797), elec: rampY(11.515), bas: rampY(14.588) }; // piso = nivel de la rampa frente a cada puerta
  for (const r of SV.rooms) { r.fy = FY[r.id]; r.clear = CEIL - r.fy; const xs = r.poly.o.map((p) => p[0]), zs = r.poly.o.map((p) => p[1]); r.cx = (Math.min(...xs) + Math.max(...xs)) / 2; r.cz = (Math.min(...zs) + Math.max(...zs)) / 2; }
  SV.at = (x, z) => SV.rooms.find((r) => pip([r.poly], x, z)) || null;
  const backZ = (r, x) => { let best = -1e9; const o = r.poly.o; for (let i = 0; i < o.length; i++) { const [ax, az] = o[i], [bx, bz] = o[(i + 1) % o.length]; if ((ax - x) * (bx - x) <= 0 && ax !== bx) { const zz = az + (bz - az) * (x - ax) / (bx - ax); if (zz > best) best = zz; } } return best; };
  SV.backZ = backZ; const R = Object.fromEntries(SV.rooms.map((r) => [r.id, r]));
  const fl = [], tile = [], front = [], frame = [], lintel = [];
  const tileTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d9d7d2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b9b6ae'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }, true); tileTex.repeat.set(1.6, 1.6);
  for (const r of SV.rooms) { fl.push(extrude([r.poly], yd, r.fy - yd - 0.012)); tile.push(extrude([r.poly], r.fy - 0.012, 0.012)); }
  B.add(meshOf(fl, M.conc)); B.add(meshOf(tile, new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.55 })));
  // muro frontal (lado rampa): base bajo el umbral, dinteles sobre puertas y paños ciegos del cuarto de basuras
  const seg = (x0, x1, y0, y1) => boxG(x0, x1, y0, y1, ZF0, ZF1);
  for (const r of SV.rooms) { const xs = r.poly.o.map((p) => p[0]); front.push(seg(Math.min(...xs) - 0.02, Math.max(...xs) + 0.02, yd, r.fy - 0.012)); }
  const DOORS = [
    { id: 'u1', room: 'util1', h: 9.192, o: 8.381, label: 'Cuarto útil 1' }, { id: 'u2', room: 'util2', h: 9.391, o: 10.202, label: 'Cuarto útil 2' },
    { id: 'eA', room: 'elec', h: 10.766, o: 11.515, label: 'Cuarto eléctrico / Telecom', dbl: true }, { id: 'eB', room: 'elec', h: 12.263, o: 11.515, label: 'Cuarto eléctrico / Telecom', dbl: true },
    { id: 'bA', room: 'bas', h: 13.734, o: 14.543, label: 'Cuarto de basuras / aseo' }, { id: 'bB', room: 'bas', h: 15.443, o: 14.633, label: 'Cuarto de basuras / aseo' },
  ];
  const doorH = (r) => Math.min(2.05, r.clear - 0.06);
  for (const d of DOORS) { const r = R[d.room]; const dh = doorH(r); const a = Math.min(d.h, d.o), b = Math.max(d.h, d.o); lintel.push(seg(a - 0.002, b + 0.002, r.fy + dh + 0.04, CEIL)); }
  // jambas y marcos metálicos
  for (const [a, b, rid] of [[8.337, 8.381, 'util1'], [9.192, 9.236, 'util1'], [9.347, 9.391, 'util2'], [10.202, 10.245, 'util2'], [13.689, 13.734, 'bas'], [14.543, 14.633, 'bas'], [15.443, 15.487, 'bas']]) { const r = R[rid]; frame.push(boxG(a, b, r.fy, CEIL, ZF0 - 0.01, ZF1 + 0.01)); }
  for (const d of DOORS) { const r = R[d.room]; const dh = doorH(r); const a = Math.min(d.h, d.o), b = Math.max(d.h, d.o); frame.push(boxG(a - 0.03, b + 0.03, r.fy + dh, r.fy + dh + 0.04, ZF0 - 0.012, ZF1 + 0.012)); }
  { const r = R.elec; frame.push(boxG(10.766, 10.80, r.fy, r.fy + doorH(r) + 0.04, ZF0 - 0.012, ZF1 + 0.012), boxG(12.229, 12.263, r.fy, r.fy + doorH(r) + 0.04, ZF0 - 0.012, ZF1 + 0.012)); }
  const rb = R.bas; front.push(seg(12.414, 13.689, rb.fy - 0.012, CEIL), seg(15.487, 16.637, rb.fy - 0.012, CEIL));
  B.add(meshOf([...front, ...lintel], M.sotWall)); B.add(meshOf(frame, new THREE.MeshStandardMaterial({ color: 0x5d6670, metalness: 0.6, roughness: 0.4 })));
  // rejillas de ventilación (basuras y cuarto eléctrico) — interpretación de la doble línea del plano
  const louv = []; for (const [a, b] of [[12.55, 13.55], [15.6, 16.5]]) for (let k = 0; k < 7; k++) louv.push(boxG(a, b, rb.fy + 1.75 + k * 0.055, rb.fy + 1.775 + k * 0.055, ZF0 - 0.03, ZF0 - 0.005));
  for (const [a, b] of [[12.55, 13.55], [15.6, 16.5]]) louv.push(boxG(a - 0.03, b + 0.03, rb.fy + 1.72, rb.fy + 2.14, ZF0 - 0.012, ZF0 - 0.0));
  B.add(meshOf(louv, new THREE.MeshStandardMaterial({ color: 0x3b4047, metalness: 0.5, roughness: 0.5 })));
  // hojas de puerta (metálicas, abren hacia adentro como en el plano)
  const metalTex = canvasTex(128, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#8a939c'); gr.addColorStop(0.5, '#a2aab2'); gr.addColorStop(1, '#8a939c'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(40,45,50,.45)'; g.lineWidth = 3; g.strokeRect(12, 14, w - 24, h * 0.42); g.strokeRect(12, h * 0.5, w - 24, h * 0.44); g.fillStyle = 'rgba(30,34,38,.55)'; for (let k = 0; k < 9; k++) g.fillRect(22, h * 0.72 + k * 7, w - 44, 3); });
  const leafMat = new THREE.MeshStandardMaterial({ map: metalTex, metalness: 0.45, roughness: 0.45 });
  const sign = (t1, t2, col) => new THREE.MeshStandardMaterial({ map: textTex([{ t: t1, s: 40, w: 800, c: '#ffffff' }, { t: t2, s: 26, w: 600, c: '#d6e2ee' }], { w: 512, h: 128, y0: 18, bg: col || '#1f4e79', r: 12 }), roughness: 0.4 });
  const SIGNS = { util1: ['CUARTO ÚTIL 1', '3.29 m² · PL_A004'], util2: ['CUARTO ÚTIL 2', '3.26 m² · PL_A004'], elec: ['CUARTO ELÉCTRICO / TELECOM', '3.67 m² · acceso restringido'], bas: ['CUARTO DE BASURAS / ASEO', '9.77 m² · PL_A004'] };
  for (const d of DOORS) {
    const r = R[d.room]; const dh = doorH(r); const w = Math.abs(d.o - d.h) - 0.01; const u = [Math.sign(d.o - d.h), 0], n = [0, 1];
    const piv = new THREE.Group(); piv.position.set(d.h, r.fy, ZF); B.add(piv);
    const lg = new THREE.BoxGeometry(w, dh, 0.045); lg.translate(w / 2, dh / 2, 0); const leaf = new THREE.Mesh(lg, leafMat); leaf.castShadow = true; piv.add(leaf);
    const th = Math.PI - Math.atan2(0, u[0]) - Math.PI; const outZ = Math.cos(-Math.atan2(u[1], u[0])) * -1 > 0 ? 1 : -1; // lado exterior (rampa) en coordenadas locales
    const hb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.05), VMAT.chrome); hb.position.set(w - 0.09, 1.0, 0); piv.add(hb);
    if (!(d.dbl && d.id === 'eB')) { const sg = SIGNS[d.room]; const pm = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(0.56, w - 0.12), Math.min(0.56, w - 0.12) / 4), sign(sg[0], sg[1], d.room === 'elec' ? '#7a1f1f' : null)); pm.position.set(w / 2, Math.min(1.55, dh - 0.2), outZ * 0.025); if (outZ < 0) pm.rotation.y = Math.PI; piv.add(pm); }
    if (d.id === 'eB') { const t = textTex([{ t: '⚡', s: 120, w: 800, c: '#1d1f23' }, { t: 'RIESGO ELÉCTRICO', s: 34, w: 800, c: '#1d1f23' }], { w: 320, h: 256, y0: 14, bg: '#f2c230', r: 14 }); const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.24), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 })); pm.position.set(w / 2, 1.45, outZ * 0.025); if (outZ < 0) pm.rotation.y = Math.PI; piv.add(pm); }
    const cx = (d.h + d.o) / 2, cz = ZF;
    const D = { svc: true, room: d.room, label: d.label, piv, hx: d.h, hz: ZF, u, n, w, a: 0, tgt: 0, max: 1.45, cx, cz, fy: r.fy };
    D.set = (a) => { D.a = a; const dx = Math.cos(a) * u[0] + Math.sin(a) * n[0], dz = Math.cos(a) * u[1] + Math.sin(a) * n[1]; piv.rotation.y = -Math.atan2(dz, dx); };
    D.seg = () => { const dx = Math.cos(D.a) * u[0] + Math.sin(D.a) * n[0], dz = Math.cos(D.a) * u[1] + Math.sin(D.a) * n[1]; return [D.hx, D.hz, D.hx + dx * D.w, D.hz + dz * D.w]; };
    D.set(0); SV.doors.push(D); void th;
  }
  // letrero del cuarto de basuras en el paño ciego (además de las hojas)
  { const sg = SIGNS.bas; const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.225), sign(sg[0], sg[1], '#2e6b3a')); pm.position.set(13.05, rb.fy + 1.45, ZF0 - 0.006); pm.rotation.y = Math.PI; B.add(pm); }
  // luminarias de cada cuarto (tubo LED)
  const lamps = SV.rooms.map((r) => boxG(r.cx - 0.45, r.cx + 0.45, CEIL - 0.06, CEIL - 0.02, r.cz - 0.05, r.cz + 0.05));
  B.add(meshOf(lamps, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3e0, emissiveIntensity: 1.2 }), false));
  // ---- cuarto eléctrico / telecom: rack URBAN 7 UR + UPS + tableros eléctricos ----
  const E = R.elec, fe = E.fy; const RX0 = 10.86, RX1 = 11.38, rz1 = backZ(E, (RX0 + RX1) / 2) - 0.02, rz0 = rz1 - 0.30; SV.rack = { x: (RX0 + RX1) / 2, z: (rz0 + rz1) / 2, y: fe + 1.36 };
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1e22, metalness: 0.6, roughness: 0.4 }); const dev = []; const led = [];
  const RY0 = fe + 1.32, RY1 = RY0 + 0.38;
  const rk = [boxG(RX0, RX1, RY0, RY0 + 0.02, rz0, rz1), boxG(RX0, RX1, RY1 - 0.02, RY1, rz0, rz1), boxG(RX0, RX0 + 0.02, RY0, RY1, rz0, rz1), boxG(RX1 - 0.02, RX1, RY0, RY1, rz0, rz1), boxG(RX0, RX1, RY0, RY1, rz1 - 0.01, rz1)];
  B.add(meshOf(rk, dark));
  const U = 0.0445; const devs = [['patch', 0xb9bec4], ['switch', 0x2f3338], ['router', 0x2a2d31], ['nvr', 0x22262b], ['ups-bat', 0x1f2226]];
  devs.slice(0, 4).forEach(([k, c], i) => { const y = RY1 - 0.04 - (i + 1) * (U + 0.012); dev.push({ g: boxG(RX0 + 0.04, RX1 - 0.04, y, y + U, rz0 + 0.03, rz1 - 0.04), c });
    for (let j = 0; j < (k === 'patch' ? 12 : k === 'switch' ? 8 : 4); j++) led.push(boxG(RX0 + 0.07 + j * (k === 'patch' ? 0.03 : 0.04), RX0 + 0.08 + j * (k === 'patch' ? 0.03 : 0.04), y + 0.018, y + 0.026, rz0 + 0.025, rz0 + 0.03)); });
  const devMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.5, roughness: 0.45 });
  const dg = dev.map(({ g, c }) => { const cc = new THREE.Color(c); const n = g.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([cc.r, cc.g, cc.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; });
  B.add(meshOf(dg, devMat)); B.add(meshOf(led, new THREE.MeshBasicMaterial({ color: 0x46ff9a }), false));
  const rg = new THREE.Mesh(boxG(RX0 + 0.01, RX1 - 0.01, RY0 + 0.01, RY1 - 0.01, rz0 - 0.004, rz0), new THREE.MeshStandardMaterial({ color: 0x223040, metalness: 0.3, roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false })); B.add(rg);
  { const t = textTex([{ t: 'URBAN · RACK 7 UR', s: 30, w: 800, c: '#2bd4ff' }, { t: 'router · switch PoE · NVR · patch panel', s: 18, w: 600, c: '#cfe7f5' }], { w: 512, h: 84, y0: 10, bg: '#11161c', r: 8 }); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.082), new THREE.MeshBasicMaterial({ map: t })); m.position.set((RX0 + RX1) / 2, RY1 + 0.07, rz0 + 0.12); m.rotation.y = Math.PI; B.add(m); }
  // UPS torre en el piso, bajo el rack
  B.add(meshOf([boxG(10.95, 11.10, fe, fe + 0.23, rz1 - 0.38, rz1 - 0.02)], dark)); { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.04), new THREE.MeshBasicMaterial({ color: 0x5fd3ff })); m.position.set(11.025, fe + 0.17, rz1 - 0.381); m.rotation.y = Math.PI; B.add(m); }
  { const t = textTex([{ t: 'UPS 1500 VA', s: 34, w: 800, c: '#ffffff' }], { w: 256, h: 56, y0: 6, bg: '#2a2e33', r: 6 }); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.03), new THREE.MeshBasicMaterial({ map: t })); m.position.set(11.025, fe + 0.08, rz1 - 0.382); m.rotation.y = Math.PI; B.add(m); }
  // tableros eléctricos en el muro derecho (cara hacia el cuarto)
  const tb = new THREE.MeshStandardMaterial({ color: 0xcfd3d6, metalness: 0.35, roughness: 0.5 }); const xw = 12.263;
  B.add(meshOf([boxG(xw - 0.14, xw, fe + 1.0, fe + 1.75, 4.95, 5.55), boxG(xw - 0.14, xw, fe + 0.9, fe + 1.75, 5.7, 6.25), boxG(xw - 0.05, xw, fe + 1.75, CEIL, 5.2, 5.3), boxG(xw - 0.05, xw, fe + 1.75, CEIL, 5.93, 6.03)], tb));
  for (const [z0, z1, t1, t2] of [[4.95, 5.55, 'TABLERO GENERAL', 'servicios comunes'], [5.7, 6.25, 'TABLERO', 'ascensor / bombas']]) { const t = textTex([{ t: t1, s: 30, w: 800, c: '#1d1f23' }, { t: t2, s: 22, w: 600, c: '#444' }], { w: 384, h: 96, y0: 12, bg: '#f2c230', r: 6 }); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.1), new THREE.MeshBasicMaterial({ map: t })); m.position.set(xw - 0.142, fe + 1.62, (z0 + z1) / 2); m.rotation.y = -Math.PI / 2; B.add(m); }
  // caja del operador de internet (ONT) y bandeja portacables hacia el rack (ilustrativo)
  B.add(meshOf([boxG(10.768, 10.80, fe + 1.45, fe + 1.75, 5.2, 5.5), boxG(10.77, 11.30, CEIL - 0.16, CEIL - 0.12, rz1 - 0.25, rz1 - 0.05), boxG(11.06, 11.14, RY1, CEIL - 0.12, rz1 - 0.2, rz1 - 0.12)], new THREE.MeshStandardMaterial({ color: 0xe9ecef, metalness: 0.4, roughness: 0.5 })));
  // ---- cuarto de basuras / aseo: 3 contenedores (código de colores Res. 2184/2019), poceta y buitrón ----
  const fb = rb.fy; const bins = [[13.409, 'blanco', 0xe9e9e6, 'APROVECHABLES'], [14.742, 'negro', 0x1c1d1f, 'NO APROVECHABLES'], [16.075, 'verde', 0x2f7d3a, 'ORGÁNICOS']];
  const binG = [], lidG = [], whG = [];
  for (const [x, , c, t] of bins) { const z = 5.717; const body = new THREE.BoxGeometry(0.82, 1.0, 0.82, 1, 1, 1); const p = body.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) { p.setX(i, p.getX(i) * 0.9); p.setZ(i, p.getZ(i) * 0.9); } body.computeVertexNormals(); body.translate(x, fb + 0.6, z); binG.push({ g: body, c });
    lidG.push({ g: boxG(x - 0.44, x + 0.44, fb + 1.1, fb + 1.16, z - 0.44, z + 0.46), c: new THREE.Color(c).multiplyScalar(0.8).getHex() });
    for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) { const w = new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12); w.rotateZ(Math.PI / 2); w.translate(x + dx, fb + 0.05, z + dz); whG.push(w); }
    const tt = textTex([{ t, s: 34, w: 800, c: c === 0xe9e9e6 ? '#1d1f23' : '#ffffff' }], { w: 384, h: 64, y0: 6 }); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.1), new THREE.MeshBasicMaterial({ map: tt, transparent: true })); m.position.set(x, fb + 0.85, z - 0.405); m.rotation.y = Math.PI; m.rotation.x = 0.05; B.add(m); }
  const colG = (arr) => arr.map(({ g, c }) => { g = g.index ? g.toNonIndexed() : g; const cc = new THREE.Color(c); const n = g.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([cc.r, cc.g, cc.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; });
  B.add(meshOf(colG([...binG, ...lidG]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }))); B.add(meshOf(whG, dark));
  // poceta de aseo (símbolo de la esquina, 0.62 × 0.42 m) con lavadero estriado y grifo
  const pz0 = 4.02, pz1 = 4.44, px0 = 12.98, px1 = 13.60; const pc = [boxG(px0, px1, fb, fb + 0.06, pz0, pz1), boxG(px0, px1, fb, fb + 0.38, pz0, pz0 + 0.05), boxG(px0, px1, fb, fb + 0.38, pz1 - 0.05, pz1), boxG(px0, px0 + 0.05, fb, fb + 0.38, pz0, pz1), boxG(px1 - 0.05, px1, fb, fb + 0.38, pz0, pz1)];
  for (let k = 0; k < 4; k++) pc.push(boxG(px0 + 0.05, px0 + 0.3, fb + 0.06 + k * 0.05, fb + 0.1 + k * 0.05, pz0 + 0.05 + k * 0.07, pz0 + 0.12 + k * 0.07));
  B.add(meshOf(pc, new THREE.MeshStandardMaterial({ color: 0xc8c6c0, roughness: 0.8 })));
  B.add(meshOf([new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8).rotateX(Math.PI / 2).translate(13.3, fb + 0.75, pz0 + 0.07).toNonIndexed(), boxG(13.28, 13.32, fb + 0.73, fb + 0.79, ZF1, ZF1 + 0.03)], VMAT.chrome));
  // buitrón (ductos con bajantes, gris en el plano): volumen cerrado con registro
  B.add(meshOf([boxG(12.415, 12.844, fb, CEIL, 4.136, 6.404)], new THREE.MeshStandardMaterial({ color: 0xb8bab9, roughness: 0.85 })));
  B.add(meshOf([boxG(12.844, 12.856, fb + 0.4, fb + 1.0, 4.4, 4.75), boxG(12.844, 12.856, fb + 0.4, fb + 1.0, 5.75, 6.1)], new THREE.MeshStandardMaterial({ color: 0x8d9195, metalness: 0.4, roughness: 0.5 })));
  // cuartos útiles: estantería metálica (ilustrativa)
  const sh = []; for (const rid of ['util1', 'util2']) { const r = R[rid]; const xs = r.poly.o.map((p) => p[0]); const xa = Math.min(...xs) + 0.25, xb = Math.max(...xs) - 0.05, zb = backZ(r, (xa + xb) / 2) - 0.03;
    for (const y of [0.05, 0.5, 0.95, 1.35]) if (y < r.clear - 0.25) sh.push(boxG(xa, xb, r.fy + y, r.fy + y + 0.025, zb - 0.4, zb)); for (const x of [xa, xb - 0.03]) for (const z of [zb - 0.4, zb - 0.03]) sh.push(boxG(x, x + 0.03, r.fy, r.fy + Math.min(1.45, r.clear - 0.2), z, z + 0.03)); }
  B.add(meshOf(sh, new THREE.MeshStandardMaterial({ color: 0x7c848c, metalness: 0.6, roughness: 0.45 })));
  // segmentos de colisión fijos del frente (paños ciegos y jambas)
  SV.segs = [[12.414, ZF0, 13.689, ZF0], [14.543, ZF0, 14.633, ZF0], [15.487, ZF0, 16.637, ZF0], [7.6, ZF0, 8.381, ZF0], [9.192, ZF0, 9.391, ZF0], [10.202, ZF0, 10.766, ZF0], [12.263, ZF0, 12.414, ZF0], [12.415, 4.136, 12.844, 4.136], [12.844, 4.136, 12.844, 6.404],
    ...[[12.88, 13.94], [14.21, 15.27], [15.55, 16.61]].flatMap(([a, b]) => [[a, 5.25, b, 5.25], [a, 5.25, a, 6.2], [b, 5.25, b, 6.2]]), [px0, pz1, px1, pz1], [px1, pz0, px1, pz1],
    [10.95, rz1 - 0.38, 11.10, rz1 - 0.38], [xw - 0.14, 4.95, xw - 0.14, 6.25]];
}
// cielos rasos solo para el recorrido (no proyectan sombra, para que el interior quede iluminado)
const ceilMat = new THREE.MeshStandardMaterial({ color: 0xe9e7e2, roughness: 0.95, side: THREE.DoubleSide });
const FPC = { sot: new THREE.Mesh(extrude(withHoles(I.sotx.ceil_in), LEVY.p1 - 0.24, 0.04), ceilMat), floor: new THREE.Mesh(extrude(S.foot2, 2.49, 0.02), ceilMat) };
FPC.sot.visible = FPC.floor.visible = false; FPC.sot.receiveShadow = FPC.floor.receiveShadow = false; lv('sot').g.add(FPC.sot); scene.add(FPC.floor);
// carro animado (entra por el portón y baja la rampa)
const CAR = { m: carMesh(0x8f1a1d, 'sedan', true), t: -1 }; CAR.m.visible = false; scene.add(CAR.m);

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
let GRIDH = null;
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
  const grid = new THREE.GridHelper(160, 80, 0x2a3440, 0x222a33); grid.position.set(15, 0.002, 13); grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid); GRIDH = grid;
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
const PED_LOCK_Y = () => GT.H * GT.hs * 0.443;
const MK = [
  { id: 'kiosk', lv: 'p1', p: [-0.2, 1.95, GT.kz], c: C_URB, t: 'Kiosko URBAN · Galaxy Tab Active5', s: 'Propuesta', loc: 'Jamba fija derecha del portón (junto a la hoja derecha), en submarco metálico atornillado, centro de pantalla ≈1,50 m, hacia la calle; carcasa metálica con visera y luz frontal; alimentación USB‑C PD por conduit. Tablet 126,8 × 213,8 × 10,1 mm en vertical.', bom: [0, 1, 2, 3, 4],
    why: 'Fase 1: el propietario se acerca, el kiosko reconoce el rostro y libera la puerta peatonal (en el modelo, la pantalla es una simulación ilustrativa). Respaldo: PIN offline y app URBAN. Va en la jamba FIJA para que no se mueva cuando abren las hojas del portón; la visera la protege del sol y la lluvia.' },
  { id: 'esp', lv: 'p1', p: [0.2, 2.0, 6.82], c: C_URB, t: 'ESP32 en caja con llave', s: 'Propuesta', loc: 'Cara interior del pilar derecho del portón, adentro (alternativa: dentro del edificio, en el acceso).', bom: [11, 12, 13, 14, 16, 17, 19],
    why: 'Controlador local que acciona la cerradura de la puerta peatonal y lee botón de salida y sensor. Va del lado seguro, en caja IP66 con llave, junto a la fuente de respaldo 12 V.' },
  { id: 'lock', lv: 'p1', p: [0.09, 2.0, GT.Z0 + 0.625 * GT.W], c: C_URB, t: 'Cerradura fail-secure (puerta peatonal)', s: 'Propuesta', loc: 'Puerta peatonal integrada en la hoja derecha del portón: cerradura de sobreponer en la cara interior, canto de cierre (lado de la manija), con contraplaca en el panel angosto de la misma hoja. LED en el modelo: rojo = enclavada, verde = liberada.', bom: [5, 9, 10, 6],
    why: 'Sin energía permanece cerrada y abre con llave mecánica. Solo se libera con una orden válida de URBAN (facial, app o PIN). El cierrapuertas asegura que la hoja vuelva y enganche.' },
  { id: 'rex', lv: 'p1', p: [0.12, 1.2, 6.62], c: C_URB, t: 'Botón de salida', s: 'Propuesta', loc: 'Cara interior de la jamba fija, junto a la puerta peatonal, h≈1.20 m.', bom: [7],
    why: 'Salida libre desde adentro sin app ni PIN; queda registrada como solicitud de salida.' },
  { id: 'sens', lv: 'p1', p: [0.1, 2.3, 4.6], c: C_URB, t: 'Sensor de puerta', s: 'Propuesta', loc: 'Cara interior de la puerta peatonal integrada (hoja derecha), lado de la manija.', bom: [8],
    why: 'Informa puerta abierta, cerrada o forzada para alarmas y bitácora.' },
  { id: 'c1', lv: 'p1', p: [-0.2, 2.8, 6.9], aim: [-5.2, 0.6, 3.6], c: C_CAM, t: 'C1 · Cámara exterior ingreso', s: 'Propuesta', loc: 'Pilar derecho del portón (exterior), mirando el kiosko, el andén y la entrada de carros.', bom: [25],
    why: 'Registra quién se acerca desde la calle y usa el kiosko (rostro y evento).' },
  { id: 'c2', lv: 'p1', p: [7.7, 2.9, 6.45], aim: [0.3, 1.0, 4.6], c: C_CAM, t: 'C2 · Cámara interior (paso peatonal)', s: 'Propuesta', loc: 'Adentro, en la fachada del edificio, mirando el paso peatonal y la puerta.', bom: [26],
    why: 'Confirma quién entró realmente después de cada apertura.' },
  { id: 'c3', lv: 'p1', p: [7.7, 3.2, 1.0], aim: [0.0, -0.3, 2.4], c: C_CAM, t: 'C3 · Cámara rampa', s: 'Propuesta', loc: 'Boca de la rampa vehicular, bajo el letrero ED. ALMENDRA de la fachada.', bom: [27],
    why: 'Registra vehículos que entran y salen por la rampa al sótano.' },
  { id: 'rack', lv: 'sot', p: [SV.rack.x, SV.rack.y + 0.55, SV.rack.z], c: C_URB, t: 'Cuarto técnico (C. Eléctrico/Telecom 3.67 m²)', s: 'Hecho', s2: 'Propuesta (equipos)', loc: 'Sótano, C. ELÉCTRICO / TELEC (3.67 m² en PL_A004), bajo la rampa entre C. Útil 2 y C. Basuras. Rack de pared 7 UR en el muro del fondo, UPS en el piso; tableros eléctricos en el muro derecho (ilustrativos).', bom: [22, 20, 21, 23, 24, 28, 29, 18],
    why: 'Concentra router VPN, switch PoE, NVR y UPS en un espacio cerrado del sótano. El cuarto existe en el plano; los equipos son propuesta.' },
  { id: 'door', lv: 'p1', p: [-0.25, 3.2, 2.5], c: 0xc9a77c, t: 'Portón ED. ALMENDRA · 2 hojas (peatonal integrada)', s: 'Aproximado', s2: 'Fase 2: motor del portón', loc: 'Un solo portón en borde de calle bajo el dintel ED.ALMENDRA. Ancho ≈6,1 m (muro norte de la rampa → lindero); alto por proporción del render. Abre en 2 hojas por el eje central (izq. ≈3,0 m, der. ≈2,6 m); la puerta peatonal va dentro de la hoja derecha; jamba fija a la derecha con el kiosko. Medidas por tomar en sitio.', bom: [43, 44],
    why: 'Es la MISMA puerta: para carros abren solo las 2 hojas (la peatonal permanece cerrada y se mueve con su hoja); para personas abre solo la puerta peatonal integrada, con URBAN (facial, app o PIN). Motor y control del vehicular: fase 2.' },
];
const MAJOR = new Set(['kiosk', 'rack', 'c1', 'door']);
const CABLE = [
  ['p1', 0.06, 1.3, GT.kz], ['p1', 0.12, 1.3, 6.6], ['p1', 0.2, 2.0, 6.82], ['p1', 0.3, -0.45, 6.6],
  ['p1', 7.6, -0.45, 6.3], ['sot', 8.15, -0.45, 6.3], ['sot', 8.15, SV.ceil - 0.18, 6.3], ['sot', 10.9, SV.ceil - 0.18, 6.25], ['sot', 11.1, SV.ceil - 0.18, SV.rack.z], ['sot', 11.1, SV.rack.y + 0.4, SV.rack.z],
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
  if (window.__intVis) window.__intVis();
}
function applyExplode() { LV.forEach((l) => { l.g.position.y = st.explode * l.k * 2.6; }); rebuildCable(); if (window.__intVis) window.__intVis(); W.cab.visible = !st.explode; }

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
    if (F.steps[f.i][0] === 'lock' && f.k !== 'luz') { openPed(true); setTimeout(() => { openPed(false); }, 3200); setTimeout(() => { KS.lock = true; }, 7000); } }
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
  ...SV.rooms.map((r) => ({ t: r.plan + ' · ' + r.area.toFixed(2) + ' m²', p: [r.cx, r.fy + 1.2, r.cz], l: 'sot', cls: 'note', only: 'sot' })),
  { t: 'Plataforma ≈N-2.37 (por verificar)', p: [23, -1.6, 2.3], l: 'sot', cls: 'note sm', only: 'sot' },
  { t: 'Sótano N-2.96 · 9 carros + 4 motos', p: [22, -1.2, 26.4], l: 'sot', cls: 'note sm', only: 'sot' },
  { t: 'Rampa 13.6 % → N-2.96', p: [26, -1.6, 10.4], l: 'sot', cls: 'note sm', only: 'sot' },
  { t: 'Volumen punto fijo ≈ (aprox.)', p: [20.3, 24.6, 11], l: 'cub', cls: 'note sm' },
].map((f) => { const el = document.createElement('div'); el.className = f.cls; el.textContent = f.t; labels.appendChild(el); return { ...f, el }; });


// ================= portón: animación =================
// ================= portón v5: 2 hojas + peatonal integrada; kiosko facial (fase 1, simulación) =================
const KS = { st: 'idle', t: 0, src: 'face', armed: true, passed: false, lock: true, dirty: true, msgT: 0 };
function pedCycle(src) { // abre la peatonal con cierre automático (cierrapuertas) y re-enclavamiento
  if (GT.v1.cur > 0.02 || GT.v2.cur > 0.02 || GT.v1.tgt || GT.v2.tgt) { KS.st = 'vehopen'; KS.t = 0; KS.dirty = true; return false; }
  KS.src = src; KS.st = 'ok'; KS.t = 0; KS.passed = false; KS.dirty = true; KS.lock = false; sfx('relay'); return true;
}
function openPed(o) { if (o && (GT.v1.cur > 0.02 || GT.v2.cur > 0.02)) return; GT.ped.tgt = o ? 1 : 0; if (o) KS.lock = false; }
function openVeh(o) {
  if (o && (GT.ped.cur > 0.01 || GT.ped.tgt)) { GT.ped.tgt = 0; if (['ok', 'open'].includes(KS.st)) { KS.st = 'closing'; KS.t = 0; KS.dirty = true; } }
  GT.v1.tgt = GT.v2.tgt = o ? 1 : 0; $('#bVeh') && $('#bVeh').classList.toggle('on', !!o); if (o && (CAR.t < 0 || CAR.t >= 1)) { CAR.t = 0; CAR.closed = false; CAR.m.visible = true; }
}
function gateUpdate(dt) {
  const P = GT.ped;
  const vehWant = GT.v1.tgt || GT.v2.tgt;
  for (const L of [GT.v1, GT.v2]) { if (vehWant && P.cur > 0.01) continue; // la peatonal debe estar cerrada antes de mover las hojas
    L.cur += Math.sign(L.tgt - L.cur) * Math.min(Math.abs(L.tgt - L.cur), 0.32 * dt); const k = L.cur * L.cur * (3 - 2 * L.cur); L.piv.rotation.y = L.sgn * k * Math.PI / 2 * 0.92; }
  P.cur += Math.sign(P.tgt - P.cur) * Math.min(Math.abs(P.tgt - P.cur), (P.tgt ? 0.9 : 0.55) * dt); const kp = P.cur * P.cur * (3 - 2 * P.cur);
  P.piv.rotation.y = P.sgn * kp * Math.PI / 2 * 0.9;
  const lockOpen = !KS.lock || P.cur > 0.005; if (GT.lockLed && GT.lockLed.userData.o !== lockOpen) { GT.lockLed.userData.o = lockOpen; GT.lockLed.material.color.set(lockOpen ? 0x34d17a : 0xff3b30); }
}
// segmentos de colisión en planta: hoja izq., hoja der. (dos tramos) y la peatonal (giro compuesto), jamba fija
function gateSegs() {
  const out = []; const L = GT.v1; const t1 = L.piv.rotation.y; out.push([0, L.hz, L.w * Math.sin(t1), L.hz + L.w * Math.cos(t1)]);
  const R = GT.v2, tR = R.piv.rotation.y, at = (s) => [-s * Math.sin(tR), R.hz - s * Math.cos(tR)];
  const P = GT.ped, hgp = at(P.hd), ph = tR + P.piv.rotation.y; const far = [hgp[0] - P.w * Math.sin(ph), hgp[1] - P.w * Math.cos(ph)];
  const a0 = at(0), aE = at(P.hd + P.w), aR = at(R.w);
  out.push([a0[0], a0[1], hgp[0], hgp[1]], [hgp[0], hgp[1], far[0], far[1]], [aE[0], aE[1], aR[0], aR[1]], [0, GT.Z0 + GT.U.jb * GT.W, 0, GT.Z1]);
  return out;
}
// ---- pantalla del kiosko (UI simulada estilo URBAN; NO es la app real) ----
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function drawKiosk(now) {
  const c = GT.kcv, g = c.getContext('2d'), W2 = c.width, H2 = c.height, st = KS.st, t = KS.t;
  const ok = st === 'ok' || st === 'open', bad = st === 'vehopen';
  const bg = g.createLinearGradient(0, 0, 0, H2); bg.addColorStop(0, '#0b1a2a'); bg.addColorStop(1, '#050b12'); g.fillStyle = bg; g.fillRect(0, 0, W2, H2);
  // barra superior
  g.fillStyle = '#e8d2b0'; g.font = '700 22px Segoe UI,Arial'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('URBAN', 18, 28);
  g.fillStyle = '#7f93a6'; g.font = '500 13px Segoe UI,Arial'; g.fillText('Ed. Almendra', 18, 50);
  const d = new Date(); g.textAlign = 'right'; g.fillStyle = '#cfe3f1'; g.font = '600 16px Segoe UI,Arial'; g.fillText(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'), W2 - 16, 28);
  // sello DEMO
  rr(g, W2 - 118, 40, 102, 20, 10); g.fillStyle = 'rgba(255,181,71,.18)'; g.fill(); g.strokeStyle = '#ffb547'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = '#ffb547'; g.font = '700 11px Segoe UI,Arial'; g.textAlign = 'center'; g.fillText('DEMO · SIMULADO', W2 - 67, 50.5);
  // óvalo guía
  const cx = W2 / 2, cy = 220, rx = 92, ry = 118;
  g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.clip();
  const pv = g.createRadialGradient(cx, cy - 20, 10, cx, cy, ry * 1.1); pv.addColorStop(0, st === 'idle' || st === 'done' || bad ? '#122233' : '#2a3d4f'); pv.addColorStop(1, '#0a1520'); g.fillStyle = pv; g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
  if (st !== 'idle' && st !== 'done' && !bad) { // silueta genérica (vista de cámara simulada, sin datos reales)
    g.fillStyle = 'rgba(190,205,220,.28)'; g.beginPath(); g.ellipse(cx, cy - 18, 46, 60, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(cx, cy + 112, 92, 62, 0, 0, Math.PI * 2); g.fill();
    if (st === 'scan') { const p = Math.min(1, t / 2.4); const yy = cy - ry + ((t * 1.2) % 1) * ry * 2; const sl = g.createLinearGradient(0, yy - 18, 0, yy + 4); sl.addColorStop(0, 'rgba(53,211,255,0)'); sl.addColorStop(1, 'rgba(53,211,255,.65)'); g.fillStyle = sl; g.fillRect(cx - rx, yy - 18, rx * 2, 22);
      g.fillStyle = 'rgba(53,211,255,.9)'; const pts = [[-20, -36], [20, -36], [0, -10], [-24, 6], [24, 6], [0, 26], [-34, -6], [34, -6]]; pts.forEach(([px, py], i) => { if (p * 8 > i) { g.beginPath(); g.arc(cx + px, cy - 18 + py, 2.6, 0, Math.PI * 2); g.fill(); } }); }
  }
  g.restore();
  const col = ok ? '#34d17a' : bad ? '#ff6b5e' : st === 'scan' ? '#35d3ff' : '#4d6a80';
  g.lineWidth = 5; g.strokeStyle = col; g.setLineDash(st === 'idle' || st === 'done' ? [10, 9] : []); g.beginPath(); g.ellipse(cx, cy, rx + 6, ry + 6, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
  if (st === 'scan') { const a = t * 4; g.lineWidth = 7; g.strokeStyle = '#9ff0ff'; g.beginPath(); g.ellipse(cx, cy, rx + 6, ry + 6, 0, a, a + 1.1); g.stroke(); const p = Math.min(1, t / 2.4); g.strokeStyle = '#35d3ff'; g.beginPath(); g.ellipse(cx, cy, rx + 16, ry + 16, 0, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); g.lineWidth = 4; g.stroke(); }
  if (ok) { g.fillStyle = 'rgba(52,209,122,.95)'; g.beginPath(); g.arc(cx, cy + ry - 6, 26, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - 12, cy + ry - 6); g.lineTo(cx - 3, cy + ry + 4); g.lineTo(cx + 13, cy + ry - 14); g.stroke(); g.lineCap = 'butt'; }
  // textos
  g.textAlign = 'center'; const T = (s, y, f, c2) => { g.font = f; g.fillStyle = c2; g.fillText(s, cx, y); };
  if (st === 'idle') { T('Acércate y mira la pantalla', 390, '600 19px Segoe UI,Arial', '#e9f4fb'); T('Reconocimiento facial', 416, '500 15px Segoe UI,Arial', '#8fb3c9'); }
  else if (st === 'scan') { T('Reconociendo rostro…', 390, '600 20px Segoe UI,Arial', '#9ff0ff'); T('Mantente frente al kiosko', 416, '500 14px Segoe UI,Arial', '#8fb3c9'); }
  else if (ok && KS.src === 'face') { T('Bienvenido, propietario', 386, '700 21px Segoe UI,Arial', '#ffffff'); T('Apto 301 · residente de ejemplo', 412, '500 14px Segoe UI,Arial', '#a7e9c4'); T('Puerta peatonal abierta', 436, '600 14px Segoe UI,Arial', '#34d17a'); }
  else if (ok && KS.src === 'app') { T('Apertura desde la app URBAN', 390, '700 18px Segoe UI,Arial', '#ffffff'); T('Puerta peatonal abierta', 416, '600 14px Segoe UI,Arial', '#34d17a'); }
  else if (ok) { T('Salida · botón interior', 390, '700 18px Segoe UI,Arial', '#ffffff'); T('Puerta peatonal abierta', 416, '600 14px Segoe UI,Arial', '#34d17a'); }
  else if (st === 'closing') { T('Cerrando puerta…', 400, '600 19px Segoe UI,Arial', '#e9f4fb'); }
  else if (st === 'done') { T('Puerta cerrada y asegurada', 392, '600 18px Segoe UI,Arial', '#e9f4fb'); T('Que tengas un buen día', 418, '500 14px Segoe UI,Arial', '#8fb3c9'); }
  else if (bad) { T('Portón vehicular abierto', 390, '700 18px Segoe UI,Arial', '#ffb0a8'); T('Espera a que cierre', 416, '500 14px Segoe UI,Arial', '#c7a9a5'); }
  // pie: botón PIN (respaldo sin internet) y aviso
  rr(g, cx - 70, 452, 140, 32, 16); g.strokeStyle = '#3b5568'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#9fb7c8'; g.font = '600 14px Segoe UI,Arial'; g.fillText('Usar PIN', cx, 468.5);
  g.fillStyle = '#5c7385'; g.font = '500 10px Segoe UI,Arial'; g.fillText('Interfaz ilustrativa para el modelo 3D', cx, 500);
  GT.ktex.needsUpdate = true; KS.dirty = false;
}
function kioskNear() {
  if (!FP.on || FP.lvl !== 'p1' || FP.x > -0.15 || FP.auto) return { d: 99, look: false };
  const kx = -0.12, dx = kx - FP.x, dz = GT.kz - FP.z, d = Math.hypot(dx, dz); const fx = -Math.sin(FP.yaw), fz = -Math.cos(FP.yaw);
  const dot = (dx * fx + dz * fz) / (d || 1); return { d, look: d < 1.2 && dot > 0.72 && FP.pitch > -0.75 && FP.pitch < 0.5 };
}
function kioskUpdate(dt) {
  if (KS.frozen) { if (KS.dirty) drawKiosk(); return; }
  KS.t += dt; const N = kioskNear(); const prev = KS.st;
  if (N.d > 1.8) KS.armed = true;
  const inWay = FP.on && FP.x > -0.9 && FP.x < 2.1 && FP.z > GT.Z0 + GT.U.p0 * GT.W - 0.1 && FP.z < GT.Z0 + GT.U.p1 * GT.W + 0.3;
  switch (KS.st) {
    case 'idle': if (N.look && KS.armed) { KS.st = 'scan'; KS.t = 0; } break;
    case 'scan': if (!N.look && KS.t < 1.6) { KS.st = 'idle'; KS.t = 0; } else if (KS.t >= 2.4) { KS.armed = false; if (pedCycle('face')) welcome(); } break;
    case 'ok': if (KS.t >= 0.45) { GT.ped.tgt = 1; KS.st = 'open'; KS.t = 0; } break;
    case 'open': if (FP.on && FP.x > 1.6) KS.passed = true;
      if ((KS.passed && !inWay && KS.t > 1.2) || (KS.t > 8 && !inWay)) { GT.ped.tgt = 0; KS.st = 'closing'; KS.t = 0; } break;
    case 'closing': if (inWay && GT.ped.cur > 0.08 && GT.ped.cur < 0.97) { GT.ped.tgt = 1; KS.st = 'open'; KS.t = 3; break; } // seguridad: re-abre si alguien está en el vano
      if (GT.ped.cur <= 0.001) { KS.lock = true; sfx('relay'); sfx('door'); KS.st = 'done'; KS.t = 0; } break;
    case 'done': if (KS.t > 2.6) { KS.st = 'idle'; KS.t = 0; } break;
    case 'vehopen': if (KS.t > 2.5 && GT.v1.cur < 0.01) { KS.st = 'idle'; KS.t = 0; } break;
  }
  if (KS.st !== prev) KS.dirty = true;
  if (KS.dirty || KS.st === 'scan' || (KS.t % 20 < dt)) drawKiosk();
}
let welT = 0;
function welcome() { const el = $('#fpToast'); if (!el) return; clearTimeout(welT); el.innerHTML = '<b>Acceso concedido</b><span>Reconocimiento facial URBAN · simulación</span>'; el.classList.add('show'); welT = setTimeout(() => el.classList.remove('show'), 3200); }
function kioskPrompt() {
  if (!FP.on || FP.lvl !== 'p1' || Math.abs(FP.y) > 0.5) return '';
  const N = kioskNear(); const s = KS.st;
  if (FP.x < -0.15 && N.d < 5) {
    if (s === 'scan') return '<span class="kp">◉ Reconociendo rostro… (simulación)</span>';
    if (s === 'ok' || s === 'open') return KS.src === 'face' ? '<span class="kp ok">✓ Bienvenido, propietario · relé ESP32 → cerradura liberada · pasa por la puerta peatonal</span>' : '<span class="kp ok">✓ Puerta peatonal abierta</span>';
    if (s === 'vehopen') return '<span class="kp">Portón vehicular abierto: la peatonal permanece cerrada dentro de su hoja</span>';
    if (s === 'closing' || s === 'done') return '<span class="kp">Puerta cerrándose · cerradura fail‑secure se re‑enclava</span>';
    if (N.d < 1.2) return '<span class="kp">Mira la pantalla del kiosko para iniciar el reconocimiento facial</span>';
    return '<span class="kp">Acércate al kiosko (jamba derecha, ≈1,5 m) para reconocimiento facial</span>';
  }
  if (FP.x > 0 && FP.x < 5.5 && (s === 'open' || s === 'closing' || s === 'done')) return '<span class="kp ok">Bienvenido a Ed. Almendra · la puerta se cierra sola detrás de ti</span>';
  return '';
}
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

// ================= RECORRIDO EN PRIMERA PERSONA (v3: tipo videojuego) =================
const FP = { on: false, x: -5.4, z: 4.4, y: 0, yaw: -Math.PI / 2, pitch: 0, mode: 'ground', floor: null, lvl: 'p1', keys: {}, joy: { x: 0, y: 0 }, prevCut: null, bob: 0, auto: null, focus: null, inCab: false, room: null, spd: 0 };
const EYE = 1.62, RAD = 0.22, STEPH = 0.45;
const TIPS = ['p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
const { EV, CI, ED, SH, ST: STR, PAIRS, stairY, LEV } = W;
function segsOf(polys) { const out = []; for (const p of polys) for (const ring of [p.o, ...(p.h || [])]) for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; out.push([a[0], a[1], b[0], b[1]]); } return out; }
function pip(polys, x, z) { for (const p of polys) { let c = false; const r = p.o; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } if (c) return true; } return false; }
function dSeg(px, pz, s) { const [ax, az, bx, bz] = s; const dx = bx - ax, dz = bz - az; const L = dx * dx + dz * dz || 1e-9; let t = ((px - ax) * dx + (pz - az) * dz) / L; t = Math.max(0, Math.min(1, t)); const qx = ax + t * dx - px, qz = az + t * dz - pz; return Math.sqrt(qx * qx + qz * qz); }
// rejilla espacial de segmentos (1 m)
function grid(segs) { const G = new Map(); for (const s of segs) { const x0 = Math.floor(Math.min(s[0], s[2]) - 0.4), x1 = Math.floor(Math.max(s[0], s[2]) + 0.4), z0 = Math.floor(Math.min(s[1], s[3]) - 0.4), z1 = Math.floor(Math.max(s[1], s[3]) + 0.4);
  for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const k = i * 1000 + j; if (!G.has(k)) G.set(k, []); G.get(k).push(s); } } return G; }
const SEGS_SOT = [...segsOf([...I.sotx.walls_in, ...I.sotx.walls_out]).filter((g) => !(Math.max(g[0], g[2]) < 7.7 && Math.min(g[1], g[3]) > 3.75 && Math.max(g[1], g[3]) < 4.25)), ...segsOf(I.sotx.cols_in), ...SV.segs,
  [1.2, 3.97, 7.8, 3.97], [16.4, 8.3, 24.55, 8.3], [16.5, 3.97, 21.79, 3.97], [24.55, 8.3, 24.55, 12.6],
  ...VEH.cars.flatMap((p) => { const hw = p.Wd / 2 + 0.05, hl = p.L / 2 + 0.03; return segsOf([{ o: [[p.cx - hw, p.cz - hl], [p.cx + hw, p.cz - hl], [p.cx + hw, p.cz + hl], [p.cx - hw, p.cz + hl]] }]); }),
  ...VEH.motos.flatMap((m) => segsOf([{ o: [[m.x - 1.05, m.z - 0.3], [m.x + 1.05, m.z - 0.3], [m.x + 1.05, m.z + 0.3], [m.x - 1.05, m.z + 0.3]] }])), [STR.x0, STR.zm, STR.x0, STR.z1]];
const SEGS_GROUND = [[1.2, 3.97, 7.884, 3.97], [0, 0.49, 0, 0.64], [0, 6.74, 0, 6.89], [-0.12, 0.49, 0.12, 0.49], [-0.12, 6.89, 0.12, 6.89], [0.1, 6.74, 7.884, 6.74], [7.884, 6.4, 7.884, 6.74], [7.884, 3.9, 7.884, 4.1]];
const GRID = {
  sot: grid([...SEGS_SOT, ...W.seg.stair, ...W.seg.elev]),
  p1: grid([...SEGS_GROUND, ...W.seg.p1, ...W.seg.stair, ...W.seg.elev]),
  tip: grid([...W.seg.tip, ...W.seg.stair, ...W.seg.elev]),
};
const P7BAR = [STR.x0, STR.z0, STR.x0, STR.zm];
function setKey(x, z, y) { if (y < 0.5 && x >= 0 && (onRamp(x, z) || (y < 0 && SV.at(x, z)))) return 'sot'; return lvlOf(y); }
function lvlOf(y) { if (y < -1.2) return 'sot'; if (y < LEVY.p2 - 1.0) return 'p1'; let id = 'p2'; for (const k of TIPS) if (LEVY[k] <= y + 1.0) id = k; return id; }
function dynSegs(lvl) {
  const out = [];
  const E = LEV[lvl];
  if (E) { for (const d of E.doors) out.push(d.seg()); if (E.bal) out.push(E.bal.seg()); if (E.ent) { const s = E.ent.seg(); if (s) out.push(s); } }
  if (lvl === 'p7') out.push(P7BAR);
  if (lvl === 'sot') for (const d of SV.doors) out.push(d.seg());
  if (lvl === 'p1' || lvl === 'sot') out.push(...gateSegs());
  const here = FLOORS[EV.fi] === lvl && EV.state !== 'moving';
  if (!(here && EV.door > 0.8)) out.push([ED[1] - 0.04, ED[2] - 0.05, ED[1] - 0.04, ED[3] + 0.05]);
  if (EV.door < 0.8 || EV.state === 'moving') out.push([CI.x1 + 0.035, ED[2] - 0.05, CI.x1 + 0.035, ED[3] + 0.05]);
  return out;
}
function blockedAt(x, z, ox, oz, key, lvl) {
  const G = GRID[key === 'sot' ? 'sot' : key === 'p1' ? 'p1' : 'tip'];
  const cell = G.get(Math.floor(x) * 1000 + Math.floor(z)) || [];
  for (const s of cell) { const d = dSeg(x, z, s); if (d < RAD && d < dSeg(ox, oz, s) - 1e-6) return true; }
  for (const s of dynSegs(lvl)) { const d = dSeg(x, z, s); if (d < RAD && d < dSeg(ox, oz, s) - 1e-6) return true; }
  return false;
}
// superficies caminables (escalera / cabina / losas / rampa / sótano)
function cands(x, z) {
  const out = [];
  if (x >= STR.x0 && x <= STR.xl && z >= STR.z0 && z <= STR.z1) { for (const P of PAIRS) { const y = stairY(P, x, z); if (y != null) out.push(y); } return out; }
  if (x > CI.x0 && x < CI.x1 + 0.03 && z > CI.z0 && z < CI.z1) { out.push(EV.y); return out; }
  if (x >= CI.x1 && x <= ED[1] + 0.03 && z > ED[2] && z < ED[3]) { out.push(EV.y); FLOORS.forEach((f) => out.push(LEVY[f])); return out; }
  if (x > SH[0] - 0.1 && x < ED[1] && z > SH[1] - 0.1 && z < SH[3] + 0.1) return out;
  if (onRamp(x, z)) out.push(rampY(x));
  else {
    if (x < 7.884) out.push(x >= STEPS.x0 && z > STEPS.z0 && z < STEPS.z1 ? stepY(x) : 0);
    else if (pipH(W.walk.p1, x, z)) out.push(LEVY.p1);
    const sr = SV.at(x, z); if (sr) out.push(sr.fy);
    if (pip(S.foot4, x, z) && x > 7.6) out.push(pip(S.deck, x, z) ? RAMP.deck : pip(S.lane2, x, z) ? laneY(z) : RAMP.low);
  }
  if (pipH(W.walk.tip, x, z)) for (const id of TIPS) out.push(LEVY[id]);
  return out;
}
function pickH(x, z, y) { let best = null; for (const h of cands(x, z)) if (h <= y + STEPH && (best === null || h > best)) best = h; if (best !== null && y - best > 0.6) return null; return best; }
// ---------- interacción ----------
function roomAt(x, z, lvl) { if (!/^p[2-7]$/.test(lvl)) return null; for (const r of W.rooms) if (r.type !== 'hall' && pipH([r], x, z)) return r; if (pipH(I.hallFloor, x, z)) return W.rooms.find((r) => r.type === 'hall'); return null; }
const NAMEAPT = { '01': 'Tipo 1', '02': 'Tipo 1', '03': 'Tipo 2', '04': 'Tipo 3' };
function doorLabel(d, lvl) { if (d.svc) return d.label; const r = roomAt(FP.x, FP.z, lvl); const other = r && r.id === d.ra ? d.rb : d.ra; const ro = W.rooms.find((q) => q.id === other); if (d.entry) { const a = W.rooms.find((q) => q.id === d.ra)?.apt || W.rooms.find((q) => q.id === d.rb)?.apt; return a ? 'Apto ' + (+lvl.slice(1) * 100 + +a) : 'Apartamento'; } return ro ? ro.name : ''; }
function nearElev() { return !FP.inCab && Math.abs(FP.y - LEVY[FP.lvl]) < 0.3 && FP.x > ED[1] - 0.05 && FP.x < ED[1] + 1.6 && FP.z > ED[2] - 0.9 && FP.z < ED[3] + 0.9; }
function inCabin() { return FP.x > CI.x0 - 0.05 && FP.x < CI.x1 + 0.12 && FP.z > CI.z0 && FP.z < CI.z1 && Math.abs(FP.y - EV.y) < 0.4; }
function findFocus() {
  const fx = -Math.sin(FP.yaw), fz = -Math.cos(FP.yaw); let best = null, bs = 1e9; const E = LEV[FP.lvl];
  const consider = (o, kind, px, pz, lab) => { const dx = px - FP.x, dz = pz - FP.z, d = Math.hypot(dx, dz); if (d > 1.9) return; const dot = (dx * fx + dz * fz) / (d || 1); if (d > 0.8 && dot < 0.55) return; const sc = d * (1.6 - dot); if (sc < bs) { bs = sc; best = { o, kind, lab }; } };
  if (E && Math.abs(FP.y - E.y) < 1.2) { for (const d of E.doors) consider(d, 'door', d.cx, d.cz); if (E.bal) consider(E.bal, 'bal', E.bal.cx, E.bal.cz); }
  if (FP.lvl === 'sot') for (const d of SV.doors) if (Math.abs(FP.y - d.fy) < 0.7) consider(d, 'door', d.cx, d.cz);
  if (FP.lvl === 'p1' && FP.x < 3.2 && Math.abs(FP.y) < 0.4) { const pz0 = GT.Z0 + GT.U.p0 * GT.W - 0.4; if (FP.z > pz0 && FP.z < GT.Z1 + 0.8) best = { kind: FP.x > 0 ? 'rex' : 'ped' }; else if (FP.z < pz0 && FP.z > GT.Z0 - 1) best = { kind: 'veh' }; }
  return best;
}
function interact(f = FP.focus) {
  if (FP.auto) return;
  if (FP.inCab) { if (EV.state === 'open' || EV.state === 'opening') evClose(); else evOpen(); return; }
  if (nearElev()) { evCall(FP.lvl); return; }
  if (!f) return;
  if (f.kind === 'door') { f.o.tgt = f.o.tgt ? 0 : 1; f.o.manual = performance.now(); sfx('door'); }
  else if (f.kind === 'bal') { f.o.tgt = f.o.tgt ? 0 : 1; sfx('slide'); }
  else if (f.kind === 'ped') { if (KS.st === 'idle') pedCycle('app'); }
  else if (f.kind === 'rex') { if (KS.st === 'idle' || KS.st === 'done') pedCycle('rex'); }
  else if (f.kind === 'veh') openVeh(!GT.v1.tgt);
}
// ---------- ascensor ----------
function evCall(f) {
  if (EV.state === 'moving') { if (!EV.target) EV.target = f; return; }
  if (FLOORS[EV.fi] === f) { if (EV.state === 'idle' || EV.state === 'closing') { EV.state = 'opening'; sfx('slide'); } else if (EV.state === 'open') EV.timer = 6; return; }
  EV.target = f; EV.drawPanel(null);
  if (EV.state === 'idle') evStart(); else if (EV.state === 'open' || EV.state === 'opening') { EV.state = 'closing'; sfx('slide'); }
}
function evOpen() { if (EV.state === 'moving') return; if (EV.state !== 'open') { EV.state = 'opening'; sfx('slide'); } else EV.timer = 6; }
function evClose() { if (EV.state === 'open' || EV.state === 'opening') { EV.state = 'closing'; EV.timer = 0; sfx('slide'); } }
function evStart() { EV.state = 'moving'; EV.t = 0; EV.y0 = EV.y; EV.y1 = LEVY[EV.target]; const n = Math.abs(FLOORS.indexOf(EV.target) - EV.fi); EV.dur = 2.2 + 1.1 * n; EV.dir = Math.sign(EV.y1 - EV.y0); hum(true); }
let lastInd = '';
function evUpdate(dt) {
  const inDoorway = FP.on && FP.x > CI.x1 - 0.05 && FP.x < ED[1] + 0.05 && FP.z > ED[2] && FP.z < ED[3] && Math.abs(FP.y - EV.y) < 0.5;
  if (EV.state === 'opening') { EV.door = Math.min(1, EV.door + dt / 1.1); if (EV.door >= 1) { EV.state = 'open'; EV.timer = 6; } }
  else if (EV.state === 'open') { EV.timer -= dt; if (EV.timer <= 0 && !inDoorway) { EV.state = 'closing'; sfx('slide'); } }
  else if (EV.state === 'closing') { if (inDoorway) EV.state = 'opening'; else { EV.door = Math.max(0, EV.door - dt / 1.1); if (EV.door <= 0) { if (EV.target && EV.target !== FLOORS[EV.fi]) evStart(); else { EV.state = 'idle'; EV.target = null; } } } }
  else if (EV.state === 'moving') {
    EV.t += dt; const u = Math.min(1, EV.t / EV.dur); const k = u * u * u * (u * (u * 6 - 15) + 10);
    EV.y = EV.y0 + (EV.y1 - EV.y0) * k;
    if (u >= 1) { EV.fi = FLOORS.indexOf(EV.target); EV.target = null; EV.state = 'opening'; EV.dir = 0; hum(false); sfx('ding'); setTimeout(() => sfx('slide'), 250); EV.drawPanel(null); }
  }
  W.cab.position.y = EV.y; EV.setDoorsVisual();
  let near = FLOORS[0]; for (const f of FLOORS) if (Math.abs(LEVY[f] - EV.y) < Math.abs(LEVY[near] - EV.y)) near = f;
  const lab = FLABEL[near] + '|' + EV.dir; if (lab !== lastInd) { lastInd = lab; EV.drawInd(FLABEL[near], EV.dir); EV.curLabel = FLABEL[near]; if (EV.state === 'moving') EV.drawPanel(null); }
  W.EV.light.intensity = FP.on && Math.abs(FP.y - EV.y) < 3 ? 1.3 : 0;
}
// ---------- puertas ----------
function doorsUpdate(dt) {
  const now = performance.now();
  for (const id of FLOORS) { const E = LEV[id]; if (!E || !E.int.visible) continue;
    const pl = FP.on && Math.abs(FP.y - E.y) < 1.0;
    for (const d of E.doors) {
      if (pl && !d.tgt && (!d.manual || now - d.manual > 4000)) { const dd = Math.hypot(FP.x - d.cx, FP.z - d.cz); if (dd < 0.95) { const fx = -Math.sin(FP.yaw), fz = -Math.cos(FP.yaw); if (((d.cx - FP.x) * fx + (d.cz - FP.z) * fz) / (dd || 1) > 0.2 || dd < 0.5) { d.tgt = 1; sfx('door'); } } }
      const goal = d.tgt * d.max; if (Math.abs(d.a - goal) > 1e-3) d.set(d.a + Math.sign(goal - d.a) * Math.min(Math.abs(goal - d.a), dt * 2.4));
    }
    if (E.bal) { if (Math.abs(E.bal.a - E.bal.tgt) > 1e-3) E.bal.set(E.bal.a + Math.sign(E.bal.tgt - E.bal.a) * Math.min(Math.abs(E.bal.tgt - E.bal.a), dt * 1.2)); }
    if (id === 'sot') for (const d of SV.doors) { const pl2 = FP.on && Math.abs(FP.y - d.fy) < 0.7;
      if (pl2 && !d.tgt && (!d.manual || now - d.manual > 4000)) { const dd = Math.hypot(FP.x - d.cx, FP.z - d.cz); if (dd < 0.95) { const fx = -Math.sin(FP.yaw), fz = -Math.cos(FP.yaw); if (((d.cx - FP.x) * fx + (d.cz - FP.z) * fz) / (dd || 1) > 0.2 || dd < 0.5) { d.tgt = 1; sfx('door'); } } }
      const goal = d.tgt * d.max; if (Math.abs(d.a - goal) > 1e-3) d.set(d.a + Math.sign(goal - d.a) * Math.min(Math.abs(goal - d.a), dt * 2.4)); }
    if (E.ent) { const want = pl && FP.x > 5.2 && FP.x < 10.5 && FP.z > 3.9 && FP.z < 6.9 ? 1 : 0; if (Math.abs(E.ent.a - want) > 1e-3) E.ent.set(E.ent.a + Math.sign(want - E.ent.a) * Math.min(Math.abs(want - E.ent.a), dt * 1.6)); }
  }
}
// ---------- sonido (WebAudio, silenciado por defecto) ----------
const AU = { on: false, ctx: null, hum: null };
function actx() { if (!AU.ctx) { try { AU.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { AU.ctx = null; } } return AU.ctx; }
function sfx(k) {
  if (!AU.on) return; const c = actx(); if (!c) return; const t = c.currentTime; const g = c.createGain(); g.connect(c.destination);
  if (k === 'ding') { for (const [f, d] of [[880, 0], [660, 0.32]]) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; const gg = c.createGain(); gg.gain.setValueAtTime(0.0001, t + d); gg.gain.exponentialRampToValueAtTime(0.18, t + d + 0.02); gg.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.2); o.connect(gg); gg.connect(c.destination); o.start(t + d); o.stop(t + d + 1.3); } return; }
  if (k === 'relay') { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 1900; const gg = c.createGain(); gg.gain.setValueAtTime(0.12, t); gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03); o.connect(gg); gg.connect(c.destination); o.start(t); o.stop(t + 0.04); const o2 = c.createOscillator(); o2.frequency.value = 140; const g2 = c.createGain(); g2.gain.setValueAtTime(0.15, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); o2.connect(g2); g2.connect(c.destination); o2.start(t); o2.stop(t + 0.09); return; }
  const len = k === 'slide' ? 1.0 : 0.35; const buf = c.createBuffer(1, c.sampleRate * len, c.sampleRate); const ch = buf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / ch.length);
  const src = c.createBufferSource(); src.buffer = buf; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = k === 'slide' ? 700 : 400; src.connect(f); f.connect(g); g.gain.value = k === 'slide' ? 0.08 : 0.12; src.start(t);
}
function hum(on) {
  const c = AU.on ? actx() : null;
  if (on && c && !AU.hum) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160; const g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.05, c.currentTime + 0.8); o.connect(f); f.connect(g); g.connect(c.destination); o.start(); AU.hum = { o, g }; }
  if (!on && AU.hum) { const { o, g } = AU.hum; const c2 = AU.ctx; g.gain.exponentialRampToValueAtTime(0.0001, c2.currentTime + 0.5); o.stop(c2.currentTime + 0.6); AU.hum = null; }
}
$('#snd').onclick = () => { AU.on = !AU.on; $('#snd').textContent = AU.on ? '🔊 Sonido' : '🔇 Sonido'; $('#snd').classList.toggle('on', AU.on); if (AU.on) { const c = actx(); c && c.resume(); if (EV.state === 'moving') hum(true); } else hum(false); };
// ---------- luces del recorrido ----------
const FPL = { hemi: new THREE.HemisphereLight(0xfff4e6, 0x8a7f72, 0), pts: [0, 1, 2].map(() => new THREE.PointLight(0xffefd8, 0, 6.5, 1.4)), t: 0 };
scene.add(FPL.hemi); FPL.pts.forEach((p) => scene.add(p));
function fpLights(dt) {
  FPL.t -= dt; if (FPL.t > 0) return; FPL.t = 0.4;
  const indoor = FP.lvl !== 'p1' || FP.x > 7.884;
  FPL.hemi.intensity = FP.on ? (indoor ? 0.22 : 0.1) : 0; HEMI.intensity = FP.on && indoor ? 0.5 : 0.9; renderer.toneMappingExposure = FP.on && indoor ? 0.92 : 1.05; scene.environmentIntensity = FP.on ? (indoor ? 0.32 : 0.5) : 0.45;
  const y = (LEV[FP.lvl]?.y ?? 0);
  let pts = [];
  if (/^p[2-7]$/.test(FP.lvl)) pts = W.TIP.lampPts.map((p) => ({ ...p, d: Math.hypot(p.x - FP.x, p.z - FP.z) })).sort((a, b) => a.d - b.d).slice(0, 3).map((p) => [p.x, y + 2.25, p.z]);
  else if (FP.lvl === 'p1') pts = [[9.8, LEVY.p1 + 2.2, 5.24], [14.2, LEVY.p1 + 2.2, 5.24], [20.4, LEVY.p1 + 2.2, 10.7]].sort((a, b) => Math.hypot(a[0] - FP.x, a[2] - FP.z) - Math.hypot(b[0] - FP.x, b[2] - FP.z));
  else { const sr = SV.at(FP.x, FP.z); pts = [[20.4, 0.3, 10.7], [21.5, 0.3, 15.5], [20.6, 0.3, 6.2], [21.5, 0.3, 21.5], [12.5, 0.2, 2.3], ...SV.rooms.map((r) => [r.cx, SV.ceil - 0.35, r.cz])].sort((a, b) => Math.hypot(a[0] - FP.x, a[2] - FP.z) - Math.hypot(b[0] - FP.x, b[2] - FP.z)); if (sr) pts = [[sr.cx, SV.ceil - 0.35, sr.cz], ...pts.filter((p) => p[1] > 0.25)]; }
  FPL.pts.forEach((p, i) => { const q = pts[i]; if (FP.on && q && indoor) { p.position.set(...q); p.intensity = i === 0 ? 1.7 : 1.1; } else p.intensity = 0; });
}
// ---------- cielo y entorno ilustrativo (solo en el recorrido) ----------
const SKY = new THREE.Group(); SKY.visible = false; scene.add(SKY);
{
  const sm = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: {}, vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vp; void main(){ float h = clamp(vp.y,0.0,1.0); vec3 hz = vec3(0.86,0.9,0.93); vec3 zt = vec3(0.36,0.58,0.84); vec3 c = mix(hz, zt, pow(h,0.55)); if (vp.y<0.0) c = vec3(0.45,0.5,0.47); gl_FragColor = vec4(c,1.0); }' });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(380, 32, 16), sm); sky.position.set(15, 0, 13); SKY.add(sky);
  // cordillera (Cocorná: montaña) — silueta procedural
  const pts = [], N = 160; for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2; const h = 28 + 22 * Math.sin(a * 3 + 1) * 0.5 + 14 * Math.sin(a * 7 + 2) * 0.5 + 6 * Math.sin(a * 17); pts.push([Math.cos(a), Math.sin(a), Math.max(8, h)]); }
  const v = [], R1 = 300; for (let i = 0; i < N; i++) { const [c0, s0, h0] = pts[i], [c1, s1, h1] = pts[i + 1]; v.push(c0 * R1, -2, s0 * R1, c1 * R1, -2, s1 * R1, c1 * R1, h1, s1 * R1, c0 * R1, -2, s0 * R1, c1 * R1, h1, s1 * R1, c0 * R1, h0, s0 * R1); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); mg.computeVertexNormals();
  const mt = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: 0x6f8a7a, side: THREE.DoubleSide, fog: false })); mt.position.set(15, 0, 13); SKY.add(mt);
  const pts2 = []; for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2; pts2.push([Math.cos(a), Math.sin(a), 14 + 9 * Math.sin(a * 5 + 0.4) + 5 * Math.sin(a * 13)]); }
  const v2 = [], R2 = 200; for (let i = 0; i < N; i++) { const [c0, s0, h0] = pts2[i], [c1, s1, h1] = pts2[i + 1]; v2.push(c0 * R2, -2, s0 * R2, c1 * R2, -2, s1 * R2, c1 * R2, h1, s1 * R2, c0 * R2, -2, s0 * R2, c1 * R2, h1, s1 * R2, c0 * R2, h0, s0 * R2); }
  const mg2 = new THREE.BufferGeometry(); mg2.setAttribute('position', new THREE.Float32BufferAttribute(v2, 3));
  const mt2 = new THREE.Mesh(mg2, new THREE.MeshBasicMaterial({ color: 0x4f6b55, side: THREE.DoubleSide })); mt2.position.set(15, 0, 13); SKY.add(mt2);
  // manzanas vecinas genéricas (ilustrativas)
  const winT = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#d9d2c4'; g.fillRect(0, 0, w, h); g.fillStyle = '#5d6a74'; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.fillRect(14 + i * 64, 18 + j * 64, 36, 30); });
  const bm = new THREE.MeshStandardMaterial({ map: winT, roughness: 0.9 });
  const blocks = [[-18, -6, 10, 12, 9], [-18, 10, 10, 9, 12], [-18, 24, 10, 12, 6], [-18, 38, 10, 10, 9], [8, -14, 12, 10, 9], [24, -14, 10, 10, 12], [40, 2, 10, 14, 6], [40, 20, 10, 12, 9], [8, 40, 12, 10, 6], [26, 40, 12, 10, 9], [-32, 2, 10, 14, 12], [52, 30, 10, 14, 15]];
  for (const [x, z, w, d, h] of blocks) { const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv; const nrm = g.attributes.normal; for (let i = 0; i < uv.count; i++) { const sx = Math.abs(nrm.getX(i)) > 0.5 ? d : w; uv.setXY(i, uv.getX(i) * sx / 3, uv.getY(i) * h / 2.8); } const m = new THREE.Mesh(g, bm); m.position.set(x, h / 2, z); winT.wrapS = winT.wrapT = THREE.RepeatWrapping; SKY.add(m); }
  // árboles simples
  const tg = []; const tr = new THREE.MeshStandardMaterial({ color: 0x4d7a45, roughness: 1 });
  for (const [x, z] of [[-9, -4], [-9, 9], [-9, 18], [-9, 30], [-2, -8], [30, -6], [32, 30], [-3, 34], [12, 32]]) { const c = new THREE.SphereGeometry(1.8, 10, 8); c.translate(x, 4, z); tg.push(c); const t = new THREE.CylinderGeometry(0.15, 0.2, 2.6, 6); t.translate(x, 1.3, z); tg.push(t); }
  SKY.add(new THREE.Mesh(mergeGeometries(tg.map((g) => g.index ? g.toNonIndexed() : g)), tr));
}
// ---------- teletransporte con fundido ----------
const fade = $('#fade');
const TPP = { inicio: [-5.4, 5.3, -Math.PI / 2, 0], acceso: [6.2, 5.4, -Math.PI / 2, 0] };
function fpTeleport(k, instant) {
  const go = () => {
    FP.auto = null;
    if (TPP[k]) { const [x, z, yaw, y] = TPP[k]; FP.x = x; FP.z = z; FP.yaw = yaw; FP.y = y; }
    else { const id = k === 'acceso' ? 'p1' : k; FP.x = 20.5; FP.z = 10.69; FP.yaw = Math.PI / 2; FP.y = LEVY[id]; }
    FP.pitch = 0; fpRefresh(true);
  };
  if (instant || !fade) { go(); return; }
  fade.classList.add('on'); setTimeout(() => { go(); setTimeout(() => fade.classList.remove('on'), 60); }, 320);
}
function fpPose(x, z, yaw, pitch, y) { FP.auto = null; FP.x = x; FP.z = z; FP.yaw = yaw; FP.pitch = pitch || 0; FP.y = typeof y === 'string' ? LEVY[y === 'floor' ? 'p4' : y === 'ground' ? 'p1' : y] ?? 0 : (y ?? (pickH(x, z, 30) ?? 0)); fpRefresh(true); }
// ---------- visibilidad por cercanía (rendimiento) ----------
let lastVis = '';
function fpVis(force) {
  const lvl = FP.lvl; const i = FLOORS.indexOf(lvl); const nearCore = FP.x > 16 && FP.x < 25 && FP.z > 8 && FP.z < 13.2;
  const key = lvl + nearCore + (FP.inCab ? 'c' : ''); if (!force && key === lastVis) return; lastVis = key;
  LV.forEach((l) => { l.g.visible = l.on; });
  FLOORS.forEach((id, k) => { const E = LEV[id]; const on = k === i || k === i + 1 || (nearCore && k === i - 1) || (FP.inCab && Math.abs(k - i) <= 1);
    E.int.visible = on; if (E.ceil) E.ceil.visible = on; });
  FPC.sot.visible = lvl === 'sot';
  if (GT.blk) GT.blk.forEach((m) => { m.visible = !(lvl === 'sot' || (FP.x > 0 && lvl === 'p1')); });
  st.cut = null; cutSel.value = '';
}
function intVisOrbit() { FLOORS.forEach((id) => { const E = LEV[id]; E.int.visible = !!(st.xray || st.explode > 0 || st.cut === id); if (E.ceil) E.ceil.visible = false; }); if (GT.blk) GT.blk.forEach((m) => { m.visible = true; }); }
// ---------- HUD ----------
const hud = { where: $('#fpWhere'), sub: $('#fpSub'), prompt: $('#fpPrompt'), elev: $('#elev'), act: $('#fpActBtn') };
function placeName() {
  const lvl = FP.lvl;
  if (FP.inCab) return ['Ascensor', EV.state === 'moving' ? (EV.dir > 0 ? 'Subiendo ▲ ' : 'Bajando ▼ ') + EV.curLabel + (EV.target ? ' → ' + FLABEL[EV.target] : '') : 'Piso ' + EV.curLabel];
  if (FP.x >= STR.x0 && FP.x <= STR.xl && FP.z >= STR.z0 && FP.z <= STR.z1) { const lo = FLOORS.slice().reverse().find((f) => LEVY[f] <= FP.y + 0.05) || 'sot'; const hi = FLOORS[FLOORS.indexOf(lo) + 1]; return ['Escalera', Math.abs(FP.y - LEVY[lo]) < 0.05 ? (lo === 'sot' ? 'Sótano' : 'Piso ' + FLABEL[lo]) : 'Entre ' + (lo === 'sot' ? 'sótano' : 'piso ' + FLABEL[lo]) + ' y piso ' + FLABEL[hi]]; }
  if (lvl === 'sot' && SV.at(FP.x, FP.z)) { const r = SV.at(FP.x, FP.z); return ['Sótano · ' + r.name, r.area.toFixed(2).replace('.', ',') + ' m² (cuadro de áreas PL_A004) · altura libre ≈' + r.clear.toFixed(2).replace('.', ',') + ' m'] }
  if (lvl === 'sot') return [FP.x < 7.7 && pip(S.band1, FP.x, FP.z) ? 'Rampa vehicular' : 'Sótano', pip(S.band1, FP.x, FP.z) ? 'Pendiente 10,9 % (PL_A004)' : 'Parqueaderos · N-2.96'];
  if (lvl === 'p1') { if (FP.x < -0.05) return ['Andén / calle', 'Frente del edificio · portón ED. ALMENDRA']; if (FP.x < 7.884) return ['Paso peatonal', 'Portón URBAN en borde de calle']; return ['Piso 1 · Lobby', 'Distribución aproximada (falta plancha 1/6)']; }
  const r = roomAt(FP.x, FP.z, lvl); const fl = +lvl.slice(1);
  if (!r) return ['Piso ' + fl, ''];
  if (r.type === 'hall') return ['Piso ' + fl + ' · Hall', 'Aptos ' + fl + '01–' + fl + '04 · ascensor · escalera'];
  return ['Piso ' + fl + ' · Apto ' + (fl * 100 + +r.apt) + ' (' + NAMEAPT[r.apt] + ')', r.name + (r.area ? ' · ' + r.area.toFixed(2).replace('.', ',') + ' m²' : '') + ' · amoblado ilustrativo'];
}
let lastHud = '';
function fpHud() {
  const [a, b] = placeName(); FP.mode = /^p[2-7]$/.test(FP.lvl) ? 'floor' : FP.lvl === 'p1' ? 'ground' : 'sot';
  let pr = '', act = '', ek = '';
  const f = FP.focus;
  if (FP.auto) pr = '<span class="auto">Recorrido automático…</span>';
  else if (FP.inCab) { pr = 'Elige el piso en la botonera  <b>1–7</b> · <b>0</b> = Sótano · <b>E</b> abrir/cerrar'; act = EV.state === 'open' ? 'Cerrar' : 'Abrir'; ek = 'cab'; }
  else if (nearElev()) { const here = FLOORS[EV.fi] === FP.lvl && EV.state !== 'moving'; pr = here && EV.door > 0.5 ? 'Entra al ascensor · o elige piso para ir automáticamente' : '<b>E</b> Llamar ascensor · o elige piso <b>0–7</b>'; act = here && EV.door > 0.5 ? 'Cerrar' : 'Llamar'; ek = 'land'; }
  else if (f) { if (f.kind === 'door') { act = f.o.tgt ? 'Cerrar' : 'Abrir'; pr = `<b>E</b> ${act} puerta · ${doorLabel(f.o, FP.lvl)}`; } else if (f.kind === 'bal') { act = f.o.tgt ? 'Cerrar' : 'Abrir'; pr = `<b>E</b> ${act} puerta‑ventana del balcón`; } else if (f.kind === 'ped') { act = 'App'; pr = 'Acércate al kiosko para reconocimiento facial · <b>E</b> abrir con la app URBAN (simulado) · <b>V</b> portón vehicular'; } else if (f.kind === 'rex') { act = 'Salir'; pr = '<b>E</b> Botón de salida · abrir puerta peatonal'; } else if (f.kind === 'veh') { act = 'Portón'; pr = '<b>V</b> Abrir portón vehicular · abre en 2 hojas, la peatonal queda cerrada (motor: fase 2)'; } }
  const kp = kioskPrompt(); if (kp && !FP.inCab) pr = kp;
  const key = a + b + pr + act + ek + EV.state + EV.curLabel + EV.target + FP.lvl;
  if (key === lastHud) return; lastHud = key;
  hud.where.textContent = a; hud.sub.textContent = b; hud.prompt.innerHTML = pr;
  hud.act.textContent = act || '·'; hud.act.classList.toggle('dim', !act);
  // panel de ascensor contextual
  hud.elev.classList.toggle('show', !!ek); document.body.classList.toggle('elevshow', !!ek);
  if (ek) {
    $('#elevTitle').textContent = ek === 'cab' ? 'Ascensor · cabina' : 'Ascensor · ' + (FP.lvl === 'sot' ? 'Sótano' : 'Piso ' + FLABEL[FP.lvl]);
    $('#elevInd').innerHTML = `<span>${EV.curLabel || ''}</span><i>${EV.dir > 0 ? '▲' : EV.dir < 0 ? '▼' : ''}</i>`;
    $('#elevCall').style.display = ek === 'land' ? '' : 'none';
    document.querySelectorAll('#elevKeys [data-f]').forEach((b) => { b.classList.toggle('on', EV.target === b.dataset.f); b.classList.toggle('cur', FLOORS[EV.fi] === b.dataset.f && EV.state !== 'moving'); });
  }
}
// ---------- secuencia automática (montarse en el ascensor en primera persona) ----------
function goFloor(f) {
  if (FP.inCab) { evCall(f); return; }
  if (!nearElev() && !FP.inCab) return;
  if (f === FP.lvl) { evCall(f); return; }
  FP.auto = { phase: 'call', f, t: 0 }; evCall(FP.lvl);
}
const lerpA = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };
function autoUpdate(dt) {
  const A = FP.auto; if (!A) return; A.t += dt;
  const walk = (tx, tz, tyaw, spd = 1.1) => { const dx = tx - FP.x, dz = tz - FP.z, d = Math.hypot(dx, dz); const st2 = Math.min(d, spd * dt); if (d > 1e-3) { FP.x += dx / d * st2; FP.z += dz / d * st2; FP.bob += st2 * 7; } FP.yaw = lerpA(FP.yaw, tyaw, Math.min(1, dt * 3.2)); FP.pitch += (0 - FP.pitch) * Math.min(1, dt * 3); return d < 0.03 && Math.abs(lerpA(FP.yaw, tyaw, 1) - FP.yaw) < 0.03; };
  const here = FLOORS[EV.fi] === FP.lvl && EV.state !== 'moving';
  if (A.phase === 'call') { walk(20.15, 10.69, Math.PI / 2, 1.0); if (here && EV.state === 'open') { A.phase = 'enter'; } else if (here && EV.state === 'idle') evCall(FP.lvl); }
  else if (A.phase === 'enter') { if (EV.state === 'open') EV.timer = 3; const done = walk(18.3, 10.69, Math.PI / 2 + 0.0001, 1.0); if (FP.x < 18.6) { const ok = walk(18.3, 10.69, -Math.PI / 2, 0.6); if (ok || A.t > 12) { A.phase = 'ride'; evCall(A.f); } } void done; }
  else if (A.phase === 'ride') { FP.yaw = lerpA(FP.yaw, -Math.PI / 2, Math.min(1, dt * 3)); if (EV.state === 'open' && FLOORS[EV.fi] === A.f) { A.phase = 'exit'; A.t = 0; } }
  else if (A.phase === 'exit') { if (A.t > 0.5) { EV.timer = 4; if (walk(20.3, 10.69, -Math.PI / 2, 1.0)) FP.auto = null; } }
}
// ---------- entrar / salir del modo ----------
function fpEnter() {
  if (FP.on) return; FP.on = true; FP.prevCut = st.cut; stopFlow(); closePanel(); tween = null;
  if (st.explode) { st.explode = 0; $('#explode').value = 0; applyExplode(); }
  controls.enabled = false; camera.near = 0.05; camera.fov = innerWidth < innerHeight ? 75 : 68; camera.updateProjectionMatrix();
  document.body.classList.add('fp'); $('#bFP').classList.add('on'); $('#bFP').textContent = 'Salir del recorrido';
  SKY.visible = true; M.ground.color.set(0x56604c); if (GRIDH) GRIDH.visible = false; scene.environmentIntensity = 0.6;
  fpTeleport('inicio', true); tip.classList.remove('show');
}
function fpExit() {
  if (!FP.on) return; FP.on = false; FP.auto = null; if (document.pointerLockElement) document.exitPointerLock();
  FPC.sot.visible = false; controls.enabled = true; camera.near = 0.1; camera.rotation.set(0, 0, 0); resize();
  document.body.classList.remove('fp'); $('#bFP').classList.remove('on'); $('#bFP').textContent = 'Recorrer por dentro';
  SKY.visible = false; M.ground.color.set(0x1b2027); if (GRIDH) GRIDH.visible = true; scene.environmentIntensity = 0.45; FPL.hemi.intensity = 0; HEMI.intensity = 0.9; renderer.toneMappingExposure = 1.05; urban.visible = st.urban; MK.forEach((m) => { m.g.visible = st.urban; }); FPL.pts.forEach((p) => (p.intensity = 0)); hum(false);
  st.cut = FP.prevCut; cutSel.value = st.cut || ''; applyVis(); lastVis = ''; hud.elev.classList.remove('show');
  camera.position.set(-25, 20, -12); controls.target.set(13, 5.5, 11); controls.update();
}
function fpRefresh(force) { FP.lvl = setKey(FP.x, FP.z, FP.y); FP.inCab = inCabin(); fpVis(force); lastHud = ''; FPL.t = 0; }
// ---------- actualización por cuadro ----------
function fpUpdate(dt) {
  if (FP.auto) autoUpdate(dt);
  else {
    const k = FP.keys; let f = 0, r = 0;
    if (k.KeyW || k.ArrowUp) f += 1; if (k.KeyS || k.ArrowDown) f -= 1; if (k.KeyD) r += 1; if (k.KeyA) r -= 1;
    if (k.ArrowLeft) FP.yaw += 1.8 * dt; if (k.ArrowRight) FP.yaw -= 1.8 * dt;
    f += -FP.joy.y; r += FP.joy.x;
    const n = Math.hypot(f, r); if (n > 1) { f /= n; r /= n; }
    const sp = (k.ShiftLeft || k.ShiftRight ? 3.0 : 1.45) * dt;
    const fx = -Math.sin(FP.yaw), fz = -Math.cos(FP.yaw), rx = Math.cos(FP.yaw), rz = -Math.sin(FP.yaw);
    const dx = (fx * f + rx * r) * sp, dz = (fz * f + rz * r) * sp;
    if (dx || dz) {
      const key = setKey(FP.x, FP.z, FP.y);
      const ok = (nx, nz) => { if (blockedAt(nx, nz, FP.x, FP.z, key, FP.lvl)) return null; const h = pickH(nx, nz, FP.y); return h; };
      let h = ok(FP.x + dx, FP.z + dz), mv = 0;
      if (h !== null) { FP.x += dx; FP.z += dz; mv = Math.hypot(dx, dz); }
      else if ((h = ok(FP.x + dx, FP.z)) !== null) { FP.x += dx; mv = Math.abs(dx); }
      else if ((h = ok(FP.x, FP.z + dz)) !== null) { FP.z += dz; mv = Math.abs(dz); }
      FP.bob += mv * 7.5; FP.spd = mv / dt;
    } else FP.spd = 0;
  }
  // altura
  FP.inCab = inCabin();
  if (FP.inCab) FP.y = EV.y;
  else { const ty = pickH(FP.x, FP.z, FP.y); if (ty !== null) { const d = ty - FP.y; FP.y += Math.abs(d) < 0.003 ? d : d * Math.min(1, dt * 14); } }
  const nl = setKey(FP.x, FP.z, FP.y); if (nl !== FP.lvl) { FP.lvl = nl; lastHud = ''; FPL.t = 0; }
  fpVis(false);
  const bobY = Math.sin(FP.bob) * 0.022 * Math.min(1, FP.spd / 1.2 + (FP.auto ? 0.6 : 0)), bobX = Math.cos(FP.bob * 0.5) * 0.012 * Math.min(1, FP.spd / 1.2);
  const shake = EV.state === 'moving' && FP.inCab ? Math.sin(performance.now() * 0.05) * 0.0015 : 0;
  const rx = Math.cos(FP.yaw), rz = -Math.sin(FP.yaw);
  camera.position.set(FP.x + rx * bobX, FP.y + EYE + bobY + shake, FP.z + rz * bobX); camera.rotation.order = 'YXZ'; camera.rotation.set(FP.pitch, FP.yaw, 0);
  FP.focus = findFocus(); fpLights(dt); fpHud();
  const showU = st.urban && FP.mode !== 'floor' && !FP.inCab && kioskNear().d > 2.2 && !['scan', 'ok'].includes(KS.st); if (urban.visible !== showU) { urban.visible = showU; MK.forEach((m) => { m.g.visible = showU; }); }
  document.body.classList.toggle('neargate', FP.lvl === 'p1' && FP.x < 4 && Math.abs(FP.y) < 0.5);
}
// ---------- entradas ----------
const KEYF = { Digit0: 'sot', Numpad0: 'sot', KeyB: 'sot', Digit1: 'p1', Digit2: 'p2', Digit3: 'p3', Digit4: 'p4', Digit5: 'p5', Digit6: 'p6', Digit7: 'p7', Numpad1: 'p1', Numpad2: 'p2', Numpad3: 'p3', Numpad4: 'p4', Numpad5: 'p5', Numpad6: 'p6', Numpad7: 'p7' };
addEventListener('keydown', (e) => { if (!FP.on) return; FP.keys[e.code] = true;
  if (e.code === 'KeyE' && !e.repeat) interact();
  if (e.code === 'KeyV') openVeh(!GT.v1.tgt);
  if (KEYF[e.code] && (FP.inCab || nearElev())) goFloor(KEYF[e.code]);
  if (e.code === 'KeyO' && FP.inCab) evOpen(); if (e.code === 'KeyC' && FP.inCab) evClose();
  if (e.code === 'KeyM') $('#snd').click();
  if (e.code === 'Escape') { if (FP.auto) FP.auto = null; else if (!document.pointerLockElement) fpExit(); }
  if (/Arrow|Space/.test(e.code)) e.preventDefault(); });
addEventListener('keyup', (e) => { FP.keys[e.code] = false; });
let look = null;
const rayC = new THREE.Raycaster();
function clickCenter() { // con puntero bloqueado: tecla de la botonera o interacción
  rayC.setFromCamera(new THREE.Vector2(0, 0), camera); rayC.far = 2.2;
  if (FP.inCab) { const h = rayC.intersectObject(EV.panelMesh)[0]; if (h && h.uv) { const k = EV.keyAt(h.uv); if (k === 'open') evOpen(); else if (k === 'close') evClose(); else if (k) goFloor(k); return; } }
  interact();
}
canvas.addEventListener('pointerdown', (e) => { if (!FP.on) return; if (document.pointerLockElement === canvas) { clickCenter(); return; } look = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: 0, t: performance.now() }; });
addEventListener('pointermove', (e) => {
  if (!FP.on || FP.auto) return;
  if (document.pointerLockElement === canvas) { FP.yaw -= e.movementX * 0.0024; FP.pitch -= e.movementY * 0.0024; }
  else if (look && e.pointerId === look.id) { const dx = e.clientX - look.x, dy = e.clientY - look.y; look.moved += Math.abs(dx) + Math.abs(dy); FP.yaw -= dx * 0.005; FP.pitch -= dy * 0.005; look.x = e.clientX; look.y = e.clientY; }
  FP.pitch = Math.max(-1.3, Math.min(1.3, FP.pitch));
});
addEventListener('pointerup', (e) => { if (!FP.on || !look || e.pointerId !== look.id) return;
  if (look.moved < 6) { if (e.pointerType === 'mouse' && canvas.requestPointerLock) { try { canvas.requestPointerLock(); } catch (_) {} } else { // toque: botonera de cabina o interacción
    const r = canvas.getBoundingClientRect(); rayC.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera); rayC.far = 2.4;
    const h = FP.inCab ? rayC.intersectObject(EV.panelMesh)[0] : null; if (h && h.uv) { const k = EV.keyAt(h.uv); if (k === 'open') evOpen(); else if (k === 'close') evClose(); else if (k) goFloor(k); } } }
  look = null; });
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
$('#fpOpen').onclick = () => { if (KS.st === 'idle' || KS.st === 'done') pedCycle(FP.x > 0 ? 'rex' : 'app'); };
$('#fpVeh').onclick = () => openVeh(!GT.v1.tgt);
$('#bVeh').onclick = () => openVeh(!GT.v1.tgt);
$('#gateH').onchange = (e) => setGateH(e.target.value);
$('#fpActBtn').onclick = () => interact();
document.querySelectorAll('#elevKeys [data-f]').forEach((b) => (b.onclick = () => goFloor(b.dataset.f)));
$('#elevOpen').onclick = () => (FP.inCab ? evOpen() : evCall(FP.lvl));
$('#elevClose').onclick = () => evClose();
$('#elevCall').onclick = () => evCall(FP.lvl);
// ---------- minimapa (planta del nivel actual, centrada en el jugador) ----------
const mini = $('#mini'), mctx = mini.getContext('2d');
const MMS = 14, MX0 = -8, MZ0 = -3, MW = 40, MH = 32; // px/m y ventana del plano
const RCOL = { alcoba: '#3c5a78', sala: '#4f6f5a', circ: '#55606e', cocina: '#7a6a4a', ropas: '#6a6f73', bano: '#3f7a80', hall: '#7a5a3a', balcon: '#6d5446', cabina: '#999' };
function mkMap(kind) {
  const c = document.createElement('canvas'); c.width = MW * MMS; c.height = MH * MMS; const g = c.getContext('2d'); g.setTransform(MMS, 0, 0, MMS, -MX0 * MMS, -MZ0 * MMS);
  const P = (polys) => { const p = new Path2D(); for (const q of polys) for (const ring of [q.o, ...(q.h || [])]) { ring.forEach(([x, z], i) => (i ? p.lineTo(x, z) : p.moveTo(x, z))); p.closePath(); } return p; };
  g.fillStyle = '#0d1218'; g.fillRect(MX0, MZ0, MW, MH); g.fillStyle = '#2a2e34'; g.fillRect(MX0, MZ0, -MX0 - 0.6, MH);
  if (kind === 'tip') {
    g.fillStyle = '#1d2733'; g.fill(P(S.foot2), 'evenodd');
    for (const r of I.rooms) { g.fillStyle = RCOL[r.type] || '#444'; g.fill(P([r])); }
    g.fillStyle = '#7a5a3a'; g.fill(P(I.hallFloor));
    g.fillStyle = '#e8e2d6'; g.fill(P(I.caps));
    for (const w of I.wins) { g.fillStyle = '#7fd3ff'; g.fillRect(w.x0, w.z0, w.x1 - w.x0, w.z1 - w.z0); }
    g.font = '0.34px Segoe UI,Arial'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.85)';
    for (const r of I.rooms) { if (r.type === 'cabina' || r.type === 'hall') continue; const n = r.name.replace('Alcoba principal', 'Alc. ppal').replace('Sala-comedor', 'Sala-com.').replace('Baño alcoba principal', 'Baño').replace('Baño social', 'Baño'); g.fillText(n, r.lp[0], r.lp[1]); }
  } else if (kind === 'p1') { g.fillStyle = '#1d2733'; g.fill(P(S.f1)); g.fillStyle = '#3a3f46'; g.fill(P(S.band1)); g.fillStyle = '#7a5a3a'; g.fill(P(I.lobbyAll)); g.fillStyle = '#e8e2d6'; g.fill(P(I.f1walls)); g.font = '0.4px Segoe UI,Arial'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('Lobby (aprox.)', 12.3, 5.4); g.fillText('Paso peatonal', 4, 5.4); }
  else { g.fillStyle = '#1d2733'; g.fill(P(S.foot4), 'evenodd'); g.fillStyle = '#3a3f46'; g.fill(P(S.band1)); g.fillStyle = '#e8e2d6'; g.fill(P(S.walls4), 'evenodd'); g.font = '0.5px Segoe UI,Arial'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('Parqueaderos', 22, 19); }
  // escalera y ascensor
  g.strokeStyle = '#ffb547'; g.lineWidth = 0.06; for (let k = 0; k <= 7; k++) { const x = STR.x0 + k * 0.3; g.beginPath(); g.moveTo(x, STR.z0); g.lineTo(x, STR.z1); g.stroke(); }
  g.strokeRect(STR.x0, STR.z0, STR.xl - STR.x0, STR.z1 - STR.z0);
  g.fillStyle = '#35d3ff'; g.fillRect(CI.x0, CI.z0, CI.x1 - CI.x0, CI.z1 - CI.z0); g.fillStyle = '#05080c'; g.font = '0.42px Segoe UI,Arial'; g.textAlign = 'center'; g.fillText('ASC', (CI.x0 + CI.x1) / 2, (CI.z0 + CI.z1) / 2 + 0.15);
  g.strokeStyle = '#c9a77c'; g.lineWidth = 0.14; g.beginPath(); g.moveTo(0, GT.Z0); g.lineTo(0, GT.Z1); g.stroke();
  return c;
}
const MAPS = { tip: mkMap('tip'), p1: mkMap('p1'), sot: mkMap('sot') };
function drawMini() {
  const Wd = mini.width, Ht = mini.height; mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.clearRect(0, 0, Wd, Ht);
  const kind = /^p[2-7]$/.test(FP.lvl) ? 'tip' : FP.lvl; const img = MAPS[kind] || MAPS.tip;
  const zoom = 1.0; const view = 13; // metros visibles
  const s = Wd / view;
  mctx.save(); mctx.beginPath(); mctx.roundRect(0, 0, Wd, Ht, 22); mctx.clip(); mctx.fillStyle = '#0a0e13'; mctx.fillRect(0, 0, Wd, Ht);
  mctx.translate(Wd / 2, Ht / 2); mctx.scale(s / MMS * zoom, s / MMS * zoom); mctx.translate(-(FP.x - MX0) * MMS, -(FP.z - MZ0) * MMS);
  mctx.drawImage(img, 0, 0);
  // puertas abiertas/cerradas del nivel
  const E = LEV[FP.lvl]; if (E && E.doors.length) { mctx.strokeStyle = '#ffd59a'; mctx.lineWidth = 0.07 * MMS; for (const d of E.doors) { const sg = d.seg(); mctx.beginPath(); mctx.moveTo((sg[0] - MX0) * MMS, (sg[1] - MZ0) * MMS); mctx.lineTo((sg[2] - MX0) * MMS, (sg[3] - MZ0) * MMS); mctx.stroke(); } }
  if (kind === 'tip') { mctx.fillStyle = '#fff'; mctx.font = `700 ${0.5 * MMS}px Segoe UI,Arial`; mctx.textAlign = 'center'; const fl = +FP.lvl.slice(1); for (const [x, z, n] of [[24.8, 18.2, 1], [19.6, 18.2, 2], [24.0, 5.6, 3], [11.6, 2.9, 4]]) mctx.fillText(String(fl * 100 + n), (x - MX0) * MMS, (z - MZ0) * MMS); }
  mctx.restore();
  // jugador (centro) con cono de visión
  const a = -FP.yaw - Math.PI / 2; const cx = Wd / 2, cy = Ht / 2;
  mctx.fillStyle = 'rgba(53,211,255,.22)'; mctx.beginPath(); mctx.moveTo(cx, cy); mctx.arc(cx, cy, 70, a - 0.55, a + 0.55); mctx.closePath(); mctx.fill();
  mctx.fillStyle = '#35d3ff'; mctx.beginPath(); mctx.arc(cx, cy, 8, 0, 6.29); mctx.fill(); mctx.strokeStyle = '#fff'; mctx.lineWidth = 3; mctx.stroke();
  mctx.fillStyle = 'rgba(8,12,18,.8)'; mctx.fillRect(0, Ht - 40, Wd, 40); mctx.fillStyle = '#e8e2d6'; mctx.font = '600 22px Segoe UI,Arial'; mctx.textAlign = 'left';
  mctx.fillText(FP.inCab ? 'Ascensor · ' + (EV.curLabel === 'S' ? 'Sótano' : 'Piso ' + EV.curLabel) : FP.lvl === 'sot' ? 'Sótano' : 'Piso ' + FLABEL[FP.lvl], 14, Ht - 13);
}

window.__intVis = () => { if (!FP.on) intVisOrbit(); };

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
  evUpdate(dt); doorsUpdate(dt);
  gateUpdate(dt); kioskUpdate(dt); carUpdate(dt);
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
  floatLbl.forEach((f) => { wp.set(...f.p); wp.y += lv(f.l).g.position.y; place(f.el, wp, lv(f.l).g.visible && (!f.only || st.cut === f.only) && (f.only || !f.cls.includes('sm') || camera.position.distanceTo(wp) < 20) && (!FP.on || (FP.mode !== 'floor' && camera.position.distanceTo(wp) < 14 && kioskNear().d > 2.2))); });
}
requestAnimationFrame(loop);
function sim(sec, step = 1 / 30) { for (let t = 0; t < sec; t += step) { if (FP.on) fpUpdate(step); evUpdate(step); doorsUpdate(step); gateUpdate(step); kioskUpdate(step); } }
window.__app = { SV, VEH, cam: (p, t) => { camera.position.set(...p); controls.target.set(...t); controls.update(); }, info: () => ({ ...renderer.info.render, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures, progs: renderer.info.programs.length }), sim, EV, W, evCall, goFloor, interact, LEVY, carAt: (t) => { openVeh(true); GT.v1.cur = GT.v2.cur = 1; CAR.t = t; CAR.closed = true; }, CAR, GT, FP, fpEnter, fpExit, fpTeleport, fpPose, openPed, openVeh, pedCycle, KS, kioskNear, drawKiosk, setGateH: (k) => setGateH(k), goView, startFlow, stopFlow, openPanel: (id) => openPanel(id === 'cable' ? CAB_MK : MK.find((m) => m.id === id)), closePanel, st, applyVis, applyExplode, setCut: (c) => { st.cut = c; cutSel.value = c || ''; applyVis(); } };
document.body.classList.add('ready');
