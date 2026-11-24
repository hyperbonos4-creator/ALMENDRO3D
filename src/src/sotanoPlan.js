// Sótano según el plano nuevo (AutoCAD, 1 lámina). Escala medida en los rectángulos
// blancos de las plazas: 171.8 pt = 2.50 m y 309.2 pt = 4.50 m → 68.72 pt/m.
// Origen (413.4, 138.7) para que el pozo 2.45×1.70 caiga sobre el de PL_A002.
// PDF y hacia abajo = +z (sur). El acceso oeste es x chico.

export const EMT_OD = 0.0234; // 3/4" EMT, diámetro exterior
export const EMT_R = 0.20; // radio de los barridos (mayor que el mínimo de código, ~114 mm)
export const CLEAR_H = 2.25; // eje del tubo sobre la rasante; el bajo queda a 2.24 m

export function floorY(x, z) {
  // Pasillo oriente: baja hacia el sur al 13.6 % y llega a N−2.96 en z = 20.95.
  // El resto del piso empalma con ese pasillo sin escalón: en el acceso (z chico)
  // el borde oeste está en la calle, y hacia el sur baja al sótano.
  if (z > 21.05) return -2.96;
  const slope = Math.min(0, -2.96 + 0.136 * Math.max(0, 20.95 - z));
  if (x >= 24.15) return slope;
  const k = Math.min(1, Math.max(0, (z - 6.2) / 3));
  const west = -2.96 * k;
  const t = Math.min(1, Math.max(0, x / 24.15));
  return west + (slope - west) * t;
}

const rect = (x0, x1, z0, z1) => ({ o: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], h: [] });

export const ROOMS = [
  { id: 'aseo', name: 'C. Aseo', plan: 'C.ASEO', area: 2.18, poly: rect(9.55, 11.00, -0.86, 0.55) },
  { id: 'elec', name: 'C. Eléctrico / Telecom', plan: 'C.ELECTRICO', area: 2.18, poly: rect(11.00, 12.45, -0.86, 0.55) },
  { id: 'util1', name: 'C. Útil 1', plan: 'C.UTIL 1', area: 3.42, poly: rect(16.76, 18.05, 7.05, 9.70) },
  { id: 'util2', name: 'C. Útil 2', plan: 'C.UTIL 2', area: 3.45, poly: rect(18.05, 19.35, 7.05, 9.70) },
];

// Columnas y el pozo de 0.44 m al oriente de la plaza 1 (el plano lo acota .44).
export const COLS = [
  [9.70, 10.20, 0.35, 0.75], [13.34, 13.94, 0.40, 0.80], [16.62, 17.22, 0.40, 0.80],
  [21.92, 22.32, 0.40, 0.80], [26.95, 27.35, 0.40, 0.80],
  [13.34, 13.78, 4.48, 4.92], // pozo / caja 0.44 m
  [8.02, 8.42, 6.00, 6.40], [13.34, 13.94, 6.00, 6.40], [16.50, 17.10, 6.00, 6.40],
  [22.05, 22.45, 4.6, 5.0], [27.15, 27.50, 4.8, 5.2],
  [16.70, 17.14, 12.55, 13.05], [21.90, 22.30, 12.55, 13.00], [26.90, 27.35, 12.60, 13.10],
  [16.70, 17.14, 16.85, 17.35], [26.90, 27.35, 16.80, 17.30],
  [16.55, 17.05, 24.90, 25.40], [21.90, 22.35, 24.85, 25.35], [26.85, 27.35, 24.90, 25.40],
].map(([x0, x1, z0, z1]) => rect(x0, x1, z0, z1));

