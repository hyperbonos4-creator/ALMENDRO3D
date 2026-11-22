import { viewerUrl } from './html-url.mjs';
import { chromium } from 'playwright';
const file = process.argv[2] || 'ed_almendra_3d.html'; const q = process.argv[3] || 'alta';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(viewerUrl(file));
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
await p.evaluate((q) => { __app.setQuality && __app.setQuality(q); __app.fpEnter(); }, q);
const out = { q };
for (const [name, pose] of [['hall_p3', [20.6, 10.7, Math.PI / 2, -0.25, 'p3']], ['bano_202', [18.85, 17.15, Math.PI, -0.2, 'p3']], ['sala_303', [21.0, 3.0, 2.36, -0.2, 'p3']], ['cocina_302', [20.0, 21.9, -1.5708, -0.25, 'p3']]]) {
  await p.evaluate((ps) => { __app.fpPose(...ps); __app.sim(0.3); }, pose); await p.waitForTimeout(2500);
  out[name] = await p.evaluate(() => { const i = __app.info(); return { calls: i.calls, tris: i.triangles, frame: i.frame }; }); }
out.fps = await p.evaluate(() => document.querySelector('#fps')?.textContent);
console.log(JSON.stringify(out)); await b.close();
