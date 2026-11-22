import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 800, height: 450 } }); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('file:///workspace/almendra/3d/ed_almendra_3d.html');
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
console.log(JSON.stringify(await p.evaluate(() => __app.W.FUR.sinks)));
await b.close();
