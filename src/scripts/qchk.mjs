import { viewerUrl } from './html-url.mjs';
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(viewerUrl());
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
const r = [];
for (const q of ['baja', 'media', 'alta']) r.push(await p.evaluate((q) => { __app.setQuality(q); const f = __app.W.LEV.p3.int.getObjectByName('fur'); const g = f.children.find((m) => m.userData.fur === 'glass'); return { q, glass: g.material.type, detailVisible: f.children.filter((m) => m.userData.furDetail).every((m) => m.visible), renderer: document.querySelector('#glR')?.textContent, rinner: document.querySelector('#glR')?.outerHTML.slice(0,200), perf: document.querySelector('#perfBox')?.innerText.slice(0,200) }; }, q));
console.log(JSON.stringify({ r, errs })); await b.close();
