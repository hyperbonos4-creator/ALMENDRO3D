// v8: estilo real del edificio (renders promocionales públicos: fachada café/caramelo con listones de madera,
// franjas gris texturizado y azul grafito, ventanas en franjas verticales con marco negro, balcones con cable y
// pasamanos amarillo, sótano en concreto a la vista con pasatubos, topellantas amarillos, jardineras con banca de listones).
// Todo procedural (canvas) → el archivo sigue funcionando sin red.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

let seed = 1234567;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const cvs = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
function tex(c, o = {}) { const t = new THREE.CanvasTexture(c); if (o.rep !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = o.lin ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.anisotropy = o.aniso || 8; return t; }
function grain(g, w, h, amp, cell = 1) { const id = g.getImageData(0, 0, w, h), d = id.data; for (let y = 0; y < h; y += cell) for (let x = 0; x < w; x += cell) { const n = (rnd() - 0.5) * amp; for (let j = 0; j < cell; j++) for (let i = 0; i < cell; i++) { const k = ((y + j) * w + x + i) * 4; d[k] += n; d[k + 1] += n; d[k + 2] += n; } } g.putImageData(id, 0, 0); }
function blotch(g, w, h, n, rmin, rmax, cols, a) { for (let i = 0; i < n; i++) { const x = rnd() * w, y = rnd() * h, r = rmin + rnd() * (rmax - rmin); const gr = g.createRadialGradient(x, y, 0, x, y, r); const c = cols[i % cols.length]; gr.addColorStop(0, c.replace('A', String(a * (0.5 + rnd() * 0.5)))); gr.addColorStop(1, c.replace('A', '0')); g.fillStyle = gr; for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.save(); g.translate(ox, oy); g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore(); } } }