// Muros: perímetro del nuevo sótano y divisiones de cuartos. Cada uno es una faja.
function band(x0, z0, x1, z1, t = 0.18) {
  const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1;
  const nx = -dz / L * t / 2, nz = dx / L * t / 2;
  return { o: [[x0 + nx, z0 + nz], [x1 + nx, z1 + nz], [x1 - nx, z1 - nz], [x0 - nx, z0 - nz]], h: [] };
}
export const WALLS = [
  // El acceso oeste queda abierto: el portón está en x = 0 y no hay muro detrás.
  band(0.10, 0.78, 9.91, 0.77),
  band(9.91, 0.77, 12.61, 0.63),
  band(12.61, 0.63, 20.81, 0.15),
  band(20.81, 0.15, 27.45, 0.43),
  band(27.40, 0.43, 27.27, 26.07),
  band(27.27, 26.07, 17.02, 25.45),
  band(17.02, 25.45, 16.46, 12.04),
  band(16.46, 12.04, 16.79, 6.26),
  band(14.09, 6.40, 8.12, 6.55),
  band(8.12, 6.55, 8.05, 3.95),
  band(8.05, 3.95, 0.15, 3.82),
  // cuartos norte
  band(9.55, -0.86, 12.45, -0.86),
  band(9.55, -0.86, 9.55, 0.55),
  band(12.45, -0.86, 12.45, 0.55),
  band(11.00, -0.86, 11.00, 0.40),
  // útiles, al norte del pozo
  band(16.76, 7.05, 19.35, 7.05),
  band(16.76, 7.05, 16.76, 9.70),
  band(19.35, 7.05, 19.35, 9.70),
  band(18.05, 7.20, 18.05, 9.55),
];

export const SPOTS = [
  { n: 1, r: [8.115, 13.336, 3.886, 6.387], aisle: 'n', axis: 'x', nose: -1, t: 'sedan', c: 0xe8e6e1 },
  { n: 2, r: [17.105, 21.925, 0.368, 2.765], aisle: 's', axis: 'x', nose: -1, t: 'hatch', c: 0xd8d8d4 },
  { n: 3, r: [22.326, 24.674, 0.311, 5.010], aisle: 's', t: 'hatch', c: 0x8d1d24 },
  { n: 4, r: [24.674, 27.024, 0.410, 5.410], aisle: 's', t: 'hatch', c: 0xe4e4e1 },
  { n: 5, r: [21.889, 24.388, 12.692, 17.191], aisle: 's', t: 'sedan', c: 0xc5c8cc },
  { n: 6, r: [19.391, 21.889, 12.692, 17.191], aisle: 's', t: 'sedan', c: 0xf2f2f0 },
  { n: 7, r: [17.121, 19.622, 20.955, 25.452], aisle: 'n', t: 'hatch', c: 0xc8cbcf },
  { n: 8, r: [19.622, 22.124, 20.955, 25.452], aisle: 'n', t: 'sedan', c: 0x111214 },
  { n: 9, r: [22.124, 24.622, 20.955, 25.452], aisle: 'n', t: 'suv', c: 0x16171a },
  { n: 10, r: [24.622, 27.121, 20.955, 25.452], aisle: 'n', t: 'sedan', c: 0xeceae6 },
];

export const MOTO_X = [16.68, 19.25];
export const MOTO_Z = [[12.692, 13.812], [13.812, 14.932], [14.932, 16.052], [16.052, 17.192]];

// Centro del tubo, absoluto. Tramo recto por el muro norte del acceso, a 2.25 m de la rasante.
export function trayPoint(x) {
  return { x, y: floorY(x, 0.62) + CLEAR_H, z: 0.62 };
}

// Puntos del eje, con barridos de radio EMT_R. El barrido de la jamba y el de la entrada al cuarto son los únicos quiebres.
export function emtCenterline() {
  const R = EMT_R, zWall = 0.62;
  const raw = [];
  raw.push([0.08, 0.28]);
  const cxA = 0.08 + R, czA = zWall - R;
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI - (Math.PI / 2) * (i / 8);
    raw.push([cxA + R * Math.cos(a), czA + R * Math.sin(a)]);
  }
  const xTurn = 11.15 - R;
  raw.push([xTurn, zWall]);
  for (let i = 1; i <= 8; i++) {
    const a = Math.PI / 2 - (Math.PI / 2) * (i / 8);
    raw.push([xTurn + R * Math.cos(a), (zWall - R) + R * Math.sin(a)]);
  }
  raw.push([11.15, 0.05]);
  return raw.map(([x, z]) => ({ x, z, y: floorY(x, 0.62) + CLEAR_H }));
}

export const PULL_BOXES = [
  { id: 'CJ1', name: 'jamba del acceso', x: 0.08, z: 0.28 },
  { id: 'CJ2', name: 'mitad del tramo recto', x: 6.0, z: 0.62 },
  { id: 'CJ3', name: 'entrada a C. Eléctrico', x: 11.15, z: 0.05 },
];
