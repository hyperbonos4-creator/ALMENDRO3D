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
  const p = CAR.spot, cx = p.cx, cz = p.cz; const IN = new THREE.CurvePath(); IN.add(new THREE.LineCurve3(V2(-13, 2.3), V2(19, 2.3))); IN.add(bez([19, 2.3], [22.6, 2.3], [24.6, 1.9], [26.3, 1.9]));
  const REV = new THREE.CurvePath(); REV.add(bez([26.3, 1.9], [23.9, 1.9], [cx, cz - 2.7], [cx, cz]));
  const OUT = new THREE.CurvePath(); OUT.add(bez([cx, cz], [cx, cz - 2.0], [21.5, 2.36], [19.5, 2.36])); OUT.add(new THREE.LineCurve3(V2(19.5, 2.36), V2(-13, 2.3)));
  return { in: [{ c: IN, dir: 1, vmax: 3.2, gate: 'in' }, { c: REV, dir: -1, vmax: 1.1 }], out: [{ c: OUT, dir: 1, vmax: 3.0, gate: 'out' }] };
}
function carY(x, z) { if (x < 0) return 0; if (x <= RAMP.x1 && z < RAMP_S + 0.1) return rampY(x); return floorAt(x, z); }
const _cp = new THREE.Vector3(), _ct = new THREE.Vector3();
function carPose(c, u, dir) {
  c.getPointAt(u, _cp); c.getTangentAt(u, _ct); const fx = _ct.x * dir, fz = _ct.z * dir; const h = Math.atan2(-fz, fx);
  const x = _cp.x, z = _cp.z, hw = CAR.wb / 2; const yF = carY(x + fx * hw, z + fz * hw), yR = carY(x - fx * hw, z - fz * hw);
  CAR.m.position.set(x, (yF + yR) / 2 + 0.005, z); CAR.m.rotation.set(0, h, Math.atan2(yF - yR, CAR.wb));
  return { x, z, h };
}
function carPark() { const p = CAR.spot; CAR.m.position.set(p.cx, p.y + 0.005, p.cz); CAR.m.rotation.set(0, p.f < 0 ? Math.PI / 2 : -Math.PI / 2, 0); CAR.m.visible = true; CAR.state = 'parked'; CAR.ph = null; CAR.wheels.forEach((w) => { w.steer.rotation.y = 0; }); carLights(false); carBtn(); }
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
function carSegs() { if (CAR.state !== 'parked') return []; const p = CAR.spot, hw = p.Wd / 2 + 0.05, hl = p.L / 2 + 0.03; return segsOf([{ o: [[p.cx - hw, p.cz - hl], [p.cx + hw, p.cz - hl], [p.cx + hw, p.cz + hl], [p.cx - hw, p.cz + hl]] }]); }
carPark();