export function makeTex8() {
  const T = {};
  // estuco/revoque fino (2 m): base neutra que se tiñe con el color del material
  T.stucco = tex(cvs(512, 512, (g, w, h) => { g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, w, h); blotch(g, w, h, 60, 30, 110, ['rgba(255,255,255,A)', 'rgba(200,200,200,A)'], 0.28); grain(g, w, h, 26); }));
  T.stucco.repeat.set(0.5, 0.5);
  // gris texturizado (graniplast) 1 m
  T.rough = tex(cvs(512, 512, (g, w, h) => { g.fillStyle = '#e9e9e9'; g.fillRect(0, 0, w, h); blotch(g, w, h, 40, 20, 80, ['rgba(255,255,255,A)', 'rgba(170,170,170,A)'], 0.25); grain(g, w, h, 70, 2); grain(g, w, h, 30); }));
  T.rough.repeat.set(1, 1);
  // listones verticales de madera clara (pino) — 1.2 m × 2.4 m, 20 listones de 6 cm con dilatación
  T.slats = tex(cvs(512, 1024, (g, w, h) => { // v8.1: pino claro ≈ #C9A46E (× color por vértice) con ranuras visibles
    const n = 16, sw = w / n;
    for (let i = 0; i < n; i++) { const x = i * sw; const c = new THREE.Color().setHSL(0.09, 0.08, 0.93 + (rnd() - 0.5) * 0.04); g.fillStyle = '#' + c.getHexString(); g.fillRect(x, 0, sw, h);
      for (let k = 0; k < 8; k++) { g.strokeStyle = `rgba(160,115,62,${0.07 + rnd() * 0.12})`; g.lineWidth = 0.6 + rnd() * 1.3; g.beginPath(); let xx = x + 3 + rnd() * (sw - 6); g.moveTo(xx, 0); for (let y = 0; y <= h; y += 40) { xx += (rnd() - 0.5) * 1.6; xx = Math.max(x + 4, Math.min(x + sw - 3, xx)); g.lineTo(xx, y); } g.stroke(); }
      for (let k = 0; k < 2; k++) if (rnd() < 0.45) { const ky = rnd() * h, kx = x + sw * (0.3 + rnd() * 0.4); g.fillStyle = 'rgba(140,95,45,0.3)'; g.beginPath(); g.ellipse(kx, ky, 2.4, 4.5, 0, 0, 6.3); g.fill(); g.fillStyle = 'rgba(105,65,30,0.4)'; g.beginPath(); g.ellipse(kx, ky, 1, 2, 0, 0, 6.3); g.fill(); }
      // ranura (sombra profunda) + canto iluminado + canto en sombra
      g.fillStyle = 'rgba(48,30,14,0.92)'; g.fillRect(x, 0, 3.2, h); g.fillStyle = 'rgba(95,62,30,0.55)'; g.fillRect(x + 3.2, 0, 1.6, h);
      g.fillStyle = 'rgba(255,240,210,0.45)'; g.fillRect(x + sw - 2.2, 0, 1.4, h);
    }
    grain(g, w, h, 8);
  }));
  // relieve de las ranuras (normal map en espacio tangente; depende solo de u)
  T.slatsN = tex(cvs(512, 8, (g, w, h) => { g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, w, h); const n = 16, sw = w / n;
    for (let i = 0; i < n; i++) { const x = i * sw; g.fillStyle = 'rgb(128,128,255)'; g.fillRect(x, 0, 3.2, h); g.fillStyle = 'rgb(30,128,200)'; g.fillRect(x + 3.2, 0, 2.2, h); g.fillStyle = 'rgb(226,128,200)'; g.fillRect(x - 2.2, 0, 2.2, h); g.fillStyle = 'rgb(150,128,250)'; g.fillRect(x + 5.4, 0, 3, h); } }));
  T.slatsN.colorSpace = THREE.NoColorSpace; T.slatsN.repeat.set(1 / 1.2, 1 / 2.4);
  T.slats.repeat.set(1 / 1.2, 1 / 2.4);
  // concreto a la vista con pasatubos (formaleta 2.4 × 1.2 m) — muros del sótano
  T.concTie = tex(cvs(1024, 512, (g, w, h) => {
    g.fillStyle = '#d4d3cf'; g.fillRect(0, 0, w, h); blotch(g, w, h, 70, 30, 140, ['rgba(255,255,255,A)', 'rgba(170,168,160,A)'], 0.22); grain(g, w, h, 18);
    g.strokeStyle = 'rgba(120,118,112,0.45)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.strokeRect(3, 3, w - 6, h - 6);
    for (const fx of [0.125, 0.375, 0.625, 0.875]) for (const fy of [0.25, 0.75]) { const x = fx * w, y = fy * h; const gr = g.createRadialGradient(x, y, 0, x, y, 11); gr.addColorStop(0, 'rgba(70,70,68,0.95)'); gr.addColorStop(0.45, 'rgba(95,95,92,0.8)'); gr.addColorStop(0.62, 'rgba(235,235,230,0.6)'); gr.addColorStop(1, 'rgba(235,235,230,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 11, 0, 6.3); g.fill(); }
  }));
  T.concTie.repeat.set(1 / 2.4, 1 / 1.2);
  // piso de concreto liso del sótano (4 m) con juntas de corte
  T.concFloor = tex(cvs(512, 512, (g, w, h) => { g.fillStyle = '#a3a3a0'; g.fillRect(0, 0, w, h); blotch(g, w, h, 80, 25, 120, ['rgba(255,255,255,A)', 'rgba(110,110,106,A)'], 0.2); grain(g, w, h, 14);
    g.strokeStyle = 'rgba(70,70,68,0.55)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 0.8); g.lineTo(w, 0.8); g.moveTo(0.8, 0); g.lineTo(0.8, h); g.stroke(); }));
  T.concFloor.repeat.set(1 / 4, 1 / 4);
  // concreto fino claro (huellas de escalera) 1.2 m
  T.concFine = tex(cvs(512, 512, (g, w, h) => { g.fillStyle = '#c9c8c3'; g.fillRect(0, 0, w, h); blotch(g, w, h, 50, 15, 70, ['rgba(255,255,255,A)', 'rgba(140,138,132,A)'], 0.2); grain(g, w, h, 20); }));
  T.concFine.userData = { sx: 1.2, sz: 1.2 };
  // empedrado de canto rodado en abanico (1 m)
  T.pebble = tex(cvs(512, 512, (g, w, h) => { g.fillStyle = '#5b5a58'; g.fillRect(0, 0, w, h);
    const R = w / 4; for (let row = -1; row < 9; row++) for (let col = -1; col < 5; col++) { const cx = col * R + (row % 2 ? R / 2 : 0), cy = row * R / 2; for (let rr = R * 0.95; rr > 4; rr -= 9) { const n = Math.max(3, Math.floor(rr * 0.5)); for (let k = 0; k < n; k++) { const a = Math.PI + (k + 0.5) / n * Math.PI; const x = cx + Math.cos(a) * rr, y = cy - Math.sin(a) * rr * -1; const v = 120 + rnd() * 90; g.fillStyle = `rgb(${v},${v - 3},${v - 8})`; g.beginPath(); g.ellipse(x, y, 3.6 + rnd() * 1.2, 2.6 + rnd(), a + Math.PI / 2, 0, 6.3); g.fill(); } } }
    grain(g, w, h, 16); }));
  T.pebble.repeat.set(1, 1);
  // mármol blanco 60×60 con vetas grises (sala / comedor / circulación / cocina) — 1.2 m
  T.marble = tex(cvs(1024, 1024, (g, w, h) => {
    const nx = 2, tw = w / nx; g.fillStyle = '#cfcdc8'; g.fillRect(0, 0, w, h);
    for (let j = 0; j < nx; j++) for (let i = 0; i < nx; i++) { const x0 = i * tw + 1.5, y0 = j * tw + 1.5, s = tw - 3; g.save(); g.beginPath(); g.rect(x0, y0, s, s); g.clip();
      const c = 238 + Math.floor((rnd() - 0.5) * 8); g.fillStyle = `rgb(${c},${c},${c - 2})`; g.fillRect(x0, y0, s, s);
      blotch(g, w, h, 14, 40, 160, ['rgba(215,213,208,A)'], 0.5);
      for (let v = 0; v < 7; v++) { g.strokeStyle = `rgba(${120 + rnd() * 40},${120 + rnd() * 40},${125 + rnd() * 40},${0.18 + rnd() * 0.3})`; g.lineWidth = 0.6 + rnd() * 2.2; g.beginPath(); let x = x0 + rnd() * s, y = y0 - 10; g.moveTo(x, y); const ang = 0.6 + rnd() * 0.9; for (let k = 0; k < 22; k++) { x += Math.cos(ang) * s * 0.06 + (rnd() - 0.5) * 14; y += Math.sin(ang) * s * 0.06 + (rnd() - 0.5) * 10; g.lineTo(x, y); } g.stroke(); }
      grain(g, w, h, 5); g.restore(); }
  }));
  T.marble.userData = { sx: 1.2, sz: 1.2 };
  // porcelanato gris claro 60×60 (alcobas, hall de piso)
  const tileGrey = (base, grout) => tex(cvs(512, 512, (g, w, h) => { g.fillStyle = grout; g.fillRect(0, 0, w, h); const tw = w / 2; for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const c = new THREE.Color(base); c.offsetHSL(0, 0, (rnd() - 0.5) * 0.025); g.fillStyle = '#' + c.getHexString(); g.fillRect(i * tw + 1.5, j * tw + 1.5, tw - 3, tw - 3); } blotch(g, w, h, 30, 20, 90, ['rgba(255,255,255,A)', 'rgba(150,150,150,A)'], 0.12); grain(g, w, h, 8); }));
  T.tileG = tileGrey('#d4d4d1', '#b3b2ad'); T.tileG.userData = { sx: 1.2, sz: 1.2 };
  T.tileL = tileGrey('#e3e2de', '#c2c0ba'); T.tileL.userData = { sx: 1.2, sz: 1.2 };
  T.tileB = tileGrey('#c7c7c4', '#9f9e99'); T.tileB.userData = { sx: 0.6, sz: 0.6 }; // balcón 30×30
  // roble natural liso (puertas)
  T.oak = tex(cvs(256, 512, (g, w, h) => { g.fillStyle = '#d2a679'; g.fillRect(0, 0, w, h); for (let i = 0; i < 55; i++) { g.strokeStyle = `rgba(${150 + rnd() * 30},${100 + rnd() * 20},${55},${0.08 + rnd() * 0.12})`; g.lineWidth = 0.6 + rnd() * 2.2; g.beginPath(); let x = rnd() * w; g.moveTo(x, 0); for (let y = 0; y <= h; y += 24) { x += (rnd() - 0.5) * 2.5; g.lineTo(x, y); } g.stroke(); } grain(g, w, h, 8); }));
  // madera clara de muebles (alacenas, mesas, cama)
  T.lwood = tex(cvs(512, 256, (g, w, h) => { g.fillStyle = '#e2cfb2'; g.fillRect(0, 0, w, h); for (let i = 0; i < 46; i++) { g.strokeStyle = `rgba(${165 + rnd() * 25},${130 + rnd() * 20},${90},${0.1 + rnd() * 0.14})`; g.lineWidth = 0.6 + rnd() * 2; g.beginPath(); let y = rnd() * h; g.moveTo(0, y); for (let x = 0; x <= w; x += 24) { y += (rnd() - 0.5) * 2.2; g.lineTo(x, y); } g.stroke(); } grain(g, w, h, 7); }));
  // cuarzo blanco
  T.quartz = tex(cvs(512, 512, (g, w, h) => { g.fillStyle = '#f4f3f0'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const v = 200 + rnd() * 50; g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); } blotch(g, w, h, 10, 30, 90, ['rgba(225,224,220,A)'], 0.5); }));
  // cuadros abstractos (como en los renders interiores)
  T.art = [0, 1, 2].map((v) => tex(cvs(256, 352, (g, w, h) => { g.fillStyle = '#f6f5f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.fillRect(18, 18, w - 36, h - 36);
    const pal = [['rgba(120,124,130,A)', 'rgba(60,62,66,A)', 'rgba(190,192,196,A)'], ['rgba(150,140,130,A)', 'rgba(70,66,60,A)', 'rgba(205,198,188,A)'], ['rgba(110,120,128,A)', 'rgba(40,44,48,A)', 'rgba(170,180,186,A)']][v];
    g.save(); g.beginPath(); g.rect(18, 18, w - 36, h - 36); g.clip(); blotch(g, w, h, 26, 14, 70, pal, 0.55);
    g.strokeStyle = 'rgba(30,30,32,0.65)'; for (let i = 0; i < 9; i++) { g.lineWidth = 0.8 + rnd() * 2.6; g.beginPath(); let x = 30 + rnd() * (w - 60), y = 40 + rnd() * (h - 80); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 40; y += (rnd() - 0.3) * 30; g.lineTo(x, y); } g.stroke(); } g.restore(); }), { rep: false }));
  // follaje: hiedra colgante y planta tropical (alpha)
  const leaf = (g, x, y, L, Wd, a, col) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = col; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Wd, L * 0.45, 0, L); g.quadraticCurveTo(-Wd, L * 0.45, 0, 0); g.fill(); g.strokeStyle = 'rgba(20,45,15,0.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, L * 0.95); g.stroke(); g.restore(); };
  const green = () => { const c = new THREE.Color().setHSL(0.27 + (rnd() - 0.5) * 0.06, 0.45 + rnd() * 0.2, 0.25 + rnd() * 0.18); return '#' + c.getHexString(); };
  T.ivy = tex(cvs(256, 512, (g, w, h) => { for (let s = 0; s < 9; s++) { let x = 14 + s * (w - 28) / 8 + (rnd() - 0.5) * 14; const len = h * (0.45 + rnd() * 0.55); g.strokeStyle = 'rgba(70,90,40,0.9)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y < len; y += 10) { x += (rnd() - 0.5) * 4; g.lineTo(x, y); } g.stroke();
      let xx = 14 + s * (w - 28) / 8; for (let y = 2; y < len; y += 7 + rnd() * 5) { xx += (rnd() - 0.5) * 4; leaf(g, xx, y, 14 + rnd() * 10, 7 + rnd() * 4, (rnd() - 0.5) * 2.6, green()); } } }), { rep: false }); T.ivy.wrapS = THREE.RepeatWrapping;
  T.tropical = tex(cvs(512, 512, (g, w, h) => { for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 2.4; const L = 160 + rnd() * 210; g.save(); g.translate(w / 2, h - 6); g.rotate(a + Math.PI / 2); g.strokeStyle = 'rgba(60,85,35,0.9)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -L * 0.35); g.stroke(); leaf(g, 0, -L * 0.3, -L * 0.7, 18 + rnd() * 26, 0, green()); g.restore(); } }), { rep: false });
  // brillo de cinta LED (degradado vertical)
  T.glow = tex(cvs(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,240,215,0)'); gr.addColorStop(0.7, 'rgba(255,240,215,0.18)'); gr.addColorStop(1, 'rgba(255,246,230,0.7)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), { rep: false });
  return T;
}

// portón estilo render: hojas en metal gris grafito con riostras en X (dos X apiladas por panel) — mapeado igual que door_v5.jpg
export function gateTexture(U) {
  const W = 1024, H = 754; const c = cvs(W, H, (g) => {
    g.fillStyle = '#4b4d50'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 1800; i++) { g.globalAlpha = 0.04 + rnd() * 0.05; g.fillStyle = rnd() < 0.5 ? '#6a6d71' : '#33353a'; g.fillRect(rnd() * W, 0, 0.8 + rnd(), H); } g.globalAlpha = 1;
    const fr = '#26272a', hl = 'rgba(160,165,170,0.35)';
    const panel = (u0, u1, split) => { const x0 = u0 * W, x1 = u1 * W, y0 = 14, y1 = H - 14; g.strokeStyle = fr; g.lineWidth = 12; g.strokeRect(x0 + 6, y0, x1 - x0 - 12, y1 - y0);
      const cells = split ? 2 : 1; for (let k = 0; k < cells; k++) { const ya = y0 + (y1 - y0) * k / cells, yb = y0 + (y1 - y0) * (k + 1) / cells; if (k) { g.lineWidth = 10; g.beginPath(); g.moveTo(x0 + 6, ya); g.lineTo(x1 - 6, ya); g.stroke(); }
        for (const [a, b] of [[[x0 + 12, ya + 6], [x1 - 12, yb - 6]], [[x1 - 12, ya + 6], [x0 + 12, yb - 6]]]) { g.strokeStyle = fr; g.lineWidth = 9; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); g.strokeStyle = hl; g.lineWidth = 1.5; g.beginPath(); g.moveTo(a[0], a[1] - 3); g.lineTo(b[0], b[1] - 3); g.stroke(); } } };
    panel(0, U.mid * 0.76, true); panel(U.mid * 0.76, U.mid, true); panel(U.mid, U.p0, true); panel(U.p0, U.p1, true); panel(U.p1, U.jb, false);
    g.fillStyle = '#3c3e41'; g.fillRect(U.jb * W, 0, W - U.jb * W, H); g.strokeStyle = fr; g.lineWidth = 10; g.strokeRect(U.jb * W + 5, 14, W - U.jb * W - 10, H - 28);
    g.fillStyle = fr; g.fillRect(U.mid * W - 4, 0, 8, H);
  });
  const t = tex(c, { rep: false }); return t;
}
export function signTexture(text, sub) {
  const c = cvs(1024, 140, (g, w, h) => { g.fillStyle = '#3b332d'; g.fillRect(0, 0, w, h); grain(g, w, h, 10); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 74px "Segoe UI",Helvetica,Arial,sans-serif'; g.letterSpacing = '10px'; g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 6; g.shadowOffsetY = 3; g.fillStyle = '#f4f1ea'; g.fillText(text, w / 2, sub ? 56 : h / 2 + 2);
    if (sub) { g.font = '500 24px "Segoe UI",Arial'; g.letterSpacing = '8px'; g.fillStyle = '#d9c7a6'; g.fillText(sub, w / 2, 112); } });
  return tex(c, { rep: false });
}

