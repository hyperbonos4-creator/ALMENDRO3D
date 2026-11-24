import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeTextures } from './tex.js';
import { buildWorld, LEVY, FLOORS, FLABEL, pipH } from './interior.js';
import { carParts, motoParts, vehicleMaterials, mergeVehicles, CAR_TYPES } from './vehicles.js';
import { textTex } from './tex.js';
import { makeTex8, gateTexture, signTexture, facadeModel, buildFacadeFloor, segBox, plantMats, tropicalGeo, ivyGeo, worldUV } from './style8.js';
import { floorY, SPOTS as NEW_SPOTS, MOTO_Z as NEW_MOTO_Z, MOTO_X, WALLS, COLS, ROOMS, emtCenterline, PULL_BOXES, EMT_OD, CLEAR_H } from './sotanoPlan.js';

const S = window.__SCENE__, TEX = window.__TEX__;
const $ = (q) => document.querySelector(q);
const isMobile = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
const fmt = (n) => n == null ? '—' : 'COP ' + n.toLocaleString('es-CO');

// ---------- renderer / scene ----------
const canvas = $('#c');
function glFallback(msg) {
  let el = document.getElementById('gl-fallback');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gl-fallback';
    el.setAttribute('role', 'alert');
    el.style.cssText = 'position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:24px;background:#07090d;color:#e8edf3;font:16px/1.45 system-ui,Segoe UI,sans-serif';
    document.body.appendChild(el);
  }
  el.innerHTML = `<div style="max-width:520px"><h2 style="font-size:20px;margin-bottom:10px">No se pudo mostrar el modelo 3D</h2><p>${msg}</p><p style="margin-top:12px"><button type="button" onclick="location.reload()" style="background:#35d3ff;color:#061018;border:0;border-radius:8px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer">Recargar</button></p></div>`;
}
let renderer;
let glLost = false;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('sin contexto');
} catch (err) {
  glFallback('Este navegador no tiene WebGL disponible, o la aceleración gráfica está desactivada. Prueba con Chrome o Edge actualizado, activa la aceleración por hardware y recarga la página.');
  throw err;
}
canvas.addEventListener('webglcontextlost', (ev) => {
  ev.preventDefault();
  glLost = true;
  glFallback('Se perdió el contexto gráfico: la GPU dejó de responder. Recarga la página para volver a ver el edificio.');
}, false);
canvas.addEventListener('webglcontextrestored', () => { location.reload(); }, false);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; // v6: sombras estáticas, se recalculan solo si algo cambia
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
const MOV = { t: 0 }; const shadowDirty = () => { renderer.shadowMap.needsUpdate = true; };
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
const texPuerta = loader.load(TEX.puerta); texPuerta.colorSpace = THREE.SRGBColorSpace; texPuerta.anisotropy = 8;
const texLetrero = loader.load(TEX.letrero); texLetrero.colorSpace = THREE.SRGBColorSpace; texLetrero.anisotropy = 8;

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
  park: new THREE.MeshStandardMaterial({ color: 0x8c8c8c, roughness: 0.92 }),
  asph: new THREE.MeshStandardMaterial({ color: 0xffffff, map: texAsph, roughness: 0.95 }),
  f1: new THREE.MeshStandardMaterial({ color: 0xffffff, map: texHatch, roughness: 0.9, transparent: true, opacity: 0.86 }),
  ground: new THREE.MeshStandardMaterial({ color: 0x1b2027, roughness: 1 }),
  side: new THREE.MeshStandardMaterial({ color: 0x5c6168, roughness: 1 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xe0b828, roughness: 0.6, emissive: 0x2a2000 }),
};
texRoof.repeat.set(2, 1);
// ---------- v8: materiales del estilo real (renders promocionales) ----------
const T8 = makeTex8();
const st8 = (c, map, r = 0.9, o = {}) => new THREE.MeshStandardMaterial({ color: c, map, roughness: r, ...o });
const F8 = {
  render: st8(0xa69382, T8.stucco, 0.88),   // marco moca/taupe #A69382 (fotos y PL_A006, café)
  grey: st8(0xb5b1aa, T8.rough, 0.95),      // gris texturizado (graniplast)
  wood: st8(0xffdfa6, T8.slats, 0.72, { normalMap: T8.slatsN, normalScale: new THREE.Vector2(1.1, 1.1) }),      // listones de madera clara (pino)
  woodD: st8(0xffdfa6, T8.slats, 0.72, { normalMap: T8.slatsN, normalScale: new THREE.Vector2(1.1, 1.1) }),      // listones más oscuros del costado azul (ref_01)
  char: st8(0x3b3a39, T8.stucco, 0.85),     // marcos grafito del costado azul
  tan: st8(0x977652, T8.stucco, 0.85),      // paños café medio (franjas verticales)
  dark: st8(0x4a525d, T8.stucco, 0.8),      // azul grafito empotrado
  band: st8(0xe2ded6, null, 0.7),           // franjas claras en línea de losa
  spandrel: st8(0x2c2e31, null, 0.32, { metalness: 0.35 }), // antepecho de vidrio oscuro en franjas de ventana
  white: st8(0xeceae5, T8.stucco, 0.9),     // revoque blanco (ala posterior / ranura del punto fijo)
  recess: st8(0xdcd9d3, T8.stucco, 0.9),    // interior del balcón empotrado
  stuccoVC: st8(0xffffff, T8.stucco, 0.87, { vertexColors: true }), // v8: revoques fundidos con color por vértice
  slatVC: st8(0xffffff, T8.slats, 0.71, { vertexColors: true, normalMap: T8.slatsN, normalScale: new THREE.Vector2(1.1, 1.1) }),    // v8: listones claros + oscuros fundidos
};
M.alu.color.set(0x1a1a1a); M.alu.metalness = 0.55; M.alu.roughness = 0.4; // perfilería negra #1A1A1A
M.glass.color.set(0x9eb8c9); M.glass.metalness = 0.55; M.glass.roughness = 0.08; M.glass.opacity = 0.55; // vidrio levemente azulado y reflectivo (fotos)
M.rglass = new THREE.MeshStandardMaterial({ color: 0xdfe9ec, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide });
M.slab.color.set(0xd2d0ca);
M.conc.map = T8.concFloor; M.conc.color.set(0xffffff); M.conc.roughness = 0.82;
M.drip.color.set(0xd9d5cc);
const PM8 = plantMats(T8);
const FACADE = [M.grey, M.white, M.liston, M.brown, M.glass, M.alu, M.drip, M.f1, M.rglass, ...Object.values(F8)];
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
  ...[1, 2, 3, 4, 5, 6].map((n, i) => ({ id: 'p' + n, name: 'Piso ' + n, y: 1.0 + i * 2.7, k: i })),
  { id: 'cub', name: 'Cubierta', y: 17.6, k: 6 },
];
const root = new THREE.Group(); scene.add(root);
LV.forEach((l) => { l.g = new THREE.Group(); l.g.name = l.id; root.add(l.g); l.on = true; });
const lv = (id) => LV.find((l) => l.id === id);
const I = window.__INT__;
// La escalera del plano nuevo arranca 2 m más cerca del ascensor y cae dentro del hall.
I.stair = { ...I.stair, x0: 19.36, x1: 21.46, xl: 22.46 };
const W = buildWorld({ I, S, lv, T: makeTextures(), M, isMobile, T8 });
scene.add(W.cab);
const CORE_HOLES = [[[19.36, 9.69], [22.46, 9.69], [22.46, 11.69], [19.36, 11.69]], [[16.755, 9.841], [19.207, 9.841], [19.207, 11.541], [16.755, 11.541]]];
const withHoles = (polys) => polys.map((p) => ({ o: p.o, h: [...(p.h || []), ...CORE_HOLES] }));

// ---------- typical floor (shared geometry, 2–7) ----------
function typicalFloor() {
  const G = new THREE.Group();
  const g = { wall: [], grey: [], white: [], liston: [], brown: [], glass: [], alu: [], drip: [], rglass: [] }; const solids = [];
  g.slab = [W.TIP.slab];
  for (const p of S.skin) {
    const [nx, nz, L] = normOf(p);
    // v8: la piel opaca (paños, pilastras, listones, franjas) se arma por piso en style8.js → aquí solo vidrio, perfilería y barandas
    void nx; void nz;
    if (p.k === 'solid') { solids.push(p); continue; }
    if (p.code === 'V-7') continue; // puerta-ventana del balcón: se modela en interior.js
    if (p.k === 'open') { g.rglass.push(seg(p.a, p.b, 0.06, 0.98, 0.012, 0.0)); g.alu.push(seg(p.a, p.b, 0.98, 1.03, 0.05, 0.0), seg(p.a, p.b, 0.02, 0.06, 0.04, 0.0));
      for (let t = 0.04; t < L; t += Math.max(0.6, L / Math.max(1, Math.round(L / 1.2)))) { const c = [p.a[0] + (p.b[0] - p.a[0]) * t / L, p.a[1] + (p.b[1] - p.a[1]) * t / L], e = [(p.b[0] - p.a[0]) / L * 0.02, (p.b[1] - p.a[1]) / L * 0.02]; g.alu.push(seg([c[0] - e[0], c[1] - e[1]], [c[0] + e[0], c[1] + e[1]], 0.02, 0.98, 0.04, 0.0)); }
      continue; }
    const sill = p.sill, head = p.head;
    g.glass.push(seg(p.a, p.b, sill, head, 0.02, -0.05));
    g.alu.push(seg(p.a, p.b, head - 0.04, head, 0.07, -0.05), seg(p.a, p.b, Math.max(sill, 0.04), Math.max(sill, 0.04) + 0.04, 0.07, -0.05));
    const dx = p.b[0] - p.a[0], dz = p.b[1] - p.a[1];
    for (const f of [0, 0.5, 1]) { if (f === 0.5 && L < 1.4) continue; const c = [p.a[0] + dx * f, p.a[1] + dz * f]; const u = [dx / L * 0.025, dz / L * 0.025];
      g.alu.push(seg([c[0] - u[0], c[1] - u[1]], [c[0] + u[0], c[1] + u[1]], sill, head, 0.07, -0.05)); }
    if (sill > 0.04) g.drip.push(seg(p.a, p.b, sill - 0.03, sill, 0.07, 0.075, 0.0)); // alfajía delgada
  }
  for (const [k, list] of Object.entries(g)) if (list.length) { const m = meshOf(list, M[k], k !== 'glass' && k !== 'rglass'); m.userData.kind = k; G.add(m); }
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
const TF = typicalFloor(); void solidSkin;
const FMOD = facadeModel(S);
LV.filter((l) => /^p[1-6]$/.test(l.id)).forEach((l) => { const c = TF.clone(); c.position.y = l.y; c.add(buildFacadeFloor(FMOD, l.y, F8)); l.g.add(c);
  // borde de losa del balcón empotrado (frente abierto, x = 6.864) en gris claro
  c.add(meshOf([segBox([6.864, 3.969], [0, -1], [-1, 0], 0, 3.251, -0.2, 0.0, -0.036, 0.04)], F8.recess)); // hasta el borde de la losa del balcón (x = 6.90)
  // jardineras colgantes en el borde del corredor hacia la ranura del punto fijo (ref_05/ref_10)
  if (!TF.userData.plantG) { const pots = [], ivy = []; for (const p of S.skin) { if (p.k !== 'open') continue; const [nx, nz, L] = normOf(p); const u = [(p.b[0] - p.a[0]) / L, (p.b[1] - p.a[1]) / L];
      for (let t = 0.35; t + 1.05 < L; t += 1.6) { const a = [p.a[0] + u[0] * t, p.a[1] + u[1] * t], b = [p.a[0] + u[0] * (t + 1.0), p.a[1] + u[1] * (t + 1.0)];
        pots.push(segBox(p.a, u, [nx, nz], t, t + 1.0, 0.62, 0.86, 0.05, 0.27)); ivy.push(ivyGeo(a, b, 0.92, 1.05, 0.285), ivyGeo(a, b, 0.92, 0.8, 0.16)); } }
    const pgm = mergeGeometries(pots); { const c = new THREE.Color(0xa9845c), n = pgm.attributes.position.count, ca = new Float32Array(n * 3); for (let i = 0; i < n; i++) ca.set([c.r, c.g, c.b], i * 3); pgm.setAttribute('color', new THREE.BufferAttribute(ca, 3)); }
    TF.userData.plantG = [pgm, mergeGeometries(ivy)]; }
  const [pg, ig] = TF.userData.plantG; const pm = new THREE.Mesh(pg, F8.stuccoVC); pm.castShadow = true; c.add(pm); const im = new THREE.Mesh(ig, PM8.ivy); im.castShadow = true; c.add(im); });

// ---------- Piso 1 (esquemático) ----------
// escalones paso peatonal (N+0.00) → lobby (N+1.00, PL_A006): 6 contrahuellas de 0.167 m (supuesto: falta plancha 1/6)
const STEPS = { x0: 6.084, x1: 7.884, z0: 4.07, z1: 6.41, n: 6 };
function stepY(x) { const k = Math.min(STEPS.n, Math.max(0, Math.floor((x - STEPS.x0) / 0.3) + 1)); return (k / STEPS.n) * LEVY.p1; }
const GT = { leaves: [] };
{
  const L1 = lv('p1').g;
  GT.blk = [];
  texHatch.repeat.set(0.5, 0.5);
  // ================= PORTÓN COMPLETO EN BORDE DE CALLE (x = 0) =================
  // Cubre todo el acceso: franja de rampa (3.33 m) + franja peatonal, del muro norte de la rampa (z≈0.64) al lindero (z≈6.74).
  // v5: UN SOLO portón de 2 hojas (según render). Hoja izquierda = panel grande con travesaño + panel angosto.
  // Hoja derecha = panel angosto + PUERTA PEATONAL INTEGRADA (con manija y cerradura) que viaja con su hoja.
  // Jamba fija a la derecha: kiosko URBAN (Galaxy Tab Active5 en carcasa con visera, sobre submarco metálico).
  // Cortes medidos sobre la imagen del render (768 px): eje central u=0.4975, peatonal u=0.613–0.912, jamba u=0.918–1.
  // 3,33 m es el ancho exterior del acceso (el plano lo acota así). El vano libre queda entre los muros.
  GT.Z0 = 0.63; GT.Z1 = 3.96; GT.W = GT.Z1 - GT.Z0; GT.H = Math.max(2.6, GT.W / (856 / 630));
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
  const conc = new THREE.MeshStandardMaterial({ color: 0xc9c6bf, roughness: 0.9 }); const bandMat = conc.clone();
  const sH = W * 114 / 904;
  const signM = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.3, sH), new THREE.MeshStandardMaterial({ map: texSign, roughness: 0.6, emissive: 0x332a20, emissiveIntensity: 0.25 }));
  signM.rotation.y = -Math.PI / 2; L1.add(signM);
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const band = new THREE.Mesh(unit, bandMat), postA = new THREE.Mesh(unit, bandMat), postB = new THREE.Mesh(unit, bandMat);
  [band, postA, postB].forEach((m) => { m.castShadow = true; m.receiveShadow = true; L1.add(m); });
  // v8: estilo del video/renders → hojas grafito con riostras en X, franja oscura con letras blancas y plantas colgantes
  const gtex8 = gateTexture(U), stex8 = signTexture('ED. ALMENDRA');
  const ivyS = new THREE.Mesh(mergeGeometries([ivyGeo([-0.272, GT.Z0 + 0.05], [-0.272, GT.Z1 - 0.05], 0.13, 0.42), ivyGeo([-0.235, GT.Z0 + 0.3], [-0.235, GT.Z1 - 0.3], 0.15, 0.3)]), PM8.ivy); L1.add(ivyS);
  const pot = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bandMat.clone()); L1.add(pot); pot.castShadow = true;
  const gatePlant = new THREE.Mesh(tropicalGeo(-1.2, 0.42, GT.Z0 - 0.15, 0.85, 0.7, 0.4), PM8.trop); gatePlant.castShadow = true; L1.add(gatePlant); GT.gatePlant = gatePlant;
  GT.style = 'foto';
  GT.setStyle = (k) => { GT.style = k; const foto = k === 'foto', r = k === 'render';
    gmat.map = foto ? texPuerta : r ? gtex8 : texDoor; gmat.color.set(0xffffff);
    gmat.metalness = foto ? 0.42 : r ? 0.45 : 0.55; gmat.roughness = foto ? 0.48 : r ? 0.5 : 0.42; gmat.needsUpdate = true;
    fmat.color.set(foto ? 0x8c6239 : r ? 0x2a2b2e : 0x5a3f27); hmat.color.set(foto ? 0x5c4328 : r ? 0x1c1d1f : 0x3a2818);
    signM.material.map = foto ? texLetrero : r ? stex8 : texSign; signM.material.emissive.set(0x000000); signM.material.roughness = foto ? 0.82 : 0.6; signM.material.metalness = foto ? 0.05 : 0;
    signM.material.needsUpdate = true;
    bandMat.color.set(foto ? 0xd5d2cb : r ? 0x3b332d : 0xc9c6bf); ivyS.visible = r; pot.visible = foto || r;
    if (gatePlant) gatePlant.visible = foto;
    if (GT.kBronze) GT.kBronze.color.set(foto ? 0x8c6239 : r ? 0x2e3034 : 0x6b4a2c);
    if (GT.layout) GT.layout(GT.hs || 1); };
  GT.layout = (hs) => {
    g.scale.y = hs; const top = H * hs + 0.04;
    ivyS.position.y = top - 0.02;
    if (GT.style === 'foto') { pot.scale.set(0.85, 0.42, 0.7); pot.position.set(-1.25, 0.21, GT.Z0 - 0.2); pot.material.color.set(0xf4f1ea); }
    else { pot.scale.set(0.14, 0.16, W + 0.2); pot.position.set(-0.19, top + 0.06, (GT.Z0 + GT.Z1) / 2); pot.material.color.set(bandMat.color); }
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
    const bronze = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, metalness: 0.75, roughness: 0.3 }); GT.kBronze = bronze;
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
  GT.setStyle('foto');
  // El portón de bronce queda en el acceso oeste, a nivel de calle, abriendo hacia la rampa y el núcleo.
}

