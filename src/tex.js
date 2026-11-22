// Texturas procedurales (sin red). Cada textura representa un tamaño real (m) => repeat por UV en metros.
import * as THREE from 'three';
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function mk(w, h, draw, aniso = 8) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
}
function noise(g, w, h, a, n = 4000, cols = ['#000', '#fff']) { for (let i = 0; i < n; i++) { g.globalAlpha = a * rnd(); g.fillStyle = cols[i % cols.length]; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); } g.globalAlpha = 1; }
function veins(g, w, h, col, a, n) { g.strokeStyle = col; for (let i = 0; i < n; i++) { g.globalAlpha = a * (0.4 + rnd()); g.lineWidth = 0.6 + rnd() * 1.6; g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let k = 0; k < 14; k++) { x += (rnd() - 0.3) * w * 0.09; y += (rnd() - 0.5) * h * 0.07; g.lineTo(x, y); } g.stroke(); } g.globalAlpha = 1; }
function tiles(g, w, h, nx, ny, base, grout, gw, vary, extra) {
  const tw = w / nx, th = h / ny;
  g.fillStyle = grout; g.fillRect(0, 0, w, h);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v = (rnd() - 0.5) * vary; const c = new THREE.Color(base); c.offsetHSL(0, 0, v);
    g.fillStyle = '#' + c.getHexString(); g.fillRect(i * tw + gw / 2, j * th + gw / 2, tw - gw, th - gw);
    if (extra) { g.save(); g.beginPath(); g.rect(i * tw + gw / 2, j * th + gw / 2, tw - gw, th - gw); g.clip(); extra(g, i * tw, j * th, tw, th); g.restore(); }
  }
}
export function makeTextures() {
  const T = {};
  // laminado roble: tablas 0.19 x 1.20 m — textura = 2.4 x 2.28 m (12 tablas)
  T.lam = mk(1024, 1024, (g, w, h) => {
    const rows = 12, rh = h / rows;
    for (let r = 0; r < rows; r++) { const off = (r * 0.37 % 1) * w; for (let k = -2; k < 3; k++) {
      const x0 = off + k * w / 2; const c = new THREE.Color().setHSL(0.085 + (rnd() - 0.5) * 0.012, 0.42 + rnd() * 0.08, 0.56 + (rnd() - 0.5) * 0.08);
      g.fillStyle = '#' + c.getHexString(); g.fillRect(x0, r * rh, w / 2, rh);
      g.strokeStyle = 'rgba(70,40,15,0.18)'; for (let l = 0; l < 9; l++) { g.lineWidth = 0.5 + rnd(); g.beginPath(); const y = r * rh + rnd() * rh; g.moveTo(x0, y); g.bezierCurveTo(x0 + w * 0.15, y + (rnd() - 0.5) * 6, x0 + w * 0.3, y + (rnd() - 0.5) * 6, x0 + w / 2, y + (rnd() - 0.5) * 4); g.stroke(); }
      if (rnd() < 0.4) { g.fillStyle = 'rgba(80,45,20,0.25)'; g.beginPath(); g.ellipse(x0 + rnd() * w / 2, r * rh + rh / 2, 6, 2.5, 0, 0, 6.3); g.fill(); }
      g.fillStyle = 'rgba(40,22,8,0.55)'; g.fillRect(x0, r * rh, 1.5, rh);
    } g.fillStyle = 'rgba(40,22,8,0.5)'; g.fillRect(0, r * rh, w, 1.5); }
    noise(g, w, h, 0.05, 9000);
  });
  T.lam.userData = { sx: 2.4, sz: 2.28 };
  // porcelanato claro 60x60 tipo mármol (sala / circulación) — 1.2 m
  T.porc = mk(512, 512, (g, w, h) => tiles(g, w, h, 2, 2, '#ddd6ca', '#aea595', 3, 0.035, (g2, x, y, tw, th) => { g2.translate(x, y); veins(g2, tw, th, '#a49c90', 0.25, 3); }));
  T.porc.userData = { sx: 1.2, sz: 1.2 };
  // porcelanato oscuro 60x60 (hall)
  T.porcD = mk(512, 512, (g, w, h) => { tiles(g, w, h, 2, 2, '#4a4b4d', '#2e2f31', 2, 0.04); veins(g, w, h, '#77787a', 0.18, 6); noise(g, w, h, 0.06, 6000); });
  T.porcD.userData = { sx: 1.2, sz: 1.2 };
  // cerámica 30x30 beige (cocina / ropas)
  T.cer = mk(512, 512, (g, w, h) => { tiles(g, w, h, 4, 4, '#d9cfbf', '#b5aa98', 3, 0.05); noise(g, w, h, 0.05, 5000); });
  T.cer.userData = { sx: 1.2, sz: 1.2 };
  // cerámica baño 20x20 gris claro
  T.bath = mk(512, 512, (g, w, h) => { tiles(g, w, h, 4, 4, '#c9cdd0', '#9ea4a8', 3, 0.04); noise(g, w, h, 0.04, 4000); });
  T.bath.userData = { sx: 0.8, sz: 0.8 };
  // enchape de muro de baño 30x60 blanco
  T.wtile = mk(512, 512, (g, w, h) => { tiles(g, w, h, 4, 2, '#f1f1ee', '#cfd2d2', 3, 0.02); });
  T.wtile.userData = { sx: 1.2, sz: 1.2 };
  // balcón: gres 30x30
  T.terr = mk(512, 512, (g, w, h) => { tiles(g, w, h, 4, 4, '#a7684a', '#6f4836', 4, 0.06); noise(g, w, h, 0.07, 5000); });
  T.terr.userData = { sx: 1.2, sz: 1.2 };
  // granito (cabina ascensor)
  T.gran = mk(256, 256, (g, w, h) => { g.fillStyle = '#2a2b2e'; g.fillRect(0, 0, w, h); noise(g, w, h, 0.5, 9000, ['#111', '#6a6c70', '#9a8f80']); });
  T.gran.userData = { sx: 0.8, sz: 0.8 };
  // acero inoxidable cepillado
  T.steel = mk(512, 512, (g, w, h) => { g.fillStyle = '#b9bdc1'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { g.globalAlpha = 0.025 + rnd() * 0.05; g.fillStyle = rnd() < 0.5 ? '#ffffff' : '#7e848a'; g.fillRect(0, rnd() * h, w, 0.6 + rnd()); } g.globalAlpha = 1; });
  // madera de puertas (veta vertical)
  T.wood = mk(256, 512, (g, w, h) => { g.fillStyle = '#9a6a42'; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${60 + rnd() * 40},${32 + rnd() * 20},${12},${0.15 + rnd() * 0.2})`; g.lineWidth = 0.6 + rnd() * 2.4; g.beginPath(); let x = rnd() * w; g.moveTo(x, 0); for (let y = 0; y <= h; y += 32) { x += (rnd() - 0.5) * 3; g.lineTo(x, y); } g.stroke(); } noise(g, w, h, 0.05, 3000); });
  T.woodL = mk(256, 512, (g, w, h) => { g.fillStyle = '#d6bf9c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(150,110,70,${0.1 + rnd() * 0.15})`; g.lineWidth = 0.6 + rnd() * 2; g.beginPath(); let x = rnd() * w; g.moveTo(x, 0); for (let y = 0; y <= h; y += 32) { x += (rnd() - 0.5) * 3; g.lineTo(x, y); } g.stroke(); } });
  // pañete/estuco (variación sutil, se tiñe por color de vértice)
  T.plaster = mk(256, 256, (g, w, h) => { g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, w, h); noise(g, w, h, 0.05, 7000, ['#d8d8d4', '#ffffff']); });
  T.plaster.userData = { sx: 1.5, sz: 1.5 };
  // tela (sofá / cama)
  T.fabric = mk(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 2) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(i, 0, 1, h); g.fillRect(0, i, w, 1); } noise(g, w, h, 0.05, 1500); });
  // concreto (sótano)
  T.conc = mk(512, 512, (g, w, h) => { g.fillStyle = '#9c9a94'; g.fillRect(0, 0, w, h); noise(g, w, h, 0.12, 14000, ['#7d7b76', '#b7b4ad']); g.strokeStyle = 'rgba(60,60,60,0.25)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); });
  T.conc.userData = { sx: 4, sz: 4 };
  return T;
}
// textura de texto (letreros)
export function textTex(lines, o = {}) {
  const W = o.w || 512, H = o.h || 128;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  if (o.bg) { g.fillStyle = o.bg; if (o.r) { g.beginPath(); g.roundRect(2, 2, W - 4, H - 4, o.r); g.fill(); } else g.fillRect(0, 0, W, H); }
  if (o.border) { g.strokeStyle = o.border; g.lineWidth = o.bw || 4; g.beginPath(); g.roundRect(4, 4, W - 8, H - 8, o.r || 0); g.stroke(); }
  let y = o.y0 || 0; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
  for (const L of lines) { let fs = L.s; g.font = `${L.w || 600} ${fs}px "Segoe UI",Helvetica,Arial,sans-serif`; const mw = W - 28; const tw = g.measureText(L.t).width; if (tw > mw) { fs = Math.floor(fs * mw / tw); g.font = `${L.w || 600} ${fs}px "Segoe UI",Helvetica,Arial,sans-serif`; } g.fillStyle = L.c || o.color || '#222'; if (L.ls) g.letterSpacing = L.ls + 'px'; else g.letterSpacing = '0px'; g.fillText(L.t, o.align === 'left' ? (o.x || 24) : W / 2, y + L.s * 0.62 + (L.dy || 0)); y += L.s * (L.lh || 1.25); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.canvas = c; return t;
}
