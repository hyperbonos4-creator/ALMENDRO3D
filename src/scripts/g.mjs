import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.goto('file:///workspace/almendra/3d/ed_almendra_3d.html');
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
console.log(await p.evaluate(() => [document.querySelectorAll('#glR').length, document.querySelector('#glR').textContent, document.querySelector('#glR').title]));
await b.close();
