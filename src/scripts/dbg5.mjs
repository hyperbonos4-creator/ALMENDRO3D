import { viewerUrl } from './html-url.mjs';
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 800, height: 500 } });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(viewerUrl());
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
console.log(await p.evaluate(() => { const A = __app, F = A.FP; A.fpEnter(); A.fpPose(-3.5, 5.3, -Math.PI / 2, 0, 'p1'); const r = [[A.FP.y, JSON.stringify(A.GT.v2.hz)]]; F.keys.KeyW = true; for (let i = 0; i < 5; i++) { A.sim(0.5); r.push([F.x.toFixed(2), F.z.toFixed(2), F.lvl, F.auto]); } F.keys.KeyW = false; return JSON.stringify(r); }));
await b.close();
