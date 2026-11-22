import { viewerUrl } from './html-url.mjs';
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 560 } });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message, e.stack));
p.on('console', (m) => console.log(m.type(), m.text()));
await p.goto(viewerUrl());
await p.waitForTimeout(15000);
await b.close();
