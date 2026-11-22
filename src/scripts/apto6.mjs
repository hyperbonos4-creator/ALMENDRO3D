import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('file:///workspace/almendra/3d/ed_almendra_3d.html');
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
const r = await p.evaluate(() => { __app.setQuality('alta'); __app.fpEnter(); __app.fpPose(22.5, 17, 0, 0, 'p4'); __app.sim(0.3); return __app.BATCHED(); });
await p.waitForTimeout(1500); await p.screenshot({ path: '../shots6/regresion/apto_piso4_tras_fusion.png' }); console.log('batched', r); await b.close();
