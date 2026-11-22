// ================= RECORRIDO EN PRIMERA PERSONA (v3: tipo videojuego) =================
const FP = { on: false, x: -5.4, z: 4.4, y: 0, yaw: -Math.PI / 2, pitch: 0, mode: 'ground', floor: null, lvl: 'p1', keys: {}, joy: { x: 0, y: 0 }, prevCut: null, bob: 0, auto: null, focus: null, inCab: false, room: null, spd: 0 };
const EYE = 1.62, RAD = 0.22, STEP = 0.45;
const TIPS = ['p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
const { EV, CI, ED, SH, ST: STR, PAIRS, stairY, LEV } = W;
function segsOf(polys) { const out = []; for (const p of polys) for (const ring of [p.o, ...(p.h || [])]) for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; out.push([a[0], a[1], b[0], b[1]]); } return out; }
function pip(polys, x, z) { for (const p of polys) { let c = false; const r = p.o; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } if (c) return true; } return false; }
function dSeg(px, pz, s) { const [ax, az, bx, bz] = s; const dx = bx - ax, dz = bz - az; const L = dx * dx + dz * dz || 1e-9; let t = ((px - ax) * dx + (pz - az) * dz) / L; t = Math.max(0, Math.min(1, t)); const qx = ax + t * dx - px, qz = az + t * dz - pz; return Math.sqrt(qx * qx + qz * qz); }
// rejilla espacial de segmentos (1 m)
function grid(segs) { const G = new Map(); for (const s of segs) { const x0 = Math.floor(Math.min(s[0], s[2]) - 0.4), x1 = Math.floor(Math.max(s[0], s[2]) + 0.4), z0 = Math.floor(Math.min(s[1], s[3]) - 0.4), z1 = Math.floor(Math.max(s[1], s[3]) + 0.4);
  for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const k = i * 1000 + j; if (!G.has(k)) G.set(k, []); G.get(k).push(s); } } return G; }
const SEGS_SOT = [...segsOf(S.walls4).filter((g) => !(Math.max(g[0], g[2]) < 7.7 && Math.min(g[1], g[3]) > 3.75 && Math.max(g[1], g[3]) < 4.25)), ...segsOf(S.cols4),
  [1.2, 3.97, 7.8, 3.97], [16.4, 8.3, 24.55, 8.3], [16.5, 3.97, 21.79, 3.97], [24.55, 8.3, 24.55, 12.6],
  ...[...PARK.deck, ...PARK.low].flatMap(([x, z]) => segsOf([{ o: [[x - 0.9, z - 2.15], [x + 0.9, z - 2.15], [x + 0.9, z + 2.15], [x - 0.9, z + 2.15]] }])),
  [17.3, 13.0, 19.2, 13.0], [19.2, 13.0, 19.2, 17.0], [17.3, 17.0, 19.2, 17.0], [STR.x0, STR.zm, STR.x0, STR.z1]];
