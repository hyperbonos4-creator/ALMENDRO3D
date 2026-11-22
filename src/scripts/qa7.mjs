import { chromium } from 'playwright';
import fs from 'fs';
// uso: node qa7.mjs poses.json outdir
const poses = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const OUT = process.argv[3] || '/tmp/qa'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); let errs = 0;
p.on('pageerror', (e) => { errs++; console.log('ERR', e.message); });
await p.goto('file:///workspace/almendra/3d/ed_almendra_3d.html');
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
await p.evaluate(() => { __app.setQuality('alta'); __app.fpEnter(); document.querySelectorAll('#elev,#fpPrompt').forEach((e) => (e.style.visibility = 'hidden')); });
for (const [name, x, z, yaw, pitch, y, js] of poses) {
  const r = await p.evaluate(({ x, z, yaw, pitch, y, js }) => { if (x != null) { __app.fpPose(x, z, yaw, pitch, y); } if (js) eval(js); __app.sim(0.15); if (x != null) { __app.FP.yaw = yaw; __app.FP.pitch = pitch; __app.sim(0.02); } const F = __app.FP; return { x: +F.x.toFixed(2), z: +F.z.toFixed(2), y: +F.y.toFixed(3), lvl: F.lvl, where: document.querySelector('#fpWhere,.loc b,#fpTop b')?.textContent || '' }; }, { x, z, yaw, pitch, y, js }).catch((e) => 'E ' + e.message);
  await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${name}.png` }); console.log(name, JSON.stringify(r));
}
console.log('errors', errs); await b.close();
