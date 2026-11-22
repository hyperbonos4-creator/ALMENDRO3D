import { viewerUrl } from './html-url.mjs';
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(viewerUrl());
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
const r = await p.evaluate(() => { const T = __app.THREE; __app.fpEnter(); __app.fpPose(22.8, 3.7, 0, -0.35, 3.7); __app.sim(0.2);
  const o = new T.Vector3(22.8, 3.7 + 1.62, 3.7), out = [];
  for (const tgt of [[22.8, 4.1, 2.2], [22.3, 4.3, 2.2]]) { const d = new T.Vector3(...tgt).sub(o).normalize(); const rc = new T.Raycaster(o, d, 0, 10);
    const ms = []; __app.scene.traverse((m) => { if (m.isMesh) ms.push(m); }); const hs = rc.intersectObjects(ms, false).filter((h) => h.object.visible && (() => { let q = h.object; while (q) { if (!q.visible) return false; q = q.parent; } return true; })()).slice(0, 4);
    out.push(hs.map((h) => { const chain = []; let q = h.object; while (q && chain.length < 4) { chain.push(q.name || q.type); q = q.parent; } return { d: +h.distance.toFixed(2), y: +h.point.y.toFixed(2), px: +h.point.x.toFixed(2), pz: +h.point.z.toFixed(2), mat: h.object.material.type + (h.object.material.map ? 'M' : '') + (h.object.material.transparent ? 'T' : ''), col: h.object.material.color?.getHexString(), chain: chain.join('<'), mn: h.object.material.name, ud: JSON.stringify(h.object.userData).slice(0,80), bb: (() => { h.object.geometry.computeBoundingBox(); const b = h.object.geometry.boundingBox; return [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].map((v) => +v.toFixed(2)); })(), op: h.object.material.opacity, ro: h.object.renderOrder }; })); }
  return out; });
console.log(JSON.stringify(r, null, 1)); await b.close();