const SEGS_GROUND = [[1.2, 3.97, 7.884, 3.97], [0, 0.49, 0, 0.64], [0, 6.74, 0, 6.89], [-0.12, 0.49, 0.12, 0.49], [-0.12, 6.89, 0.12, 6.89], [0.1, 6.74, 7.884, 6.74], [7.884, 6.4, 7.884, 6.74], [7.884, 3.9, 7.884, 4.1]];
const GRID = {
  sot: grid([...SEGS_SOT, ...W.seg.stair, ...W.seg.elev]),
  p1: grid([...SEGS_GROUND, ...W.seg.p1, ...W.seg.stair, ...W.seg.elev]),
  tip: grid([...W.seg.tip, ...W.seg.stair, ...W.seg.elev]),
};
const P7BAR = [STR.x0, STR.z0, STR.x0, STR.zm];
function setKey(x, z, y) { if (x >= 0 && pip(S.band1, x, z)) return 'sot'; return lvlOf(y); }
function lvlOf(y) { if (y < -1.2) return 'sot'; if (y < LEVY.p2 - 1.0) return 'p1'; let id = 'p2'; for (const k of TIPS) if (LEVY[k] <= y + 1.0) id = k; return id; }
function dynSegs(lvl) {
  const out = [];
  const E = LEV[lvl];
  if (E) { for (const d of E.doors) out.push(d.seg()); if (E.bal) out.push(E.bal.seg()); if (E.ent) { const s = E.ent.seg(); if (s) out.push(s); } }
  if (lvl === 'p7') out.push(P7BAR);
  if (lvl === 'p1' || lvl === 'sot') { GT.leaves.forEach((L) => out.push(leafSeg(L))); out.push([0, GT.Z0 + 0.91 * GT.W, 0, GT.Z1]); }
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
  if (x >= 0 && pip(S.band1, x, z)) out.push(rampY(x));
  else {
    if (x < 7.884) out.push(x < -0.1 ? 0 : 0.0);
    else if (pipH(W.walk.p1, x, z)) out.push(0);
    if (pip(S.foot4, x, z) && x > 7.6) out.push(pip(S.deck, x, z) ? RAMP.deck : pip(S.lane2, x, z) ? laneY(z) : RAMP.low);
  }
  if (pipH(W.walk.tip, x, z)) for (const id of TIPS) out.push(LEVY[id]);
  return out;
}
function pickH(x, z, y) { let best = null; for (const h of cands(x, z)) if (h <= y + STEP && (best === null || h > best)) best = h; if (best !== null && y - best > 0.6) return null; return best; }
// ---------- interacción ----------
function roomAt(x, z, lvl) { if (!/^p[2-7]$/.test(lvl)) return null; for (const r of W.rooms) if (r.type !== 'hall' && pipH([r], x, z)) return r; if (pipH(I.hallFloor, x, z)) return W.rooms.find((r) => r.type === 'hall'); return null; }
const NAMEAPT = { '01': 'Tipo 1', '02': 'Tipo 1', '03': 'Tipo 2', '04': 'Tipo 3' };
function doorLabel(d, lvl) { const r = roomAt(FP.x, FP.z, lvl); const other = r && r.id === d.ra ? d.rb : d.ra; const ro = W.rooms.find((q) => q.id === other); if (d.entry) { const a = W.rooms.find((q) => q.id === d.ra)?.apt || W.rooms.find((q) => q.id === d.rb)?.apt; return a ? 'Apto ' + (+lvl.slice(1) * 100 + +a) : 'Apartamento'; } return ro ? ro.name : ''; }
function nearElev() { return !FP.inCab && Math.abs(FP.y - LEVY[FP.lvl]) < 0.3 && FP.x > ED[1] - 0.05 && FP.x < ED[1] + 2.3 && FP.z > ED[2] - 1.2 && FP.z < ED[3] + 1.2; }
function inCabin() { return FP.x > CI.x0 - 0.05 && FP.x < CI.x1 + 0.12 && FP.z > CI.z0 && FP.z < CI.z1 && Math.abs(FP.y - EV.y) < 0.4; }
function findFocus() {
  const fx = -Math.sin(FP.yaw), fz = -Math.cos(FP.yaw); let best = null, bs = 1e9; const E = LEV[FP.lvl];
  const consider = (o, kind, px, pz, lab) => { const dx = px - FP.x, dz = pz - FP.z, d = Math.hypot(dx, dz); if (d > 1.9) return; const dot = (dx * fx + dz * fz) / (d || 1); if (d > 0.8 && dot < 0.55) return; const sc = d * (1.6 - dot); if (sc < bs) { bs = sc; best = { o, kind, lab }; } };
  if (E && Math.abs(FP.y - E.y) < 1.2) { for (const d of E.doors) consider(d, 'door', d.cx, d.cz); if (E.bal) consider(E.bal, 'bal', E.bal.cx, E.bal.cz); }
  if (FP.lvl === 'p1' && FP.x < 3.2 && Math.abs(FP.y) < 0.4) { if (FP.z > GT.ped.hz - GT.ped.w - 0.6 && FP.z < GT.Z1 + 0.8 && Math.abs(FP.x) < 3.2) best = { kind: 'ped' }; else if (FP.z < GT.v2.hz + 0.3 && FP.z > GT.Z0 - 1) best = { kind: 'veh' }; }
  return best;
}
function interact(f = FP.focus) {
  if (FP.auto) return;
  if (FP.inCab) { if (EV.state === 'open' || EV.state === 'opening') evClose(); else evOpen(); return; }
  if (nearElev()) { evCall(FP.lvl); return; }
  if (!f) return;
  if (f.kind === 'door') { f.o.tgt = f.o.tgt ? 0 : 1; f.o.manual = performance.now(); sfx('door'); }
  else if (f.kind === 'bal') { f.o.tgt = f.o.tgt ? 0 : 1; sfx('slide'); }
  else if (f.kind === 'ped') { openPed(true); setTimeout(() => openPed(false), 4500); }
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
  W.EV.light.intensity = FP.on && Math.abs(FP.y - EV.y) < 3 ? 2.2 : 0;
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
    if (E.ent) { const want = pl && FP.x > 5.2 && FP.x < 10.5 && FP.z > 3.9 && FP.z < 6.9 ? 1 : 0; if (Math.abs(E.ent.a - want) > 1e-3) E.ent.set(E.ent.a + Math.sign(want - E.ent.a) * Math.min(Math.abs(want - E.ent.a), dt * 1.6)); }
  }
}
// ---------- sonido (WebAudio, silenciado por defecto) ----------
const AU = { on: false, ctx: null, hum: null };
function actx() { if (!AU.ctx) { try { AU.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { AU.ctx = null; } } return AU.ctx; }
function sfx(k) {
  if (!AU.on) return; const c = actx(); if (!c) return; const t = c.currentTime; const g = c.createGain(); g.connect(c.destination);
  if (k === 'ding') { for (const [f, d] of [[880, 0], [660, 0.32]]) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; const gg = c.createGain(); gg.gain.setValueAtTime(0.0001, t + d); gg.gain.exponentialRampToValueAtTime(0.18, t + d + 0.02); gg.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.2); o.connect(gg); gg.connect(c.destination); o.start(t + d); o.stop(t + d + 1.3); } return; }
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
  FPL.hemi.intensity = FP.on ? (indoor ? 0.9 : 0.25) : 0;
  const y = (LEV[FP.lvl]?.y ?? 0);
  let pts = [];
  if (/^p[2-7]$/.test(FP.lvl)) pts = W.TIP.lampPts.map((p) => ({ ...p, d: Math.hypot(p.x - FP.x, p.z - FP.z) })).sort((a, b) => a.d - b.d).slice(0, 3).map((p) => [p.x, y + 2.25, p.z]);
  else if (FP.lvl === 'p1') pts = [[9.8, 3.2, 5.24], [14.2, 3.2, 5.24], [20.4, 3.2, 10.7]].sort((a, b) => Math.hypot(a[0] - FP.x, a[2] - FP.z) - Math.hypot(b[0] - FP.x, b[2] - FP.z));
  else pts = [[20.4, -0.6, 10.7], [21.5, -0.6, 15.5], [12, -0.6, 6]].sort((a, b) => Math.hypot(a[0] - FP.x, a[2] - FP.z) - Math.hypot(b[0] - FP.x, b[2] - FP.z));
  FPL.pts.forEach((p, i) => { const q = pts[i]; if (FP.on && q && indoor) { p.position.set(...q); p.intensity = i === 0 ? 3.2 : 2.2; } else p.intensity = 0; });
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
const TPP = { inicio: [-5.4, 4.4, -Math.PI / 2, 0], acceso: [6.2, 5.4, -Math.PI / 2, 0] };
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
  if (GT.blk) GT.blk.forEach((m) => { m.visible = !(FP.x > 7.0 && lvl === 'p1'); });
  st.cut = null; cutSel.value = '';
}
function intVisOrbit() { FLOORS.forEach((id) => { const E = LEV[id]; E.int.visible = !!(st.xray || st.explode > 0 || st.cut === id); if (E.ceil) E.ceil.visible = false; }); if (GT.blk) GT.blk.forEach((m) => { m.visible = true; }); }
// ---------- HUD ----------
const hud = { where: $('#fpWhere'), sub: $('#fpSub'), prompt: $('#fpPrompt'), elev: $('#elev'), act: $('#fpActBtn') };
function placeName() {
  const lvl = FP.lvl;
  if (FP.inCab) return ['Ascensor', EV.state === 'moving' ? (EV.dir > 0 ? 'Subiendo ▲ ' : 'Bajando ▼ ') + EV.curLabel + (EV.target ? ' → ' + FLABEL[EV.target] : '') : 'Piso ' + EV.curLabel];
  if (FP.x >= STR.x0 && FP.x <= STR.xl && FP.z >= STR.z0 && FP.z <= STR.z1) { const lo = FLOORS.slice().reverse().find((f) => LEVY[f] <= FP.y + 0.05) || 'sot'; const hi = FLOORS[FLOORS.indexOf(lo) + 1]; return ['Escalera', Math.abs(FP.y - LEVY[lo]) < 0.05 ? (lo === 'sot' ? 'Sótano' : 'Piso ' + FLABEL[lo]) : 'Entre ' + (lo === 'sot' ? 'sótano' : 'piso ' + FLABEL[lo]) + ' y piso ' + FLABEL[hi]]; }
  if (lvl === 'sot') return [FP.x < 7.7 && pip(S.band1, FP.x, FP.z) ? 'Rampa vehicular' : 'Sótano', pip(S.band1, FP.x, FP.z) ? 'Pendiente 10,9 % (PL_A004)' : 'Parqueaderos · N-2.96'];
  if (lvl === 'p1') { if (FP.x < -0.6) return ['Andén / calle', 'Frente del edificio']; if (FP.x < 7.884) return ['Paso peatonal', 'Portón URBAN en borde de calle']; return ['Piso 1 · Lobby', 'Distribución aproximada (falta plancha 1/6)']; }
  const r = roomAt(FP.x, FP.z, lvl); const fl = +lvl.slice(1);
  if (!r) return ['Piso ' + fl, ''];
  if (r.type === 'hall') return ['Piso ' + fl + ' · Hall', 'Aptos ' + fl + '01–' + fl + '04 · ascensor · escalera'];
  return ['Piso ' + fl + ' · Apto ' + (fl * 100 + +r.apt) + ' (' + NAMEAPT[r.apt] + ')', r.name + (r.area ? ' · ' + r.area.toFixed(2).replace('.', ',') + ' m²' : '')];
}
let lastHud = '';
function fpHud() {
  const [a, b] = placeName(); FP.mode = /^p[2-7]$/.test(FP.lvl) ? 'floor' : FP.lvl === 'p1' ? 'ground' : 'sot';
  let pr = '', act = '', ek = '';
  const f = FP.focus;
  if (FP.auto) pr = '<span class="auto">Recorrido automático…</span>';
  else if (FP.inCab) { pr = 'Elige el piso en la botonera  <b>1–7</b> · <b>0</b> = Sótano · <b>E</b> abrir/cerrar'; act = EV.state === 'open' ? 'Cerrar' : 'Abrir'; ek = 'cab'; }
  else if (nearElev()) { const here = FLOORS[EV.fi] === FP.lvl && EV.state !== 'moving'; pr = here && EV.door > 0.5 ? 'Entra al ascensor · o elige piso para ir automáticamente' : '<b>E</b> Llamar ascensor · o elige piso <b>0–7</b>'; act = here && EV.door > 0.5 ? 'Cerrar' : 'Llamar'; ek = 'land'; }
  else if (f) { if (f.kind === 'door') { act = f.o.tgt ? 'Cerrar' : 'Abrir'; pr = `<b>E</b> ${act} puerta · ${doorLabel(f.o, FP.lvl)}`; } else if (f.kind === 'bal') { act = f.o.tgt ? 'Cerrar' : 'Abrir'; pr = `<b>E</b> ${act} puerta‑ventana del balcón`; } else if (f.kind === 'ped') { act = 'Abrir'; pr = '<b>E</b> Abrir puerta peatonal con URBAN (facial — simulado)'; } else if (f.kind === 'veh') { act = 'Portón'; pr = '<b>V</b> Abrir portón vehicular (fase 2 — motor/control por definir)'; } }
  const key = a + b + pr + act + ek + EV.state + EV.curLabel + EV.target + FP.lvl;
  if (key === lastHud) return; lastHud = key;
  hud.where.textContent = a; hud.sub.textContent = b; hud.prompt.innerHTML = pr;
  hud.act.textContent = act || '·'; hud.act.classList.toggle('dim', !act);
  // panel de ascensor contextual
  hud.elev.classList.toggle('show', !!ek);
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
  SKY.visible = false; M.ground.color.set(0x1b2027); if (GRIDH) GRIDH.visible = true; scene.environmentIntensity = 0.45; FPL.hemi.intensity = 0; FPL.pts.forEach((p) => (p.intensity = 0)); hum(false);
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
$('#fpOpen').onclick = () => { openPed(true); setTimeout(() => openPed(false), 4500); };
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
  mctx.textAlign = 'right'; mctx.fillStyle = '#9aa3ad'; mctx.fillText('N ↑ plano', Wd - 12, Ht - 13);
}