// ---------- Sótano nuevo: acceso oeste → pasillo oriente 13,6 % hacia el sur → pasillo sur ----------
const RAMP = { x1: 24.2, s1: 0.016, s2: 0.136, deck: floorY(12, 2), low: -2.96, lz0: 12.6 };
const rampY = (x) => floorY(Math.max(0, x), 2.1);
const onRamp = (x, z) => x >= -0.2 && x <= 27.4 && z >= 0.3 && z <= 21.2 && floorY(x, z) > -2.9;
const laneY = (z) => floorY(26, z);
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
const VMAT = vehicleMaterials(); VMAT.trim.side = THREE.DoubleSide; VMAT.rim.side = THREE.DoubleSide; VMAT.tyre.side = THREE.DoubleSide;
function carMesh(color, type = 'sedan', lit = false) { const G = mergeVehicles([{ parts: carParts(type, color), m: new THREE.Matrix4() }], VMAT); if (lit) G.children.forEach((m) => { if (m.material === VMAT.lightF) { m.material = VMAT.lightF.clone(); m.material.emissiveIntensity = 1.4; } }); return G; }
// Plazas del plano nuevo. aisle 'n'/'s' = el pasillo está en z bajo/alto. axis 'x' = plaza en paralelo (el largo va en x).
const SPOTS = NEW_SPOTS;
const MOTO_Z = NEW_MOTO_Z;
const MOTO_C = [0x141414, 0x9b1c1c, 0x1c3e88, 0xe6e6e6];
// ===== v6: RAMPA VEHICULAR = un solo sólido continuo de concreto (PL_A004: 21,79 m, 10,9 % promedio) =====
// Borde norte según el vector (band1) y cara del muro; borde sur z = 3.97 (muro de cuartos / antepecho).
const rampN = (x) => 0.7;
const RAMP_S = 3.9;
const APRON = 2.6;
const SV_CEIL = LEVY.p1 - 0.2;
const MOUTH_X0 = 8.0;
function driveY(x, z) { return floorY(x, z); }
function buildRamp(B) {
  const tc = document.createElement('canvas'); tc.width = tc.height = 256; const g = tc.getContext('2d');
  g.fillStyle = '#a19e96'; g.fillRect(0, 0, 256, 256);
  const id = g.getImageData(0, 0, 256, 256); for (let i = 0; i < id.data.length; i += 4) { const n = (Math.random() - 0.5) * 18; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; } g.putImageData(id, 0, 0);
  for (let x = 0; x < 256; x += 32) { g.fillStyle = 'rgba(78,76,72,.45)'; g.fillRect(x, 0, 4, 256); }
  const tex = new THREE.CanvasTexture(tc); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  const grid = (x0, x1, z0, z1, nx, nz) => {
    const P = [], UV = [], IDX = [];
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      const x = x0 + (x1 - x0) * i / nx, z = z0 + (z1 - z0) * j / nz;
      P.push(x, floorY(x, z) + 0.012, z); UV.push(x, z);
    }
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const a = i * (nz + 1) + j, b = a + nz + 1; IDX.push(a, a + 1, b, a + 1, b + 1, b);
    }
    const top = new THREE.BufferGeometry(); top.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); top.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); top.setIndex(IDX); top.computeVertexNormals();
    const tm = new THREE.Mesh(top, mat); tm.receiveShadow = true; B.add(tm); return tm;
  };
  // Acceso oeste (sin bordillo delante de la plaza 1) y pasillo oriente, sin muro que cierre las bocas.
  RAMPG.top = grid(0.2, 24.2, 0.85, 3.85, 28, 4);
  grid(22.4, 27.15, 0.5, 20.9, 6, 24);
  grid(16.6, 27.15, 17.25, 20.9, 12, 4);
}
const RAMPG = {};

