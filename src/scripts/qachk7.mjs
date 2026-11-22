import { viewerUrl } from './html-url.mjs';
// v7 QA programático: coplanaridad (z-fighting), altura libre en escalera, holgura de cámara, mobiliario fuera de recintos
import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 800, height: 450 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(viewerUrl());
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
const out = await p.evaluate(() => {
  const T = __app.THREE, W = __app.W, LEVY = __app.LEVY; const R = {};
  __app.fpEnter(); __app.fpPose(20.7, 10.69, 0, 0, 'p3'); __app.sim(0.1);
  Object.values(W.LEV).forEach((E) => { E.int.visible = true; if (E.ceil) E.ceil.visible = true; });
  const vis = (o) => { let q = o; while (q) { if (!q.visible) return false; q = q.parent; } return true; };
  const ms = []; __app.scene.traverse((m) => { if (m.isMesh && vis(m) && !m.material.transparent && !m.material.transmission) ms.push(m); });
  const rc = new T.Raycaster(); const up = new T.Vector3(0, 1, 0);
  const firstHit = (o, d, far = 5) => { rc.set(o, d); rc.far = far; const h = rc.intersectObjects(ms, false); return h.length ? h[0] : null; };
  // ---- escalera: altura libre y holgura de cámara ----
  const ST = W.ST; const st = [];
  for (const P of W.PAIRS) { let minH = 9, minHat = null, minC = 9, minCat = null; const pts = [];
    for (let x = ST.x0 + 0.15; x < ST.x1; x += 0.3) pts.push([x, (ST.z0 + ST.zm) / 2]);
    for (const x of [ST.x1 + 0.3, ST.x1 + 0.7]) for (const z of [ST.z0 + 0.4, (ST.z0 + ST.z1) / 2, ST.z1 - 0.4]) pts.push([x, z]);
    for (let x = ST.x1 - 0.15; x > ST.x0; x -= 0.3) pts.push([x, (ST.zm + ST.z1) / 2]);
    for (const [x, z] of pts) { const y = W.stairY(P, x, z); if (y == null) continue; const o = new T.Vector3(x, y + 0.02, z); const h = firstHit(o, up, 4); const hd = h ? h.distance + 0.02 : 9;
      if (hd < minH) { minH = hd; minHat = [x.toFixed(2), z.toFixed(2), y.toFixed(2), h ? (h.object.parent?.name || '') + '/' + h.object.material.type : '']; }
      const eye = new T.Vector3(x, y + 1.62, z); for (let a = 0; a < 16; a++) { const th = a / 16 * Math.PI * 2; for (const el of [-0.6, 0, 0.6, 1.4]) { const d = new T.Vector3(Math.cos(th) * Math.cos(el), Math.sin(el), Math.sin(th) * Math.cos(el)).normalize(); const hh = firstHit(eye, d, 1); if (hh && hh.distance < minC) { minC = hh.distance; minCat = [x.toFixed(2), z.toFixed(2), (y + 1.62).toFixed(2), (hh.object.parent?.name || '') + '/' + hh.object.material.type]; } } } }
    st.push({ pair: P.lo + '→' + P.hi, minHeadroom: +minH.toFixed(2), at: minHat, minCamClear: +minC.toFixed(3), camAt: minCat }); }
  R.stair = st;
  // ---- coplanaridad (z-fighting) por nivel ----
  const zf = {};
  const groups = { p3: [W.LEV.p3.int, ...__app.scene.children.filter((g) => g.name === 'p3')], p1: [W.LEV.p1.int], sot: [W.LEV.sot.int] };
  for (const [gid, roots] of Object.entries(groups)) { const tris = []; const mids = new Map(); let mi = 0;
    for (const r0 of roots) r0.traverse((m) => { if (!m.isMesh || !vis(m) || m.material.transparent || m.material.polygonOffset || m.isSprite) return; const g = m.geometry; const pos = g.attributes.position; if (!pos) return; m.updateWorldMatrix(true, false); const id = mi++; mids.set(id, m);
      const idx = g.index ? g.index.array : null; const n = idx ? idx.length : pos.count; const A = new T.Vector3(), B = new T.Vector3(), C = new T.Vector3();
      for (let i = 0; i < n; i += 3) { const ia = idx ? idx[i] : i, ib = idx ? idx[i + 1] : i + 1, ic = idx ? idx[i + 2] : i + 2; A.fromBufferAttribute(pos, ia).applyMatrix4(m.matrixWorld); B.fromBufferAttribute(pos, ib).applyMatrix4(m.matrixWorld); C.fromBufferAttribute(pos, ic).applyMatrix4(m.matrixWorld);
        const nn = new T.Vector3().subVectors(B, A).cross(new T.Vector3().subVectors(C, A)); const ar = nn.length() / 2; if (ar < 2e-4) continue; nn.normalize();
        const ax = Math.abs(nn.x) > 0.99 ? 0 : Math.abs(nn.y) > 0.99 ? 1 : Math.abs(nn.z) > 0.99 ? 2 : -1; if (ax < 0) continue; // solo caras alineadas a ejes
        const sgn = Math.sign(nn.getComponent(ax)); const d = A.getComponent(ax); const u = (ax + 1) % 3, v = (ax + 2) % 3;
        tris.push({ k: ax + (sgn > 0 ? 'p' : 'n') + Math.round(d / 0.003), id, mat: m.material.uuid, c: [[A.getComponent(u), A.getComponent(v)], [B.getComponent(u), B.getComponent(v)], [C.getComponent(u), C.getComponent(v)]], pos: [A.x, A.y, A.z] }); } });
    const by = new Map(); for (const t of tris) { if (!by.has(t.k)) by.set(t.k, []); by.get(t.k).push(t); }
    const shrink = (c) => { const cx = (c[0][0] + c[1][0] + c[2][0]) / 3, cy = (c[0][1] + c[1][1] + c[2][1]) / 3; return c.map(([x, y]) => [x + (cx - x) * 0.02 + Math.sign(cx - x) * 0.003, y + (cy - y) * 0.02 + Math.sign(cy - y) * 0.003]); };
    const sep = (P, Q) => { for (const S of [P, Q]) for (let i = 0; i < 3; i++) { const a = S[i], b2 = S[(i + 1) % 3]; const nx = b2[1] - a[1], ny = a[0] - b2[0]; let p0 = 1e9, p1 = -1e9, q0 = 1e9, q1 = -1e9; for (const [x, y] of P) { const d = x * nx + y * ny; p0 = Math.min(p0, d); p1 = Math.max(p1, d); } for (const [x, y] of Q) { const d = x * nx + y * ny; q0 = Math.min(q0, d); q1 = Math.max(q1, d); } if (p1 <= q0 + 1e-9 || q1 <= p0 + 1e-9) return true; } return false; };
    const hits = []; let pairs = 0;
    for (const arr of by.values()) { if (arr.length < 2 || arr.length > 4000) continue; const sh = arr.map((t) => shrink(t.c));
      for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) { const a = arr[i], c = arr[j]; if (a.id === c.id && a.mat === c.mat) { /* misma malla: solo si se superponen (cajas duplicadas) */ } pairs++; if (!sep(sh[i], sh[j])) hits.push({ a: mids.get(a.id), b: mids.get(c.id), pos: a.pos.map((v) => +v.toFixed(2)), same: a.id === c.id }); } }
    const desc = (m) => (m.parent?.name || m.parent?.type || '') + ':' + (m.name || '') + ':' + m.material.type + (m.material.map ? 'M' : '') + ':' + (m.material.color ? m.material.color.getHexString() : '') + ':' + (m.userData.fur || '');
    const agg = new Map(); for (const h of hits) { const k = desc(h.a) + ' × ' + desc(h.b); if (!agg.has(k)) agg.set(k, { n: 0, ex: h.pos }); agg.get(k).n++; }
    zf[gid] = { tris: tris.length, overlaps: hits.length, top: [...agg.entries()].sort((x, y) => y[1].n - x[1].n).slice(0, 25).map(([k, v]) => ({ k, n: v.n, ex: v.ex })) }; }
  R.zfight = zf;
  // ---- mobiliario fuera de recintos ----
  const pip = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
  R.furOut = W.FUR.coll.filter(([x0, z0, x1, z1]) => !W.rooms.some((r) => pip(r.o, (x0 + x1) / 2, (z0 + z1) / 2))).map((b) => b.map((v) => +v.toFixed(2)));
  R.furCount = W.FUR.coll.length; R.sinks = W.FUR.sinks;
  return R;
});
out.pageErrors = errs; fs.writeFileSync(process.argv[2] || '/tmp/qachk7.json', JSON.stringify(out, null, 1)); console.log(JSON.stringify({ stair: out.stair, zf: Object.fromEntries(Object.entries(out.zfight).map(([k, v]) => [k, [v.tris, v.overlaps]])), furOut: out.furOut, errs }, null, 0));
await b.close();
