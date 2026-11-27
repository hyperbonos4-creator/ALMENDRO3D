(() => { const A = __app; if (!A.FP.on) A.fpEnter();
 const snap = () => { const o = {}; const L = A.W.LEV; for (const id of Object.keys(L)) { const E = L[id]; (E.doors || []).forEach((d, i) => { o[id + '.d' + i] = [d.tgt, +(d.a || 0).toFixed(3)]; }); if (E.bal) o[id + '.bal'] = [E.bal.tgt, +(E.bal.a || 0).toFixed(3)]; if (E.ent) o[id + '.ent'] = [E.ent.tgt || 0, +E.ent.a.toFixed(3)]; }
   (A.SV.doors || []).forEach((d, i) => { o['sv.d' + i + ':' + (d.label || '')] = [d.tgt, +(d.a || 0).toFixed(3)]; });
   o.EV = [A.EV.state, +A.EV.door.toFixed(3)]; o.gate = [+A.GT.v1.cur.toFixed(3), +A.GT.v2.cur.toFixed(3), +A.GT.ped.cur.toFixed(3), A.GT.ped.tgt, A.KS.st]; return o; };
 const before = snap(); let walked = 0;
 const targets = []; const L = A.W.LEV;
 for (const id of Object.keys(L)) { const E = L[id]; for (const d of E.doors || []) targets.push({ x: d.cx, z: d.cz, y: E.y, lab: id }); if (E.bal) targets.push({ x: E.bal.cx, z: E.bal.cz, y: E.y, lab: id + 'bal' }); }
 for (const d of A.SV.doors || []) targets.push({ x: d.cx, z: d.cz, y: d.fy, lab: 'sv' });
 targets.push({ x: -0.5, z: 3.1, y: 0, lab: 'ped_ext' }, { x: 1.2, z: 3.1, y: 0, lab: 'ped_int' }, { x: 0.5, z: 3.8, y: 0, lab: 'kiosk_int' }, { x: -0.4, z: 3.7, y: 0, lab: 'kiosk_ext' });
 for (const t of targets) { for (const [ox, oz] of [[0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7], [0.25, 0.25]]) { const x = t.x + ox, z = t.z + oz; const yaw = Math.atan2(-(t.x - x), -(t.z - z)); A.fpPose(x, z, yaw, 0, t.y); A.FP.keys.KeyW = true; A.sim(1.6); A.FP.keys.KeyW = false; A.sim(0.3); walked++; } }
 // cabina / hall del ascensor: caminar sin pedir nada
 for (const f of ['p2', 'p3', 'p5', 'sot']) { A.fpPose(20.2, 10.69, Math.PI / 2, 0, f); A.FP.keys.KeyW = true; A.sim(2); A.FP.keys.KeyW = false; A.sim(1); walked++; }
 const after = snap(); const changed = []; for (const k in before) if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changed.push([k, before[k], after[k]]);
 return { puertas: Object.keys(before).length, caminadas: walked, cambiadas: changed.length, detalle: changed.slice(0, 12) }; })()