const DEMO_SPOT = 3;
const SOT8 = { rail: [], planters: [] };
const floorAt = (x, z) => floorY(x, z);
function meshExtent(parts) {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const [k, gs] of Object.entries(parts)) {
    if (k === 'wheels') continue;
    for (const g of gs) {
      const a = g.attributes.position;
      for (let i = 0; i < a.count; i++) {
        const x = a.getX(i), z = a.getZ(i);
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z;
      }
    }
  }
  return { x0, x1, z0, z1, L: x1 - x0, W: z1 - z0 };
}
const CAR_EXT = Object.fromEntries(Object.keys(CAR_TYPES).map((t) => [t, meshExtent(carParts(t, 0xffffff))]));
const MOTO_EXT = meshExtent(motoParts(0xffffff));
// Holgura dentro de la línea de la plaza: 0,22 m del lado del pasillo (detrás del bordillo) y 0,08 m del muro.
const AISLE_IN = 0.22, BACK_IN = 0.18, SIDE_IN = 0.08;
const VEH = { cars: [], motos: [] };
I.sotx.cols_in = COLS;
I.sotx.walls_in = WALLS;
I.sotx.walls_out = [];
I.sotx.rooms = ROOMS;
{
  const foot = { o: [[0.12, 0.78], [9.91, 0.77], [12.61, 0.63], [20.81, 0.15], [27.45, 0.43], [27.27, 26.07], [17.02, 25.45], [16.46, 12.04], [16.79, 6.26], [8.12, 6.55], [8.05, 3.95], [0.12, 3.82]], h: [] };
  S.lower = [foot]; S.deck = [foot]; S.band1 = [foot]; S.lane2 = []; S.foot4 = [foot];
}
const COL_RECTS = I.sotx.cols_in.map((c) => {
  const xs = c.o.map((q) => q[0]), zs = c.o.map((q) => q[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
});
SPOTS.forEach((p) => {
  const ex = CAR_EXT[p.t];
  const along = p.axis === 'x' ? (p.r[1] - p.r[0]) : (p.r[3] - p.r[2]);
  const across = p.axis === 'x' ? (p.r[3] - p.r[2]) : (p.r[1] - p.r[0]);
  const sc = Math.min(1, (along - AISLE_IN - BACK_IN) / ex.L, (across - 2 * SIDE_IN) / ex.W);
  let cx = (p.r[0] + p.r[1]) / 2;
  let cz = (p.r[2] + p.r[3]) / 2;
  if (p.axis === 'x') {
    p.f = p.nose < 0 ? -1 : 1;
    p.yaw = p.nose < 0 ? Math.PI : 0;
    const noseX = p.nose < 0 ? p.r[0] + 0.28 : p.r[1] - 0.28;
    cx = p.nose < 0 ? noseX + ex.x1 * sc : noseX - ex.x1 * sc;
    const aisleZ = p.aisle === 'n' ? p.r[2] : p.r[3];
    const halfW = Math.max(Math.abs(ex.z0), Math.abs(ex.z1)) * sc;
    cz = p.aisle === 'n' ? aisleZ + 0.22 + halfW : aisleZ - 0.22 - halfW;
    p.noseZ = cz; p.tailZ = cz;
    p.xMin = Math.min(cx - ex.L * sc / 2, cx + ex.L * sc / 2);
    p.xMax = Math.max(cx - ex.L * sc / 2, cx + ex.L * sc / 2);
    p.zMin = cz - halfW; p.zMax = cz + halfW;
  } else {
    p.f = p.aisle === 's' ? 1 : -1;
    p.yaw = p.f < 0 ? Math.PI / 2 : -Math.PI / 2;
    cz = p.f < 0 ? p.r[2] + AISLE_IN + ex.x1 * sc : p.r[3] - AISLE_IN - ex.x1 * sc;
    const zOf = (lx) => (p.f < 0 ? cz - lx * sc : cz + lx * sc);
    p.noseZ = zOf(ex.x1); p.tailZ = zOf(ex.x0);
    p.zMin = Math.min(p.noseZ, p.tailZ); p.zMax = Math.max(p.noseZ, p.tailZ);
    const xSign = p.f < 0 ? 1 : -1;
    p.xMin = Math.min(cx + xSign * ex.z0 * sc, cx + xSign * ex.z1 * sc);
    p.xMax = Math.max(cx + xSign * ex.z0 * sc, cx + xSign * ex.z1 * sc);
  }
  p.sc = sc; p.ex = ex; p.cx = cx; p.cz = cz; p.y = floorY(cx, cz);
  // Si una columna de eje (está en el plano) muerde la carrocería, se corre el carro dentro de la celda.
  const half = (p.xMax - p.xMin) / 2;
  for (const c of COL_RECTS) {
    if (c.z1 < p.zMin + 0.05 || c.z0 > p.zMax - 0.05) continue;
    if (c.x1 < p.xMin + 0.02 || c.x0 > p.xMax - 0.02) continue;
    const lo = p.r[0] + half + 0.04, hi = p.r[1] - half - 0.04;
    const nx = c.x0 < cx ? Math.min(hi, c.x1 + half + 0.06) : Math.max(lo, c.x0 - half - 0.06);
    if (nx >= lo && nx <= hi && Math.abs(nx - cx) > 0.005) {
      const d = nx - cx; cx = nx; p.xMin += d; p.xMax += d;
    }
  }
  p.cx = cx;
  p.L = p.zMax - p.zMin; p.Wd = p.xMax - p.xMin;
  VEH.cars.push(p);
});
MOTO_Z.forEach(([z0, z1], i) => {
  const xA = MOTO_X[0], xB = MOTO_X[1], depth = xB - xA, width = z1 - z0;
  const sc = Math.min(1, (depth - 0.10) / MOTO_EXT.L, (width - 0.06) / MOTO_EXT.W);
  const x = (xA + xB) / 2, z = (z0 + z1) / 2;
  // giro de 180°: local (x,z) → mundo (−x, −z)
  const xs = [x - MOTO_EXT.x0 * sc, x - MOTO_EXT.x1 * sc], zs = [z - MOTO_EXT.z0 * sc, z - MOTO_EXT.z1 * sc];
  VEH.motos.push({ n: i + 1, x, z, y: RAMP.low, c: MOTO_C[i], sc, z0, z1, xMin: Math.min(...xs), xMax: Math.max(...xs), zMin: Math.min(...zs), zMax: Math.max(...zs) });
});
// pintura del piso y señalización con funciones simples
function decalGeo(pts, fy, dy = 0.014) { const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, fy(p.getX(i), p.getZ(i)) + dy); g.computeVertexNormals(); return g.index ? g.toNonIndexed() : g; }
const paintMat = new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.7, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
{
  const B = lv('sot').g, y0 = RAMP.low, yd = RAMP.deck, CEIL = LEVY.p1 - 0.2;
  const sotWall = new THREE.MeshStandardMaterial({ color: 0xf2f1ee, map: T8.concTie, roughness: 0.9 }); M.sotWall = sotWall; // v8: concreto a la vista con pasatubos (ref_04/ref_10)
  B.add(meshOf([extrude(S.lower, y0 - 0.25, 0.25)], M.park));
  if (I.sotx.walls_in.length) {
    const geos = I.sotx.walls_in.map((w) => {
      const o = w.o;
      const a = [(o[0][0] + o[3][0]) / 2, (o[0][1] + o[3][1]) / 2];
      const b = [(o[1][0] + o[2][0]) / 2, (o[1][1] + o[2][1]) / 2];
      return seg(a, b, y0, CEIL, 0.16, 0);
    });
    B.add(meshOf(geos, sotWall));
  }
  if (I.sotx.walls_out.length) B.add(meshOf([extrude(I.sotx.walls_out, y0, -0.2 - y0)], M.side));
  if (I.sotx.cols_in.length) {
    const cg = I.sotx.cols_in.map((c) => {
      const xs = c.o.map((p) => p[0]), zs = c.o.map((p) => p[1]);
      return boxG(Math.min(...xs), Math.max(...xs), y0, CEIL, Math.min(...zs), Math.max(...zs));
    });
    B.add(meshOf(cg, new THREE.MeshStandardMaterial({ color: 0xe6e5e1, map: T8.concTie, roughness: 0.9 })));
  }
  buildRamp(B);
  // Losa de piso continua y sin luz propia: el corte cenital no puede quedar negro.
  {
    const ring = S.lower[0].o;
    const inside = (x, z) => { let n = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / ((zj - zi) || 1e-9) + xi) n++; } return n % 2 === 1; };
    const pos = [], ix = [], xA = -0.2, xB = 27.8, zA = -1.0, zB = 26.4, s = 0.55;
    const nx = Math.ceil((xB - xA) / s), nz = Math.ceil((zB - zA) / s), id = new Map();
    const vid = (i, j) => { const k = i + ',' + j; if (id.has(k)) return id.get(k); const x = xA + i * s, z = zA + j * s; const v = pos.length / 3; id.set(k, v); pos.push(x, floorY(x, z) + 0.012, z); return v; };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      if (!inside(xA + (i + 0.5) * s, zA + (j + 0.5) * s)) continue;
      const a = vid(i, j), b = vid(i + 1, j), c = vid(i + 1, j + 1), d = vid(i, j + 1);
      ix.push(a, b, c, a, c, d);
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    fg.setIndex(ix); fg.computeVertexNormals();
    const floor = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0xc9c7c0, side: THREE.DoubleSide }));
    floor.name = 'sot-floor'; B.add(floor);
  }
  texAsph.repeat.set(0.15, 0.15);
  // Flechas del plano nuevo: acceso al oriente, pasillo 2.64 m al sur (13.6 %), pasillo 3.76 m al oriente.
  const AR = [
    [[[4.2, 2.05], [4.2, 2.28], [8.4, 2.28], [8.4, 2.05]], (x, z) => floorY(x, z)],
    [[[8.4, 1.85], [8.4, 2.48], [9.3, 2.16]], (x, z) => floorY(x, z)],
    [[[25.85, 6.2], [26.08, 6.2], [26.08, 12.4], [25.85, 12.4]], (x, z) => floorY(x, z)],
    [[[25.55, 12.4], [26.38, 12.4], [25.96, 13.5]], (x, z) => floorY(x, z)],
    [[[18.2, 18.95], [18.2, 19.18], [23.2, 19.18], [23.2, 18.95]], () => RAMP.low],
    [[[23.2, 18.75], [23.2, 19.38], [24.3, 19.06]], () => RAMP.low],
  ];
  B.add(meshOf(AR.map(([p, f]) => decalGeo(p, f, 0.02)), paintMat, false));
  const txt = (t, w, h) => new THREE.MeshStandardMaterial({ map: textTex([{ t, s: 92, w: 700, c: '#f3f3f0' }], { w: 640, h: 128, y0: 6 }), transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -3 });
  { const g = new THREE.PlaneGeometry(1.5, 0.3); g.rotateX(-Math.PI / 2); g.translate(6.2, floorY(6.2, 2.4) + 0.03, 2.55); B.add(new THREE.Mesh(g, txt('pend. %'))); }
  { const g = new THREE.PlaneGeometry(1.5, 0.3); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 2); g.translate(26.35, floorY(26.35, 11) + 0.03, 11.2); B.add(new THREE.Mesh(g, txt('pend. 13.6%'))); }
  // Líneas de plaza: solo los lados, no cruzan la boca.
  const YC = [];
  for (const p of SPOTS) {
    const [x0, x1, z0, z1] = p.r;
    if (p.axis === 'x') { YC.push([x0, z0, x0 + 0.06, z1], [x1 - 0.06, z0, x1, z1]); }
    else {
      const zb = p.aisle === 'n' ? z1 - 0.06 : z0;
      const zt = p.aisle === 'n' ? z1 : z0 + 0.06;
      YC.push([x0, zb, x1, zt], [x0, z0, x0 + 0.06, z1], [x1 - 0.06, z0, x1, z1]);
    }
  }
  B.add(meshOf(YC.map(([a, b, c, d]) => { const fy = floorY((a + c) / 2, (b + d) / 2); return boxG(Math.min(a, c), Math.max(a, c), fy + 0.01, fy + 0.03, Math.min(b, d), Math.max(b, d)); }), M.yellow));
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
  // v8: plafones LED redondos de sobreponer (ref_04/ref_10) en lugar de regletas
  const tubes = [], rims = []; for (const [x, z] of [[18.1, 6.1], [23.1, 6.1], [20.6, 5.0], [20.6, 10.0], [26.0, 8.0], [26.0, 11.0], [26.0, 14.0], [18.0, 15.0], [22.6, 15.0], [20.0, 19.2], [24.0, 19.2], [19.5, 23.2], [24.5, 23.2], [22.0, 23.2], [14.5, 2.3], [9.5, 2.3]]) {
    const d = new THREE.CylinderGeometry(0.15, 0.15, 0.012, 28); d.translate(x, CEIL - 0.036, z); tubes.push(d.toNonIndexed());
    const r = new THREE.CylinderGeometry(0.175, 0.17, 0.03, 28); r.translate(x, CEIL - 0.015, z); rims.push(r.toNonIndexed()); }
  const tm = meshOf(tubes, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6e8, emissiveIntensity: 1.25 }), false); B.add(tm);
  B.add(meshOf(rims, new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.5 }), false));
  // v8: topellantas amarillos (dos bloques por celda), detrás de la llanta que queda contra el final de la celda
  { const ws = []; for (const p of VEH.cars) {
      if (p.axis === 'x') continue;
      const za = p.f < 0 ? p.r[3] - 0.16 : p.r[2] + 0.04, zb = p.f < 0 ? p.r[3] - 0.04 : p.r[2] + 0.16;
      const fy = floorY(p.cx, (za + zb) / 2);
      const g = new THREE.BoxGeometry(Math.min(1.7, p.r[1] - p.r[0] - 0.35), 0.1, zb - za);
      const pp = g.attributes.position; for (let i = 0; i < pp.count; i++) if (pp.getY(i) > 0) pp.setZ(i, pp.getZ(i) * 0.55);
      g.translate(p.cx, fy + 0.05, (za + zb) / 2); g.computeVertexNormals(); ws.push(g.toNonIndexed()); }
    if (ws.length) B.add(meshOf(ws, M.yellow)); }
  // carros y motos: geometría fusionada por material (≈9 llamadas de dibujo para todos)
  const list = []; const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (const p of VEH.cars) { if (p.n === DEMO_SPOT) continue; q.setFromAxisAngle(up, p.yaw); list.push({ parts: carParts(p.t, p.c), m: new THREE.Matrix4().compose(new THREE.Vector3(p.cx, p.y, p.cz), q.clone(), new THREE.Vector3(p.sc, p.sc, p.sc)) }); }
  for (const m of VEH.motos) { q.setFromAxisAngle(up, Math.PI); list.push({ parts: motoParts(m.c), m: new THREE.Matrix4().compose(new THREE.Vector3(m.x, m.y, m.z), q.clone(), new THREE.Vector3(m.sc, m.sc, m.sc)) }); }
  const VG = mergeVehicles(list, VMAT); VG.name = 'vehiculos'; B.add(VG); VEH.group = VG;
}
// ---------- v4: cuartos de servicio bajo la rampa (PL_A004, vector) ----------
const SV = { rooms: ROOMS, doors: [], ceil: LEVY.p1 - 0.2, segs: [] };
{
  const B = lv('sot').g, CEIL = SV.ceil;
  for (const r of SV.rooms) {
    const xs = r.poly.o.map((q) => q[0]), zs = r.poly.o.map((q) => q[1]);
    r.cx = (Math.min(...xs) + Math.max(...xs)) / 2; r.cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    r.fy = floorY(r.cx, Math.max(...zs) + 0.3); r.clear = Math.max(2.05, CEIL - r.fy);
  }
  SV.at = (x, z) => SV.rooms.find((r) => pip([r.poly], x, z)) || null;
  const fl = [], tile = [];
  for (const r of SV.rooms) { fl.push(extrude([r.poly], r.fy - 0.08, 0.08)); }
  if (fl.length) B.add(meshOf(fl, M.conc));
  const metal = new THREE.MeshStandardMaterial({ color: 0x8d949c, metalness: 0.45, roughness: 0.45 });
  for (const r of SV.rooms) {
    const xs = r.poly.o.map((q) => q[0]), zs = r.poly.o.map((q) => q[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), z1 = Math.max(...zs);
    const w = Math.min(0.9, (x1 - x0) * 0.55), dh = Math.min(2.05, r.clear - 0.1);
    const hx = r.cx - w / 2;
    const piv = new THREE.Group(); piv.position.set(hx, r.fy, z1); B.add(piv);
    const lg = new THREE.BoxGeometry(w, dh, 0.04); lg.translate(w / 2, dh / 2, 0); piv.add(new THREE.Mesh(lg, metal));
    const D = { svc: true, room: r.id, label: r.name, piv, hx, hz: z1, u: [1, 0], n: [0, 1], w, a: 0, tgt: 0, max: 1.4, cx: r.cx, cz: z1, fy: r.fy };
    D.set = (a) => { D.a = a; piv.rotation.y = -a; };
    D.seg = () => { const c = Math.cos(D.a), s = Math.sin(D.a); return [D.hx, D.hz, D.hx + c * D.w, D.hz + s * D.w]; };
    D.set(0); SV.doors.push(D);
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(0.7, w), 0.16), new THREE.MeshBasicMaterial({ map: textTex([{ t: r.plan, s: 36, w: 700, c: '#fff' }], { w: 512, h: 96, y0: 8, bg: r.id === 'elec' ? '#7a1f1f' : '#1f4e79', r: 8 }) }));
    pm.position.set(r.cx, r.fy + Math.min(1.5, dh - 0.2), z1 + 0.03); B.add(pm);
    SV.segs.push([x0, z1, hx - 0.02, z1], [hx + w + 0.02, z1, x1, z1]);
  }
  const E = SV.rooms.find((r) => r.id === 'elec');
  SV.rack = { x: E.cx, z: E.cz - 0.15, y: E.fy + 1.2 };
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1e22, metalness: 0.6, roughness: 0.4 });
  B.add(meshOf([boxG(E.cx - 0.28, E.cx + 0.28, E.fy + 1.15, E.fy + 1.7, E.cz - 0.35, E.cz - 0.05)], dark));
  B.add(meshOf([boxG(E.cx - 0.55, E.cx + 0.55, CEIL - 0.08, CEIL - 0.02, E.cz - 0.15, E.cz + 0.15)], new THREE.MeshStandardMaterial({ color: 0xfff6e8, emissive: 0xfff3dc, emissiveIntensity: 0.8 }), false));
}
// cielos rasos solo para el recorrido (no proyectan sombra, para que el interior quede iluminado)
const ceilMat = new THREE.MeshStandardMaterial({ color: 0xe9e7e2, roughness: 0.95, side: THREE.DoubleSide });
const FPC = { sot: new THREE.Mesh(extrude(withHoles(I.sotx.ceil_in), LEVY.p1 - 0.24, 0.04), ceilMat), floor: new THREE.Mesh(extrude(S.foot2, 2.49, 0.02), ceilMat) };
FPC.sot.visible = FPC.floor.visible = false; FPC.sot.receiveShadow = FPC.floor.receiveShadow = false; lv('sot').g.add(FPC.sot); scene.add(FPC.floor);
// carro animado (entra por el portón y baja la rampa)
// ===== v6: carro de simulación con ruedas que giran; siempre termina en una celda (nunca en el pasillo) =====
// Es el carro de la celda 3 (hatch vino, como en el inventario de plazas). Estado inicial: estacionado en su celda.
const CAR = { spot: null, state: 'parked', ph: null, s: 0, v: 0, gateClosed: false, wheels: [], m: new THREE.Group(), lit: [] };
{
  const sp = VEH.cars.find((p) => p.n === DEMO_SPOT); CAR.spot = sp;
  const parts = carParts(sp.t, sp.c, { wheels: true });
  const body = mergeVehicles([{ parts, m: new THREE.Matrix4() }], VMAT); CAR.m.add(body);
  body.children.forEach((m) => { if (m.material === VMAT.lightF || m.material === VMAT.lightR) { m.material = m.material.clone(); CAR.lit.push(m); } });
  for (const w of parts.wheels) { const steer = new THREE.Group(); steer.position.set(w.x, w.y, w.z); const spin = mergeVehicles([{ parts: w.parts, m: new THREE.Matrix4() }], VMAT); steer.add(spin); CAR.m.add(steer); CAR.wheels.push({ steer, spin, front: w.front }); }
  CAR.r = CAR_TYPES[sp.t].r; CAR.wb = CAR_TYPES[sp.t].wb; CAR.m.rotation.order = 'YZX';
  lv('sot').g.add(CAR.m);
}
const V2 = (x, z) => new THREE.Vector3(x, 0, z);
const bez = (a, b, c, d) => new THREE.CubicBezierCurve3(V2(...a), V2(...b), V2(...c), V2(...d));
function carPaths() {
  const p = CAR.spot, cx = p.cx, cz = p.cz; const IN = new THREE.CurvePath(); IN.add(new THREE.LineCurve3(V2(-13, 2.3), V2(19, 2.3))); IN.add(bez([19, 2.3], [22.0, 2.3], [23.8, 1.9], [25.2, 1.9])); // frente del carro queda a ≈27,2 (muro ≈27,3)
  const REV = new THREE.CurvePath(); REV.add(bez([25.2, 1.9], [23.5, 1.9], [cx, cz - 2.6], [cx, cz]));
  const OUT = new THREE.CurvePath(); OUT.add(bez([cx, cz], [cx, cz - 2.0], [21.5, 2.36], [19.5, 2.36])); OUT.add(new THREE.LineCurve3(V2(19.5, 2.36), V2(-13, 2.3)));
  return { in: [{ c: IN, dir: 1, vmax: 3.2, gate: 'in' }, { c: REV, dir: -1, vmax: 1.1 }], out: [{ c: OUT, dir: 1, vmax: 3.0, gate: 'out' }] };
}
function carY(x, z) { if (x < 0) return 0; return driveY(x, z); }
const _cp = new THREE.Vector3(), _ct = new THREE.Vector3();
function carPose(c, u, dir) {
  c.getPointAt(u, _cp); c.getTangentAt(u, _ct); const fx = _ct.x * dir, fz = _ct.z * dir; const h = Math.atan2(-fz, fx);
  const x = _cp.x, z = _cp.z, hw = CAR.wb / 2; const yF = carY(x + fx * hw, z + fz * hw), yR = carY(x - fx * hw, z - fz * hw);
  CAR.m.position.set(x, (yF + yR) / 2 + 0.005, z); CAR.m.rotation.set(0, h, Math.atan2(yF - yR, CAR.wb));
  return { x, z, h };
}
function carPark() { const p = CAR.spot; CAR.m.position.set(p.cx, p.y + 0.005, p.cz); CAR.m.rotation.set(0, p.yaw, 0); CAR.m.scale.setScalar(p.sc); CAR.m.visible = true; CAR.state = 'parked'; CAR.ph = null; CAR.wheels.forEach((w) => { w.steer.rotation.y = 0; }); carLights(false); carBtn(); }
function carLights(on) { CAR.lit.forEach((m) => { m.material.emissiveIntensity = on ? (m.material.color.r > 0.5 ? 1.4 : 1.1) : 0.15; }); }
function carStart(kind) {
  if (CAR.ph) return false;
  if (kind === 'in' && CAR.state !== 'out') return false; // la celda está ocupada por este carro: primero hay que sacarlo
  if (kind === 'out' && CAR.state !== 'parked') return false;
  CAR.ph = carPaths()[kind]; CAR.k = 0; CAR.s = 0; CAR.v = 0; CAR.kind = kind; CAR.gateClosed = false; CAR.state = kind === 'in' ? 'entering' : 'leaving'; CAR.m.visible = true; carLights(true);
  if (kind === 'out' || kind === 'in') openVeh(true); carBtn(); return true;
}
function carUpdate(dt) {
  if (!CAR.ph) return; MOV.t = performance.now();
  const P = CAR.ph[CAR.k], c = P.c, Lc = c.getLength();
  // punto de parada ante el portón si aún no está abierto
  let lim = Lc - CAR.s; const gateOpen = GT.v1.cur > 0.97 && GT.v2.cur > 0.97;
  if (P.gate === 'in' && !gateOpen) lim = Math.min(lim, Math.max(0, 8.6 - CAR.s)); // centro en x≈-4.4
  if (P.gate === 'out' && !gateOpen) { const sx = (Lc - (5.6 + 13)) ; lim = Math.min(lim, Math.max(0, sx - CAR.s)); } // centro en x≈5.6
  const vt = Math.min(P.vmax, Math.sqrt(2 * 1.6 * Math.max(0, lim)));
  CAR.v += Math.sign(vt - CAR.v) * Math.min(Math.abs(vt - CAR.v), (vt > CAR.v ? 1.8 : 3.5) * dt);
  CAR.s = Math.min(Lc, CAR.s + CAR.v * dt);
  const u = CAR.s / Lc, pose = carPose(c, u, P.dir);
  // ruedas: giro proporcional a la distancia; dirección delantera por curvatura
  const ang = CAR.v * dt / CAR.r * P.dir; let steer = 0; if (u < 0.999) { c.getTangentAt(Math.min(1, u + 0.02), _ct); const h2 = Math.atan2(-_ct.z * P.dir, _ct.x * P.dir); let dh = h2 - pose.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); steer = THREE.MathUtils.clamp(dh * 6 * P.dir, -0.55, 0.55); }
  CAR.wheels.forEach((w) => { w.spin.rotation.z -= ang; if (w.front) w.steer.rotation.y += (steer - w.steer.rotation.y) * Math.min(1, dt * 6); });
  if (!CAR.gateClosed && ((P.gate === 'in' && pose.x > 6.2) || (P.gate === 'out' && pose.x < -4.6))) { CAR.gateClosed = true; setTimeout(() => openVeh(false), 500); }
  if (CAR.s >= Lc - 1e-4 && CAR.v < 0.05) { CAR.k++; CAR.s = 0; CAR.v = 0;
    if (CAR.k >= CAR.ph.length) { if (CAR.kind === 'in') carPark(); else { CAR.ph = null; CAR.state = 'out'; CAR.m.visible = false; carLights(false); carBtn(); } } }
}
function carBtn() { const b = $('#bCar'); if (!b) return; b.textContent = CAR.ph ? (CAR.kind === 'in' ? 'Entrando a la celda ' + DEMO_SPOT + '…' : 'Saliendo de la celda ' + DEMO_SPOT + '…') : CAR.state === 'parked' ? 'Sacar carro de la celda ' + DEMO_SPOT : 'Entrar carro → celda ' + DEMO_SPOT + ' (libre)'; b.disabled = !!CAR.ph; }
function carSegs() { if (CAR.state !== 'parked') return []; const p = CAR.spot; return segsOf([{ o: [[p.xMin, p.zMin], [p.xMax, p.zMin], [p.xMax, p.zMax], [p.xMin, p.zMax]] }]); }
carPark();


