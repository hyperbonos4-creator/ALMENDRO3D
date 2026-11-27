// ============================================================================================
// v10.2 · SISTEMA DE CONTROL DE ACCESO DENTRO DEL RECORRIDO 3D (fuente de verdad: /workspace/urban_acceso, láminas L1–L8)
// Cada elemento es interactivo: hover = resalte · clic o E = ficha (mismos textos de acceso_interactivo.html, sin precios ni marcas)
// La ficha resalta además sus relaciones (rel) y su ruta (datos / energía / chapas). Ruta del sistema guiada (escenarios de L6).
// Adaptación al modelo: la peatonal es la integrada en la hoja derecha del portón (render); sus bisagras quedan al sur, contra la
// jamba fija, que hace de "pilar del lado de las bisagras" (H2). El muro interior de ese lado mide 1.55 m: la caja 2C baja a 1.16 m.
// ============================================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ACC_C as C, ACC_SCN, ACC_TAGS, ACC_HYP } from './acc_data.js';
import { textTex } from './tex.js';

const COL = { data: 0x2fb84a, power: 0x8a939e, power120: 0x5d6673, wires: 0xff8c00, red: 0xe0301e, black: 0x1a1a1a };
const ROUTE_COL = { data: COL.data, power: COL.power, wires: COL.wires };
const ST_TXT = { D: 'Dato', T: 'Típico, verificar en obra', H: 'Hipótesis, confirmar', F: 'Falta medir o definir' };
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function buildAcceso(X) {
  const { scene, camera, canvas, lv, GT, $, place, visibleObj } = X;
  const SOTG = lv('sot').g, P1G = lv('p1').g;
  const root = new THREE.Group(); root.name = 'acceso'; SOTG.add(root); // sótano / rampa / cuarto técnico (coordenadas de mundo)
  const ext = new THREE.Group(); ext.name = 'accesoExt'; P1G.add(ext);  // exterior del portón (andén)
  // ---------- registro de elementos ----------
  const REG = new Map(); const PICK = [];
  const BASE = {
    galv: { color: 0xc3c8cd, metalness: 0.78, roughness: 0.34 }, steel: { color: 0x2d3136, metalness: 0.55, roughness: 0.42 }, dark: { color: 0x17191c, metalness: 0.3, roughness: 0.55 },
    grey: { color: 0xb4b9bf, metalness: 0.45, roughness: 0.45 }, light: { color: 0xdcdfe2, metalness: 0.15, roughness: 0.55 }, white: { color: 0xf3f3f1, metalness: 0.05, roughness: 0.6 },
    pcb: { color: 0x1f7a3c, metalness: 0.2, roughness: 0.55 }, blue: { color: 0x2862c9, metalness: 0.2, roughness: 0.45 }, orange: { color: 0xe0822a, metalness: 0.2, roughness: 0.5 },
    chrome: { color: 0xd8dde2, metalness: 0.95, roughness: 0.18 }, brass: { color: 0xc9a560, metalness: 0.85, roughness: 0.3 }, red: { color: 0xc8261b, metalness: 0.2, roughness: 0.5 },
    green: { color: 0x1db954, metalness: 0.1, roughness: 0.4 }, black: { color: 0x0d0e10, metalness: 0.2, roughness: 0.6 }, rubber: { color: 0x202224, metalness: 0.05, roughness: 0.8 },
    glass: { color: 0x9fc3d6, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false }, clear: { color: 0xe8f3f8, metalness: 0.05, roughness: 0.1, transparent: true, opacity: 0.28, depthWrite: false },
    cdata: { color: COL.data, metalness: 0.1, roughness: 0.5 }, cpow: { color: 0x2a2c30, metalness: 0.1, roughness: 0.6 }, canal: { color: 0xeceae5, metalness: 0.05, roughness: 0.6 },
    armor: { color: 0x8d949b, metalness: 0.85, roughness: 0.32 }, ups: { color: 0x26292d, metalness: 0.35, roughness: 0.5 },
  };
  const matCache = new Map();
  function mat(id, key) { const k = id + '|' + key; let m = matCache.get(k); if (!m) { m = new THREE.MeshStandardMaterial(BASE[key]); m.userData.acc = id; matCache.set(k, m); E(id).mats.push(m); } return m; }
  function E(id) { let r = REG.get(id); if (!r) { r = { id, objs: [], mats: [], anchor: null, cover: [], view: null }; REG.set(id, r); } return r; }
  function addMesh(id, parent, geo, key, o = {}) { const m = new THREE.Mesh(geo, typeof key === 'string' ? mat(id, key) : key); m.userData.acc = id; m.castShadow = o.cast !== false; m.receiveShadow = false; parent.add(m); E(id).objs.push(m); if (o.pick !== false) PICK.push(m); return m; }
  function anchor(id, parent, p, view) { const a = new THREE.Object3D(); a.position.set(...p); parent.add(a); const r = E(id); if (!r.anchor) r.anchor = a; if (view) r.view = view; return a; }
  function proxy(id, parent, geo) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false })); m.userData.acc = id; parent.add(m); PICK.push(m); E(id).objs.push(m); return m; }
  // ---------- geometría ----------
  const bx = (x0, x1, y0, y1, z0, z1) => { const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function cylAB(a, b, r, seg = 12) { const d = b.clone().sub(a), L = d.length(); const g = new THREE.CylinderGeometry(r, r, L, seg, 1); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); return g; }
  function roundPath(pts, rad = 0.08) { // polilínea con curvas (radio de doblado EMT)
    const P = new THREE.CurvePath(); let cur = pts[0].clone();
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], c = pts[i + 1];
      if (!c) { P.add(new THREE.LineCurve3(cur, b.clone())); break; }
      const d1 = b.clone().sub(a), d2 = c.clone().sub(b); const r = Math.min(rad, d1.length() / 2.05, d2.length() / 2.05);
      const p1 = b.clone().addScaledVector(d1.normalize(), -r), p2 = b.clone().addScaledVector(d2.normalize(), r);
      if (cur.distanceTo(p1) > 1e-4) P.add(new THREE.LineCurve3(cur, p1)); P.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2)); cur = p2; }
    return P; }
  function tubeGeo(pts, r, rad = 0.08, radial = 10) { const P = roundPath(pts, rad); const L = P.getLength(); return new THREE.TubeGeometry(P, Math.max(8, Math.ceil(L / 0.05)), r, radial, false); }
  const polyLen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += pts[i].distanceTo(pts[i - 1]); return L; };
  function txtPlane(lines, w, h, opt = {}) { const ph = opt.ph || Math.round(256 * h / w); const tot = lines.reduce((a, L) => a + L.s * 1.25, 0) - lines[lines.length - 1].s * 0.25; const t = textTex(lines, { w: opt.pw || 256, h: ph, y0: Math.max(0, (ph - tot) / 2 - 1), bg: opt.bg, r: opt.r ?? 4 }); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: !opt.bg, polygonOffset: true, polygonOffsetFactor: -2 })); return m; }

  // =====================================================================================
  // 1) PORTÓN · EXTERIOR: tablet 1, marco 1A, splitter 1B, cilindros 3C, cámara 15A, ramal exterior 11E
  // =====================================================================================
  const K = GT.kParts; // piezas del kiosko existente (main.js)
  for (const m of K.tablet) { m.userData.acc = '1'; E('1').objs.push(m); PICK.push(m); E('1').mats.push(m.material); }
  for (const m of K.frame) { m.userData.acc = '1A'; E('1A').objs.push(m); PICK.push(m); E('1A').mats.push(m.material); E('1B').cover.push(m); }
  const KX = -0.088, KY = GT.ky, KZ = GT.kz;
  anchor('1', ext, [-0.125, KY, KZ], 'ext'); anchor('1A', ext, [-0.09, KY + 0.31, KZ + 0.17], 'ext');
  addMesh('1B', ext, bx(-0.104, -0.074, KY - 0.115, KY - 0.06, KZ - 0.035, KZ + 0.035), 'dark'); // splitter PoE dentro del marco, detrás de la tablet
  addMesh('1B', ext, bx(-0.074, -0.064, KY - 0.1, KY - 0.075, KZ - 0.012, KZ + 0.012), 'blue', { pick: false });
  anchor('1B', ext, [-0.09, KY - 0.09, KZ], 'ext');
  // cámara 15A (exterior, 2.55 m, sobre la puerta, extremo de la franja del letrero) + cono de visión
  const CAMG = (id, parent, pos, aim, ext_ = true) => {
    const g = new THREE.Group(); g.position.copy(pos); parent.add(g); const dir = aim.clone().sub(pos).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, -1), dir);
    const b = new THREE.Group(); b.quaternion.copy(q); g.add(b);
    addMesh(id, b, (() => { const c = new THREE.CylinderGeometry(0.036, 0.036, 0.17, 18); c.rotateX(Math.PI / 2); c.translate(0, 0, -0.06); return c; })(), 'white');
    addMesh(id, b, bx(-0.045, 0.045, 0.03, 0.04, -0.17, 0.03), 'white', { pick: false }); // visera
    addMesh(id, b, (() => { const c = new THREE.CircleGeometry(0.028, 18); c.translate(0, 0, -0.1455); c.rotateY(Math.PI); c.translate(0, 0, -0.291); return c; })(), 'black', { pick: false });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), new THREE.MeshBasicMaterial({ color: 0x0b0d10 })); lens.position.set(0, 0, -0.1455); lens.rotation.y = Math.PI; b.add(lens);
    const ir = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.034, 20), new THREE.MeshBasicMaterial({ color: 0x5a1010 })); ir.position.set(0, 0, -0.1458); ir.rotation.y = Math.PI; b.add(ir);
    // brazo + base al soporte
    addMesh(id, g, cylAB(V(0, 0, 0), dir.clone().multiplyScalar(-0.0).add(V(0, 0.06, 0)), 0.012), 'white', { pick: false });
    // cono (campo de visión ilustrativo, 5 m, 100° × 60°)
    const R = 5.0, w = Math.tan(THREE.MathUtils.degToRad(50)) * R, h = Math.tan(THREE.MathUtils.degToRad(30)) * R;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -w, -h, -R, w, -h, -R, w, h, -R, -w, h, -R], 3)); geo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
    const cone = new THREE.Group(); cone.quaternion.copy(q); g.add(cone);
    cone.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x7cf7c5, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false })));
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -w, -h, -R, 0, 0, 0, w, -h, -R, 0, 0, 0, w, h, -R, 0, 0, 0, -w, h, -R, -w, -h, -R, w, -h, -R, w, -h, -R, w, h, -R, w, h, -R, -w, h, -R, -w, h, -R, -w, -h, -R], 3));
    cone.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x7cf7c5, transparent: true, opacity: 0.5 })));
    cone.renderOrder = 5; E(id).cone = cone; anchor(id, g, [0, 0.02, 0], ext_ ? 'ext' : 'pass'); return g; };
  const c15A = new THREE.Group(); ext.add(c15A); // se reubica con el alto del portón
  const C15A_P = V(-0.25, 0, 3.86);
  CAMG('15A', c15A, C15A_P.clone(), V(-3.6, -1.6, 2.9));
  addMesh('15A', c15A, bx(-0.17, -0.131, -0.07, 0.07, 3.82, 3.9), 'white'); // placa de anclaje en la franja
  addMesh('15A', c15A, cylAB(V(-0.17, 0, 3.86), V(-0.25, 0, 3.86), 0.014), 'white', { pick: false });
  // ramal exterior EMT 1/2" (11E) del marco a la cámara (U-04) + pasamuro
  const extTube = new THREE.Group(); ext.add(extTube);
  function layoutExt() { const top = GT.H * GT.hs + 0.04; const yc = top + 0.24; c15A.position.y = yc; // ≈2.55 m con el alto del render
    extTube.clear(); const pts = [V(-0.048, KY + 0.31, 3.85), V(-0.048, top - 0.035, 3.85), V(-0.15, top - 0.035, 3.85), V(-0.15, yc - 0.075, 3.85)];
    addMesh('11E', extTube, tubeGeo(pts, 0.0105, 0.04), 'galv'); for (const y of [KY + 0.45, top - 0.2]) addMesh('11D', extTube, bx(-0.066, -0.03, y - 0.012, y + 0.012, 3.83, 3.87), 'galv', { pick: false });
    E('15A').pathTop = yc; }
  layoutExt();
  anchor('11E', ext, [-0.048, KY + 0.6, 3.85], 'ext');

  // =====================================================================================
  // 2) HOJA PEATONAL (se mueve con la puerta): chapas 3A/3B (+3C), caja 12F, canaleta 12A, placa del paso 8, cierrapuertas 10
  // =====================================================================================
  const P = GT.ped; const PA = new THREE.Group(); PA.name = 'accHoja'; P.piv.add(PA);
  const VA = new THREE.Group(); VA.name = 'accHojaDer'; GT.v2.piv.add(VA); // contraparte fija en la hoja vehicular (cerraderos, zapata)
  const pw = P.w, hd = P.hd, ZE = -pw; // canto de cerradura (local)
  const CHAPA = {};
  function chapa(id, yc) {
    const g = new THREE.Group(); PA.add(g);
    addMesh(id, g, bx(0.004, 0.072, yc - 0.08, yc + 0.08, ZE + 0.003, ZE + 0.123), 'grey');        // cuerpo de chapa 0.12 m (cara interior)
    addMesh(id, g, bx(0.072, 0.075, yc - 0.07, yc + 0.07, ZE + 0.013, ZE + 0.113), 'light', { pick: false }); // tapa
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3b30 })); led.position.set(0.076, yc + 0.055, ZE + 0.1); g.add(led);
    const bolt = addMesh(id, g, bx(0.028, 0.052, yc - 0.014, yc + 0.014, ZE - 0.024, ZE + 0.006), 'chrome', { pick: false }); // pestillo
    const lbl = txtPlane([{ t: id, s: 44, w: 800, c: '#1d1f23' }], 0.04, 0.02, { pw: 128, ph: 64, y0: -8 }); lbl.position.set(0.0752, yc - 0.045, ZE + 0.063); lbl.rotation.y = Math.PI / 2; g.add(lbl);
    // cilindro de llave 3C en la cara exterior
    const cy = new THREE.CylinderGeometry(0.017, 0.017, 0.014, 22); cy.rotateZ(Math.PI / 2); cy.translate(-0.009, yc, ZE + 0.063); addMesh('3C', PA, cy, 'brass');
    const kh = new THREE.Mesh(new THREE.PlaneGeometry(0.004, 0.016), new THREE.MeshBasicMaterial({ color: 0x1a1308 })); kh.position.set(-0.0165, yc, ZE + 0.063); kh.rotation.y = -Math.PI / 2; PA.add(kh);
    // cerradero en el panel angosto de la hoja vehicular derecha
    addMesh(id, VA, bx(0.006, 0.07, yc - 0.065, yc + 0.065, -hd - pw - 0.07, -hd - pw - 0.004), 'grey');
    CHAPA[id] = { bolt, led, x0: 0 }; anchor(id, PA, [0.07, yc, ZE + 0.06], 'leaf'); }
  chapa('3A', 1.90); chapa('3B', 0.30);
  anchor('3C', PA, [-0.02, 1.9, ZE + 0.063], 'ext');
  GT.lockLed = CHAPA['3A'].led; // el LED de estado del modelo ahora es el de la chapa superior
  // caja de derivación 12F (1.00 m) + placa del paso de cable 8 + canaleta 12A en la hoja
  addMesh('12F', PA, bx(0.004, 0.054, 0.95, 1.05, -0.27, -0.17), 'light'); addMesh('12F', PA, bx(0.054, 0.057, 0.96, 1.04, -0.26, -0.18), 'grey', { pick: false });
  anchor('12F', PA, [0.055, 1.0, -0.22], 'leaf');
  addMesh('8', PA, bx(0.003, 0.011, 0.94, 1.06, -0.12, -0.075), 'armor'); anchor('8', PA, [0.03, 1.0, -0.1], 'leaf');
  const CAN = (id, parent, a, b, w = 0.02, t = 0.012) => { // canaleta recta (con tapa) entre a y b sobre una cara
    const dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]), dz = Math.abs(b[2] - a[2]); let g;
    if (dy >= dz && dy >= dx) g = bx(a[0], a[0] + t * Math.sign(a[0] || 1), Math.min(a[1], b[1]), Math.max(a[1], b[1]), a[2] - w / 2, a[2] + w / 2);
    else if (dz >= dx) g = bx(a[0], a[0] + t * Math.sign(a[0] || 1), a[1] - w / 2, a[1] + w / 2, Math.min(a[2], b[2]), Math.max(a[2], b[2]));
    else g = bx(Math.min(a[0], b[0]), Math.max(a[0], b[0]), a[1] - w / 2, a[1] + w / 2, a[2], a[2] + t * Math.sign(a[2] || -1));
    return addMesh(id, parent, g, 'canal'); };
  CAN('12A', PA, [0.004, 1.0, -0.12], [0.004, 1.0, -0.17]);
  CAN('12A', PA, [0.004, 1.05, -0.22], [0.004, 1.44, -0.22]);
  CAN('12A', PA, [0.004, 1.43, -0.21], [0.004, 1.43, ZE + 0.053]);
  CAN('12A', PA, [0.004, 1.44, ZE + 0.063], [0.004, 1.82, ZE + 0.063]);
  CAN('12A', PA, [0.004, 1.42, ZE + 0.063], [0.004, 0.38, ZE + 0.063]);
  anchor('12A', PA, [0.02, 1.43, -0.5], 'leaf');
  // cierrapuertas 10: cuerpo en la hoja (lado bisagras, arriba) + brazo articulado a la zapata en el cabezal (riel superior de la hoja vehicular)
  const CL = { g: new THREE.Group(), a1: null, a2: null };
  PA.add(CL.g);
  const CLb = addMesh('10', CL.g, bx(0.004, 0.058, 0, 0.075, -0.40, -0.11), 'grey'); void CLb;
  addMesh('10', CL.g, (() => { const c = new THREE.CylinderGeometry(0.03, 0.03, 0.06, 16); c.rotateZ(Math.PI / 2); c.translate(0.031, 0.0375, -0.40); return c; })(), 'grey', { pick: false });
  const armMat = mat('10', 'steel');
  CL.a1 = new THREE.Mesh(new THREE.BoxGeometry(1, 0.016, 0.02), armMat); CL.a2 = new THREE.Mesh(new THREE.BoxGeometry(1, 0.014, 0.016), armMat); CL.a1.userData.acc = CL.a2.userData.acc = '10';
  VA.add(CL.a1, CL.a2); E('10').objs.push(CL.a1, CL.a2); PICK.push(CL.a1, CL.a2);
  const shoe = addMesh('10', VA, bx(0.04, 0.062, 0, 0.03, -hd - 0.44, -hd - 0.36), 'grey');
  CL.L1 = 0.25; CL.L2 = 0.21;
  anchor('10', PA, [0.04, 2.1, -0.25], 'leaf');
  function layoutLeaf() { const Hh = GT.H * GT.hs; const k = 1 / GT.hs; PA.scale.y = k; VA.scale.y = k; CL.g.position.y = Hh - 0.21; shoe.position.y = Hh - 0.07; CL.y = Hh - 0.15; }
  layoutLeaf();
  const _p = V(0, 0, 0), _q = V(0, 0, 0);
  function updCloser() { // pivote del brazo (en la hoja) y zapata (fija), codo por intersección de círculos, en coords de VA
    const r = P.piv.rotation.y, cs = Math.cos(r), sn = Math.sin(r); const lx = 0.06, lz = -0.13;
    const px = lx * cs + lz * sn, pz = -lx * sn + lz * cs - hd; const sx = 0.06, sz = -hd - 0.40;
    let dx = sx - px, dz = sz - pz, d = Math.hypot(dx, dz); const L1 = CL.L1, L2 = CL.L2; d = Math.min(Math.max(d, Math.abs(L1 - L2) + 1e-3), L1 + L2 - 1e-3);
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a)); const ux = dx / Math.hypot(dx, dz), uz = dz / Math.hypot(dx, dz);
    let ex = px + a * ux + h * -uz, ez = pz + a * uz + h * ux; if (ex < Math.max(px, sx)) { ex = px + a * ux - h * -uz; ez = pz + a * uz - h * ux; }
    const y = CL.y; const seg = (m, x0, z0, x1, z1) => { m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.scale.x = Math.hypot(x1 - x0, z1 - z0); m.rotation.set(0, -Math.atan2(z1 - z0, x1 - x0), 0); };
    seg(CL.a1, px, pz, ex, ez); seg(CL.a2, ex, ez, sx, sz); CL.a2.position.y = y + 0.012; }
  // proxy H1 sobre la hoja peatonal (clic en la hoja = ficha de la hipótesis de la puerta)
  const h1p = proxy('H1', PA, bx(-0.03, 0.03, 0.05, 2.15, ZE + 0.15, -0.3)); h1p.renderOrder = -1; anchor('H1', PA, [-0.04, 1.2, ZE / 2], 'ext');

  // =====================================================================================
  // 3) MURO INTERIOR DEL LADO DE BISAGRAS (cara norte del muro sur de la rampa): paso 8, botón 9, caja 2C (+ ESP32-A/B, K1, 5, 12B, 12D), CP-3, canaleta 12A
  // =====================================================================================
  const TH = Math.atan(0.0203); const WG = new THREE.Group(); WG.position.set(0.2, 0, 3.823); WG.rotation.y = -TH; root.add(WG); WG.updateMatrixWorld(true);
  const wl = (x, y, z) => { root.updateMatrixWorld(true); const v = V(x, y, z); v.applyMatrix4(WG.matrix); return v; }; // local del muro → coords de root
  // paso de cable 8: placa fija
  addMesh('8', WG, bx(-0.075, -0.035, 0.94, 1.06, -0.007, 0), 'armor');
  // botón de salida 9 (1.15 m)
  addMesh('9', WG, bx(0.035, 0.115, 1.09, 1.21, -0.034, 0), 'white');
  addMesh('9', WG, (() => { const c = new THREE.CylinderGeometry(0.019, 0.022, 0.018, 24); c.rotateX(Math.PI / 2); c.translate(0.075, 1.16, -0.043); return c; })(), 'green');
  { const t = txtPlane([{ t: 'SALIDA', s: 64, w: 800, c: '#1d1f23' }], 0.06, 0.016, { pw: 256, ph: 68, y0: 2 }); t.position.set(0.075, 1.115, -0.0345); t.rotation.y = Math.PI; WG.add(t); }
  anchor('9', WG, [0.075, 1.16, -0.05], 'wall');
  // caja 2C (0.30 × 0.40 × 0.15, centro 1.16 m: el muro mide 1.55 m) con tapa abatible
  const CJ = { x0: 0.24, x1: 0.54, y0: 0.96, y1: 1.36, d: 0.15 };
  { const { x0, x1, y0, y1, d } = CJ, t = 0.006;
    addMesh('2C', WG, bx(x0, x1, y0, y1, -t, 0), 'light'); addMesh('2C', WG, bx(x0, x0 + t, y0, y1, -d, 0), 'light'); addMesh('2C', WG, bx(x1 - t, x1, y0, y1, -d, 0), 'light');
    addMesh('2C', WG, bx(x0, x1, y1 - t, y1, -d, 0), 'light'); addMesh('2C', WG, bx(x0, x1, y0, y0 + t, -d, 0), 'light');
    addMesh('2C', WG, bx(x0 + 0.015, x1 - 0.015, y0 + 0.015, y1 - 0.015, -0.014, -0.006), 'galv', { pick: false }); // placa de montaje
    const lidP = new THREE.Group(); lidP.position.set(x0, 0, -d); WG.add(lidP); CJ.lid = lidP; CJ.open = 0; CJ.tgt = 0;
    addMesh('2C', lidP, bx(0, x1 - x0, y0, y1, -0.012, 0), 'grey'); addMesh('2C', lidP, bx(x1 - x0 - 0.03, x1 - x0 - 0.012, (y0 + y1) / 2 - 0.03, (y0 + y1) / 2 + 0.03, -0.022, -0.012), 'dark', { pick: false });
    const lb = txtPlane([{ t: '2C · CONTROL DE ACCESO', s: 30, w: 800, c: '#1d1f23' }, { t: '12 VDC · no abrir sin autorización', s: 20, w: 600, c: '#444' }], 0.16, 0.04, { pw: 320, ph: 80, y0: 6, bg: '#f2c230' });
    lb.position.set((x1 - x0) / 2, y1 - 0.06, -0.0125); lb.rotation.y = Math.PI; lidP.add(lb);
    // borneras y portafusibles 12B (X1 X2 X3 · F1 F2) sobre riel DIN
    addMesh('12B', WG, bx(x0 + 0.02, x1 - 0.02, y1 - 0.075, y1 - 0.06, -0.022, -0.014), 'galv', { pick: false });
    for (let i = 0; i < 11; i++) { const xx = x0 + 0.03 + i * 0.021; const fuse = i >= 9; addMesh('12B', WG, bx(xx, xx + 0.016, y1 - 0.095, y1 - 0.04, -0.05, -0.022), fuse ? 'dark' : (i % 4 === 3 ? 'blue' : 'grey')); }
    { const t2 = txtPlane([{ t: 'X1    X2    X3    F1 F2', s: 27, w: 800, c: '#1d1f23' }], 0.22, 0.014, { pw: 512, ph: 34, y0: -2, bg: '#ffffff' }); t2.position.set((x0 + x1) / 2, y1 - 0.104, -0.0505); t2.rotation.y = Math.PI; WG.add(t2); }
    // ESP32-A + K1 (izq.) · ESP32-B + K2 (der.)
    const board = (id, xa, relayId) => { addMesh(id, WG, bx(xa, xa + 0.11, y0 + 0.15, y0 + 0.29, -0.024, -0.014), 'pcb');
      addMesh(id, WG, bx(xa + 0.012, xa + 0.05, y0 + 0.215, y0 + 0.275, -0.029, -0.024), 'chrome'); // módulo ESP32
      addMesh(relayId || id, WG, bx(xa + 0.06, xa + 0.1, y0 + 0.165, y0 + 0.215, -0.052, -0.024), 'blue'); // relé
      addMesh(id, WG, bx(xa + 0.06, xa + 0.1, y0 + 0.235, y0 + 0.255, -0.034, -0.024), 'grey', { pick: false }); // borne del relé
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 6), new THREE.MeshBasicMaterial({ color: 0x38c8ff })); led.position.copy(new THREE.Vector3(xa + 0.02, y0 + 0.2, -0.026)); WG.add(led); return led; };
    CJ.ledA = board('2A', x0 + 0.025, 'K1'); CJ.ledB = board('2B', x0 + 0.155);
    { const t3 = txtPlane([{ t: 'ESP32-A · K1', s: 30, w: 800, c: '#ffffff' }], 0.08, 0.012, { pw: 256, ph: 38, y0: -4 }); t3.position.set(x0 + 0.08, y0 + 0.155, -0.0245); t3.rotation.y = Math.PI; WG.add(t3);
      const t4 = txtPlane([{ t: 'ESP32-B · K2', s: 30, w: 800, c: '#ffffff' }], 0.08, 0.012, { pw: 256, ph: 38, y0: -4 }); t4.position.set(x0 + 0.21, y0 + 0.155, -0.0245); t4.rotation.y = Math.PI; WG.add(t4); }
    // conversor 12→5 V (5)
    addMesh('5', WG, bx(x0 + 0.025, x0 + 0.125, y0 + 0.03, y0 + 0.12, -0.055, -0.014), 'orange');
    { const t5 = txtPlane([{ t: '12→5 V', s: 38, w: 800, c: '#1d1f23' }], 0.06, 0.016, { pw: 192, ph: 52, y0: 0 }); t5.position.set(x0 + 0.075, y0 + 0.075, -0.0555); t5.rotation.y = Math.PI; WG.add(t5); }
    // prensaestopas 12D (6B · 6C · 6D) abajo
    for (const xx of [x0 + 0.06, x0 + 0.12, x0 + 0.18]) addMesh('12D', WG, (() => { const c = new THREE.CylinderGeometry(0.009, 0.011, 0.024, 14); c.translate(xx, y0 - 0.012, -0.075); return c; })(), 'dark');
    // terminales tipo puntera (12C) en las borneras
    for (let i = 0; i < 9; i++) { const xx = x0 + 0.038 + i * 0.021; addMesh('12C', WG, bx(xx - 0.002, xx + 0.002, y1 - 0.04, y1 - 0.025, -0.04, -0.034), 'blue', { pick: false }); }
    anchor('2C', WG, [(x0 + x1) / 2, y1 + 0.03, -0.16], 'wall'); anchor('2A', WG, [x0 + 0.08, y0 + 0.22, -0.06], 'caja'); anchor('2B', WG, [x0 + 0.21, y0 + 0.22, -0.06], 'caja');
    anchor('K1', WG, [x0 + 0.105, y0 + 0.19, -0.06], 'caja'); anchor('5', WG, [x0 + 0.075, y0 + 0.075, -0.06], 'caja'); anchor('12B', WG, [(x0 + x1) / 2, y1 - 0.07, -0.06], 'caja');
    anchor('12D', WG, [x0 + 0.12, y0 - 0.02, -0.075], 'caja'); anchor('12C', WG, [x0 + 0.1, y1 - 0.03, -0.05], 'caja');
    for (const id of ['2A', '2B', 'K1', '5', '12B', '12C', '12D', 'D-07']) E(id).openLid = true; E('2C').openLid = true; }
  // canaleta del muro 12A: prensaestopas → paso 8 (abajo, 0.91 m) + bajante del botón
  CAN('12A', WG, [-0.06, 0.912, -0.001], [0.44, 0.912, -0.001], 0.02, 0.012); // (eje x)
  CAN('12A', WG, [-0.055, 0.912, -0.001], [-0.055, 0.94, -0.001]);
  CAN('12A', WG, [0.075, 0.922, -0.001], [0.075, 1.09, -0.001]);
  for (const xx of [CJ.x0 + 0.06, CJ.x0 + 0.12, CJ.x0 + 0.18]) CAN('12A', WG, [xx, 0.922, -0.07], [xx, 0.936, -0.07], 0.016, 0.012);
  // caja de paso CP-3 (datos), sobre el botón, junto a la puerta
  addMesh('11C', WG, bx(0.0, 0.15, 1.36, 1.51, -0.1, 0), 'galv'); addMesh('11C', WG, bx(0.005, 0.145, 1.365, 1.505, -0.104, -0.1), 'grey', { pick: false });
  { const t = txtPlane([{ t: 'CP-3', s: 52, w: 800, c: '#1d1f23' }], 0.05, 0.018, { pw: 192, ph: 68, y0: 0, bg: '#ffffff' }); t.position.set(0.075, 1.48, -0.1045); t.rotation.y = Math.PI; WG.add(t); }
  anchor('11C', WG, [0.075, 1.44, -0.11], 'wall');
  // ---- loop del paso de cable 8 (manguera acorazada) entre la placa de la hoja y la placa del muro: se recalcula al mover la hoja
  const loopMat = mat('8', 'armor'); let loopMesh = null, loopKey = '';
  const _a = V(0, 0, 0), _b = V(0, 0, 0), _na = V(0, 0, 0), _nb = V(0, 0, 0);
  function updLoop() { const k = P.piv.rotation.y.toFixed(3) + GT.v2.piv.rotation.y.toFixed(3) + GT.hs; if (k === loopKey) return; loopKey = k;
    root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    _a.set(0.011, 1.0, -0.0975).applyMatrix4(PA.matrixWorld).applyMatrix4(inv); _na.set(1, 0, 0).transformDirection(PA.matrixWorld).normalize();
    _b.set(-0.055, 1.0, -0.007).applyMatrix4(WG.matrix); _nb.set(0, 0, -1).applyAxisAngle(V(0, 1, 0), -TH);
    const c = new THREE.CubicBezierCurve3(_a.clone(), _a.clone().addScaledVector(_na, 0.13), _b.clone().addScaledVector(_nb, 0.13), _b.clone());
    const g = new THREE.TubeGeometry(c, 28, 0.0085, 8, false); if (loopMesh) { loopMesh.geometry.dispose(); loopMesh.geometry = g; } else { loopMesh = new THREE.Mesh(g, loopMat); loopMesh.userData.acc = '8'; root.add(loopMesh); E('8').objs.push(loopMesh); PICK.push(loopMesh); }
    E('8').loopPts = c.getPoints(14); }
  anchor('8', WG, [-0.055, 1.0, -0.06], 'wall');

  // =====================================================================================
  // 4) CANALIZACIÓN: EMT 1" datos (11A) y EMT 3/4" energía (11B) por el muro y bajo la losa hasta el cuarto técnico; cajas CP-1/CP-2 y CP-1E/CP-2E
  // =====================================================================================
  const YD = 1.435, YP = 1.20; // alturas de los tubos (datos / energía)
  const D_W1 = wl(0.15, YD, -0.022), D_C = wl(6.851, YD, -0.022); const XD = D_C.x; // giro de datos (x ≈ 7.05, bajo la losa)
  const P_W1 = wl(CJ.x1, YP, -0.016), P_C = wl(7.05, YP, -0.016); const XP = P_C.x;
  const RACK = { x0: 11.10, x1: 11.70, y0: 0.0, y1: 0.64, z0: -0.862, z1: -0.412, A: -1.0 };
  const DATA = [D_W1, D_C, V(XD, YD, 1.38), V(11.40, YD, 1.38), V(11.40, YD, -0.65), V(11.40, RACK.y1, -0.65)];
  const POW = [P_W1, P_C, V(XP, YP, 1.58), V(12.10, YP, 1.58), V(12.10, YP, -0.80), V(12.10, 0.40, -0.80)];
  addMesh('11A', root, tubeGeo(DATA, 0.0167, 0.12, 12), 'galv'); proxy('11A', root, tubeGeo(DATA, 0.032, 0.12, 6));
  addMesh('11B', root, tubeGeo(POW, 0.0118, 0.10, 12), 'galv'); proxy('11B', root, tubeGeo(POW, 0.028, 0.10, 6));
  // ramales 11E: CP-3 → caja 2C (1/2", U-02/U-03) y CP-3 → pasamuro → marco de la tablet (3/4", U-01/U-04); CP-2 → cámara 15B (1/2", U-05)
  const BR1 = [wl(0.15, 1.385, -0.022), wl(0.30, 1.385, -0.022), wl(0.30, CJ.y1, -0.022)];
  const BR2 = [wl(0.0, YD, -0.022), wl(-0.2, YD, -0.022), V(-0.045, YD, wl(-0.2, YD, -0.022).z)];
  addMesh('11E', root, tubeGeo(BR1, 0.0105, 0.03), 'galv'); addMesh('11E', root, tubeGeo(BR2, 0.0118, 0.03), 'galv');
  addMesh('11E', root, (() => { const c = new THREE.CylinderGeometry(0.03, 0.03, 0.012, 20); c.rotateZ(Math.PI / 2); c.translate(0.008, YD, BR2[2].z); return c; })(), 'galv', { pick: false }); // pasamuro (brida)
  const C15B = V(XD + 0.06, 1.40, 0.93);
  const BR3 = [V(XD, YD, 1.305), V(XD, YD, 1.05), V(C15B.x, YD, 1.05), V(C15B.x, YD, C15B.z + 0.02)];
  addMesh('11E', root, tubeGeo(BR3, 0.0105, 0.04), 'galv');
  anchor('11E', root, [wl(0.3, 1.385, -0.03).x, 1.385, wl(0.3, 1.385, -0.03).z], 'wall');
  // cajas de paso
  const box3 = (id, c, w, h, d, lab) => { addMesh(id, root, bx(c.x - w / 2, c.x + w / 2, c.y - h / 2, c.y + h / 2, c.z - d / 2, c.z + d / 2), 'galv');
    const t = txtPlane([{ t: lab, s: 48, w: 800, c: '#1d1f23' }], 0.06, 0.02, { pw: 192, ph: 64, y0: 0, bg: '#ffffff' }); t.position.set(c.x, c.y - h / 2 - 0.0005, c.z); t.rotation.x = Math.PI / 2; root.add(t); return t; };
  box3('11C', V(XD, YD, 1.38), 0.15, 0.13, 0.15, 'CP-2'); box3('11C', V(10.80, YD, 1.38), 0.15, 0.13, 0.15, 'CP-1');
  box3('11C', V(XP, YP, 1.58), 0.11, 0.11, 0.11, 'CP-2E'); box3('11C', V(10.95, YP, 1.58), 0.11, 0.11, 0.11, 'CP-1E');
  // abrazaderas y soportes (11D): en muro cada ≈1.5 m; bajo losa con varilla roscada a la losa (N+1.50), a ≤0.90 m de cada caja
  { const g = [], rod = [];
    const along = (A, B, step, f) => { const L = A.distanceTo(B); const n = Math.max(1, Math.round(L / step)); for (let i = 0; i <= n; i++) { const t = (0.35 + (L - 0.7) * i / n) / L; if (t < 0 || t > 1) continue; f(A.clone().lerp(B, t)); } };
    along(D_W1, D_C, 1.5, (p) => { g.push(bx(p.x - 0.012, p.x + 0.012, p.y - 0.022, p.y + 0.022, p.z - 0.02, p.z + 0.022)); });
    along(P_W1, P_C, 1.5, (p) => { g.push(bx(p.x - 0.011, p.x + 0.011, p.y - 0.017, p.y + 0.017, p.z - 0.015, p.z + 0.016)); });
    const hang = (p, r) => { g.push(bx(p.x - 0.02, p.x + 0.02, p.y - r - 0.006, p.y - r, p.z - 0.03, p.z + 0.03)); rod.push(cylAB(V(p.x, p.y - r - 0.006, p.z), V(p.x, 1.5, p.z), 0.0045, 6)); };
    for (const [A, B] of [[DATA[1], DATA[2]], [DATA[2], DATA[3]], [DATA[3], DATA[4]]]) { const a = A.clone(), b = B.clone(); if (a.z > 3.5) a.z = 3.6; along(a, b, 1.6, (p) => hang(p, 0.0167)); }
    for (const [A, B] of [[POW[1], POW[2]], [POW[2], POW[3]], [POW[3], POW[4]]]) { const a = A.clone(); if (a.z > 3.5) a.z = 3.6; along(a, B.clone(), 1.6, (p) => hang(p, 0.0118)); }
    addMesh('11D', root, mergeGeometries(g), 'galv', { cast: false }); addMesh('11D', root, mergeGeometries(rod), 'galv', { pick: false, cast: false });
    anchor('11D', root, [D_W1.x + 2.2, YD + 0.03, wl(2.0, 0, -0.03).z], 'pass'); }
  anchor('11A', root, [4.2, YD + 0.03, wl(4.0, 0, -0.03).z], 'pass'); anchor('11B', root, [4.6, YP + 0.03, wl(4.4, 0, -0.03).z], 'pass');
  // marquillas 12E en los tubos (junto a la caja 2C y al entrar al cuarto técnico)
  const marq = (p, lab, col, rotY) => { const t = txtPlane([{ t: lab, s: 46, w: 800, c: '#ffffff' }], 0.11, 0.024, { pw: 256, ph: 56, y0: 2, bg: col }); t.position.copy(p); t.rotation.y = rotY; root.add(t); t.userData.acc = '12E'; E('12E').objs.push(t); PICK.push(t); };
  marq(wl(1.0, YD + 0.03, -0.0405), '11A · DATOS', '#2a8a2a', Math.PI - TH); marq(wl(1.0, YP + 0.026, -0.03), '11B · 12 VDC', '#555555', Math.PI - TH);
  marq(V(11.40 - 0.0175, YD - 0.05, 0.25), '11A · DATOS', '#2a8a2a', -Math.PI / 2); marq(V(12.10 - 0.0125, YP - 0.04, 0.25), '11B · 12 VDC', '#555555', -Math.PI / 2);
  anchor('12E', root, [wl(1.0, 0, 0).x, YD + 0.05, wl(1.0, 0, -0.05).z], 'wall');
  // cámara 15B (interior, junto a la columna A / muro norte, bajo la losa)
  { const g = CAMG('15B', root, C15B.clone(), V(0.3, -0.6, 3.1), false); void g; addMesh('15B', root, bx(C15B.x - 0.04, C15B.x + 0.04, 1.44, 1.5, C15B.z - 0.04, C15B.z + 0.04), 'white'); addMesh('15B', root, cylAB(V(C15B.x, 1.44, C15B.z), C15B.clone(), 0.012), 'white', { pick: false }); }

  // =====================================================================================
  // 5) CUARTO ELÉCTRICO / TELEC.: rack 14A (12U, abierto con puerta de vidrio) y sus unidades; fuente 4A + batería 4B; breaker 13A + DPS 13B; toma 13C
  // =====================================================================================
  const RK = RACK, U = 0.04445, Y1 = RK.y0 + 0.053, XC = (RK.x0 + RK.x1) / 2; const yU = (n) => Y1 + (n - 1) * U; const ZF = RK.z1 - 0.012; // cara frontal de equipos
  { // gabinete 14A
    const t = 0.012; const S = 'steel';
    addMesh('14A', root, bx(RK.x0, RK.x1, RK.y0, RK.y1, RK.z0, RK.z0 + t), S); addMesh('14A', root, bx(RK.x0, RK.x0 + t, RK.y0, RK.y1, RK.z0, RK.z1), S); addMesh('14A', root, bx(RK.x1 - t, RK.x1, RK.y0, RK.y1, RK.z0, RK.z1), S);
    addMesh('14A', root, bx(RK.x0, RK.x1, RK.y1 - t, RK.y1, RK.z0, RK.z1), S); addMesh('14A', root, bx(RK.x0, RK.x1, RK.y0, RK.y0 + t, RK.z0, RK.z1), S);
    // rejillas de ventilación laterales
    for (let i = 0; i < 8; i++) { const y = RK.y0 + 0.17 + i * 0.04; for (const x of [RK.x0 - 0.0005, RK.x1 + 0.0005]) addMesh('14A', root, bx(x - 0.0006, x + 0.0006, y, y + 0.012, RK.z0 + 0.12, RK.z1 - 0.06), 'black', { pick: false, cast: false }); }
    // rieles 19"
    for (const x of [XC - 0.2415, XC + 0.2415]) addMesh('14A', root, bx(x - (x < XC ? 0.016 : -0.0), x + (x < XC ? 0 : 0.016), Y1 - 0.01, yU(13) + 0.01, ZF - 0.006, ZF), 'galv', { pick: false });
    // puerta de vidrio abierta (bisagra a la derecha) para ver las unidades
    const dp = new THREE.Group(); dp.position.set(RK.x1, 0, RK.z1); root.add(dp); dp.rotation.y = -1.66;
    addMesh('14A', dp, bx(-0.6, 0, RK.y0 + 0.01, RK.y1 - 0.01, -0.01, 0.0), 'glass', { cast: false });
    for (const g of [bx(-0.6, -0.575, RK.y0, RK.y1, -0.012, 0.002), bx(-0.025, 0, RK.y0, RK.y1, -0.012, 0.002), bx(-0.6, 0, RK.y1 - 0.025, RK.y1, -0.012, 0.002), bx(-0.6, 0, RK.y0, RK.y0 + 0.025, -0.012, 0.002)]) addMesh('14A', dp, g, 'steel');
    addMesh('14A', dp, bx(-0.59, -0.582, (RK.y0 + RK.y1) / 2 - 0.05, (RK.y0 + RK.y1) / 2 + 0.05, -0.03, -0.012), 'dark', { pick: false });
    // soportes al muro
    addMesh('14A', root, bx(RK.x0 + 0.05, RK.x1 - 0.05, RK.y1 - 0.06, RK.y1 - 0.02, RK.z0 - 0.0, RK.z0 + 0.015), 'galv', { pick: false });
    anchor('14A', root, [RK.x0 + 0.05, RK.y1 + 0.04, RK.z1], 'room');
    const lab = txtPlane([{ t: '14A · RACK 19" · 12U', s: 34, w: 800, c: '#ffffff' }], 0.2, 0.026, { pw: 320, ph: 42, y0: 0, bg: '#1d1f23' }); lab.position.set(XC, RK.y1 - 0.03, RK.z1 + 0.0015); root.add(lab); }
  const front = (id, n0, n, key, depth, o = {}) => { const y0 = yU(n0) + 0.0015, y1 = yU(n0 + n) - 0.0015; const w = o.w ?? 0.44;
    addMesh(id, root, bx(XC - w / 2, XC + w / 2, y0, y1, ZF - depth, ZF), key); addMesh(id, root, bx(XC - 0.2415, XC + 0.2415, y0, y1, ZF, ZF + 0.003), o.panel || key, { pick: true });
    anchor(id, root, [XC + 0.17, (y0 + y1) / 2, ZF + 0.02], 'room'); return { y0, y1 }; };
  // U1–U2 UPS 14B
  { const r = front('14B', 1, 2, 'ups', 0.40); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), new THREE.MeshBasicMaterial({ color: 0x47c4ff })); scr.position.set(XC - 0.12, (r.y0 + r.y1) / 2, ZF + 0.0035); root.add(scr);
    for (let i = 0; i < 3; i++) addMesh('14B', root, (() => { const c = new THREE.CylinderGeometry(0.006, 0.006, 0.004, 12); c.rotateX(Math.PI / 2); c.translate(XC - 0.06 + i * 0.022, (r.y0 + r.y1) / 2, ZF + 0.005); return c; })(), i === 0 ? 'green' : 'grey', { pick: false });
    const t = txtPlane([{ t: 'UPS 14B', s: 32, w: 800, c: '#cfd6de' }], 0.07, 0.016, { pw: 192, ph: 44, y0: 0 }); t.position.set(XC + 0.12, (r.y0 + r.y1) / 2, ZF + 0.0035); root.add(t); }
  // U4 regleta 14I
  { const r = front('14I', 4, 1, 'dark', 0.06); for (let i = 0; i < 6; i++) addMesh('14I', root, bx(XC - 0.17 + i * 0.05, XC - 0.14 + i * 0.05, r.y0 + 0.008, r.y1 - 0.008, ZF + 0.003, ZF + 0.005), 'grey', { pick: false });
    addMesh('14I', root, bx(XC + 0.16, XC + 0.19, r.y0 + 0.01, r.y1 - 0.01, ZF + 0.003, ZF + 0.008), 'red', { pick: false }); }
  // U6–U7 NVR 14C sobre bandeja + disco 14D dentro (tapa superior transparente al seleccionar)
  { const y0 = yU(6) + 0.002; addMesh('14C', root, bx(XC - 0.2415, XC + 0.2415, y0, y0 + 0.004, RK.z0 + 0.06, ZF), 'galv', { pick: false }); // bandeja
    const ny0 = y0 + 0.004, ny1 = ny0 + 0.052; addMesh('14C', root, bx(XC - 0.19, XC + 0.19, ny0, ny0 + 0.004, ZF - 0.30, ZF - 0.01), 'ups');
    for (const g of [bx(XC - 0.19, XC - 0.186, ny0, ny1, ZF - 0.30, ZF - 0.01), bx(XC + 0.186, XC + 0.19, ny0, ny1, ZF - 0.30, ZF - 0.01), bx(XC - 0.19, XC + 0.19, ny0, ny1, ZF - 0.014, ZF - 0.01), bx(XC - 0.19, XC + 0.19, ny0, ny1, ZF - 0.30, ZF - 0.296)]) addMesh('14C', root, g, 'ups');
    const top = addMesh('14C', root, bx(XC - 0.19, XC + 0.19, ny1 - 0.004, ny1, ZF - 0.30, ZF - 0.01), 'ups'); E('14C').cover.push(top); E('14D').cover.push(top);
    const fr = txtPlane([{ t: 'NVR 14C · 4 canales', s: 27, w: 800, c: '#cfd6de' }], 0.13, 0.014, { pw: 320, ph: 34, y0: -2 }); fr.position.set(XC - 0.08, (ny0 + ny1) / 2, ZF - 0.0095); root.add(fr);
    for (let i = 0; i < 2; i++) { const led = new THREE.Mesh(new THREE.CircleGeometry(0.003, 8), new THREE.MeshBasicMaterial({ color: i ? 0x3cff7a : 0x4fb3ff })); led.position.set(XC + 0.12 + i * 0.015, (ny0 + ny1) / 2, ZF - 0.0095); root.add(led); }
    addMesh('14D', root, bx(XC - 0.05, XC + 0.05, ny0 + 0.005, ny0 + 0.031, ZF - 0.27, ZF - 0.123), 'galv'); // disco 3.5" 1 TB
    addMesh('14D', root, bx(XC - 0.03, XC + 0.03, ny0 + 0.031, ny0 + 0.032, ZF - 0.24, ZF - 0.16), 'light', { pick: false });
    anchor('14C', root, [XC + 0.17, (ny0 + ny1) / 2, ZF + 0.02], 'room'); anchor('14D', root, [XC, ny1 + 0.01, ZF - 0.2], 'room'); E('14D').openCover = true; E('14C').openCover = true; }
  // U8 bandeja fija 14H con el equipo de internet EXISTENTE (no incluido)
  { const y0 = yU(8) + 0.002; addMesh('14H', root, bx(XC - 0.2415, XC + 0.2415, y0, y0 + 0.004, RK.z0 + 0.06, ZF), 'galv'); addMesh('14H', root, bx(XC - 0.2415, XC + 0.2415, y0, y0 + U - 0.003, ZF - 0.003, ZF), 'galv');
    const mo = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.032, 0.14), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 })); mo.position.set(XC - 0.06, y0 + 0.02, ZF - 0.1); root.add(mo);
    const t = txtPlane([{ t: 'internet existente (no incluido)', s: 23, w: 700, c: '#555' }], 0.15, 0.012, { pw: 384, ph: 30, y0: -4 }); t.position.set(XC - 0.06, y0 + 0.02, ZF - 0.0295); root.add(t);
    anchor('14H', root, [XC + 0.17, y0 + 0.02, ZF + 0.02], 'room'); }
  // U9 y U11 organizadores 14G
  for (const n of [9, 11]) { const r = front('14G', n, 1, 'dark', 0.03); for (let i = 0; i < 5; i++) { const x = XC - 0.18 + i * 0.09; addMesh('14G', root, bx(x - 0.012, x + 0.012, r.y0 + 0.006, r.y1 - 0.006, ZF + 0.003, ZF + 0.04), 'dark', { pick: false }); } }
  // U10 switch PoE 14E (8 puertos; 1–4 PoE)
  const SWP = []; { const r = front('14E', 10, 1, 'ups', 0.22, { panel: 'ups' }); for (let i = 0; i < 8; i++) { const x = XC - 0.09 + i * 0.022; addMesh('14E', root, bx(x - 0.007, x + 0.007, r.y0 + 0.012, r.y1 - 0.01, ZF + 0.003, ZF + 0.0045), 'black', { pick: false }); SWP.push(V(x, r.y0 + 0.02, ZF + 0.006));
      const led = new THREE.Mesh(new THREE.CircleGeometry(0.0022, 8), new THREE.MeshBasicMaterial({ color: i < 4 ? 0xffb020 : 0x3cff7a })); led.position.set(x, r.y1 - 0.006, ZF + 0.0048); root.add(led); }
    const t = txtPlane([{ t: 'SWITCH PoE 14E', s: 30, w: 800, c: '#cfd6de' }], 0.1, 0.013, { pw: 288, ph: 38, y0: -2 }); t.position.set(XC - 0.165, (r.y0 + r.y1) / 2, ZF + 0.0048); root.add(t); }
  // U12 patch panel 14F (24 puertos; P01–P06 en uso)
  const PPP = []; { const r = front('14F', 12, 1, 'dark', 0.08); for (let i = 0; i < 24; i++) { const x = XC - 0.2 + i * 0.0172; addMesh('14F', root, bx(x - 0.006, x + 0.006, r.y0 + 0.012, r.y1 - 0.012, ZF + 0.003, ZF + 0.0045), i < 6 ? 'cdata' : 'black', { pick: false }); if (i < 6) PPP.push(V(x, r.y0 + 0.02, ZF + 0.006)); }
    const t = txtPlane([{ t: 'P01 P02 P03 P04 P05 P06', s: 26, w: 800, c: '#ffffff' }], 0.105, 0.007, { pw: 512, ph: 34, y0: -2 }); t.position.set(XC - 0.157, r.y1 - 0.006, ZF + 0.0046); root.add(t); }
  // patch cords 14J (PC-01…): patch P01–P06 → switch 1–6 por el organizador; switch 8 → NVR
  { const g = []; const PCs = [];
    for (let i = 0; i < 6; i++) { const a = PPP[i], b = SWP[i]; const c = new THREE.CubicBezierCurve3(a, a.clone().add(V(0, -0.02, 0.06 + i * 0.004)), b.clone().add(V(0, 0.03, 0.07 + i * 0.004)), b); g.push(new THREE.TubeGeometry(c, 16, 0.0026, 6)); PCs.push(c.getPoints(10)); }
    const nvrY = yU(6) + 0.032; const pc = new THREE.CubicBezierCurve3(SWP[7], SWP[7].clone().add(V(0.05, -0.02, 0.06)), V(XC + 0.22, nvrY + 0.02, ZF + 0.05), V(XC + 0.17, nvrY, ZF - 0.008)); g.push(new THREE.TubeGeometry(pc, 16, 0.0026, 6)); PCs.push(pc.getPoints(10));
    addMesh('14J', root, mergeGeometries(g), 'cdata', { cast: false }); anchor('14J', root, [XC - 0.02, yU(11) + 0.02, ZF + 0.08], 'room'); E('14J').pts = PCs; E('PC-01').pts = [pc.getPoints(12)]; }
  // fuente 4A (gabinete con cargador) + batería 4B dentro (frente transparente al seleccionar)
  const F4 = { x0: 11.84, x1: 12.14, y0: 0.10, y1: 0.40, z0: -0.862, z1: -0.742 };
  { const { x0, x1, y0, y1, z0, z1 } = F4; const t = 0.005;
    for (const g of [bx(x0, x1, y0, y1, z0, z0 + t), bx(x0, x0 + t, y0, y1, z0, z1), bx(x1 - t, x1, y0, y1, z0, z1), bx(x0, x1, y1 - t, y1, z0, z1), bx(x0, x1, y0, y0 + t, z0, z1)]) addMesh('4A', root, g, 'grey');
    const door = addMesh('4A', root, bx(x0, x1, y0, y1, z1, z1 + 0.006), 'grey'); E('4A').cover.push(door); E('4B').cover.push(door);
    addMesh('4A', root, bx(x0 + 0.02, x1 - 0.02, y1 - 0.11, y1 - 0.02, z0 + 0.01, z0 + 0.04), 'pcb'); // cargador
    addMesh('4B', root, bx(x0 + 0.02, x0 + 0.171, y0 + 0.01, y0 + 0.104, z0 + 0.01, z0 + 0.075), 'black'); addMesh('4B', root, bx(x0 + 0.03, x0 + 0.05, y0 + 0.104, y0 + 0.112, z0 + 0.03, z0 + 0.05), 'red', { pick: false });
    const lb = txtPlane([{ t: '4A · FUENTE 12 V', s: 40, w: 800, c: '#1d1f23' }, { t: 'con cargador · batería 4B', s: 26, w: 600, c: '#444' }], 0.15, 0.04, { pw: 320, ph: 86, y0: 4, bg: '#ffffff' }); lb.position.set((x0 + x1) / 2, y1 - 0.06, z1 + 0.0065); root.add(lb);
    const led = new THREE.Mesh(new THREE.CircleGeometry(0.004, 10), new THREE.MeshBasicMaterial({ color: 0x3cff7a })); led.position.set(x1 - 0.03, y0 + 0.03, z1 + 0.0066); root.add(led);
    anchor('4A', root, [x1 - 0.02, y1 + 0.03, z1 + 0.02], 'room'); anchor('4B', root, [x0 + 0.09, y0 + 0.06, z1 + 0.01], 'room'); E('4A').openCover = true; E('4B').openCover = true; }
  // caja del breaker 13A + DPS 13B (tapa transparente), toma 13C
  { const x0 = 11.75, x1 = 11.97, y0 = 0.62, y1 = 0.83, z0 = -0.862, z1 = -0.77;
    for (const g of [bx(x0, x1, y0, y1, z0, z0 + 0.005), bx(x0, x0 + 0.005, y0, y1, z0, z1), bx(x1 - 0.005, x1, y0, y1, z0, z1), bx(x0, x1, y1 - 0.005, y1, z0, z1), bx(x0, x1, y0, y0 + 0.005, z0, z1)]) addMesh('13A', root, g, 'light');
    addMesh('13A', root, bx(x0, x1, y0, y1, z1, z1 + 0.004), 'clear', { cast: false });
    addMesh('13A', root, bx(x0 + 0.015, x1 - 0.015, 0.715, 0.735, z0 + 0.005, z0 + 0.012), 'galv', { pick: false });
    addMesh('13A', root, bx(x0 + 0.04, x0 + 0.058, 0.68, 0.77, z0 + 0.012, z0 + 0.075), 'white'); addMesh('13A', root, bx(x0 + 0.044, x0 + 0.054, 0.73, 0.75, z0 + 0.075, z0 + 0.085), 'dark', { pick: false });
    addMesh('13B', root, bx(x0 + 0.1, x0 + 0.136, 0.68, 0.77, z0 + 0.012, z0 + 0.075), 'grey'); addMesh('13B', root, bx(x0 + 0.108, x0 + 0.128, 0.74, 0.755, z0 + 0.0755, z0 + 0.077), 'green', { pick: false });
    const t = txtPlane([{ t: '13A  ·  13B', s: 42, w: 800, c: '#1d1f23' }], 0.08, 0.018, { pw: 256, ph: 58, y0: 0 }); t.position.set((x0 + x1) / 2, y0 + 0.02, z1 + 0.0045); root.add(t);
    anchor('13A', root, [x0 + 0.049, y1 + 0.03, z1 + 0.01], 'room'); anchor('13B', root, [x0 + 0.118, y1 + 0.03, z1 + 0.01], 'room');
    addMesh('13C', root, bx(11.735, 11.805, -0.058, 0.058, -0.862, -0.853), 'white');
    for (const y of [-0.025, 0.025]) addMesh('13C', root, bx(11.755, 11.785, y - 0.012, y + 0.012, -0.853, -0.851), 'light', { pick: false });
    anchor('13C', root, [11.77, 0.09, -0.84], 'room');
    // EMT 1/2" del tablero existente al breaker (E-01) y del DPS a la toma
    const E1 = [V(12.29, 0.70, -0.30), V(12.29, 1.05, -0.30), V(11.86, 1.05, -0.30), V(11.86, 1.05, -0.82), V(11.86, y1, -0.82)];
    addMesh('E-01', root, tubeGeo(E1, 0.0105, 0.05), 'galv'); E('E-01').pts = [E1.map((p) => p.clone())];
    const E1b = [V(11.77, y0, -0.83), V(11.77, 0.058, -0.83)]; addMesh('E-01', root, tubeGeo(E1b, 0.0105, 0.03), 'galv'); E('E-01').pts.push(E1b);
    proxy('TAB', root, bx(12.212, 12.35, -0.1, 0.7, -0.62, -0.02)); anchor('TAB', root, [12.2, 0.72, -0.32], 'room'); }
  // cordones E-02 (toma → UPS) y E-03 (regleta → fuente 4A)
  { const e2 = new THREE.CatmullRomCurve3([V(11.77, -0.02, -0.851), V(11.75, -0.05, -0.80), V(11.69, 0.02, -0.70), V(11.62, yU(1) + 0.03, -0.70)]);
    const e3 = new THREE.CatmullRomCurve3([V(11.62, yU(4) + 0.02, -0.80), V(11.71, yU(4), -0.79), V(11.80, 0.06, -0.80), V(11.88, F4.y0 - 0.005, -0.80)]);
    addMesh('E-02', root, new THREE.TubeGeometry(e2, 20, 0.0035, 6), 'black', { cast: false }); addMesh('E-03', root, new THREE.TubeGeometry(e3, 20, 0.0035, 6), 'black', { cast: false });
    E('E-02').pts = [e2.getPoints(16)]; E('E-03').pts = [e3.getPoints(16)]; anchor('E-02', root, [11.72, 0.0, -0.75], 'room'); anchor('E-03', root, [11.8, 0.08, -0.79], 'room'); anchor('E-01', root, [12.05, 1.07, -0.3], 'room'); }

  // =====================================================================================
  // 6) NODOS VIRTUALES (no van en obra): servidor URBAN y app del residente
  // =====================================================================================
  const VIRT = {};
  const vsprite = (id, emoji, lab, pos) => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const g = cv.getContext('2d');
    g.fillStyle = 'rgba(10,31,60,0.88)'; g.beginPath(); g.arc(128, 128, 118, 0, 6.3); g.fill(); g.lineWidth = 10; g.strokeStyle = '#b4231a'; g.setLineDash([22, 12]); g.stroke(); g.setLineDash([]);
    g.font = '96px Segoe UI Emoji, Noto Color Emoji, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(emoji, 128, 112); g.font = '700 30px Segoe UI, Arial'; g.fillText(lab, 128, 196);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true, transparent: true })); s.scale.setScalar(0.55); s.position.copy(pos); s.renderOrder = 40; root.add(s); s.visible = false;
    s.userData.acc = id; s.material.depthTest = true; VIRT[id] = s; E(id).objs.push(s); anchor(id, root, [pos.x, pos.y - 0.32, pos.z], 'virt'); return s; };
  vsprite('SRV', '☁', 'SERVIDOR', V(XC, 2.35, 0.15)); vsprite('APP', '📱', 'APP', V(XC + 1.1, 2.0, 0.6));

  // =====================================================================================
  // 7) CABLES POR TIPO (rayos X): recorridos de cada tirada sobre la canalización real
  // =====================================================================================
  const CAB = new THREE.Group(); CAB.name = 'cables'; root.add(CAB); const CABL = new THREE.Group(); PA.add(CABL); // los de la hoja se mueven con ella
  const cabMat = (c) => new THREE.MeshBasicMaterial({ color: c, depthTest: false, transparent: true, opacity: 0.95 });
  const CABS = {}; // id → { meshes, col }
  function cable(id, pts, col, r = 0.0045, parent = CAB, off = V(0, 0, 0)) { if (!pts || pts.length < 2) return; const P2 = pts.map((p) => p.clone().add(off)); const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P2, false, 'catmullrom', 0.02), Math.max(12, Math.ceil(polyLen(P2) / 0.03)), r, 6, false);
    const m = new THREE.Mesh(g, cabMat(col)); m.renderOrder = 30; m.visible = false; m.userData.acc = id; parent.add(m); (CABS[id] = CABS[id] || { meshes: [], col }).meshes.push(m); return m; }
  const dense = (pts) => { const o = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const n = Math.max(1, Math.ceil(a.distanceTo(b) / 0.25)); for (let k = 0; k < n; k++) o.push(a.clone().lerp(b, k / n)); } o.push(pts[pts.length - 1].clone()); return o; };
  const PATCH_IN = (i) => V(XC - 0.2 + i * 0.0172, yU(12) + 0.02, ZF - 0.08);
  const TRUNK_D = dense([...DATA].reverse()); // rack → CP-3
  const toCP3 = (i) => [PATCH_IN(i), V(11.40, yU(12) + 0.03, -0.65), ...TRUNK_D.slice(1)];
  const TAB_PTS = [wl(0.0, YD, -0.05), BR2[1], BR2[2], V(-0.08, YD, BR2[2].z), V(-0.09, KY - 0.08, KZ + 0.02)];
  const CAJA_IN = [wl(0.15, 1.385, -0.05), ...BR1.slice(1), wl(0.30, CJ.y1 - 0.12, -0.03)];
  const offs = [-0.008, -0.004, 0, 0.004, 0.008, 0.012].map((d) => V(0, d, d * 0.5));
  const UT = {};
  UT['U-01'] = [...toCP3(0), ...TAB_PTS]; UT['U-02'] = [...toCP3(1), ...CAJA_IN, wl(0.32, CJ.y0 + 0.22, -0.03)]; UT['U-03'] = [...toCP3(2), ...CAJA_IN, wl(0.46, CJ.y0 + 0.22, -0.03)];
  UT['U-04'] = [...toCP3(3), ...TAB_PTS.slice(0, 4), V(-0.048, KY + 0.31, 3.85)]; UT['U-05'] = [PATCH_IN(4), V(11.40, yU(12) + 0.03, -0.65), ...dense([...DATA].reverse()).filter((p) => p.x > XD + 0.01 || p.z < 1.39), V(XD, YD, 1.38), ...BR3.slice(0)]; UT['U-06'] = [...toCP3(5), wl(0.075, YD, -0.05)];
  Object.entries(UT).forEach(([id, pts], i) => cable(id, pts, COL.data, 0.0038, CAB, offs[i]));
  for (const id of ['U-01', 'U-02', 'U-03', 'U-04', 'U-05', 'U-06']) for (const m of CABS[id].meshes) { (CABS['7'] = CABS['7'] || { meshes: [], col: COL.data }).meshes.push(m); }
  // U-04 sigue por fuera hasta la cámara 15A
  { const top = GT.H * GT.hs + 0.04; cable('U-04', [V(-0.048, KY + 0.31, 3.85), V(-0.048, top - 0.035, 3.85), V(-0.15, top - 0.035, 3.85), V(-0.15, top + 0.165, 3.85)].map((p) => p), COL.data, 0.0038, ext); }
  CABS['U-04'].meshes.forEach((m) => CABS['7'].meshes.includes(m) || CABS['7'].meshes.push(m));
  const D01 = dense([...POW].reverse()).concat([wl(CJ.x1 - 0.05, YP, -0.03), wl(CJ.x0 + 0.06, CJ.y1 - 0.07, -0.04)]);
  cable('D-01', D01, COL.power, 0.0055); CABS['6A'] = CABS['D-01'];
  // cables de la caja hacia la puerta (en el muro) y por la hoja
  const PAS = wl(-0.055, 1.0, -0.01);
  const C_D02w = [wl(CJ.x0 + 0.06, CJ.y0 - 0.005, -0.075), wl(CJ.x0 + 0.06, 0.912, -0.008), wl(-0.055, 0.912, -0.008), PAS];
  cable('D-02', C_D02w, COL.wires, 0.0045); cable('D-05', C_D02w.map((p) => p.clone()), 0x9aa3ad, 0.0032, CAB, V(0, 0.008, 0));
  cable('D-06', [wl(0.075, 1.09, -0.008), wl(0.075, 0.92, -0.008), wl(CJ.x0 + 0.18, 0.92, -0.008), wl(CJ.x0 + 0.18, CJ.y0 - 0.005, -0.075)], COL.red, 0.0035);
  cable('D-07', [wl(CJ.x0 + 0.075, CJ.y0 + 0.12, -0.06), wl(CJ.x0 + 0.08, CJ.y0 + 0.15, -0.035), wl(CJ.x0 + 0.21, CJ.y0 + 0.15, -0.035)], COL.red, 0.0028);
  const LEAF = { d02: [V(0.012, 1.0, -0.1), V(0.012, 1.0, -0.17)], d03: [V(0.012, 1.05, -0.22), V(0.012, 1.43, -0.22), V(0.012, 1.43, ZE + 0.063), V(0.012, 1.82, ZE + 0.063)], d04: [V(0.012, 1.05, -0.215), V(0.012, 1.425, -0.215), V(0.012, 1.425, ZE + 0.058), V(0.012, 0.38, ZE + 0.058)] };
  cable('D-02', LEAF.d02, COL.wires, 0.0045, CABL); cable('D-03', LEAF.d03, COL.wires, 0.0042, CABL); cable('D-04', LEAF.d04, COL.wires, 0.0042, CABL);
  cable('D-05', LEAF.d03.map((p) => p.clone()), 0x9aa3ad, 0.0028, CABL, V(0.002, 0.004, 0.004)); cable('D-05', LEAF.d04.map((p) => p.clone()), 0x9aa3ad, 0.0028, CABL, V(0.002, -0.004, 0.004));
  CABS['6B'] = { meshes: [...CABS['D-02'].meshes, ...CABS['D-03'].meshes, ...CABS['D-04'].meshes], col: COL.wires }; CABS['6C'] = CABS['D-05']; CABS['6D'] = CABS['D-06'];
  // dentro del paso 8 (se recalcula con la hoja)
  let loopCab = null; const loopCabMat = cabMat(COL.wires);
  for (const id of ['E-01', 'E-02', 'E-03', 'PC-01']) for (const pts of E(id).pts || []) cable(id, pts, id === 'PC-01' ? COL.data : COL.power120, 0.004);
  for (const pts of E('14J').pts || []) cable('14J', pts, COL.data, 0.0032);
  const CAB_IDS = Object.keys(CABS);
  // anclas de los cables (para fichas y burbujas)
  const mid = (pts) => pts[Math.floor(pts.length / 2)];
  for (const id of ['U-01', 'U-02', 'U-03', 'U-04', 'U-05', 'U-06']) anchor(id, root, mid(UT[id]).toArray(), 'pass');
  anchor('7', root, [5.0, YD, wl(5.0, 0, -0.03).z], 'pass'); anchor('D-01', root, [5.4, YP, wl(5.4, 0, -0.03).z], 'pass'); anchor('6A', root, [5.8, YP, wl(5.8, 0, -0.03).z], 'pass');
  anchor('D-02', WG, [0.1, 0.912, -0.03], 'wall'); anchor('6B', WG, [0.2, 0.912, -0.03], 'wall'); anchor('D-05', WG, [0.25, 0.92, -0.03], 'wall'); anchor('6C', WG, [0.3, 0.92, -0.03], 'wall');
  anchor('D-06', WG, [0.075, 1.0, -0.03], 'wall'); anchor('6D', WG, [0.075, 1.02, -0.03], 'wall'); anchor('D-07', WG, [CJ.x0 + 0.14, CJ.y0 + 0.15, -0.05], 'caja');
  anchor('D-03', PA, [0.02, 1.65, ZE + 0.063], 'leaf'); anchor('D-04', PA, [0.02, 0.7, ZE + 0.063], 'leaf'); anchor('PC-01', root, [XC + 0.21, yU(8), ZF + 0.05], 'room');
  // proxies de selección para los cables sin malla propia (solo activos con rayos X)
  for (const id of CAB_IDS) for (const m of CABS[id].meshes) if (!PICK.includes(m)) { PICK.push(m); m.userData.cab = true; }

  // =====================================================================================
  // 8) INTERACCIÓN: hover, selección, ficha, burbujas numeradas, índice, ruta del sistema
  // =====================================================================================
  const S = { sel: null, hov: null, xray: false, labels: true, route: null, t: 0, bolt: 0 };
  const HL = new Map(); // id → modo
  const setEm = (id, col, k) => { const r = REG.get(id); if (!r) return; for (const m of r.mats) { if (!m.emissive) continue; m.emissive.setHex(col); m.emissiveIntensity = k; } };
  function refreshHL() { for (const [id] of REG) setEm(id, 0x000000, 0);
    const sel = S.sel, c = sel && C[sel];
    const rel = new Set(c ? c.rel || [] : []); if (S.route) for (const id of S.route.hl || []) rel.add(id);
    for (const id of rel) setEm(id, 0x35d3ff, 0.22);
    if (sel) setEm(sel, 0xf2a900, 0.4);
    if (S.hov && S.hov !== sel) setEm(S.hov, 0xffffff, 0.32);
    // cables: visibles con rayos X, o los de la ficha / ruta
    const showC = new Set(); if (S.xray) CAB_IDS.forEach((i) => showC.add(i));
    const route = c && c.route; if (c) { if (CABS[sel]) showC.add(sel); for (const r of c.rel || []) if (CABS[r]) showC.add(r); for (const [k, v] of Object.entries(CABS)) if (route && C[k] && C[k].route === route && (C[k].rel || []).some((q) => q === sel || (c.rel || []).includes(q))) showC.add(k); }
    if (S.route) for (const id of S.route.cab || []) showC.add(id);
    for (const [id, v] of Object.entries(CABS)) for (const m of v.meshes) { m.visible = false; }
    for (const id of showC) for (const m of CABS[id].meshes) m.visible = true;
    if (loopCab) loopCab.visible = showC.has('D-02') || showC.has('6B');
    // tubos de la ruta
    if (c && route === 'data') setEm('11A', COL.data, 0.55); if (c && route === 'power') setEm('11B', 0x9fb3c8, 0.5); if (c && route === 'wires') { setEm('12A', COL.wires, 0.5); setEm('8', COL.wires, 0.4); }
    // tapas: abrir la caja 2C / mostrar el interior
    const want = (k) => sel && (REG.get(sel)?.[k]); CJ.tgt = want('openLid') || (S.route && S.route.lid) ? 1 : (CJ.tgt && S.lidManual ? 1 : 0);
    for (const [id, r] of REG) for (const m of r.cover) { const show = sel && (sel === id || REG.get(sel)?.cover.includes(m)) && (REG.get(sel).openCover || sel === '1B'); m.material.transparent = !!show || m.material.userData.baseTr; m.material.opacity = show ? 0.18 : (m.material.userData.baseOp ?? 1); m.material.depthWrite = !show; }
    for (const id of ['15A', '15B']) { const cn = REG.get(id)?.cone; if (cn) cn.visible = S.cones || sel === id || rel.has(id) || (S.route && (S.route.hl || []).includes(id)); }
    for (const id of ['SRV', 'APP']) VIRT[id].visible = !!(sel === id || rel.has(id) || (S.route && S.route.virt));
    renderBubbles(true); }
  for (const r of REG.values()) for (const m of r.cover) { if (!m.userData.uniq) { m.material = m.material.clone(); m.userData.uniq = true; const ow = REG.get(m.userData.acc); if (ow && !ow.mats.includes(m.material)) ow.mats.push(m.material); } m.material.userData.baseTr = m.material.transparent; m.material.userData.baseOp = m.material.opacity; }
  // ---------- panel de ficha (mismo estilo y textos que acceso_interactivo.html) ----------
  const fp = document.createElement('aside'); fp.id = 'ficha'; document.body.appendChild(fp);
  const chip = (id) => `<button class="chip" data-go="${esc(id)}" title="${esc(C[id] ? C[id].n : id)}">${esc(id)}</button>`;
  const ACTIONS = { '9': ['Pulsar el botón (simular salida)', () => X.pedCycle('rex')], '3A': ['Simular apertura (K1 → chapas)', () => X.pedCycle('app')], '3B': ['Simular apertura (K1 → chapas)', () => X.pedCycle('app')], 'K1': ['Simular pulso del relé K1', () => X.pedCycle('app')],
    '2C': ['Abrir / cerrar la tapa', () => { S.lidManual = !S.lidManual; CJ.tgt = S.lidManual ? 1 : 0; }], '1': ['Ver la ruta: el visitante llama', () => routeStart('visita')], 'APP': ['Ver la ruta: el visitante llama', () => routeStart('visita')], 'SRV': ['Ver la ruta: el visitante llama', () => routeStart('visita')], '10': ['Abrir la peatonal y ver el cierre', () => X.pedCycle('app')] };
  const MODEL_NOTE = {
    '2C': 'En el modelo: el muro interior del lado de las bisagras mide 1.55 m de alto (no hay pilar de 0.45 m, H2), por eso la caja queda con centro a 1.16 m. Confirmar en obra.',
    'H1': 'En el modelo: la peatonal es la integrada en la hoja derecha del portón (render del proyecto). Abre hacia el interior; sus bisagras quedan contra la jamba fija, que hace de pilar del lado de las bisagras.',
    '1': 'En el modelo: centro de pantalla a 1.55 m, en la jamba fija junto a las bisagras de la peatonal (jamba de 0.25 m: el centro queda a 0.13 m del canto).',
    '11A': 'En el modelo: el recorrido de la rampa va por la cara interior del muro sur (lado de la peatonal) a 1.44 m, y bajo la losa desde x ≈ 7 m a 0.60 m del muro norte. Altura libre bajo los tubos ≈ 2.2 m: verificar gálibo (F3).',
    '11B': 'En el modelo: paralelo al de datos, a 1.20 m en el muro y a 0.80 m del muro norte bajo la losa (H8).',
    '9': 'En el modelo: cara interior del muro del lado de las bisagras, junto a la puerta.',
    'TAB': 'Elemento existente del edificio: se muestra para ubicar el origen del circuito E-01.' };
  function renderFicha() {
    const id = S.sel; if (!id) { fp.classList.remove('show'); document.body.classList.remove('ficha'); return; }
    const c = C[id]; if (!c) return;
    let h = `<div class="phead"><div class="pid">${esc(c.id)}</div><div><h2>${esc(c.n)}</h2><small>${esc(c.cat)}${c.existente ? ' · existente' : ''}</small></div><button class="pclose" aria-label="Cerrar">×</button></div>`;
    h += '<div class="badges">' + (c.st || []).map((s) => `<span class="bd ${s}">${ST_TXT[s]}</span>`).join('') + '</div>';
    if (c.stn) h += `<div class="stn">${esc(c.stn)}</div>`;
    if (c.nuevo) h += `<div class="nuevo"><b>Desarrollo nuevo</b>${esc(c.nuevo)}</div>`;
    h += `<div class="psec"><h4>Qué es</h4><p>${esc(c.q)}</p></div><div class="psec"><h4>Para qué sirve</h4><p>${esc(c.p)}</p></div>`;
    h += `<div class="psec"><h4>Dónde va (cotas y altura)</h4><ul>${(c.d || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    h += `<div class="psec"><h4>Cómo se conecta</h4><table class="cx">${(c.c || []).map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</table></div>`;
    h += `<div class="psec"><h4>Especificación genérica</h4><ul>${(c.e || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    if (MODEL_NOTE[id]) h += `<div class="psec"><h4>En este modelo 3D</h4><p class="mn">${esc(MODEL_NOTE[id])}</p></div>`;
    if (c.route) h += `<div class="psec"><h4>Ruta</h4><p><span class="rt ${c.route}"></span>${{ data: 'Datos (UTP Cat6) · verde', power: 'Energía · gris', wires: 'Chapas y botón · naranja/rojo' }[c.route]}: resaltada en el modelo.</p></div>`;
    if ((c.rel || []).length) h += `<div class="psec"><h4>Se conecta o depende de</h4><div class="chips">${c.rel.map(chip).join('')}</div></div>`;
    h += '<div class="pfoot">' + (ACTIONS[id] ? `<button class="act">${esc(ACTIONS[id][0])}</button>` : '') + `<button class="ver">Ver en el modelo</button><button class="pclose2">Quitar resalte</button></div>`;
    h += '<p class="fine">Fuente: láminas L1–L8 y ficha del sistema de acceso (Visionyx · URBAN). Propuesta, no apta para construcción.</p>';
    fp.innerHTML = h; fp.classList.add('show'); document.body.classList.add('ficha'); fp.scrollTop = 0;
    fp.querySelector('.pclose').onclick = fp.querySelector('.pclose2').onclick = () => select(null);
    fp.querySelector('.ver').onclick = () => focus(id);
    const ab = fp.querySelector('.act'); if (ab) ab.onclick = () => ACTIONS[id][1]();
    fp.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => { select(b.dataset.go); }));
  }
  function select(id, opt = {}) { if (id && !C[id]) return; S.sel = id; if (!id) S.lidManual = false; renderFicha(); refreshHL(); if (id && opt.focus) focus(id); X.onSelect && X.onSelect(id); }
  // ---------- vista hacia un elemento ----------
  const VIEWS = { ext: (a) => ({ p: [a.x - 1.15, Math.max(1.2, a.y + 0.15), a.z - 0.25], t: a }), leaf: (a) => ({ p: [1.55, Math.max(1.3, a.y * 0.5 + 0.8), 2.35], t: a }), wall: (a) => ({ p: [a.x + 0.55, a.y + 0.25, a.z - 1.05], t: a }),
    caja: (a) => ({ p: [a.x + 0.12, a.y + 0.12, a.z - 0.42], t: a }), pass: (a) => ({ p: [a.x - 1.8, Math.max(a.y - 0.2, 0.6), 2.4], t: a }), room: (a) => ({ p: [Math.min(Math.max(a.x, 11.25), 12.0) - 0.05, 0.75, 0.32], t: a }), virt: (a) => ({ p: [a.x - 1.2, a.y + 0.3, 2.6], t: a }) };
  const _w = V(0, 0, 0);
  function worldOf(id, out = V(0, 0, 0)) { const r = REG.get(id); if (!r || !r.anchor) return null; r.anchor.updateWorldMatrix(true, false); return r.anchor.getWorldPosition(out); }
  const VIEW_ID = { '14A': { p: [11.42, 0.98, 0.52], t: [11.40, 0.32, -0.62] }, '4A': { p: [11.9, 0.7, 0.2], t: [11.98, 0.25, -0.8] }, '4B': { p: [11.9, 0.55, -0.2], t: [11.95, 0.15, -0.8] }, '13A': { p: [11.8, 0.95, -0.25], t: [11.86, 0.72, -0.85] }, '13B': { p: [11.85, 0.95, -0.25], t: [11.87, 0.72, -0.85] },
    '13C': { p: [11.62, 0.45, -0.3], t: [11.77, 0.0, -0.86] }, 'TAB': { p: [11.6, 0.95, 0.2], t: [12.3, 0.45, -0.32] }, 'E-01': { p: [11.5, 1.0, 0.35], t: [12.0, 0.8, -0.5] }, 'SRV': { p: [9.6, 1.25, 2.6], t: [11.5, 1.75, 0.3] }, 'APP': { p: [9.6, 1.25, 2.6], t: [12.3, 1.7, 0.6] },
    '11A': { p: [1.6, 1.35, 2.2], t: [6.5, 1.4, 3.2] }, '11B': { p: [1.6, 1.15, 2.3], t: [6.5, 1.2, 3.3] }, '7': { p: [1.6, 1.35, 2.2], t: [6.5, 1.4, 3.2] }, 'D-01': { p: [1.6, 1.15, 2.3], t: [6.5, 1.2, 3.3] }, '6A': { p: [1.6, 1.15, 2.3], t: [6.5, 1.2, 3.3] },
    '11D': { p: [4.0, 1.0, 2.2], t: [7.5, 1.45, 2.4] }, '15B': { p: [5.6, 0.9, 2.3], t: [7.1, 1.35, 1.0] }, '15A': { p: [-2.0, 2.0, 3.2], t: [-0.2, 2.5, 3.85] }, 'H1': { p: [-2.1, 1.5, 3.0], t: [0, 1.1, 3.1] }, '10': { p: [1.3, 1.85, 2.3], t: [0.1, 2.05, 3.3] },
    'U-05': { p: [5.6, 0.9, 2.3], t: [7.1, 1.35, 1.2] } };
  function focus(id) { const r = REG.get(id); const a = worldOf(id); if (!a) return; const v0 = VIEW_ID[id]; const v = v0 ? { p: v0.p, t: V(...v0.t) } : (VIEWS[r.view] || VIEWS.pass)(a);
    if (['room'].includes(r.view)) X.openElecDoors();
    if (S.sel !== id) { S.sel = id; renderFicha(); refreshHL(); }
    X.flyTo(v.p, [v.t.x, v.t.y, v.t.z], r.view); }
  // ---------- burbujas numeradas (como en las láminas) ----------
  const labels = $('#labels'); const BUB = [];
  const MAJOR = new Set(['1', '2C', '3A', '3B', '8', '9', '10', '14A', '4A', '15A', '15B', '11A', '11B', '11C', 'H1', '13A', 'TAB']);
  for (const [id, r] of REG) { if (!r.anchor || !C[id]) continue; if (CAB_IDS.includes(id) && !['7'].includes(id) && !/^D-0[1-6]$|^U-0/.test(id)) { /* cables menores: solo con rayos X */ }
    const el = document.createElement('button'); el.className = 'accb' + (C[id].nuevo ? ' new' : '') + (CAB_IDS.includes(id) ? ' cab' : ''); el.innerHTML = `<b>${esc(id)}</b><span>${esc(C[id].n)}</span>`; el.title = C[id].n;
    el.onclick = (e) => { e.stopPropagation(); select(id); }; el.onmouseenter = () => { S.hov = id; refreshHL(); }; el.onmouseleave = () => { if (S.hov === id) { S.hov = null; refreshHL(); } };
    labels.appendChild(el); BUB.push({ id, el, r, cab: CAB_IDS.includes(id) }); }
  let bubT = 0;
  function renderBubbles(force) { const now = performance.now(); if (!force && now - bubT < 33) return; bubT = now;
    const on = X.urbanOn() && S.labels; const cp = camera.position;
    const camExt = cp.x < 0.02 && cp.z > 0.3 && cp.z < 4.6 && cp.y > -0.5 && cp.y < 4;
    for (const b of BUB) { const a = worldOf(b.id, _w); let show = on && a && visibleObj(b.r.anchor) && !X.planOn();
      if (show && b.id !== S.sel) { const isExt = b.r.view === 'ext'; if (isExt !== camExt && (isExt || cp.x < 0.02)) show = false; }
      if (show) { const d = cp.distanceTo(a); const lim = b.id === S.sel ? 60 : (b.r.view === 'caja' ? (CJ.open > 0.5 ? 1.6 : 0) : b.cab ? (S.xray ? 5 : 0) : (b.r.view === 'room' ? 2.6 : MAJOR.has(b.id) ? (X.fpOn() ? 4.5 : 14) : 3.0)); if (X.fpOn() && Math.abs(a.y - camera.position.y) > 2.4) show = false; else show = d < lim || (S.route && (S.route.hl || []).includes(b.id)); if (b.r.view === 'virt') show = VIRT[b.id].visible; }
      b.el.classList.toggle('sel', b.id === S.sel); b.el.classList.toggle('hov', b.id === S.hov); b.el.classList.toggle('rel', !!(S.sel && (C[S.sel].rel || []).includes(b.id)));
      place(b.el, a || _w, !!show); } }
  // ---------- hover / clic (vista orbital) y mira central (recorrido) ----------
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); const tip = $('#tip');
  function pickAt(nx, ny, far = 80, skip) { ray.setFromCamera(ndc.set(nx, ny), camera); ray.far = far; const list = PICK.filter((m) => (!m.userData.cab || m.visible) && visibleObj(m.parent) && (m.visible || m.material.visible === false));
    const h = ray.intersectObjects(list, false); for (const q of h) { const id = q.object.userData.acc; if (skip && skip.has(id)) continue; if (id && C[id]) return { id, d: q.distance }; } return null; }
  const FP_SKIP = new Set(['H1']); let lastMove = 0;
  canvas.addEventListener('pointermove', (e) => { if (X.fpOn() || e.pointerType === 'touch') return; const now = performance.now(); if (now - lastMove < 40) return; lastMove = now; if (!X.urbanOn()) return;
    const r = canvas.getBoundingClientRect(); const h = pickAt(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const id = h ? h.id : null; if (id !== S.hov) { S.hov = id; refreshHL(); canvas.style.cursor = id ? 'pointer' : ''; }
    if (id) { tip.innerHTML = `<b>${esc(id)} · ${esc(C[id].n)}</b><span>${esc(C[id].cat)}${C[id].nuevo ? ' · <em style="color:#ff8f86;font-style:normal">desarrollo nuevo</em>' : ''}</span><small>Clic: ver ficha</small>`; tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 14 + 'px'; tip.classList.add('show'); X.hoverOwn(true); }
    else X.hoverOwn(false); });
  function clickAt(e) { if (!X.urbanOn()) return false; const r = canvas.getBoundingClientRect(); const h = pickAt(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); if (h) { select(h.id); return true; } return false; }
  function fpFocus() { if (!X.urbanOn()) { if (S.hov) { S.hov = null; refreshHL(); } return null; } const h = pickAt(0, 0, 3.2, FP_SKIP); const id = h ? h.id : null; if (id !== S.hov) { S.hov = id; refreshHL(); } return id; }
  // ---------- índice de elementos ----------
  const idx = document.createElement('div'); idx.id = 'accIdx'; document.body.appendChild(idx);
  function openIdx() { const cats = []; for (const id of Object.keys(C)) { const c = C[id]; if (!cats.includes(c.cat)) cats.push(c.cat); }
    let h = '<div class="ih"><b>Elementos del sistema de acceso</b><span>' + Object.keys(C).length + ' fichas · clic para verlo en el modelo</span><button class="x">×</button></div><div class="ib">';
    for (const cat of cats) { h += `<h4>${esc(cat)}</h4>`; for (const id of Object.keys(C).filter((i) => C[i].cat === cat)) { const c = C[id]; const inM = REG.get(id) && REG.get(id).anchor; h += `<button class="ir" data-id="${esc(id)}"><i>${esc(id)}</i><span>${esc(c.n)}${c.nuevo ? ' <em>Desarrollo nuevo</em>' : ''}${!inM ? ' <small>(sin pieza física)</small>' : ''}</span></button>`; } }
    h += '<h4>Hipótesis (L8)</h4>' + ACC_HYP.map((t) => `<p class="hy">${esc(t)}</p>`).join('') + '</div>';
    idx.innerHTML = h; idx.classList.add('show'); idx.querySelector('.x').onclick = () => idx.classList.remove('show');
    idx.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => { idx.classList.remove('show'); const id = b.dataset.id; if (REG.get(id)?.anchor) focus(id); else select(id); })); }
  // ---------- ruta del sistema (escenarios de "Cómo funciona", textos tal cual) ----------
  const NODE = { person: () => V(-1.0, 1.6, 3.4), tablet: () => worldOf('1'), sw: () => SWP[0].clone(), server: () => VIRT.SRV.position.clone(), phone: () => VIRT.APP.position.clone(), esp: () => worldOf('2A'), relay: () => worldOf('K1'), locks: () => worldOf('3A'), closer: () => worldOf('10'), button: () => worldOf('9'), key: () => worldOf('3C'), power: () => worldOf('4A'), inside: () => V(1.4, 1.5, 3.2) };
  const NODE_ID = { tablet: '1', sw: '14E', server: 'SRV', phone: 'APP', esp: '2A', relay: 'K1', locks: '3A', closer: '10', button: '9', key: '3C', power: '4A' };
  const EDGE_PTS = { 'tablet>sw': () => [...UT['U-01']].reverse().concat([PPP[0], SWP[0]]), 'sw>server': () => [SWP[0], V(11.40, YD, -0.65), V(XC, 2.2, 0.15)], 'server>phone': () => [VIRT.SRV.position.clone(), VIRT.APP.position.clone()], 'phone>server': () => [VIRT.APP.position.clone(), VIRT.SRV.position.clone()],
    'server>sw': () => [V(XC, 2.2, 0.15), V(11.40, YD, -0.65), SWP[1]], 'sw>esp': () => [SWP[1], PPP[1], ...UT['U-02']], 'esp>relay': () => [worldOf('2A'), worldOf('K1')], 'relay>locks': () => [worldOf('K1'), ...C_D02w, ...(E('8').loopPts || []).slice().reverse(), worldOf('12F'), worldOf('3A')],
    'locks>closer': () => [worldOf('3A'), worldOf('10')], 'button>esp': () => [worldOf('9'), worldOf('2A')], 'button>relay': () => [worldOf('9'), worldOf('K1')], 'power>esp': () => [...D01.slice()], 'power>locks': () => [...D01, ...C_D02w, worldOf('3A')], 'person>tablet': () => [V(-1.0, 1.6, 3.4), worldOf('1')], 'person>key': () => [V(-1.0, 1.4, 3.0), worldOf('3C')], 'key>locks': () => [worldOf('3C'), worldOf('3A')], 'inside>button': () => [V(1.4, 1.5, 3.2), worldOf('9')], 'tablet>tablet': () => [worldOf('1'), worldOf('1')] };
  const STEP_CAM = { person: 'ext', tablet: 'ext', sw: 'net', server: 'room', phone: 'room', esp: 'caja', relay: 'caja', locks: 'leaf', closer: 'leaf', button: 'wall', key: 'ext', power: 'room', inside: 'wall' };
  const CAMS = { ext: { p: [-1.9, 1.75, 3.05], t: [0, 1.5, 3.6] }, net: { p: [0.6, 1.25, 2.1], t: [10.5, 1.15, 1.2] }, room: { p: [11.72, 0.95, 0.75], t: [11.55, 0.4, -0.6] }, caja: { p: [0.75, 1.32, 3.25], t: [0.47, 1.12, 3.8] }, leaf: { p: [1.75, 1.45, 2.15], t: [0.15, 1.15, 3.1] }, wall: { p: [1.4, 1.35, 2.5], t: [0.35, 1.1, 3.8] } };
  const routeEl = document.createElement('div'); routeEl.id = 'accRoute'; document.body.appendChild(routeEl);
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false })); pulse.renderOrder = 45; pulse.visible = false; root.add(pulse);
  const trail = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xffe08a, depthTest: false, transparent: true, opacity: 0.85 })); trail.renderOrder = 44; root.add(trail); trail.visible = false;
  const toRoot = (v) => { root.updateMatrixWorld(true); return root.worldToLocal(v.clone()); };
  function stepDef(sk, i) { const sc = ACC_SCN[sk]; const s = sc.steps[i]; const paths = s.paths || []; const pts = []; const hl = new Set(); const cab = new Set(); let virt = false, lid = false;
    for (const [a, ...rest] of paths) { let prev = a; for (const b of rest) { const f = EDGE_PTS[prev + '>' + b]; if (f) { const P2 = f().filter(Boolean); pts.push(...P2); } prev = b; }
      [a, ...rest].forEach((n) => { if (NODE_ID[n]) hl.add(NODE_ID[n]); if (n === 'server' || n === 'phone') virt = true; if (n === 'esp' || n === 'relay') lid = true; if (n === 'locks') { hl.add('3B'); } }); }
    for (const id of s.hl || []) hl.add(NODE_ID[id] || id);
    const key = paths.map((p) => p.join('>')).join(' '); if (/tablet>sw|sw>esp/.test(key)) { cab.add('U-01'); cab.add('U-02'); } if (/relay>locks|power>locks/.test(key)) { ['D-02', 'D-03', 'D-04'].forEach((q) => cab.add(q)); } if (/power/.test(key)) cab.add('D-01'); if (/button/.test(key)) cab.add('D-06');
    const last = paths.length ? paths[paths.length - 1] : ['tablet']; let camK = STEP_CAM[last[last.length - 1]] || 'net'; if (last[0] === 'tablet' && last.length > 1) camK = 'net';
    return { s, pts: pts.map(toRoot), hl: [...hl], cab: [...cab], virt, lid, cam: CAMS[camK], camK, last }; }
  function routeStart(sk) { X.beforeRoute(); S.route = { sk, i: 0, t0: performance.now(), play: false }; /* v10.2.1: manual por defecto; automático solo si el usuario lo activa */ routeGo(0); }
  function routeGo(i) { const R = S.route; if (!R) return; const sc = ACC_SCN[R.sk]; R.i = Math.max(0, Math.min(sc.steps.length - 1, i)); R.t0 = performance.now(); const d = stepDef(R.sk, R.i); Object.assign(R, d);
    // animación de chapas / puerta según el paso
    const t = d.s.t.toLowerCase(); if (/abren las dos chapas|se abren las dos chapas/.test(t)) { X.pedCycle('app'); } else if (/cierrapuertas/.test(t)) { /* la hoja se cierra sola (KS) */ } else if (/se va la luz/.test(t)) { /* sin animación */ }
    if (d.pts.length > 1) { const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(d.pts, false, 'catmullrom', 0.02), Math.max(20, Math.ceil(polyLen(d.pts) / 0.05)), 0.009, 6); trail.geometry.dispose(); trail.geometry = g; trail.visible = true; R.curve = new THREE.CatmullRomCurve3(d.pts, false, 'catmullrom', 0.02); pulse.visible = true; } else { trail.visible = false; pulse.visible = false; R.curve = null; }
    X.flyTo(d.cam.p, d.cam.t, d.camK === 'room' ? 'room' : 'route');
    const tg = ACC_TAGS[d.s.tag] || ''; const phone = d.virt ? `<div class="phone"><div class="pt">${R.i >= 3 ? '✓ Abriendo…' : '📞 Visitante en la puerta'}</div><div class="pv"></div><div class="pb">${R.i >= 3 ? 'Orden enviada' : 'Abrir'}</div><small>App del residente · simulación · desarrollo nuevo</small></div>` : '';
    routeEl.innerHTML = `<div class="rh"><b>Ruta del sistema · ${esc(sc.name)}</b><button class="x">×</button></div><div class="rs">Paso ${R.i + 1}/${sc.steps.length}<span class="tg ${d.s.tag}">${esc(tg)}</span></div><h3>${esc(d.s.t)}</h3><p>${esc(d.s.d)}</p>${phone}<div class="rc"><button class="pv">◀</button><button class="pp">${R.play ? '⏸ Pausa' : '▶ Reproducir solo'}</button><button class="nx">▶</button><span>${d.hl.map((q) => `<button class="chip" data-go="${esc(q)}">${esc(q)}</button>`).join('')}</span></div><div class="rsc">${Object.entries(ACC_SCN).map(([k, v]) => `<button data-sk="${k}" class="${k === R.sk ? 'on' : ''}">${esc(v.name)}</button>`).join('')}</div>`;
    routeEl.classList.add('show'); routeEl.querySelector('.x').onclick = routeStop; routeEl.querySelector('.pv').onclick = () => { R.play = false; routeGo(R.i - 1); }; routeEl.querySelector('.nx').onclick = () => { R.play = false; routeGo(R.i + 1); };
    routeEl.querySelector('.pp').onclick = () => { R.play = !R.play; R.t0 = performance.now(); routeGo(R.i); }; routeEl.querySelectorAll('[data-sk]').forEach((b) => (b.onclick = () => routeStart(b.dataset.sk))); routeEl.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => select(b.dataset.go)));
    S.sel = d.hl[d.hl.length - 1] || null; renderFicha(); refreshHL(); }
  function routeStop() { S.route = null; routeEl.classList.remove('show'); trail.visible = false; pulse.visible = false; refreshHL(); }
  // ---------- actualización por cuadro ----------
  function update(dt) { S.t += dt;
    // chapas: pestillos fuera = enclavada; adentro = abierta (orden OPEN o puerta abierta)
    const open = !X.KS.lock || P.cur > 0.005; const tgt = open ? 1 : 0; S.bolt += Math.sign(tgt - S.bolt) * Math.min(Math.abs(tgt - S.bolt), dt * 6);
    for (const k of ['3A', '3B']) CHAPA[k].bolt.position.z = S.bolt * 0.026;
    CHAPA['3B'].led.material.color.setHex(open ? 0x34d17a : 0xff3b30);
    // relés K1 / ESP32
    CJ.ledA.material.color.setHex(open ? 0x34d17a : 0x38c8ff);
    // tapa de la caja 2C
    CJ.open += Math.sign(CJ.tgt - CJ.open) * Math.min(Math.abs(CJ.tgt - CJ.open), dt * 2.2); CJ.lid.rotation.y = -CJ.open * 1.9;
    updCloser(); updLoop();
    if (!loopCab && E('8').loopPts) { loopCab = new THREE.Mesh(new THREE.BufferGeometry(), loopCabMat); loopCab.renderOrder = 30; root.add(loopCab); loopCab.visible = false; }
    if (loopCab && loopCab.visible && E('8').loopPts) { loopCab.geometry.dispose(); loopCab.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(E('8').loopPts), 20, 0.0045, 6); }
    // pulso de la ruta
    const R = S.route; if (R) { const e = (performance.now() - R.t0) / 1000; if (R.curve) { const u = Math.min(1, e / 2.6); pulse.position.copy(R.curve.getPointAt(u * u * (3 - 2 * u))); pulse.scale.setScalar(1 + 0.25 * Math.sin(S.t * 10)); }
      if (R.play && e > 5.2) { const n = ACC_SCN[R.sk].steps.length; if (R.i < n - 1) routeGo(R.i + 1); else R.play = false; } }
    if (S.sel) { const k = 0.3 + 0.16 * Math.sin(S.t * 5); setEm(S.sel, 0xf2a900, k); }
    renderBubbles(false); }
  function setXray(on) { S.xray = on; refreshHL(); }
  function setLabels(on) { S.labels = on; renderBubbles(true); }
  function setCones(on) { S.cones = on; refreshHL(); }
  S.cones = true; refreshHL();
  const onLayout = () => { layoutLeaf(); layoutExt(); loopKey = ''; };
  return { REG, C, select, focus, update, clickAt, fpFocus, openIdx, routeStart, routeStop, routeGo, routeState: () => S.route && { sk: S.route.sk, i: S.route.i }, setXray, setLabels, setCones, onLayout, S, CJ, worldOf, ids: () => [...REG.keys()].filter((i) => C[i]), name: (id) => C[id] && C[id].n, CABS, refreshHL, renderBubbles };
}