// UV planar en metros según la normal dominante (para fachadas, muros y pisos)
export function worldUV(g) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ay >= ax && ay >= az) { uv[i * 2] = x; uv[i * 2 + 1] = -z; } else if (ax >= az) { uv[i * 2] = z * Math.sign(-n.getX(i) || 1); uv[i * 2 + 1] = y; } else { uv[i * 2] = x * Math.sign(n.getZ(i) || 1); uv[i * 2 + 1] = y; } }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
const ni = (g) => (g.index ? g.toNonIndexed() : g);
// caja en el marco de un segmento de fachada: s a lo largo (desde a), d hacia afuera (normal), y vertical
export function segBox(a, u, n, s0, s1, y0, y1, d0, d1) {
  if (s1 - s0 < 1e-4 || y1 - y0 < 1e-4 || d1 - d0 < 1e-4) return null;
  const g = new THREE.BoxGeometry(s1 - s0, y1 - y0, d1 - d0); g.rotateY(Math.atan2(-u[1], u[0]));
  const sm = (s0 + s1) / 2, dm = (d0 + d1) / 2; g.translate(a[0] + u[0] * sm + n[0] * dm, (y0 + y1) / 2, a[1] + u[1] * sm + n[1] * dm);
  return worldUV(ni(g));
}