// ---------- Cubierta ----------
{
  const R = lv('cub').g, y = 17.6;
  R.add(meshOf([extrude(S.foot2, y - 0.2, 0.2)], M.slab));
  // v8: antepecho grueso en revoque café (remate superior de los renders), cerrando también el frente del balcón empotrado
  const par = [], parIn = [];
  const PT = LEVY.p6 + 2.5, PY = y + 0.75; // desde el cielo del piso 6 hasta el remate (antepecho 0,60 m + losa)
  const parC = [];
  for (const sg of FMOD.segs) { if (sg.cls === 'recess') continue; (sg.cls === 'blue' ? parC : par).push(segBox(sg.a, sg.u, sg.n, 0, sg.L, PT, PY, 0.0, 0.14)); parIn.push(segBox(sg.a, sg.u, sg.n, 0, sg.L, y, PY, -0.12, 0.0)); }
  for (const c of FMOD.corners) { const d = 0.14, x0 = Math.min(c.p[0], c.p[0] + (c.n1[0] + c.n2[0]) * d), x1 = Math.max(c.p[0], c.p[0] + (c.n1[0] + c.n2[0]) * d), z0 = Math.min(c.p[1], c.p[1] + (c.n1[1] + c.n2[1]) * d), z1 = Math.max(c.p[1], c.p[1] + (c.n1[1] + c.n2[1]) * d); if (x1 - x0 > 0.01 && z1 - z0 > 0.01) par.push(worldUV(boxG(x0, x1, PT, PY, z0, z1))); }
  par.push(segBox([6.864, 4.069], [0, -1], [-1, 0], 0, 3.45, PT, PY, 0.0, 0.14)); // frente del balcón
  R.add(meshOf(par, F8.render)); R.add(meshOf(parC, F8.char)); R.add(meshOf(parIn, F8.render));
  const flash = [];
  for (const sg of FMOD.segs) { if (sg.cls === 'recess') continue; flash.push(segBox(sg.a, sg.u, sg.n, 0, sg.L, PY - 0.015, PY + 0.035, 0.06, 0.2)); }
  if (flash.length) R.add(meshOf(flash, new THREE.MeshStandardMaterial({ color: 0x2a2c2e, metalness: 0.65, roughness: 0.35 })));
  { const pv = document.createElement('canvas'); pv.width = pv.height = 256; const g = pv.getContext('2d'); g.fillStyle = '#c0c0c0'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#8e8e8e'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); }
    const pt = new THREE.CanvasTexture(pv); pt.wrapS = pt.wrapT = THREE.RepeatWrapping; pt.colorSpace = THREE.SRGBColorSpace; pt.repeat.set(0.35, 0.35);
    const top = new THREE.Mesh(extrude(S.foot2, y + 0.005, 0.015), new THREE.MeshStandardMaterial({ map: pt, color: 0xc0c0c0, roughness: 0.9 })); top.receiveShadow = true; R.add(top); }
  R.add(meshOf([worldUV(boxG(6.864, 7.835, PT, y, 0.718, 3.969))], F8.recess)); // losa/cielo sobre el balcón del piso 7
  // volumen punto fijo sobre cubierta (aproximado, ≈N+24.4) en revoque café como en el video
  R.add(meshOf([worldUV(boxG(16.75, 23.8, y, 21.5, 9.4, 12.6))], F8.render));
  // v8: lucernario de vidrio oscuro sobre la ranura del punto fijo (ref_05) — ilustrativo, no está en planos
  { const x0 = 22.46, x1 = 25.3, z0 = 8.69, z1 = 12.64, yb = PY + 0.02; const fr = [];
    fr.push(boxG(x0, x1, yb, yb + 0.08, z0, z0 + 0.06), boxG(x0, x1, yb, yb + 0.08, z1 - 0.06, z1), boxG(x0, x0 + 0.06, yb, yb + 0.08, z0 + 0.06, z1 - 0.06), boxG(x1 - 0.06, x1, yb, yb + 0.08, z0 + 0.06, z1 - 0.06));
    for (const z of [z0 + (z1 - z0) / 3, z0 + 2 * (z1 - z0) / 3]) fr.push(boxG(x0 + 0.06, x1 - 0.06, yb, yb + 0.07, z - 0.025, z + 0.025));
    R.add(meshOf(fr, M.alu));
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 0.1, z1 - z0 - 0.1), new THREE.MeshStandardMaterial({ color: 0x1d2328, metalness: 0.6, roughness: 0.05, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
    gl.rotation.x = -Math.PI / 2; gl.position.set((x0 + x1) / 2, yb + 0.045, (z0 + z1) / 2); R.add(gl); gl.material.userData.op = 0.55; gl.material.userData.tr = true; FACADE.push(gl.material); }
  const rf = new THREE.BoxGeometry(7.45, 0.08, 3.6); rf.rotateZ(0.05); rf.translate(20.27, 21.6, 11.0);
  R.add(meshOf([rf], M.roof));
}

// ---------- entorno ----------
let GRIDH = null;
{
  const big = new THREE.Shape([new THREE.Vector2(-60, 60), new THREE.Vector2(90, 60), new THREE.Vector2(90, -90), new THREE.Vector2(-60, -90)]);
  const f4 = S.foot4[0]; big.holes.push(new THREE.Path([...f4.o].reverse().map(([x, z]) => new THREE.Vector2(x, -z))));
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
  { id: 'c1', lv: 'p1', p: [-0.35, 2.6, 2.1], aim: [-4, 1.2, 2.1], c: C_CAM, t: 'C1 · Cámara exterior ingreso', s: 'Propuesta', loc: 'Jamba del acceso oeste, mirando la calle.', bom: [25],
    why: 'Registra quién se acerca desde la calle y usa el kiosko (rostro y evento).' },
  { id: 'c2', lv: 'p1', p: [4.2, 2.5, 2.3], aim: [0.2, 1.4, 2.1], c: C_CAM, t: 'C2 · Cámara interior del acceso', s: 'Propuesta', loc: 'Sobre el acceso, mirando el portón.', bom: [26],
    why: 'Confirma quién entró realmente después de cada apertura.' },
  { id: 'c3', lv: 'p1', p: [8.4, 2.4, 1.15], aim: [16, -0.4, 2.2], c: C_CAM, t: 'C3 · Cámara rampa', s: 'Propuesta', loc: 'Muro norte de la rampa, mirando el acceso hacia el oriente.', bom: [27],
    why: 'Registra vehículos que entran y salen por la rampa al sótano.' },
  { id: 'rack', lv: 'sot', p: [SV.rack.x, SV.rack.y + 0.55, SV.rack.z], c: C_URB, t: 'C. Eléctrico / Telecom', s: 'Hecho', s2: 'Propuesta (equipos)', loc: 'Sótano, C. ELECTRICO/TELEC del plano nuevo, en el borde norte del acceso. Rack de pared 7 UR; tableros ilustrativos.', bom: [22, 20, 21, 23, 24, 28, 29, 18],
    why: 'Concentra router VPN, switch PoE, NVR y UPS en un espacio cerrado del sótano. El cuarto existe en el plano; los equipos son propuesta.' },
  { id: 'door', lv: 'p1', p: [-0.25, 3.2, 2.5], c: 0xc9a77c, t: 'Portón ED. ALMENDRA · 2 hojas (peatonal integrada)', s: 'Aproximado', s2: 'Fase 2: motor del portón', loc: 'Un solo portón en borde de calle bajo el dintel ED.ALMENDRA. Ancho ≈6,1 m (muro norte de la rampa → lindero); alto por proporción del render. Abre en 2 hojas por el eje central (izq. ≈3,0 m, der. ≈2,6 m); la puerta peatonal va dentro de la hoja derecha; jamba fija a la derecha con el kiosko. Medidas por tomar en sitio.', bom: [43, 44],
    why: 'Es la MISMA puerta: para carros abren solo las 2 hojas (la peatonal permanece cerrada y se mueve con su hoja); para personas abre solo la puerta peatonal integrada, con URBAN (facial, app o PIN). Motor y control del vehicular: fase 2.' },
];
const MAJOR = new Set(['kiosk', 'rack', 'c1', 'door']);
// EMT 3/4" a la vista, por el muro norte del acceso. Lo arma rebuildCable.
const CABLE = [];
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
let cableMesh = null; const cableLabel = document.createElement('div'); cableLabel.className = 'tag cab'; cableLabel.innerHTML = '<i></i><span>Ruta de tubería propuesta (a la vista, por aire)</span>';
cableLabel.onclick = () => openPanel(CAB_MK); labels.appendChild(cableLabel);
const CAB_MK = { t: 'Ruta de tubería propuesta (a la vista, por aire)', s: 'Propuesta', c: C_CAB, loc: '', bom: [30, 31, 32, 33, 34, 35, 36, 37],
  why: 'EMT de 3/4" (Ø 23,4 mm) a la vista, alto sobre el muro norte de la rampa, para poder cambiar el cableado sin picar. Barridos de radio 200 mm. Las cámaras, el kiosko, la cerradura, el sensor, el botón y el ESP32 entran a este tubo y siguen hasta C. Eléctrico/Telecom.' };
function cablePts() { return emtCenterline().map((p) => new THREE.Vector3(p.x, p.y, p.z)); }
function rebuildCable() {
  const pts = cablePts(); const path = new THREE.CurvePath(); let trunk = 0;
  for (let i = 0; i < pts.length - 1; i++) { if (pts[i].distanceTo(pts[i + 1]) < 1e-4) continue; path.add(new THREE.LineCurve3(pts[i], pts[i + 1])); trunk += pts[i].distanceTo(pts[i + 1]); }
  let L = trunk;
  const r = EMT_OD / 2;
  if (cableMesh) { cableMesh.geometry.dispose(); urban.remove(cableMesh); }
  cableMesh = new THREE.Mesh(new THREE.TubeGeometry(path, 240, r, 8, false), cableMat); cableMesh.renderOrder = 18; urban.add(cableMesh);
  if (window.__cond) { urban.remove(window.__cond); window.__cond.geometry.dispose(); }
  const steel = new THREE.MeshStandardMaterial({ color: 0xc5c8cc, metalness: 0.75, roughness: 0.35 });
  const boxM = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, metalness: 0.4, roughness: 0.45 });
  const cg = [];
  // grapas al muro norte cada 1,2 m en el tramo recto
  for (let x = 1.2; x < 10.6; x += 1.2) {
    const y = floorY(x, 0.62) + CLEAR_H;
    const arm = new THREE.CylinderGeometry(0.006, 0.006, 0.16, 6); arm.rotateX(Math.PI / 2); arm.translate(x, y, 0.70); cg.push(arm.index ? arm.toNonIndexed() : arm);
  }
  for (const b of PULL_BOXES) {
    const y = floorY(b.x, b.z) + CLEAR_H;
    cg.push(boxG(b.x - 0.06, b.x + 0.06, y - 0.05, y + 0.05, b.z - 0.05, b.z + 0.04));
  }
  // derivaciones de los equipos: suben en vertical y un barrido de 90° las acuesta sobre el tronco
  const feeds = ['kiosk', 'esp', 'lock', 'rex', 'sens', 'c1', 'c2', 'c3'];
  for (const id of feeds) {
    const m = MK.find((q) => q.id === id); if (!m) continue;
    const x = m.p[0], y = m.p[1], z = m.p[2];
    const yT = floorY(Math.max(0.3, Math.min(10, x)), 0.62) + CLEAR_H;
    const xT = Math.max(0.4, Math.min(10.5, x));
    const whip = [new THREE.Vector3(x, y, z), new THREE.Vector3(x, yT, z)];
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      const a = (Math.PI / 2) * (i / steps);
      whip.push(new THREE.Vector3(x + (xT - x) * (1 - Math.cos(a)), yT, z + (0.62 - z) * Math.sin(a)));
    }
    whip.push(new THREE.Vector3(xT, yT, 0.62));
    const wp = new THREE.CurvePath();
    for (let i = 0; i < whip.length - 1; i++) { if (whip[i].distanceTo(whip[i + 1]) < 1e-3) continue; wp.add(new THREE.LineCurve3(whip[i], whip[i + 1])); L += whip[i].distanceTo(whip[i + 1]); }
    urban.add(new THREE.Mesh(new THREE.TubeGeometry(wp, 48, r * 0.85, 6, false), steel));
  }
  window.__cond = new THREE.Mesh(mergeGeometries(cg), boxM); urban.add(window.__cond);
  cableMat.uniforms.len.value = L;
  CAB_MK.mid = path.getPointAt(0.5); CAB_MK.len = L;
  CAB_MK.loc = `EMT 3/4" (Ø ${Math.round(EMT_OD * 1000)} mm), a la vista sobre el muro norte. Eje a ${CLEAR_H.toFixed(2)} m de la rasante; bajo del tubo a ${(CLEAR_H - r).toFixed(2)} m (paso de vehículo). Tronco ${trunk.toFixed(1)} m. Con las derivaciones de los equipos, ${L.toFixed(1)} m. Tronco: 2 barridos de 90° (radio 200 mm) = 180°. Cajas de paso CJ1 (jamba del acceso), CJ2 (x ≈ 6 m, tramo recto) y CJ3 (entrada a C. Eléctrico/Telecom). Entre cajas no se pasan 90°. Cada equipo entra con un solo barrido de 90°.`;
  cableLabel.innerHTML = `<i></i><span>Ruta de tubería propuesta (a la vista, por aire) · EMT 3/4" · tronco ${trunk.toFixed(1)} m</span>`;
}
rebuildCable();

