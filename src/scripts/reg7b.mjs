import { chromium } from 'playwright';
const only = process.argv[2];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const logs = [];
async function shot(name, fn, vp = { width: 1600, height: 1000 }, wait = 2500) {
  if (only && !only.split(',').some((o) => name.includes(o))) return;
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: 1 });
  p.on('console', (m) => { if (m.type() !== 'log' || /error|warn/i.test(m.text())) logs.push(`[${name}] ${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => logs.push(`[${name}] PAGEERROR: ${e.message}`));
  await p.goto('file:///workspace/almendra/3d/ed_almendra_3d.html');
  await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
  await p.waitForTimeout(500);
  const info = await fn(p);
  await p.waitForTimeout(wait);
  await p.screenshot({ path: `../shots7/reg_${name}.png` });
  if (info) logs.push(`[${name}] info: ${JSON.stringify(info)}`);
  await p.close();
}
const E = (p, f, a) => p.evaluate(f, a);
const noU = '__app.st.urban = false; __app.applyVis();';
const kz = 'var kz = __app.GT.kz;';
await shot('50_porton_cerrado_frente', async (p) => { await E(p, (o) => { eval(o); __app.cam([-9.5, 2.7, 3.7], [0, 2.7, 3.7]); }, noU); });
await shot('50b_porton_cerrado_frente_capas', async (p) => { await E(p, () => { __app.cam([-9.5, 2.7, 3.7], [0, 2.7, 3.7]); }); });
await shot('51_porton_vehicular_abierto_peatonal_cerrada', async (p) => { return await E(p, (o) => { eval(o); __app.openVeh(true); __app.CAR.t = -1; __app.CAR.m.visible = false; const G = __app.GT; G.v1.cur = G.v2.cur = 1; __app.sim(0.1); __app.cam([-7.5, 3.6, -1.2], [1.2, 1.6, 3.9]); return { ped: G.ped.cur, v1: G.v1.cur }; }, noU); });
await shot('51b_porton_abierto_desde_adentro', async (p) => { await E(p, (o) => { eval(o); __app.openVeh(true); __app.CAR.t = -1; __app.CAR.m.visible = false; const G = __app.GT; G.v1.cur = G.v2.cur = 1; __app.sim(0.1); __app.fpEnter(); __app.fpPose(4.6, 5.3, Math.PI / 2 - 0.25, -0.12, 0); __app.CAR.m.visible = false; __app.sim(0.2); }, noU); });
await shot('51c_porton_abriendo_2_hojas', async (p) => { await E(p, (o) => { eval(o); __app.openVeh(true); __app.CAR.t = -1; __app.CAR.m.visible = false; const G = __app.GT; G.v1.cur = G.v2.cur = 0.45; G.v1.tgt = G.v2.tgt = 0.45; __app.sim(0.1); __app.cam([-8.5, 2.8, 3.7], [0.5, 2.0, 3.7]); }, noU); });
await shot('52_kiosko_cerca_reposo', async (p) => { await E(p, (o) => { eval(o); __app.fpEnter(); __app.KS.frozen = true; __app.KS.st = 'idle'; __app.KS.dirty = true; __app.fpPose(-0.47, kz + 0.01, -Math.PI / 2, -0.34, 0); __app.sim(0.1); }, kz); });
await shot('53_kiosko_escaneando', async (p) => { await E(p, (o) => { eval(o); __app.fpEnter(); __app.fpPose(-0.47, kz + 0.01, -Math.PI / 2, -0.34, 0); __app.KS.frozen = true; __app.KS.st = 'scan'; __app.KS.t = 1.5; __app.KS.dirty = true; __app.sim(0.1); }, kz); });
await shot('54_kiosko_bienvenido', async (p) => { await E(p, (o) => { eval(o); __app.fpEnter(); __app.fpPose(-0.47, kz + 0.01, -Math.PI / 2, -0.34, 0); __app.KS.frozen = true; __app.KS.st = 'open'; __app.KS.src = 'face'; __app.KS.lock = false; __app.KS.dirty = true; __app.sim(0.1); }, kz); });
await shot('55_kiosko_orbita_visera', async (p) => { await E(p, (o) => { eval(o); eval(noU0); __app.cam([-0.75, 1.85, kz - 0.75], [-0.08, 1.5, kz]); }, kz + 'var noU0 = "__app.st.urban = false; __app.applyVis();";'); });
// flujo real: acercarse, mirar, reconocer → la puerta abre sola
await shot('56_flujo_real_puerta_peatonal_abierta', async (p) => { return await E(p, (o) => { eval(o); __app.fpEnter(); __app.fpPose(-0.62, kz, -Math.PI / 2, -0.06, 0); __app.sim(2.6); const s1 = __app.KS.st; __app.sim(2.4); const s2 = __app.KS.st; __app.KS.frozen = true; __app.fpPose(-2.6, 4.2, -Math.PI / 2 - 0.25, -0.05, 0); __app.sim(0.05); return { s1, s2, ped: __app.GT.ped.cur, v1: __app.GT.v1.cur, v2: __app.GT.v2.cur }; }, kz); });
await shot('57_paso_y_cierre_detras', async (p) => { return await E(p, (o) => { eval(o); __app.fpEnter(); __app.fpPose(-0.62, kz, -Math.PI / 2, -0.06, 0); __app.sim(4.5); const a = __app.KS.st; __app.fpPose(-0.5, 5.3, -Math.PI / 2, 0, 0); const F = __app.FP; F.keys.KeyW = true; __app.sim(2.6); F.keys.KeyW = false; const x = F.x; __app.sim(0.3); F.yaw = Math.PI / 2; __app.sim(1.4); return { a, x, st: __app.KS.st, ped: __app.GT.ped.cur }; }, kz); });
await shot('58_puerta_cerrada_reenclavada', async (p) => { return await E(p, (o) => { eval(o); __app.fpEnter(); __app.fpPose(-0.62, kz, -Math.PI / 2, -0.06, 0); __app.sim(4.5); __app.fpPose(-0.5, 5.3, -Math.PI / 2, 0, 0); const F = __app.FP; F.keys.KeyW = true; __app.sim(2.6); F.keys.KeyW = false; F.yaw = Math.PI / 2; __app.sim(6); __app.KS.frozen = true; return { st: __app.KS.st, ped: __app.GT.ped.cur, lock: __app.KS.lock, x: F.x }; }, kz); });
await shot('59_veh_bloquea_peatonal_kiosko', async (p) => { return await E(p, (o) => { eval(o); __app.openVeh(true); __app.CAR.t = -1; __app.CAR.m.visible = false; __app.GT.v1.cur = __app.GT.v2.cur = 1; __app.fpEnter(); __app.CAR.m.visible = false; const r = __app.pedCycle('face'); __app.KS.frozen = true; __app.KS.dirty = true; __app.fpPose(-0.47, kz + 0.01, -Math.PI / 2, -0.34, 0); __app.sim(0.1); return { r, st: __app.KS.st, ped: __app.GT.ped.cur }; }, kz); });
await shot('60_movil_kiosko', async (p) => { await E(p, (o) => { eval(o); __app.fpEnter(); __app.fpPose(-0.7, kz, -Math.PI / 2, -0.08, 0); __app.KS.frozen = true; __app.KS.st = 'scan'; __app.KS.t = 1.2; __app.KS.dirty = true; __app.sim(0.1); }, kz); }, { width: 390, height: 844 });
// capturas planas de la pantalla del kiosko (canvas) en cada estado
{ const p = await b.newPage({ viewport: { width: 800, height: 500 } }); await p.goto('file:///workspace/almendra/3d/ed_almendra_3d.html'); await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
  const urls = await p.evaluate(() => { const K = __app.KS; K.frozen = true; const out = {}; for (const [st, t, src] of [['idle', 0, 'face'], ['scan', 1.4, 'face'], ['open', 0, 'face'], ['done', 0, 'face'], ['vehopen', 0, 'face']]) { K.st = st; K.t = t; K.src = src; __app.drawKiosk(); out[st] = __app.GT.kcv.toDataURL('image/png'); } return out; });
  const fs = await import('fs'); for (const [k, v] of Object.entries(urls)) fs.writeFileSync(`../shots7/reg_ui_${k}.png`, Buffer.from(v.split(',')[1], 'base64')); await p.close(); }
console.log(logs.join('\n')); console.log('all logs', logs.length);
await b.close();