// ====================== FACHADA POR PISO ======================
// Clases: 'recess' (balcón empotrado: gris claro), 'white' (ala posterior con ventanas pequeñas, ref_01),
// 'slot' (ranura del punto fijo hacia el vacío: blanco, ref_05), 'comp' (composición café/listones/gris).
export function facadeModel(S) {
  const nf = S.nflip;
  const segs = S.skin.map((p, i) => { const dx = p.b[0] - p.a[0], dz = p.b[1] - p.a[1], L = Math.hypot(dx, dz); const u = [dx / L, dz / L], n = [(dz / L) * nf, (-dx / L) * nf]; return { p, i, L, u, n, a: p.a, b: p.b, mx: (p.a[0] + p.b[0]) / 2, mz: (p.a[1] + p.b[1]) / 2 }; });
  for (const s of segs) {
    if (s.mx > 6.95 && s.mx < 7.9 && s.mz > 0.7 && s.mz < 3.98) s.cls = 'recess';
    else if (s.mz > 24.5) s.cls = 'white';            // saliente posterior: blanco con ventanas pequeñas y franjas café (ref_01)
    else if (s.mz > 23.5) s.cls = 'tanf';             // caras posteriores: café medio con franjas blancas (ref_01)
    else if (s.n[0] > 0.9 && s.mx > 27) s.cls = 'blue'; // costado largo oriental: azul grafito, marcos oscuros y listones (ref_01)
    else if (s.mz >= 8.69 && s.mz <= 12.65 && s.mx < 27.29 && s.mx > 24.4) s.cls = 'slot';
    else s.cls = 'comp';
  }
  // tramos (runs) colineales de la misma clase
  const runs = []; let cur = null;
  for (const s of segs) { if (cur && cur.cls === s.cls && cur.n[0] * s.n[0] + cur.n[1] * s.n[1] > 0.995 && Math.hypot(cur.end[0] - s.a[0], cur.end[1] - s.a[1]) < 0.02) { s.s0 = cur.L; cur.L += s.L; cur.end = s.b; cur.segs.push(s); } else { cur = { cls: s.cls, n: s.n, u: s.u, a: s.a, end: s.b, L: s.L, segs: [s] }; s.s0 = 0; runs.push(cur); } }
  if (runs.length > 1) { const f = runs[0], l = runs[runs.length - 1]; if (f.cls === l.cls && f.n[0] * l.n[0] + f.n[1] * l.n[1] > 0.995 && Math.hypot(l.end[0] - f.a[0], l.end[1] - f.a[1]) < 0.02) { for (const s of f.segs) { s.s0 += l.L; l.segs.push(s); } l.L += f.L; l.end = f.end; runs.shift(); } }
  runs.forEach((r, i) => { r.i = i; r.segs.forEach((s) => { s.run = r; }); });
  // bahías de composición: tipo estable por bahía (igual en todos los pisos) → paneles continuos y escalonados
  const PA = ['slat', 'tan', 'slat', 'grey', 'tan', 'slat', 'grey', 'slat', 'tan']; // ref_02/ref_03: gris + listones claros + café
  const PB = ['slat', 'grey', 'dark', 'slat', 'grey', 'slat', 'dark'];             // ref_01: azul + listones oscuros + grafito
  let c = 0;
  for (const r of runs) { r.pil = []; if (r.cls === 'recess') continue;
    if (r.L < 0.5) { r.allRender = true; continue; }
    r.pil.push([0, 0.22], [r.L - 0.22, r.L]);
    for (const s of r.segs) {
      const cmp = r.cls === 'comp' || r.cls === 'blue';
      if (s.p.k === 'win' && s.p.code !== 'V-7') { if (cmp) s.pil = true, r.pil.push([s.s0, s.s0 + 0.12], [s.s0 + s.L - 0.12, s.s0 + s.L]); continue; }
      if (s.p.k !== 'solid' || !cmp) continue;
      const nb = Math.max(1, Math.round(s.L / 1.35)); s.bays = [];
      for (let i = 0; i < nb; i++, c++) { const b0 = s.L * i / nb, b1 = s.L * (i + 1) / nb; const P = r.cls === 'blue' ? PB : PA; let t = s.L / nb < 0.55 ? 'grey' : P[(c + r.i * 5) % P.length];
        const st = 3.5 + ((c * 53) % 7) * 1.25 + 0.35, len = 4.6 + ((c * 37) % 5) * 1.15; const w1 = [st, Math.min(19.7, st + len)];
        const w2 = w1[1] < 14.5 ? [w1[1] + 1.7 + ((c * 13) % 3) * 0.6, Math.min(19.7, w1[1] + 6.2)] : null;
        s.bays.push({ b0, b1, t, w: [w1, w2].filter(Boolean), dw: [3.5 + ((c * 29) % 5) * 1.9 + 0.9, 3.5 + ((c * 29) % 5) * 1.9 + 4.3] });
        if (t === 'tan' && s.L / nb > 0.9) r.pil.push([s.s0 + b0, s.s0 + b0 + 0.1], [s.s0 + b1 - 0.1, s.s0 + b1]); }
    }
    // unión de intervalos de pilastras (sin solapes → sin caras coplanares)
    r.pil.sort((x, y) => x[0] - y[0]); const m = []; for (const iv of r.pil) { if (m.length && iv[0] <= m[m.length - 1][1] + 0.02) m[m.length - 1][1] = Math.max(m[m.length - 1][1], iv[1]); else m.push([...iv]); } r.pil = m;
  }
  // esquinas convexas entre tramos (bloque de remate café)
  const corners = [];
  for (let i = 0; i < runs.length; i++) { const A = runs[i], B = runs[(i + 1) % runs.length]; if (A.cls === 'recess' || B.cls === 'recess') continue; if (Math.hypot(A.end[0] - B.a[0], A.end[1] - B.a[1]) > 0.02) continue;
    const conv = B.u[0] * A.n[0] + B.u[1] * A.n[1] < -0.3; if (conv) corners.push({ p: A.end, n1: A.n, n2: B.n }); }
  return { segs, runs, corners };
}

