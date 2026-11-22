import { chromium } from 'playwright';
const file = process.argv[2] || 'ed_almendra_3d.html';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('file:///workspace/almendra/3d/' + file);
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
const r = await p.evaluate(async () => {
  const S = __app.scene, R = __app.R; const lights = {}, mats = {}, matSet = new Set(); let meshes = 0, shadowL = 0;
  S.traverse((o) => { if (o.isLight) { const k = o.type + (o.castShadow ? '+shadow' : ''); lights[k] = (lights[k] || 0) + 1; if (o.castShadow) shadowL++; } if (o.isMesh) { meshes++; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => matSet.add(m)); } });
  matSet.forEach((m) => { const k = m.type + (m.transparent ? '/T' : '') + (m.transmission ? '/transm' : ''); mats[k] = (mats[k] || 0) + 1; });
  let texPx = 0, texN = 0; const seen = new Set(); matSet.forEach((m) => { for (const k of ['map', 'bumpMap', 'normalMap', 'emissiveMap', 'roughnessMap']) { const t = m[k]; if (t && !seen.has(t)) { seen.add(t); const i = t.image; if (i && i.width) { texPx += i.width * i.height; texN++; } } } });
  const labels = document.querySelectorAll('.tag').length;
  // per-frame JS timing: measure time in our rAF callback vs render
  __app.fpEnter(); __app.fpPose(20.6, 10.7, Math.PI / 2, -0.25, 'p3'); await new Promise((ok) => setTimeout(ok, 1500));

  return { lights, shadowL, meshes, mats, texN, texMpx: +(texPx / 1e6).toFixed(1), labels, shadowMap: R.shadowMap.enabled + '/' + R.shadowMap.type + '/auto=' + R.shadowMap.autoUpdate, dpr: R.getPixelRatio(), size: [R.domElement.width, R.domElement.height], info: __app.info() };
}).catch((e) => 'E ' + e.message);
console.log(JSON.stringify(r, null, 1)); await b.close();
