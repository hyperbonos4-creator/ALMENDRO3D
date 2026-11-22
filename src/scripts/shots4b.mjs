import { chromium } from 'playwright';
const only = process.argv[2];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const logs = [];
async function shot(name, fn, vp = { width: 1600, height: 1000 }) {
  if (only && !only.split(',').some((o) => name.includes(o))) return;
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: 1 });
  p.on('console', (m) => { if (m.type() !== 'log' || /error|warn/i.test(m.text())) logs.push(`[${name}] ${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => logs.push(`[${name}] PAGEERROR: ${e.message}`));
  await p.goto('file:///workspace/almendra/3d/ed_almendra_3d.html');
  await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
  await p.waitForTimeout(500);
  const info = await fn(p);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `../shots4/${name}.png` });
  if (info) logs.push(`[${name}] info: ${JSON.stringify(info)}`);
  await p.close();
}
const E = (p, f, a) => p.evaluate(f, a);
const openSvc = 'for (const d of __app.SV.doors) { d.tgt = 1; d.manual = performance.now() + 1e9; d.set(d.max); }';
await shot('33_puertas_abiertas_rampa', async (p) => { return await E(p, (o) => { __app.fpEnter(); __app.fpPose(11.6, 1.6, Math.PI + 0.25, -0.12, -1.3); eval(o); __app.sim(0.3); return { y: __app.FP.y, l: __app.FP.lvl }; }, openSvc); });
await shot('35_cuarto_basuras_interior', async (p) => { return await E(p, (o) => { eval(o); __app.fpEnter(); __app.fpPose(14.95, 4.2, 2.5, -0.38, -1.59); __app.sim(0.3); return { y: __app.FP.y, l: __app.FP.lvl }; }, openSvc); });
await shot('43_lobby_escalones', async (p) => { await E(p, () => { __app.fpEnter(); __app.fpPose(4.2, 5.25, -Math.PI / 2, -0.05, 'p1'); __app.fpPose(4.2, 5.25, -Math.PI / 2, -0.05, 0); __app.sim(0.3); }); });
await shot('44_carro_detalle', async (p) => { await E(p, () => { __app.goView('sotano', true); __app.cam([17.4, -0.9, 18.3], [20.8, -2.45, 22.4]); }); });
console.log(logs.join('\n')); console.log('all logs', logs.length);
await b.close();