// colores de fachada (renders/video): se usan como color por vértice sobre la textura neutra
// Fotos por encima del video: marcos moca #A69382, listón roble claro #D6B997, bahías oscuras #4E545C.
export const FCOL = { render: 0xa69382, tan: 0x8d7356, dark: 0x4e545c, char: 0x3a3e44, white: 0xf3f1ec, recess: 0xe4e0d8, band: 0xf4f2ee, wood: 0xd6b997, woodD: 0xd6b997 };
export function buildFacadeFloor(FM, fy, mats, opts = {}) {
  const G = { render: [], grey: [], wood: [], tan: [], dark: [], band: [], spandrel: [], white: [], recess: [], woodD: [], char: [] };
  const BLUE = { render: 'char', grey: 'dark', wood: 'wood', tan: 'char', dark: 'char', band: 'band', spandrel: 'char' };
  let MAP = null; const push = (k, g) => { if (g) G[(MAP && MAP[k]) || k].push(g); };
  const Y0 = -0.2, Y1 = 2.5; // de losa a losa (2.70 m) → paños continuos entre pisos
  const absY = (y) => fy + y;
  for (const r of FM.runs) {
    const { u, n } = r; MAP = r.cls === 'blue' ? BLUE : null; const cmp = r.cls === 'comp' || r.cls === 'blue';
    if (r.allRender) { for (const s of r.segs) push('render', segBox(s.a, u, n, 0, s.L, Y0, Y1, 0, 0.1)); continue; }
    for (const s of r.segs) {
      const k = s.p.k, a = s.a, L = s.L;
      if (r.cls === 'recess') { if (s.p.code === 'V-7') push('recess', segBox(a, u, n, 0, L, s.p.head, Y1, 0, 0.04)); else if (k === 'solid') push('recess', segBox(a, u, n, 0, L, 0, Y1, 0, 0.04)); continue; }
      const bg = cmp ? 'grey' : r.cls === 'tanf' ? 'tan' : 'white';
      if (k === 'open') { push(bg === 'white' ? 'white' : 'render', segBox(a, u, n, 0, L, Y0, 0.0, 0, 0.04)); continue; }
      if (k === 'win') {
        const sp = cmp ? 'spandrel' : bg;
        if (s.p.sill > 0.04) push(sp, segBox(a, u, n, 0, L, Y0, s.p.sill, 0, 0.04)); else push(sp, segBox(a, u, n, 0, L, Y0, 0, 0, 0.04));
        push(sp, segBox(a, u, n, 0, L, s.p.head, Y1, 0, 0.04));
        if (cmp) push('band', segBox(a, u, n, 0.12, L - 0.12, -0.16, -0.06, 0.04, 0.052));
        continue;
      }
      // macizo
      if (!cmp) { push(bg, segBox(a, u, n, 0, L, Y0, Y1, 0, 0.04)); continue; }
      for (const b of s.bays) {
        if (b.t === 'dark') { push('dark', segBox(a, u, n, b.b0, b.b1, Y0, Y1, 0, 0.016)); push('band', segBox(a, u, n, b.b0 + 0.02, b.b1 - 0.02, -0.16, -0.06, 0.016, 0.028));
          const [d0, d1] = b.dw; const y0 = Math.max(absY(Y0), d0) - fy, y1 = Math.min(absY(Y1), d1) - fy; const half = b.b0 + (b.b1 - b.b0) * 0.55; if (y1 > y0 + 0.05) push('wood', segBox(a, u, n, half, b.b1 - 0.02, Math.max(Y0, y0), Math.min(Y1, y1), 0.016, 0.05)); continue; }
        if (b.t === 'tan') { push('tan', segBox(a, u, n, b.b0, b.b1, Y0, Y1, 0, 0.03)); push('band', segBox(a, u, n, b.b0 + 0.1, b.b1 - 0.1, -0.16, -0.06, 0.03, 0.042)); continue; }
        push('grey', segBox(a, u, n, b.b0, b.b1, Y0, Y1, 0, 0.04));
        if (b.t === 'slat') for (const [w0, w1] of b.w) { const y0 = Math.max(absY(Y0), w0) - fy, y1 = Math.min(absY(Y1), w1) - fy; if (y1 > y0 + 0.02) push('wood', segBox(a, u, n, b.b0 + 0.025, b.b1 - 0.025, y0, y1, 0.04, 0.072)); }
      }
    }
    for (const [p0, p1] of r.pil) push('render', segBox(r.a, u, n, p0, p1, Y0, Y1, 0.04, cmp ? 0.1 : 0.085));
    if (r.cls === 'white' && opts.whiteBands !== false) push('render', segBox(r.a, u, n, 0.22, r.L - 0.22, -0.24, 0.04, 0.04, 0.08));
    if (r.cls === 'tanf') push('band', segBox(r.a, u, n, 0.22, r.L - 0.22, -0.2, -0.08, 0.04, 0.06));
  }
  for (const c of FM.corners) { // bloque de esquina (de la arista hacia afuera)
    const d = 0.1, x0 = Math.min(c.p[0], c.p[0] + (c.n1[0] + c.n2[0]) * d), x1 = Math.max(c.p[0], c.p[0] + (c.n1[0] + c.n2[0]) * d), z0 = Math.min(c.p[1], c.p[1] + (c.n1[1] + c.n2[1]) * d), z1 = Math.max(c.p[1], c.p[1] + (c.n1[1] + c.n2[1]) * d);
    MAP = null; if (x1 - x0 > 0.01 && z1 - z0 > 0.01) { const g = new THREE.BoxGeometry(x1 - x0, Y1 - Y0, z1 - z0); g.translate((x0 + x1) / 2, (Y0 + Y1) / 2, (z0 + z1) / 2); push('render', worldUV(ni(g))); } }
  // v8 rendimiento: los paños con la misma textura se funden en UNA malla con color por vértice
  // (revoque: café/café medio/azul/grafito/blanco/franjas; listones: claros/oscuros) → 4 llamadas de dibujo por piso en vez de 11
  const grp = new THREE.Group(); grp.name = 'fachada8';
  const BUCKET = { render: 'stuccoVC', tan: 'stuccoVC', dark: 'stuccoVC', char: 'stuccoVC', white: 'stuccoVC', recess: 'stuccoVC', band: 'stuccoVC', wood: 'slatVC', woodD: 'slatVC', grey: 'grey', spandrel: 'spandrel' };
  const out = {};
  for (const [k, list] of Object.entries(G)) { if (!list.length) continue; const bk = BUCKET[k] || k; const vc = bk.endsWith('VC');
    for (const g of list) { if (vc) { const c = new THREE.Color(FCOL[k]); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); } (out[bk] = out[bk] || []).push(g); } }
  for (const [k, list] of Object.entries(out)) { const m = new THREE.Mesh(mergeGeometries(list, false), mats[k]); m.castShadow = true; m.receiveShadow = true; m.userData.kind = 'f8_' + k; grp.add(m); }
  return grp;
}

// ---------- vegetación procedural (quads con alpha) ----------
export function plantMats(T) {
  return {
    ivy: new THREE.MeshStandardMaterial({ map: T.ivy, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 }),
    trop: new THREE.MeshStandardMaterial({ map: T.tropical, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.75 }),
  };
}
// mata tropical: 3 quads cruzados (alto h) con base en (x,y,z)
export function tropicalGeo(x, y, z, h, w = h * 0.9, rot = 0) { const gs = []; for (let i = 0; i < 3; i++) { const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0); g.rotateY(rot + i * Math.PI / 3); g.translate(x, y, z); gs.push(ni(g)); } return mergeGeometries(gs); }
// cortina de hiedra colgante a lo largo de un segmento (de y0 hacia abajo h)
export function ivyGeo(a, b, y0, h, off = 0) { const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); const g = new THREE.PlaneGeometry(L, h); g.translate(0, y0 - h / 2, 0); g.rotateY(Math.atan2(-dz, dx)); g.translate((a[0] + b[0]) / 2 + off * dz / L, 0, (a[1] + b[1]) / 2 - off * dx / L); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * Math.max(1, L / 0.9)); return ni(g); }
