import { viewerUrl } from './html-url.mjs';
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 400 } });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await p.goto(viewerUrl());
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
console.log(await p.evaluate(process.argv[2]));
await b.close();
