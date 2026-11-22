import { viewerUrl } from './html-url.mjs';
import { chromium } from 'playwright';
const file = process.argv[2] || 'ed_almendra_3d.html', tag = process.argv[3] || '', Q = process.argv[4] || '';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const res = {};
const views = {
  orbita_general: () => { __app.goView('general', true); },
  orbita_ingreso: () => { __app.goView('ingreso', true); },
  fp_calle: () => { __app.fpEnter(); __app.fpPose(-5.4, 5.3, -Math.PI / 2, 0, 0); },
  fp_sotano_rampa: () => { __app.fpEnter(); __app.fpPose(12.6, 2.4, Math.PI / 2 - 0.05, 0.12, -1.37); },
  fp_sotano_pasillo: () => { __app.fpEnter(); __app.fpPose(22.5, 6.5, Math.PI / 2, 0, 'sot'); },
  fp_apto_piso4: () => { __app.fpEnter(); __app.fpPose(22.5, 17, 0, 0, 'p4'); },
};
for (const [k, fn] of Object.entries(views)) {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto(viewerUrl(file));
  await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
  if (Q) await p.evaluate((q) => { if (__app.setQuality) __app.setQuality(q); }, Q);
  await p.evaluate(fn); await p.waitForTimeout(Q === 'auto' ? 6000 : 1500);
  res[k] = await p.evaluate(() => new Promise((ok) => { const ts = []; let n = 0; let lay = 0; const f = (t) => { ts.push(t); if (++n < 40) requestAnimationFrame(f); else { const d = ts.slice(1).map((x, i) => x - ts[i]); d.sort((a, b) => a - b); const i = __app.info(); ok({ q: __app.QUAL ? JSON.stringify(__app.QUAL) : '-', calls: i.calls, tris: i.triangles, geos: i.geos, progs: i.progs, frame_ms_med: +d[d.length >> 1].toFixed(1) }); } }; requestAnimationFrame(f); }));
  await p.close();
}
console.log(tag, JSON.stringify(res, null, 1));
await b.close();