// ---------- UI state ----------
const st = { urban: true, xray: false, explode: 0, cut: null, flow: null };
function applyVis() {
  shadowDirty();
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
function applyExplode() { shadowDirty(); LV.forEach((l) => { l.g.position.y = st.explode * l.k * 2.6; }); rebuildCable(); if (window.__intVis) window.__intVis(); W.cab.visible = !st.explode; }

// floors list
const fl = $('#floors');
[...LV].reverse().forEach((l) => {
  const b = document.createElement('label'); b.className = 'chk';
  b.innerHTML = `<input type="checkbox" checked><span>${l.name}</span>`;
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
  { t: 'Portón ED. ALMENDRA · carros y peatones', p: [-0.2, 1.8, 2.3], l: 'p1', cls: 'note sm' },
  ...SV.rooms.map((r) => ({ t: r.plan + ' · ' + r.area.toFixed(2) + ' m²', p: [r.cx, r.fy + 1.2, r.cz], l: 'sot', cls: 'note', only: 'sot' })),
  { t: 'Sótano N-2.96 · 10 carros + 4 motos', p: [22, -1.2, 26.4], l: 'sot', cls: 'note sm', only: 'sot' },
  { t: 'Rampa 13.6 % → N-2.96', p: [26, -1.6, 10.4], l: 'sot', cls: 'note sm', only: 'sot' },
  { t: 'Volumen punto fijo ≈ (aprox.)', p: [17.6, 21.9, 11], l: 'cub', cls: 'note sm' },
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
  GT.v1.tgt = GT.v2.tgt = o ? 1 : 0; $('#bVeh') && $('#bVeh').classList.toggle('on', !!o);
}
function gateUpdate(dt) {
  const P = GT.ped;
  const vehWant = GT.v1.tgt || GT.v2.tgt;
  if (GT.v1.cur !== GT.v1.tgt || GT.v2.cur !== GT.v2.tgt || P.cur !== P.tgt) MOV.t = performance.now();
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
    case 'idle': break; // no abre al acercarse: solo con E / toque (pedCycle)
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
    return '';
  }
  if (FP.x > 0 && FP.x < 5.5 && (s === 'open' || s === 'closing' || s === 'done')) return '<span class="kp ok">Bienvenido a Ed. Almendra · la puerta se cierra sola detrás de ti</span>';
  return '';
}
function setGateH(k) {
  GT.layout(k === 'std' ? 2.6 / GT.H : 1);
  const lk = MK.find((m) => m.id === 'lock'); lk.g.position.y = Math.max(1.0, PED_LOCK_Y());
  const sn = MK.find((m) => m.id === 'sens'); sn.g.position.y = Math.min(2.3, GT.H * GT.hs - 0.15);
}
// ================= RECORRIDO EN PRIMERA PERSONA (v3: tipo videojuego) =================
const FP = { on: false, x: -5.4, z: 4.4, y: 0, yaw: -Math.PI / 2, pitch: 0, mode: 'ground', floor: null, lvl: 'p1', keys: {}, joy: { x: 0, y: 0 }, prevCut: null, bob: 0, auto: null, focus: null, inCab: false, room: null, spd: 0 };
const EYE = 1.62, RAD = 0.22, STEPH = 0.45;
const TIPS = ['p2', 'p3', 'p4', 'p5', 'p6'];
const { EV, CI, ED, SH, ST: STR, PAIRS, stairY, LEV } = W;
// v6: fusión de mallas estáticas del interior (hijos directos de cada int_*) por material → menos draw calls
function batchStatic(g) {
  const by = new Map();
  for (const c of g.children) { if (!c.isMesh || c.children.length || Array.isArray(c.material) || !c.visible || c.morphTargetInfluences || c.userData.dyn) continue; const geo = c.geometry; if (!geo || !geo.attributes.position) continue;
    const k = c.material.uuid + '|' + c.castShadow + c.receiveShadow + '|' + Object.keys(geo.attributes).sort().join(','); if (!by.has(k)) by.set(k, []); by.get(k).push(c); }
  let saved = 0;
  for (const list of by.values()) { if (list.length < 2) continue;
    const gs = list.map((c) => { c.updateMatrix(); let q = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone(); q.applyMatrix4(c.matrix); q.morphAttributes = {}; return q; });
    let mg = null; try { mg = mergeGeometries(gs, false); } catch (_) { mg = null; } if (!mg) continue;
    const m = new THREE.Mesh(mg, list[0].material); m.castShadow = list[0].castShadow; m.receiveShadow = list[0].receiveShadow; m.renderOrder = list[0].renderOrder;
    list.forEach((c) => g.remove(c)); g.add(m); saved += list.length - 1; }
  return saved;
}
let BATCHED = 0; for (const id of FLOORS) if (LEV[id]) BATCHED += batchStatic(LEV[id].int);
function segsOf(polys) { const out = []; for (const p of polys) for (const ring of [p.o, ...(p.h || [])]) for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; out.push([a[0], a[1], b[0], b[1]]); } return out; }
function pip(polys, x, z) { for (const p of polys) { let c = false; const r = p.o; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } if (c) return true; } return false; }
function dSeg(px, pz, s) { const [ax, az, bx, bz] = s; const dx = bx - ax, dz = bz - az; const L = dx * dx + dz * dz || 1e-9; let t = ((px - ax) * dx + (pz - az) * dz) / L; t = Math.max(0, Math.min(1, t)); const qx = ax + t * dx - px, qz = az + t * dz - pz; return Math.sqrt(qx * qx + qz * qz); }
// rejilla espacial de segmentos (1 m)
function grid(segs) { const G = new Map(); for (const s of segs) { const x0 = Math.floor(Math.min(s[0], s[2]) - 0.4), x1 = Math.floor(Math.max(s[0], s[2]) + 0.4), z0 = Math.floor(Math.min(s[1], s[3]) - 0.4), z1 = Math.floor(Math.max(s[1], s[3]) + 0.4);
  for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const k = i * 1000 + j; if (!G.has(k)) G.set(k, []); G.get(k).push(s); } } return G; }
const SEGS_SOT = [...segsOf([...I.sotx.walls_in, ...I.sotx.walls_out]), ...segsOf(I.sotx.cols_in), ...SV.segs,
  ...SOT8.planters.flatMap(([a, z0, b, z1]) => segsOf([{ o: [[a, z0], [b, z0], [b, z1], [a, z1]] }])),
  ...VEH.cars.filter((p) => p.n !== DEMO_SPOT).flatMap((p) => segsOf([{ o: [[p.xMin, p.zMin], [p.xMax, p.zMin], [p.xMax, p.zMax], [p.xMin, p.zMax]] }])),
  ...VEH.motos.flatMap((m) => segsOf([{ o: [[m.xMin, m.zMin], [m.xMax, m.zMin], [m.xMax, m.zMax], [m.xMin, m.zMax]] }])), [STR.x0, STR.zm, STR.x0, STR.z1]];
