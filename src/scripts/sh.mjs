import { viewerUrl } from './html-url.mjs';
// uso: node scripts/sh.mjs <html> <outdir> <shots.json|inline-json> [filtro]
import { chromium } from 'playwright';
import fs from 'fs';
const [html, out, spec, only] = process.argv.slice(2);
const list = JSON.parse(fs.existsSync(spec) ? fs.readFileSync(spec, 'utf8') : spec);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const logs = [];
for (const s of list) {
  if (only && !only.split(',').some((o) => s.n.includes(o))) continue;
  const p = await b.newPage({ viewport: s.vp || { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => logs.push(`[${s.n}] PAGEERROR: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${s.n}] ${m.type()}: ${m.text()}`); });
  await p.goto(viewerUrl(html), { timeout: 180000 });
  await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 120000 });
  await p.evaluate((q) => __app.setQuality(q), s.q || 'alta');
  await p.waitForTimeout(200);
  let info; try { info = await p.evaluate(s.f); } catch (e) { logs.push(`[${s.n}] EVAL: ${e.message}`); }
  await p.waitForTimeout(s.w || 1800);
  await p.screenshot({ path: `${out}/${s.n}.png` });
  if (info !== undefined) logs.push(`[${s.n}] ${JSON.stringify(info)}`);
  await p.close();
  fs.appendFileSync(out + '/_log.txt', logs.splice(0).join('\n') + '\n');
}
console.log(logs.join('\n'));
await b.close();
