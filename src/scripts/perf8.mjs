import { viewerUrl } from './html-url.mjs';
// v8: métricas de render (draw calls / triángulos / ms por cuadro en SwiftShader) por calidad, v7 vs v8
import { chromium } from 'playwright';
const [file, tag] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(viewerUrl(file)); await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 120000 });
const views = { general: "__app.fpExit&&__app.FP.on&&__app.fpExit();__app.goView('general',true)", apto_p4: "__app.fpEnter();__app.fpPose(22.5,17,0,0,'p4')", sotano: "__app.fpEnter();__app.fpPose(22.5,6.5,Math.PI/2,0,'sot')" };
const res = {};
for (const q of ['alta', 'media', 'baja']) for (const [k, f] of Object.entries(views)) {
  await p.evaluate((q) => __app.setQuality(q), q); await p.evaluate(f); await p.waitForTimeout(1200);
  res[q + '_' + k] = await p.evaluate(() => new Promise((ok) => { const ts = []; const fr = (t) => { ts.push(t); if (ts.length < 16) requestAnimationFrame(fr); else { const d = ts.slice(1).map((x, i) => x - ts[i]).sort((a, b) => a - b); const i = __app.info(); ok({ calls: i.calls, tris: i.triangles, geos: i.geos, tex: i.tex, progs: i.progs, ms_med: +d[d.length >> 1].toFixed(1) }); } }; requestAnimationFrame(fr); }));
}
console.log(tag, JSON.stringify(res));
await b.close();