const SEGS_GROUND = [[1.2, 3.97, 7.884, 3.97], [0, 0.49, 0, 0.64], [0, 6.74, 0, 6.89], [-0.12, 0.49, 0.12, 0.49], [-0.12, 6.89, 0.12, 6.89], [0.1, 6.74, 7.884, 6.74], [7.884, 6.4, 7.884, 6.74], [7.884, 3.9, 7.884, 4.1]];
const GRID = {
  sot: grid([...SEGS_SOT, ...W.seg.stair, ...W.seg.elev]),
  p1: grid([...W.seg.tip, ...W.seg.stair, ...W.seg.elev]),
  tip: grid([...W.seg.tip, ...W.seg.stair, ...W.seg.elev]),
};
const P7BAR = [STR.x0, STR.z0, STR.x0, STR.zm];
function setKey(x, z, y) { if (y < 0.5 && x >= 0 && (onRamp(x, z) || (y < 0 && SV.at(x, z)))) return 'sot'; return lvlOf(y); }
function lvlOf(y) { if (y < -1.2) return 'sot'; if (y < LEVY.p2 - 1.0) return 'p1'; let id = 'p2'; for (const k of TIPS) if (LEVY[k] <= y + 1.0) id = k; return id; }
function dynSegs(lvl) {
  const out = [];
  const E = LEV[lvl];
  if (E) { for (const d of E.doors) out.push(d.seg()); if (E.bal) out.push(E.bal.seg()); if (E.ent) { const s = E.ent.seg(); if (s) out.push(s); } }
  if (lvl === 'p6') out.push(P7BAR);
  if (lvl === 'sot') { for (const d of SV.doors) out.push(d.seg()); out.push(...carSegs()); }
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
  if (onRamp(x, z) || (x >= MOUTH_X0 && x <= RAMP.x1 + 0.05 && z >= RAMP_S - APRON && z <= RAMP_S + 0.2)) out.push(driveY(x, z));
  else {
    if (x < 0.4) out.push(0);
    const sr = SV.at(x, z); if (sr) out.push(sr.fy);
    if (pip(S.foot4, x, z) && x > 7.6) out.push(RAMP.low);
  }
  if (pipH(W.walk.p1, x, z)) out.push(LEVY.p1);
  if (pipH(W.walk.tip, x, z)) for (const id of TIPS) out.push(LEVY[id]);
  return out;
}
function pickH(x, z, y) { let best = null; for (const h of cands(x, z)) if (h <= y + STEPH && (best === null || h > best)) best = h; if (best !== null && y - best > 0.6) return null; return best; }
// ---------- interacción ----------
function roomAt(x, z, lvl) { if (!/^p[1-6]$/.test(lvl)) return null; for (const r of W.rooms) if (r.type !== 'hall' && pipH([r], x, z)) return r; if (pipH(I.hallFloor, x, z)) return W.rooms.find((r) => r.type === 'hall'); return null; }
const NAMEAPT = { '01': 'Tipo 1', '02': 'Tipo 1', '03': 'Tipo 2', '04': 'Tipo 3' };
function doorLabel(d, lvl) { if (d.svc) return d.label; const r = roomAt(FP.x, FP.z, lvl); const other = r && r.id === d.ra ? d.rb : d.ra; const ro = W.rooms.find((q) => q.id === other); if (d.entry) { const a = W.rooms.find((q) => q.id === d.ra)?.apt || W.rooms.find((q) => q.id === d.rb)?.apt; return a ? 'Apto ' + (+lvl.slice(1) * 100 + +a) : 'Apartamento'; } return ro ? ro.name : ''; }
function nearElev() { return !FP.inCab && Math.abs(FP.y - LEVY[FP.lvl]) < 0.3 && FP.x > ED[1] - 0.05 && FP.x < ED[1] + 1.6 && FP.z > ED[2] - 0.9 && FP.z < ED[3] + 0.9; }
function inCabin() { return FP.x > CI.x0 - 0.05 && FP.x < CI.x1 + 0.12 && FP.z > CI.z0 && FP.z < CI.z1 && Math.abs(FP.y - EV.y) < 0.4; }
function findFocus() {
  const fx = -Math.sin(FP.yaw), fz = -Math.cos(FP.yaw); let best = null, bs = 1e9; const E = LEV[FP.lvl];
  const consider = (o, kind, px, pz, lab) => { const dx = px - FP.x, dz = pz - FP.z, d = Math.hypot(dx, dz); if (d > 1.9) return; const dot = (dx * fx + dz * fz) / (d || 1); if (d > 0.8 && dot < 0.55) return; const sc = d * (1.6 - dot); if (sc < bs) { bs = sc; best = { o, kind, lab }; } };
  if (E && Math.abs(FP.y - E.y) < 1.2) { for (const d of E.doors) consider(d, 'door', d.cx, d.cz); if (E.bal) consider(E.bal, 'bal', E.bal.cx, E.bal.cz); }
  if (FP.lvl === 'sot') for (const d of SV.doors) if (Math.abs(FP.y - d.fy) < 0.7) consider(d, 'door', d.cx, d.cz);
  if (FP.lvl === 'p1' && E && E.ent && Math.abs(FP.y - LEVY.p1) < 0.6) consider(E.ent, 'ent', E.ent.cx, E.ent.cz);
  if (FP.lvl === 'p1' && FP.x < 3.2 && Math.abs(FP.y) < 0.4) { const pz0 = GT.Z0 + GT.U.p0 * GT.W - 0.4; if (FP.z > pz0 && FP.z < GT.Z1 + 0.8) best = { kind: FP.x > 0 ? 'rex' : 'ped' }; else if (FP.z < pz0 && FP.z > GT.Z0 - 1) best = { kind: 'veh' }; }
  return best;
}
function interact(f = FP.focus) {
  if (FP.auto) return;
  if (FP.inCab) { const k = panelKeyAtCenter(); if (k) { pressKey(k); return; } if (EV.state === 'open' || EV.state === 'opening') evClose(); else evOpen(); return; }
  if (nearElev()) { evRequest(FP.lvl, 'land'); return; }
  if (!f) return;
  if (f.kind === 'door' || f.kind === 'ent') { f.o.tgt = f.o.tgt ? 0 : 1; f.o.manual = performance.now(); sfx(f.kind === 'ent' ? 'slide' : 'door'); }
  else if (f.kind === 'bal') { f.o.tgt = f.o.tgt ? 0 : 1; sfx('slide'); }
  else if (f.kind === 'ped') { if (KS.st === 'idle') pedCycle('app'); }
  else if (f.kind === 'rex') { if (KS.st === 'idle' || KS.st === 'done') pedCycle('rex'); }
  else if (f.kind === 'veh') openVeh(!GT.v1.tgt);
}
// ---------- ascensor (v7: máquina de estados física; el jugador viaja dentro de la cabina, nunca se teletransporta) ----------
// Estados: idle (puertas cerradas, quieto) · opening · open · closing · moving. Cola de destinos EV.q.
const EVV = { vmax: 1.0, acc: 0.7, open: 1.2, hold: 6 }; // m/s, m/s², s
function evHere(f) { return EV.state !== 'moving' && FLOORS[EV.fi] === f; }
function evOpen() { if (EV.state === 'moving') return; if (EV.state === 'open') { EV.timer = EVV.hold; return; } if (EV.state !== 'opening') { EV.state = 'opening'; sfx('slide'); } }
function evClose() { if (EV.state === 'open' || EV.state === 'opening') { EV.state = 'closing'; EV.timer = 0; sfx('slide'); } }
function evRequest(f, src) { // src: 'cab' (botonera interior) | 'land' (llamada desde el piso)
  if (!f) return;
  if (evHere(f)) { evOpen(); return; }
  if (EV.target !== f && !EV.q.includes(f)) EV.q.push(f);
  if (src === 'land') EV.setCallLamp(f, true);
  EV.drawPanel(null); lastHud = '';
  if (EV.state === 'idle') evNext();
  else if (EV.state === 'open' || EV.state === 'opening') EV.timer = Math.min(EV.timer, src === 'cab' ? 0.8 : 2.0); // al elegir piso las puertas se cierran enseguida
}
function evCall(f) { evRequest(f, FP.inCab ? 'cab' : 'land'); }
function evNext() {
  if (!EV.q.length) { EV.state = 'idle'; EV.target = null; return; }
  // siguiente parada: la más cercana en la dirección actual (o la más cercana si no hay dirección)
  const yi = EV.y; let best = null, bd = 1e9; for (const f of EV.q) { const d = LEVY[f] - yi; const pen = EV.lastDir && Math.sign(d) !== EV.lastDir ? 100 : 0; if (Math.abs(d) + pen < bd) { bd = Math.abs(d) + pen; best = f; } }
  EV.q = EV.q.filter((f) => f !== best); EV.target = best;
  if (Math.abs(LEVY[best] - EV.y) < 1e-3) { EV.fi = FLOORS.indexOf(best); EV.target = null; EV.setCallLamp(best, false); evOpen(); return; }
  EV.state = 'moving'; EV.t = 0; EV.y0 = EV.y; EV.y1 = LEVY[best]; EV.dir = Math.sign(EV.y1 - EV.y0); EV.lastDir = EV.dir;
  const D = Math.abs(EV.y1 - EV.y0), ta = EVV.vmax / EVV.acc;
  if (D < EVV.vmax * ta) { EV.ta = Math.sqrt(D / EVV.acc); EV.vp = EVV.acc * EV.ta; EV.tc = 0; } else { EV.ta = ta; EV.vp = EVV.vmax; EV.tc = (D - EVV.vmax * ta) / EVV.vmax; }
  EV.dur = 2 * EV.ta + EV.tc; EV.D = D; hum(true); EV.drawPanel(null); lastHud = '';
}
function evDist(t) { // perfil trapezoidal de velocidad (arranque y frenado suaves)
  const a = EVV.acc, ta = EV.ta, tc = EV.tc, vp = EV.vp;
  if (t <= ta) return 0.5 * a * t * t;
  if (t <= ta + tc) return 0.5 * a * ta * ta + vp * (t - ta);
  const u = Math.min(t, EV.dur) - ta - tc; return 0.5 * a * ta * ta + vp * tc + vp * u - 0.5 * a * u * u;
}
let lastInd = '';
function evUpdate(dt) {
  const inDoorway = FP.on && FP.x > CI.x1 - 0.3 && FP.x < ED[1] + 0.12 && FP.z > ED[2] && FP.z < ED[3] && Math.abs(FP.y - EV.y) < 0.5;
  if (EV.state === 'opening') { EV.door = Math.min(1, EV.door + dt / EVV.open); if (EV.door >= 1) { EV.state = 'open'; EV.timer = EVV.hold; } }
  else if (EV.state === 'open') { EV.timer -= dt; if (EV.timer <= 0) { if (inDoorway) EV.timer = 1.0; else { EV.state = 'closing'; sfx('slide'); } } }
  else if (EV.state === 'closing') { if (inDoorway) { EV.state = 'opening'; } else { EV.door = Math.max(0, EV.door - dt / EVV.open); if (EV.door <= 0) { EV.state = 'idle'; if (EV.q.length) evNext(); else EV.target = null; } } }
  else if (EV.state === 'moving') {
    EV.t += dt; const s = evDist(EV.t); EV.y = EV.y0 + EV.dir * s; EV.v = EV.dir * (EV.t < EV.ta ? EVV.acc * EV.t : EV.t < EV.ta + EV.tc ? EV.vp : Math.max(0, EV.vp - EVV.acc * (EV.t - EV.ta - EV.tc)));
    if (EV.t >= EV.dur) { EV.y = EV.y1; EV.v = 0; EV.fi = FLOORS.indexOf(EV.target); EV.setCallLamp(EV.target, false); EV.target = null; EV.dir = 0; hum(false); sfx('ding'); EV.state = 'opening'; setTimeout(() => sfx('slide'), 250); lastHud = ''; }
  }
  if (EV.state !== 'idle' && EV.state !== 'open') MOV.t = performance.now();
  W.cab.position.y = EV.y; EV.setDoorsVisual();
  // indicador: piso más cercano a la posición REAL de la cabina (se actualiza al pasar cada piso; antes la botonera mostraba el piso de salida todo el viaje)
  let near = FLOORS[0]; for (const f of FLOORS) if (Math.abs(LEVY[f] - EV.y) < Math.abs(LEVY[near] - EV.y)) near = f;
  const lab = FLABEL[near] + '|' + EV.dir + '|' + EV.target + '|' + EV.q.join(','); if (lab !== lastInd) { lastInd = lab; EV.curLabel = FLABEL[near]; EV.drawInd(FLABEL[near], EV.dir); EV.drawPanel(null); lastHud = ''; }
}
// ---------- puertas ----------
function doorsUpdate(dt) {
  for (const id of FLOORS) { const E = LEV[id]; if (!E || !E.int.visible) continue;
    for (const d of E.doors) {
      const goal = d.tgt * d.max; if (Math.abs(d.a - goal) > 1e-3) { d.set(d.a + Math.sign(goal - d.a) * Math.min(Math.abs(goal - d.a), dt * 2.4)); MOV.t = performance.now(); }
    }
    if (E.bal) { if (Math.abs(E.bal.a - E.bal.tgt) > 1e-3) E.bal.set(E.bal.a + Math.sign(E.bal.tgt - E.bal.a) * Math.min(Math.abs(E.bal.tgt - E.bal.a), dt * 1.2)); }
    if (id === 'sot') for (const d of SV.doors) {
      const goal = d.tgt * d.max; if (Math.abs(d.a - goal) > 1e-3) d.set(d.a + Math.sign(goal - d.a) * Math.min(Math.abs(goal - d.a), dt * 2.4)); }
    if (E.ent) { const want = E.ent.tgt || 0; if (Math.abs(E.ent.a - want) > 1e-3) E.ent.set(E.ent.a + Math.sign(want - E.ent.a) * Math.min(Math.abs(want - E.ent.a), dt * 1.6)); }
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
const FPL = { hemi: new THREE.HemisphereLight(0xfff4e6, 0x8a7f72, 0), pts: [0, 1].map(() => new THREE.PointLight(0xffefd8, 0, 6.5, 1.4)), t: 0 };
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
  if (FP.inCab) pts = [[(CI.x0 + CI.x1) / 2 + 0.25, EV.y + 2.15, (CI.z0 + CI.z1) / 2], ...pts];
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
  LV.forEach((l) => { l.g.visible = l.on; }); shadowDirty();
  FLOORS.forEach((id, k) => { const E = LEV[id]; const on = k === i || k === i + 1 || (nearCore && k === i - 1) || (FP.inCab && Math.abs(k - i) <= 1);
    E.int.visible = on; if (E.ceil) E.ceil.visible = on; const fu = E.int.getObjectByName('fur'); if (fu) fu.visible = k === i; }); // v7: amoblado solo del piso actual (rendimiento)
  FPC.sot.visible = lvl === 'sot';
  if (GT.blk) GT.blk.forEach((m) => { m.visible = !(lvl === 'sot' || (FP.x > 0 && lvl === 'p1') || LEV.p1.int.visible); }); // v7: el volumen esquemático del piso 1 tapaba el hueco de escalera visto desde p2
  st.cut = null; cutSel.value = '';
}
function intVisOrbit() { FLOORS.forEach((id) => { const E = LEV[id]; { const fu = E.int.getObjectByName('fur'); if (fu) fu.visible = true; } E.int.visible = !!(st.xray || st.explode > 0 || st.cut === id); if (E.ceil) E.ceil.visible = false; }); if (GT.blk) GT.blk.forEach((m) => { m.visible = true; }); }
// ---------- HUD ----------
const hud = { where: $('#fpWhere'), sub: $('#fpSub'), prompt: $('#fpPrompt'), elev: $('#elev'), act: $('#fpActBtn') };
function placeName() {
  const lvl = FP.lvl;
  if (FP.inCab) return ['Ascensor', EV.state === 'moving' ? (EV.dir > 0 ? 'Subiendo ▲ ' : 'Bajando ▼ ') + EV.curLabel + (EV.target ? ' → ' + FLABEL[EV.target] : '') : 'Piso ' + EV.curLabel];
  if (FP.x >= STR.x0 && FP.x <= STR.xl && FP.z >= STR.z0 && FP.z <= STR.z1) { const lo = FLOORS.slice().reverse().find((f) => LEVY[f] <= FP.y + 0.05) || 'sot'; const hi = FLOORS[FLOORS.indexOf(lo) + 1]; return ['Escalera', Math.abs(FP.y - LEVY[lo]) < 0.05 ? (lo === 'sot' ? 'Sótano' : 'Piso ' + FLABEL[lo]) : 'Entre ' + (lo === 'sot' ? 'sótano' : 'piso ' + FLABEL[lo]) + ' y piso ' + FLABEL[hi]]; }
  if (lvl === 'sot' && SV.at(FP.x, FP.z)) { const r = SV.at(FP.x, FP.z); return ['Sótano · ' + r.name, r.area.toFixed(2).replace('.', ',') + ' m² (cuadro de áreas PL_A004) · altura libre ≈' + r.clear.toFixed(2).replace('.', ',') + ' m'] }
  if (lvl === 'sot') return [FP.z < 7.2 && FP.x < 24 ? 'Rampa de acceso' : 'Sótano', FP.x >= 24.15 ? 'Pendiente 13,6 %' : 'Parqueaderos · N-2.96'];
  if (lvl === 'p1') { if (FP.x < 2) return ['Acceso oeste', 'Portón ED. ALMENDRA · nivel de calle']; return ['Piso 1', 'Apartamentos']; }
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
  else if (FP.inCab) { pr = EV.state === 'moving' ? (EV.dir > 0 ? '▲ Subiendo' : '▼ Bajando') + ' · piso ' + EV.curLabel + (EV.target ? ' → ' + FLABEL[EV.target] : '') : 'Elige el piso: mira la botonera y <b>E</b>/clic, o teclas <b>1–7</b> · <b>0</b> = Sótano · <b>O</b> abrir · <b>C</b> cerrar'; act = EV.state === 'open' || EV.state === 'opening' ? 'Cerrar' : 'Abrir'; ek = 'cab'; }
  else if (nearElev()) { const here = evHere(FP.lvl); pr = here && EV.door > 0.6 ? 'Puertas abiertas · <b>camina</b> hacia la cabina y elige el piso adentro' : EV.target === FP.lvl || EV.q.includes(FP.lvl) ? 'Llamada registrada · la cabina viene (piso ' + EV.curLabel + ')' + (FP.hint ? ' · entra y elige ' + FLABEL[FP.hint] : '') : '<b>E</b> Llamar ascensor'; act = here && EV.door > 0.6 ? 'Mantener' : 'Llamar'; ek = 'land'; }
  else if (f) { if (f.kind === 'door' || f.kind === 'ent') { act = f.o.tgt ? 'Cerrar' : 'Abrir'; const que = f.kind === 'ent' ? 'la puerta del lobby' : ('la puerta · ' + doorLabel(f.o, FP.lvl)); pr = `<b>E</b> Presiona E / toca para ${act.toLowerCase()} ${que}`; } else if (f.kind === 'bal') { act = f.o.tgt ? 'Cerrar' : 'Abrir'; pr = `<b>E</b> Presiona E / toca para ${act.toLowerCase()} la puerta‑ventana del balcón`; } else if (f.kind === 'ped' || f.kind === 'rex') { act = 'Abrir'; pr = '<b>E</b> Presiona E / toca para abrir la puerta peatonal'; } else if (f.kind === 'veh') { act = GT.v1.tgt ? 'Cerrar' : 'Abrir'; pr = `<b>V</b> Presiona V / toca para ${act.toLowerCase()} el portón`; } }
  const kp = kioskPrompt(); if (kp && !FP.inCab) pr = kp;
  const key = a + b + pr + act + ek + EV.state + EV.curLabel + EV.target + EV.q.join() + FP.lvl;
  if (key === lastHud) return; lastHud = key;
  hud.where.textContent = a; hud.sub.textContent = b; hud.prompt.innerHTML = pr;
  hud.act.textContent = act || '·'; hud.act.classList.toggle('dim', !act);
  // panel de ascensor contextual
  hud.elev.classList.toggle('show', !!ek); document.body.classList.toggle('elevshow', !!ek);
  if (ek) {
    $('#elevTitle').textContent = ek === 'cab' ? 'Ascensor · cabina' : 'Ascensor · ' + (FP.lvl === 'sot' ? 'Sótano' : 'Piso ' + FLABEL[FP.lvl]);
    $('#elevInd').innerHTML = `<span>${EV.curLabel || ''}</span><i>${EV.dir > 0 ? '▲' : EV.dir < 0 ? '▼' : ''}</i>`;
    $('#elevCall').style.display = ek === 'land' ? '' : 'none';
    document.querySelectorAll('#elevKeys [data-f]').forEach((b) => { b.classList.toggle('on', EV.target === b.dataset.f || EV.q.includes(b.dataset.f)); b.classList.toggle('cur', FLOORS[EV.fi] === b.dataset.f && EV.state !== 'moving'); });
    const ST = { idle: 'Puertas cerradas', opening: 'Abriendo puertas…', open: 'Puertas abiertas', closing: 'Cerrando puertas…', moving: EV.dir > 0 ? 'Subiendo ▲' : 'Bajando ▼' }; const se = $('#elevSt'); if (se) se.textContent = ST[EV.state] + (EV.target ? ' · destino ' + FLABEL[EV.target] : '');
    const kh = $('#elevKeysH'); if (kh) kh.textContent = ek === 'cab' ? 'Botonera de cabina' : 'Desde el hall: cualquier botón llama la cabina a este piso';
  }
}
// ---------- secuencia automática (montarse en el ascensor en primera persona) ----------
function goFloor(f) { // v7: dentro de la cabina = destino; en el hall = llamar la cabina a ESTE piso (el jugador entra caminando)
  if (FP.inCab) { evRequest(f, 'cab'); return; }
  if (nearElev()) { evRequest(FP.lvl, 'land'); FP.hint = f !== FP.lvl ? f : null; lastHud = ''; }
}
function pressKey(k) { if (k === 'open') evOpen(); else if (k === 'close') evClose(); else if (k) evRequest(k, 'cab'); }
function panelKeyAtCenter() { rayC.setFromCamera(new THREE.Vector2(0, 0), camera); rayC.far = 2.2; const h = rayC.intersectObject(EV.panelMesh)[0]; return h && h.uv ? EV.keyAt(h.uv) : null; }
const lerpA = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };
function autoUpdate(dt) {
  const A = FP.auto; if (!A) return; A.t += dt;
  const walk = (tx, tz, tyaw, spd = 1.1) => { const dx = tx - FP.x, dz = tz - FP.z, d = Math.hypot(dx, dz); const st2 = Math.min(d, spd * dt); if (d > 1e-3) { FP.x += dx / d * st2; FP.z += dz / d * st2; FP.bob += st2 * 7; } FP.yaw = lerpA(FP.yaw, tyaw, Math.min(1, dt * 3.2)); FP.pitch += (0 - FP.pitch) * Math.min(1, dt * 3); return d < 0.03 && Math.abs(lerpA(FP.yaw, tyaw, 1) - FP.yaw) < 0.03; };
  const here = FLOORS[EV.fi] === FP.lvl && EV.state !== 'moving';
  if (A.phase === 'call') { walk(20.15, 10.69, Math.PI / 2, 1.0); if (here && EV.state === 'open') { A.phase = 'enter'; } else if (here && EV.state === 'idle') evCall(FP.lvl); }
  else if (A.phase === 'enter') { if (EV.state === 'open') EV.timer = 3; const done = walk(18.3, 10.69, Math.PI / 2 + 0.0001, 1.0); if (FP.x < 18.6) { const ok = walk(18.3, 10.69, -Math.PI / 2, 0.6); if (ok || A.t > 12) { A.phase = 'ride'; evCall(A.f); } } void done; }
  else if (A.phase === 'ride') { FP.yaw = lerpA(FP.yaw, -Math.PI / 2, Math.min(1, dt * 3)); if (EV.state === 'open' && FLOORS[EV.fi] === A.f) { A.phase = 'exit'; A.t = 0; } }
    else if (A.phase === 'exit') { if (A.t > 0.5) { EV.timer = 4; if (walk(17.6, 10.69, -Math.PI / 2, 1.0)) FP.auto = null; } }
}
// ---------- entrar / salir del modo ----------
function fpEnter() {
  if (FP.on) return; FP.on = true; FP.prevCut = st.cut; stopFlow(); closePanel(); tween = null;
  if (st.explode) { st.explode = 0; $('#explode').value = 0; applyExplode(); }
  controls.enabled = false; camera.near = 0.05; camera.fov = innerWidth < innerHeight ? 75 : 68; camera.updateProjectionMatrix();
  document.body.classList.add('fp'); $('#bFP').classList.add('on'); $('#bFP').textContent = 'Salir del recorrido';
  SKY.visible = true; M.ground.color.set(0x56604c); if (GRIDH) GRIDH.visible = false; scene.environmentIntensity = 0.6;
  fpTeleport('inicio', true); tip.classList.remove('show');
  MK.forEach((m) => { if (m.fr) m.fr.visible = false; }); cableMat.depthTest = true; cableMat.needsUpdate = true; shadowDirty();
}
function fpExit() {
  if (!FP.on) return; FP.on = false; FP.auto = null; if (document.pointerLockElement) document.exitPointerLock();
  FPC.sot.visible = false; controls.enabled = true; camera.near = 0.1; camera.rotation.set(0, 0, 0); resize();
  document.body.classList.remove('fp'); $('#bFP').classList.remove('on'); $('#bFP').textContent = 'Recorrer por dentro';
  SKY.visible = false; M.ground.color.set(0x1b2027); if (GRIDH) GRIDH.visible = true; scene.environmentIntensity = 0.45; FPL.hemi.intensity = 0; HEMI.intensity = 0.9; renderer.toneMappingExposure = 1.05; urban.visible = st.urban; MK.forEach((m) => { m.g.visible = st.urban; }); FPL.pts.forEach((p) => (p.intensity = 0)); hum(false);
  MK.forEach((m) => { if (m.fr) m.fr.visible = true; }); cableMat.depthTest = false; cableMat.needsUpdate = true;
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
  FP.focus = findFocus(); if (FP.inCab !== FPL.wasCab) { FPL.wasCab = FP.inCab; FPL.t = 0; } fpLights(dt); if (FP.inCab) FPL.pts[0].position.y = EV.y + 2.15; fpHud();
  const showU = st.urban && FP.mode !== 'floor' && !FP.inCab && !nearElev() && kioskNear().d > 2.2 && !['scan', 'ok'].includes(KS.st); if (urban.visible !== showU) { urban.visible = showU; MK.forEach((m) => { m.g.visible = showU; }); }
  document.body.classList.toggle('neargate', FP.lvl === 'p1' && FP.x < 4 && Math.abs(FP.y) < 0.5);
}
// ---------- entradas ----------
const KEYF = { Digit0: 'sot', Numpad0: 'sot', KeyB: 'sot', Digit1: 'p1', Digit2: 'p2', Digit3: 'p3', Digit4: 'p4', Digit5: 'p5', Digit6: 'p6', Numpad1: 'p1', Numpad2: 'p2', Numpad3: 'p3', Numpad4: 'p4', Numpad5: 'p5', Numpad6: 'p6' };
addEventListener('keydown', (e) => { if (!FP.on) return; FP.keys[e.code] = true;
  if (e.code === 'KeyE' && !e.repeat) interact();
  if (e.code === 'KeyV') openVeh(!GT.v1.tgt);
  if (KEYF[e.code] && (FP.inCab || nearElev())) goFloor(KEYF[e.code]);
  if (e.code === 'KeyO' && (FP.inCab || evHere(FP.lvl))) evOpen(); if (e.code === 'KeyC' && (FP.inCab || evHere(FP.lvl))) evClose();
  if (e.code === 'KeyM') $('#snd').click();
  if (e.code === 'Escape') { if (FP.auto) FP.auto = null; else if (!document.pointerLockElement) fpExit(); }
  if (/Arrow|Space/.test(e.code)) e.preventDefault(); });
