// ===== v6: RAMPA VEHICULAR = un solo sólido continuo de concreto (PL_A004: 21,79 m, 10,9 % promedio) =====
// Borde norte según el vector (band1) y cara del muro; borde sur z = 3.97 (muro de cuartos / antepecho).
const RN = [[0, 0.784], [7.871, 0.774], [9.81, 0.621], [12.502, 0.481], [20.712, 0.0], [21.79, 0.045]];
const rampN = (x) => { for (let i = 0; i < RN.length - 1; i++) { const [a, za] = RN[i], [b, zb] = RN[i + 1]; if (x <= b) return za + (zb - za) * Math.max(0, (x - a) / (b - a)); } return RN[RN.length - 1][1]; };
const RAMP_S = 3.97;
function buildRamp(B) {
  const L = RAMP.x1, yb = RAMP.low - 0.25, xs = []; for (let x = 0; x < L; x += 0.25) xs.push(x); xs.push(L);
  // concreto escobillado con ranuras transversales antideslizantes (textura + relieve)
  const tc = document.createElement('canvas'); tc.width = tc.height = 256; const g = tc.getContext('2d');
  g.fillStyle = '#a19e96'; g.fillRect(0, 0, 256, 256);
  const id = g.getImageData(0, 0, 256, 256); for (let i = 0; i < id.data.length; i += 4) { const n = (Math.random() - 0.5) * 22; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; } g.putImageData(id, 0, 0);
  for (let x = 0; x < 256; x += 32) { g.fillStyle = 'rgba(52,51,48,.9)'; g.fillRect(x, 0, 6, 256); g.fillStyle = 'rgba(235,232,224,.35)'; g.fillRect(x + 6, 0, 2, 256); }
  const tex = new THREE.CanvasTexture(tc); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 1.5, roughness: 0.9 });
  // superficie superior (malla continua, sin huecos)
  const P = [], UV = [], IDX = []; const nz = 4;
  xs.forEach((x, i) => { const y = rampY(x), zN = rampN(x); for (let j = 0; j <= nz; j++) { const z = zN + (RAMP_S - zN) * j / nz; P.push(x, y, z); UV.push(x, z); } });
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < nz; j++) { const a = i * (nz + 1) + j, b = a + nz + 1; IDX.push(a, a + 1, b, a + 1, b + 1, b); }
  const top = new THREE.BufferGeometry(); top.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); top.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); top.setIndex(IDX); top.computeVertexNormals();
  const tm = new THREE.Mesh(top, mat); tm.receiveShadow = true; B.add(tm); RAMPG.top = tm;
  // caras laterales (sur: visible desde las plazas 1–2; entrada en el portón) — el norte lo cubre el muro existente
  const side = []; const face = (pts) => { const v = []; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay, az] = pts[i], [bx, by, bz] = pts[i + 1]; v.push(ax, yb, az, ax, ay, az, bx, by, bz, ax, yb, az, bx, by, bz, bx, yb, bz); } const q = new THREE.BufferGeometry(); q.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); q.computeVertexNormals(); return q; };
  side.push(face(xs.map((x) => [x, rampY(x), RAMP_S]).reverse()), face([[0, 0, RAMP_S], [0, 0, rampN(0)]]));
  B.add(meshOf(side, new THREE.MeshStandardMaterial({ color: 0xb7b4ad, roughness: 0.95, side: THREE.DoubleSide })));
  // bordillos con franja de seguridad amarilla/negra a ambos lados (siguen la pendiente)
  const hz = document.createElement('canvas'); hz.width = 128; hz.height = 32; const h2 = hz.getContext('2d'); h2.fillStyle = '#f2c230'; h2.fillRect(0, 0, 128, 32); h2.fillStyle = '#17181a'; for (let i = -64; i < 160; i += 32) { h2.beginPath(); h2.moveTo(i, 32); h2.lineTo(i + 16, 32); h2.lineTo(i + 32, 0); h2.lineTo(i + 16, 0); h2.fill(); }
  const ht = new THREE.CanvasTexture(hz); ht.wrapS = ht.wrapT = THREE.RepeatWrapping; ht.colorSpace = THREE.SRGBColorSpace; ht.anisotropy = 4;
  const curb = (zf, dir, w, h) => { const v = [], uv = []; for (let i = 0; i < xs.length - 1; i++) { const xa = xs[i], xb = xs[i + 1], ya = rampY(xa), yb2 = rampY(xb), za = zf(xa), zb = zf(xb), ia = za + dir * w, ib = zb + dir * w, ua = xa / 0.9, ub = xb / 0.9;
      v.push(xa, ya + h, za, xb, yb2 + h, zb, xb, yb2 + h, ib, xa, ya + h, za, xb, yb2 + h, ib, xa, ya + h, ia); uv.push(ua, 1, ub, 1, ub, 0.6, ua, 1, ub, 0.6, ua, 0.6);
      v.push(xa, ya + h, ia, xb, yb2 + h, ib, xb, yb2 - 0.01, ib, xa, ya + h, ia, xb, yb2 - 0.01, ib, xa, ya - 0.01, ia); uv.push(ua, 0.6, ub, 0.6, ub, 0, ua, 0.6, ub, 0, ua, 0); }
    const q = new THREE.BufferGeometry(); q.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); q.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); q.computeVertexNormals(); return q; };
  B.add(meshOf([curb(rampN, 1, 0.16, 0.15), curb(() => RAMP_S, -1, 0.16, 0.15)], new THREE.MeshStandardMaterial({ map: ht, roughness: 0.6, side: THREE.DoubleSide })));
  // líneas amarillas pintadas a 0,35 m de cada bordillo
  const line = (zf) => { const v = []; for (let i = 0; i < xs.length - 1; i++) { const xa = xs[i] + 0.3, xb = xs[i + 1] + 0.3; if (xb > L - 0.2) break; const ya = rampY(xa) + 0.006, yb2 = rampY(xb) + 0.006, za = zf(xa), zb = zf(xb); v.push(xa, ya, za - 0.05, xa, ya, za + 0.05, xb, yb2, zb + 0.05, xa, ya, za - 0.05, xb, yb2, zb + 0.05, xb, yb2, zb - 0.05); } const q = new THREE.BufferGeometry(); q.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); q.computeVertexNormals(); return q; };
  B.add(meshOf([line((x) => rampN(x) + 0.51), line(() => RAMP_S - 0.51)], new THREE.MeshStandardMaterial({ color: 0xe8bd2a, roughness: 0.6, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }), false));
  // iluminación: apliques LED en el muro norte del tramo exterior y regletas en el cielo raso del tramo cubierto
  const lum = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3dc, emissiveIntensity: 1.3 });
  B.add(meshOf([1.6, 4.2, 6.8].map((x) => boxG(x - 0.18, x + 0.18, rampY(x) + 0.95, rampY(x) + 1.03, 0.79, 0.83)), lum, false));
  B.add(meshOf([11.9, 17.0, 19.8].map((x) => boxG(x - 0.6, x + 0.6, SV_CEIL - 0.05, SV_CEIL - 0.01, 2.24, 2.36)), lum, false));
}
const RAMPG = {};
