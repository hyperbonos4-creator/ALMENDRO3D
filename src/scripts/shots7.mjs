import { viewerUrl } from './html-url.mjs';
import { chromium } from 'playwright';
import fs from 'fs';
const only = process.argv[2] ? process.argv[2].split(',') : null;
const OUT = '../shots7'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('pageerror', (e) => { errs.push(e.message); console.log('ERR', e.message); });
await p.goto(viewerUrl());
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 });
await p.evaluate(() => { __app.setQuality('alta'); __app.fpEnter(); });
const ST = `({st:__app.EV.state, door:+__app.EV.door.toFixed(2), y:+__app.EV.y.toFixed(3), fi:__app.EV.fi, tgt:__app.EV.target, q:__app.EV.q.join(), lab:__app.EV.curLabel, inCab:__app.FP.inCab, fx:+__app.FP.x.toFixed(2), fy:+__app.FP.y.toFixed(3), fz:+__app.FP.z.toFixed(2), lvl:__app.FP.lvl, hud:document.querySelector('#elevSt')?.textContent})`;
const walk = (sec, key = 'KeyW') => `(()=>{ __app.FP.keys.${key}=true; __app.sim(${sec}); __app.FP.keys.${key}=false; return ${ST}; })()`;
const steps = [
  ['01_hall_p3_puertas_cerradas', `__app.fpPose(20.7, 10.69, Math.PI/2, -0.02, 'p3'); __app.sim(0.3); ${ST}`],
  ['02_angulo_captura_luisa', `__app.fpPose(21.3, 11.6, 1.75, -0.45, 'p3'); __app.sim(0.2); ${ST}`],
  ['03_llamar_y_abrir', `__app.fpPose(20.7, 10.69, Math.PI/2, -0.02, 'p3'); __app.sim(0.1); document.querySelector('#elevCall').click(); __app.sim(9.0); ${ST}`],
  ['04_puertas_abiertas_hall', `__app.sim(0.6); ${ST}`],
  ['05_entrando_caminando', walk(0.9)],
  ['06_dentro_cabina_botonera', `(()=>{ __app.FP.keys.KeyW=true; __app.sim(1.1); __app.FP.keys.KeyW=false; __app.FP.yaw = -2.18; __app.FP.pitch=-0.1; __app.sim(0.1); return ${ST}; })()`],
  ['07_eligio_piso6_cerrando', `document.querySelector('#elevKeys [data-f="p6"]').click(); __app.sim(1.6); __app.FP.yaw = Math.PI*0.5+Math.PI; __app.FP.pitch=0; __app.sim(0.05); ${ST}`],
  ['08_viajando_mitad_pozo', `__app.sim(6.0); __app.FP.yaw = -2.18; __app.FP.pitch=-0.1; __app.sim(0.05); ${ST}`],
  ['09_llegada_piso6_puertas_abiertas', `__app.sim(4.6); __app.FP.yaw = -Math.PI/2; __app.FP.pitch=-0.03; __app.sim(0.05); ${ST}`],
  ['10_saliendo_a_piso6', walk(1.9)],
  ['11_hall_p6_mirando_ascensor', `__app.FP.yaw = Math.PI/2; __app.sim(0.1); ${ST}`],
  ['12_sin_ordenes_queda_cerrado', `__app.sim(10); ${ST}`],
  ['13_abrir_cerrar_desde_hall', `(()=>{ document.querySelector('#elevOpen').click(); __app.sim(1.4); const a=${ST}; document.querySelector('#elevClose').click(); __app.sim(1.4); return {afterOpen:a, afterClose:${ST}}; })()`],
  ['14_orbita_corte_pozo', `(()=>{ __app.fpExit(); __app.evRequest('p3','land'); __app.sim(4.5); __app.setCut('p4'); __app.cam([30, 16, 3], [18.2, 9.5, 10.7]); return ${ST}; })()`],
  ['15_lobby_abrir_cabina_visible', `(()=>{ __app.sim(20); __app.setCut(''); __app.fpEnter(); __app.fpPose(20.7, 10.69, Math.PI/2, -0.03, 'p1'); __app.sim(0.2); document.querySelector('#elevOpen').click(); for (let i=0;i<400 && !(__app.EV.state==='open' && __app.EV.fi===1);i++) __app.sim(0.1); __app.sim(0.4); return ${ST}; })()`],
  ['16_lobby_entrar_cabina', walk(1.5)],
  ['17_sotano_hall_ascensor', `(()=>{ __app.FP.yaw=-Math.PI/2; document.querySelector('#elevKeys [data-f="sot"]').click(); for (let i=0;i<400 && !(__app.EV.state==='open' && __app.EV.fi===0);i++) __app.sim(0.1); __app.sim(0.4); __app.FP.yaw=-Math.PI/2; __app.sim(0.1); return ${ST}; })()`],
];
for (const [name, js] of steps) {
  if (only && !only.some((o) => name.startsWith(o))) { await p.evaluate(js).catch(() => {}); continue; }
  const r = await p.evaluate(js).catch((e) => 'E ' + e.message); await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/${name}.png` }); console.log(name, JSON.stringify(r));
}
console.log('errors', errs.length); await b.close();