addEventListener('keyup', (e) => { FP.keys[e.code] = false; });
let look = null;
const rayC = new THREE.Raycaster();
function clickCenter() { // con puntero bloqueado: tecla de la botonera o interacción
  rayC.setFromCamera(new THREE.Vector2(0, 0), camera); rayC.far = 2.2;
  if (FP.inCab) { const h = rayC.intersectObject(EV.panelMesh)[0]; if (h && h.uv) { const k = EV.keyAt(h.uv); if (k) { pressKey(k); return; } } }
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
    const h = FP.inCab ? rayC.intersectObject(EV.panelMesh)[0] : null; if (h && h.uv) { const k = EV.keyAt(h.uv); if (k) pressKey(k); } } }
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
$('#bCar') && ($('#bCar').onclick = () => carStart(CAR.state === 'parked' ? 'out' : 'in')); carBtn();
$('#gateH').onchange = (e) => setGateH(e.target.value);
$('#gateS').onchange = (e) => { GT.setStyle(e.target.value); if (typeof markDirty === 'function') markDirty(); };
$('#fpActBtn').onclick = () => interact();
document.querySelectorAll('#elevKeys [data-f]').forEach((b) => (b.onclick = () => goFloor(b.dataset.f)));
$('#elevOpen').onclick = () => { if (FP.inCab || evHere(FP.lvl)) evOpen(); else evRequest(FP.lvl, 'land'); };
$('#elevClose').onclick = () => { if (FP.inCab || evHere(FP.lvl)) evClose(); };
$('#elevCall').onclick = () => evRequest(FP.lvl, 'land');
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
  } else if (kind === 'p1') { g.fillStyle = '#d9d6cf'; g.fill(P(S.foot4)); g.fillStyle = '#9aa3ad'; g.font = '0.45px Segoe UI,Arial'; g.fillStyle = '#1d1f23'; g.textAlign = 'center'; g.fillText('Piso 1', 18, 12); }
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


