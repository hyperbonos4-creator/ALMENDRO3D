import { chromium } from 'playwright';
const file = process.argv[2] || 'ed_almendra_3d.html', out = process.argv[3] || 'ev7dbg';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('CERR', m.text()); });
await p.goto('file:///workspace/almendra/3d/' + file);
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
const shots = JSON.parse(process.argv[4] || '[]');
for (const [name, js] of shots) { const r = await p.evaluate(js).catch((e) => 'E ' + e.message); await p.waitForTimeout(700); await p.screenshot({ path: `/tmp/${out}_${name}.png` }); console.log(name, JSON.stringify(r)); }
await b.close();
