import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('file:///workspace/almendra/3d/ed_almendra_3d.html');
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
const r = await p.evaluate(() => { const g = __app.scene.getObjectByName('int_p2'); const out = {}; for (const c of g.children) { const k = c.type + ':' + (c.isMesh ? (c.material.type + (c.material.transparent ? 'T' : '') + (c.material.map ? 'M' : '')) : c.children.length) + ':' + c.visible; out[k] = (out[k] || 0) + 1; } return out; });
console.log(JSON.stringify(r, null, 0)); await b.close();
