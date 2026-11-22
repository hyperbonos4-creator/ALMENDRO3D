import { viewerUrl } from './html-url.mjs';
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 800, height: 450 } }); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(viewerUrl());
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
const r = await p.evaluate(() => { const T = __app.THREE; __app.fpEnter(); __app.fpPose(23.76, 10.09, 0, 0, -0.98); __app.sim(0.2);
  const vis = (o) => { let q = o; while (q) { if (!q.visible) return false; q = q.parent; } return true; };
  const ms = []; __app.scene.traverse((m) => { if (m.isMesh && vis(m)) ms.push(m); });
  const out = { lvl: __app.FP ? __app.FP.lvl : null };
  for (const [x, y, z] of [[23.76, -0.96, 10.09], [21.51, 0.77, 11.19], [23.0, -0.96, 11.0], [22.4, 0.0, 11.19]]) { const rc = new T.Raycaster(new T.Vector3(x, y, z), new T.Vector3(0, 1, 0), 0, 4);
    out[[x, y, z].join(',')] = rc.intersectObjects(ms, false).slice(0, 3).map((h) => { h.object.geometry.computeBoundingBox(); const bb = h.object.geometry.boundingBox; return { d: +h.distance.toFixed(2), py: +h.point.y.toFixed(2), par: h.object.parent?.name, mat: h.object.material.type, col: h.object.material.color?.getHexString(), bb: [bb.min.x, bb.min.y, bb.min.z, bb.max.x, bb.max.y, bb.max.z].map((v) => +v.toFixed(2)) }; }); }
  return out; });
console.log(JSON.stringify(r, null, 1)); await b.close();
