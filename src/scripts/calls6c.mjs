import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('file:///workspace/almendra/3d/ed_almendra_3d.html');
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
const r = await p.evaluate(() => { const out = {}; __app.scene.traverse((g) => { if (!g.isGroup && !g.isScene) return; const by = new Map(); for (const c of g.children) if (c.isMesh && !c.children.length && !Array.isArray(c.material)) { const k = c.material.type + (c.material.transparent?"T":"") + (c.material.map?"M":"") + ":" + c.material.uuid.slice(0,4); by.set(k, (by.get(k) || 0) + 1); } const ks = [...by.entries()].filter(e => e[1] > 1); if (ks.length) out[(g.name || g.type) + "#" + g.id + "<" + (g.parent && g.parent.name)] = ks; }); return out; });
console.log(JSON.stringify(r)); await b.close();
