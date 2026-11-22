import { viewerUrl } from './html-url.mjs';
import { chromium } from 'playwright';
const file = process.argv[2] || 'ed_almendra_3d.html';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(viewerUrl(file));
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
await p.evaluate(() => { __app.setQuality('baja'); __app.fpEnter(); __app.fpPose(20.6, 10.7, Math.PI / 2, -0.25, 'p3'); });
await p.waitForTimeout(1500);
const c = await p.context().newCDPSession(p); await c.send('Profiler.enable'); await c.send('Profiler.setSamplingInterval', { interval: 200 }); await c.send('Profiler.start');
await p.waitForTimeout(4000);
const { profile } = await c.send('Profiler.stop');
const self = {}; const dt = profile.timeDeltas; const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const cnt = {}; profile.samples.forEach((s, i) => { cnt[s] = (cnt[s] || 0) + (dt[i] || 0); });
for (const [id, us] of Object.entries(cnt)) { const n = byId.get(+id); const k = (n.callFrame.functionName || '(anon)') + ':' + n.callFrame.lineNumber + ':' + n.callFrame.columnNumber; self[k] = (self[k] || 0) + us / 1000; }
const tot = Object.values(self).reduce((a, b) => a + b, 0);
console.log('total ms', tot.toFixed(0)); Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, v]) => console.log(v.toFixed(0).padStart(6), k));
await b.close();