// ---------- v6: calidad / rendimiento (Auto por defecto: baja resolución o sombras si el cuadro tarda) ----------
const QL = [{ n: 'Baja', dpr: 0.75, sh: 0 }, { n: 'Media', dpr: 1.0, sh: 1024 }, { n: 'Alta', dpr: 1.5, sh: 2048 }];
const QUAL = { mode: 'auto', lv: isMobile ? 1 : 2, acc: 0, n: 0, tEval: 0, good: 0, fps: 0, ms: 0, tUI: 0 };
try { const sv = localStorage.getItem('almendraQ'); if (sv) QUAL.mode = sv; } catch (_) {}
function applyQuality(lv) {
  QUAL.lv = lv; const q = QL[lv];
  renderer.setPixelRatio(Math.min(devicePixelRatio, q.dpr));
  const want = q.sh > 0; if (sun.castShadow !== want) sun.castShadow = want;
  if (want && sun.shadow.mapSize.x !== q.sh) { sun.shadow.mapSize.set(q.sh, q.sh); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  if (W.FUR && W.FUR.setQuality) W.FUR.setQuality(lv); // v7: vidrio de ducha con transmisión solo en Alta; herrajes/detalles ocultos en Baja
  resize(); shadowDirty(); const el = $('#qLvl'); if (el) el.textContent = q.n;
}
function setQuality(m) { QUAL.mode = m; try { localStorage.setItem('almendraQ', m); } catch (_) {} if (m !== 'auto') applyQuality({ baja: 0, media: 1, alta: 2 }[m]); else applyQuality(GL_SOFT ? 0 : 1); QUAL.acc = QUAL.n = 0; QUAL.good = 0; const s2 = $('#qSel'); if (s2) s2.value = m; }
function qualTick(dt, now) {
  if (!(dt > 0) || dt > 0.5) return; QUAL.acc += dt; QUAL.n++;
  if (now - QUAL.tUI > 500) { QUAL.ms = QUAL.acc / QUAL.n * 1000; QUAL.fps = 1000 / QUAL.ms; const el = $('#fps'); if (el) el.textContent = Math.round(QUAL.fps) + ' fps'; showGLR(); QUAL.tUI = now;
    if (QUAL.mode === 'auto' && document.visibilityState === 'visible') {
      if (QUAL.ms > 26 && QUAL.lv > 0) { QUAL.good = 0; applyQuality(QUAL.lv - 1); }
      else if (QUAL.ms < 13 && QUAL.lv < 2) { if (++QUAL.good >= 10) { QUAL.good = 0; applyQuality(QUAL.lv + 1); } } else QUAL.good = 0;
    }
    QUAL.acc = 0; QUAL.n = 0; }
}
// ---------- loop ----------
const v3 = new THREE.Vector3(), WP0 = new THREE.Vector3();
const CR = { w: 1, h: 1 };
function hideEl(el) { if (el._d !== 0) { el.style.display = 'none'; el._d = 0; } }
function place(el, wp, show) {
  if (!show) return hideEl(el);
  v3.copy(wp).project(camera);
  if (v3.z > 1 || v3.z < -1 || v3.x < -1.15 || v3.x > 1.15 || v3.y < -1.15 || v3.y > 1.15) return hideEl(el);
  const x = Math.round((v3.x * 0.5 + 0.5) * CR.w), y = Math.round((-v3.y * 0.5 + 0.5) * CR.h);
  if (el._d !== 1) { el.style.display = ''; el._d = 1; }
  if (el._x !== x || el._y !== y) { el._x = x; el._y = y; el.style.transform = `translate(${x}px,${y}px)`; }
}
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; const r = canvas.getBoundingClientRect(); CR.w = r.width; CR.h = r.height; shadowDirty();
  camera.fov = w < h ? 55 : 40; camera.updateProjectionMatrix();
}
// v7: GPU real usada por Chrome (para detectar iGPU / SwiftShader) — se muestra junto a los fps
const GLR = (() => { try { const gl = renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); } catch (_) { return '?'; } })();
const GL_SOFT = /swiftshader|llvmpipe|software|basic render/i.test(GLR);
function showGLR() { const el = $('#glR'); if (el && !el._ok) { el._ok = 1; el.textContent = (GL_SOFT ? '⚠ render por software · ' : '') + GLR.replace(/^ANGLE \((.*)\)$/, '$1'); el.title = GLR + (GL_SOFT ? ' — Chrome no está usando la GPU: activa “Usar aceleración por hardware” y actualiza el driver' : ''); if (GL_SOFT) el.style.color = '#ffb547'; } } showGLR();
addEventListener('resize', resize); resize(); setQuality(QUAL.mode);
$('#qSel') && ($('#qSel').onchange = (e) => setQuality(e.target.value));
goView('general', true); applyVis();
const clock = new THREE.Clock();
function loop(now) {
  if (glLost) return;
  requestAnimationFrame(loop);
  const t = clock.getElapsedTime();
  if (tween) { const u = Math.min(1, (now - tween.s) / tween.d), k = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    camera.position.lerpVectors(tween.p0, tween.p1, k); controls.target.lerpVectors(tween.t0, tween.t1, k); if (u >= 1) tween = null; }
  const rawDt = (now - (loop.last || now)) / 1000; const dt = Math.min(0.1, rawDt); loop.last = now; qualTick(rawDt, now);
  evUpdate(dt); // v7: primero la cabina, luego el jugador (que viaja dentro) → sin desfase de un cuadro
  if (FP.on) fpUpdate(dt); else controls.update();
  doorsUpdate(dt);
  gateUpdate(dt); kioskUpdate(dt); carUpdate(dt);
  if (now - MOV.t < 350 && (loop.n = (loop.n || 0) + 1) % 3 === 0) shadowDirty(); // sombras: solo mientras algo se mueve, 1 de cada 3 cuadros
  cableMat.uniforms.t.value = t;
  MK.forEach((m, i) => { const s = 0.75 + 0.25 * Math.sin(t * 3 + i); m.halo.scale.setScalar((m.el.classList.contains('hl') || m.el.classList.contains('sel') ? 0.09 : 0.05) * s); });
  tickFlow(now);
  for (const id in W.EXT.v7) W.EXT.v7[id].visible = !LEV[id].int.visible; // v8: vano V-7 exterior solo si el interior está oculto
  renderer.render(scene, camera);
  if (FP.on && now - (loop.mini || 0) > 80) { loop.mini = now; drawMini(); }
  const wp = WP0; const kd = FP.on ? kioskNear().d : 99; loop.lab = !loop.lab; if (loop.lab && !tween && FP.on) return; // etiquetas a ~30 Hz en el recorrido
  MK.forEach((m) => { m.g.getWorldPosition(wp); const far = camera.position.distanceTo(wp) > 16 && (isMobile ? !['kiosk', 'rack'].includes(m.id) : !MAJOR.has(m.id)) && !m.el.classList.contains('hl') && !m.el.classList.contains('sel'); m.el.classList.toggle('min', far); const fpOk = !FP.on || (FP.mode !== 'floor' && camera.position.distanceTo(wp) < (FP.mode === 'ground' ? 8 : 14)); wp.y += 0.22; place(m.el, wp, fpOk && st.urban && visibleObj(m.g)); });
  place(cableLabel, CAB_MK.mid, !FP.on && st.urban && lv('sot').g.visible && lv('p1').g.visible);
  const cl = !FP.on && st.cut && /^p[2-7]$/.test(st.cut) ? lv(st.cut) : null;
  aptLbl.forEach(({ a, el }) => { if (!cl) return hideEl(el); const tx = 'APTO ' + (+cl.id.slice(1) * 100 + a.n); if (el._t !== tx) { el._t = tx; el.textContent = tx; } wp.set((a.x0 + a.x1) / 2, cl.y + cl.g.position.y + 1.2, (a.z0 + a.z1) / 2); place(el, wp, true); });
  floatLbl.forEach((f) => { wp.set(...f.p); wp.y += lv(f.l).g.position.y; place(f.el, wp, lv(f.l).g.visible && (!f.only || st.cut === f.only) && (f.only || !f.cls.includes('sm') || camera.position.distanceTo(wp) < 20) && (!FP.on || (FP.mode !== 'floor' && !FP.inCab && camera.position.distanceTo(wp) < 14 && kd > 2.2))); });
}
requestAnimationFrame(loop);
function sim(sec, step = 1 / 30) { for (let t = 0; t < sec; t += step) { evUpdate(step); if (FP.on) fpUpdate(step); doorsUpdate(step); gateUpdate(step); kioskUpdate(step); carUpdate(step); } }
const QA_MODE = /(?:^|[?&#])(qa|debug)=1(?:&|$)/.test(location.search + location.hash);
// Paso libre: un rectángulo del ancho de la plaza, desde la línea de la boca hasta 2,60 m dentro del pasillo.
// Una columna de eje (cols_in, está en el plano) se anota aparte; un muro, bordillo o baranda que cruce el paso lo cierra.
const ACCESS = [];
const ACC_G = new THREE.Group(); ACC_G.name = 'qa-acceso';
function measureAccess() {
  const meshes = [];
  lv('sot').g.updateWorldMatrix(true, true);
  lv('sot').g.traverse((o) => { if (o.isMesh && o.visible && o.geometry && o.geometry.attributes && o.geometry.attributes.position && o.parent !== VEH.group) meshes.push(o); });
  const bounds = meshes.map((mesh) => { if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox(); return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld); });
  const jobs = [];
  for (const p of VEH.cars) {
    const south = p.aisle === 's', zf = south ? p.r[3] : p.r[2];
    const zA = south ? [zf + 0.03, zf + 2.6] : [zf - 2.6, zf - 0.03];
    const zM = south ? [zf - 0.16, zf] : [zf, zf + 0.16];
    jobs.push({ id: String(p.n), kind: 'carro', aisle: p.n <= 3 ? 'rampa' : 'central', x0: p.r[0], x1: p.r[1], z0: zA[0], z1: zA[1], mz0: zM[0], mz1: zM[1], need: 2.5, y: p.y });
  }
  for (const m of VEH.motos) jobs.push({ id: 'M' + m.n, kind: 'moto', aisle: 'central', x0: 16.58, x1: 19.29, z0: 17.22, z1: 19.6, mz0: m.z0, mz1: m.z1, need: 1.12, y: m.y });
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const inCol = (x, z) => COL_RECTS.find((c) => x >= c.x0 - 0.02 && x <= c.x1 + 0.02 && z >= c.z0 - 0.02 && z <= c.z1 + 0.02);
  function sweep(job, z0, z1) {
    const span = job.x1 - job.x0, step = 0.02, n = Math.max(1, Math.ceil(span / step));
    const bar = new Uint8Array(n), col = new Uint8Array(n);
    const y0 = job.y + 0.04, y1 = job.y + 1.45;
    const mark = (xa, xb, asCol) => {
      const i0 = Math.max(0, Math.floor((xa - job.x0) / step)), i1 = Math.min(n - 1, Math.floor((xb - job.x0) / step));
      for (let i = i0; i <= i1; i++) { if (asCol) col[i] = 1; else bar[i] = 1; }
    };
    for (let mi = 0; mi < meshes.length; mi++) {
      const mesh = meshes[mi], bb = bounds[mi];
      if (bb.max.x < job.x0 || bb.min.x > job.x1 || bb.max.z < z0 || bb.min.z > z1 || bb.max.y < y0 || bb.min.y > y1) continue;
      const g = mesh.geometry, pos = g.attributes.position, idx = g.index, M = mesh.matrixWorld;
      const nT = idx ? idx.count : pos.count;
      for (let i = 0; i < nT; i += 3) {
        const ia = idx ? idx.getX(i) : i, ib = idx ? idx.getX(i + 1) : i + 1, ic = idx ? idx.getX(i + 2) : i + 2;
        A.fromBufferAttribute(pos, ia).applyMatrix4(M); B.fromBufferAttribute(pos, ib).applyMatrix4(M); C.fromBufferAttribute(pos, ic).applyMatrix4(M);
        const minx = Math.min(A.x, B.x, C.x), maxx = Math.max(A.x, B.x, C.x);
        const miny = Math.min(A.y, B.y, C.y), maxy = Math.max(A.y, B.y, C.y);
        const minz = Math.min(A.z, B.z, C.z), maxz = Math.max(A.z, B.z, C.z);
        if (maxx < job.x0 || minx > job.x1 || maxz < z0 || minz > z1 || maxy < y0 || miny > y1) continue;
        const cx = (A.x + B.x + C.x) / 3, cz = (A.z + B.z + C.z) / 3;
        if (maxy < driveY(cx, cz) + 0.8) continue;
        const ex = B.x - A.x, ey = B.y - A.y, ez = B.z - A.z, fx = C.x - A.x, fy = C.y - A.y, fz = C.z - A.z;
        const ny = ez * fx - ex * fz, nl = Math.hypot(ey * fz - ez * fy, ny, ex * fy - ey * fx);
        if (nl > 1e-8 && Math.abs(ny) / nl > 0.75) continue;
        if (maxx - minx < 0.3 && maxz - minz < 0.3) continue;
        const edge = maxx <= job.x0 + 0.16 || minx >= job.x1 - 0.16;
        if (edge && maxy - miny < 0.14 && maxy < driveY(cx, cz) + 0.18) continue;
        mark(Math.max(job.x0, minx), Math.min(job.x1, maxx), !!inCol(cx, cz));
      }
    }
    for (const p of VEH.cars) {
      if (p.n === DEMO_SPOT) continue;
      if (p.xMax < job.x0 || p.xMin > job.x1 || p.zMax < z0 || p.zMin > z1) continue;
      if (maxOverlap(p, job, z0, z1) <= 0) continue;
      mark(Math.max(job.x0, p.xMin), Math.min(job.x1, p.xMax), false);
    }
    const both = new Uint8Array(n); for (let i = 0; i < n; i++) both[i] = bar[i] || col[i] ? 1 : 0;
    const run = (flag) => { let b = 0, c = 0; for (let i = 0; i < n; i++) { if (!flag[i]) { c++; if (c > b) b = c; } else c = 0; } return b * step; };
    return { libre: Math.min(span, run(bar)), conCol: Math.min(span, run(both)) };
  }
  function maxOverlap(p, job, z0, z1) {
    const xa = Math.max(p.xMin, job.x0), xb = Math.min(p.xMax, job.x1), za = Math.max(p.zMin, z0), zb = Math.min(p.zMax, z1);
    return xa < xb && za < zb ? (xb - xa) * (zb - za) : 0;
  }
  for (const job of jobs) {
    const aisle = sweep(job, Math.min(job.z0, job.z1), Math.max(job.z0, job.z1));
    const mouth = job.kind === 'carro' ? sweep(job, job.mz0, job.mz1) : { libre: job.x1 - job.x0, conCol: job.x1 - job.x0 };
    const ancho = +(job.x1 - job.x0).toFixed(2);
    const libre = +aisle.libre.toFixed(2), boca = +mouth.libre.toFixed(2), conCol = +Math.min(aisle.conCol, mouth.conCol).toFixed(2);
    const ok = libre >= Math.min(job.need, ancho) - 0.12 && boca >= ancho - 0.15;
    const row = { id: job.id, kind: job.kind, aisle: job.aisle, x0: job.x0, x1: job.x1, z0: Math.min(job.z0, job.z1), z1: Math.max(job.z0, job.z1), y: job.y, ancho, libre, boca, conCol, need: job.need, ok };
    ACCESS.push(row);
    const key = [job.x0, job.z0, job.x1, job.z1].join(':');
    if (ACC_G.userData.seen?.has(key)) continue;
    (ACC_G.userData.seen || (ACC_G.userData.seen = new Set())).add(key);
    const g = new THREE.BoxGeometry(Math.abs(job.x1 - job.x0), 0.025, Math.abs(job.z1 - job.z0));
    g.translate((job.x0 + job.x1) / 2, job.y + 0.07, (Math.min(job.z0, job.z1) + Math.max(job.z0, job.z1)) / 2);
    const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: ok ? 0x3ecf6e : 0xd23b3b, transparent: true, opacity: 0.42, depthWrite: false }));
    mesh.userData.access = true; mesh.name = 'acceso-' + job.id; ACC_G.add(mesh);
  }
  lv('sot').g.add(ACC_G);
}
if (QA_MODE) measureAccess();
if (QA_MODE) window.__app = { THREE, SV, VEH, cam: (p, t) => { camera.position.set(...p); controls.target.set(...t); controls.update(); }, info: () => ({ ...renderer.info.render, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures, progs: renderer.info.programs.length }), sim, EV, W, evCall, evRequest, evOpen, evClose, pressKey, goFloor, interact, LEVY, carAt: (t) => { carStart(CAR.state === 'parked' ? 'out' : 'in'); }, carStart, carPark, BATCHED: () => BATCHED, CAR, R: renderer, scene, setQuality, QUAL, applyQuality, GT, FP, fpEnter, fpExit, fpTeleport, fpPose, openPed, openVeh, pedCycle, KS, kioskNear, drawKiosk, setGateH: (k) => setGateH(k), goView, startFlow, stopFlow, openPanel: (id) => openPanel(id === 'cable' ? CAB_MK : MK.find((m) => m.id === id)), closePanel, st, applyVis, applyExplode, setCut: (c) => { st.cut = c; cutSel.value = c || ''; applyVis(); }, access: ACCESS, showAccess: (on) => { ACC_G.visible = !!on; }, driveY, MOUTH_X0 };
document.body.classList.add('ready');
