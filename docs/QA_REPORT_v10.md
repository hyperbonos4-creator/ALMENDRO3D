# QA v10 — Edificio Almendra (2026-11-26, COT)
HTML: ed_almendra_3d_v10.html md5 b9926e183da403c5566c5d1062d6a415 · paquete almendra-v10-src.tgz · deploy_almendra_v10.sh (base viva v9 600c9fff…; NO ejecutado).
Base: v8.1 (se descarta el trabajo de v9 del otro modelo). Capturas: shots10/ (01–19), log shots10/_log.txt.

## Hechos medidos (headless, Chrome swiftshader)
- 0 errores de consola / pageerror en 20 escenas (solo avisos Canvas2D willReadFrequently).
- Contacto llanta-piso (vértice más bajo de la malla vs raycast al piso real, tolerancia 1 cm): 10 carros × 4 llantas y 4 motos × 2 llantas = 0,0 mm. También tras el ciclo salir/entrar del carro demo (plaza 9): OK.
- Carro demo: sale ('out') y vuelve a estacionar de reversa en la plaza 9 en 26 s.

## Modelo vs PDF (plano nuevo del sótano, vector)
| Elemento | PDF | Modelo |
|---|---|---|
| Plaza 1 | 5.22 × 2.50 | 5.221 × 2.501 |
| Plaza 2 | 4.82 × 2.40 | 4.820 × 2.397 |
| Plaza 3 | 2.35 × 4.70 | 2.348 × 4.699 |
| Plaza 4 | 2.35 × 5.00 | 2.350 × 5.000 |
| Plazas 5–10 | 2.50 × 4.50 | 2.498–2.502 × 4.497–4.499 |
| Franja motos | 2.71 | 2.71 (celdas 1.12/1.12/1.12/1.14) |
| Pasillo sur | 3.76 | 3.76 |
| Rampa oriente | 2.64, 13.6 % | 2.64 nominal (≈2.58 libre junto a baranda, 2.44 frente a la caja de escalera), 13.6 % en 8.50 m |
| Acceso | 3.33 | 3.33 entre caras exteriores; 3.04 libre (portón) |
| Ascensor | 2.45 × 1.70 | 2.45 × 1.70 |
| C. ASEO / C. ELÉC.-TELEC / C. ÚTIL 1 / C. ÚTIL 2 | (áreas medidas) | 1.68 / 1.81 / 3.35 / 3.26 m² |
| Columnas / topellantas | 22 / 20 | 22 / 20 (coordenadas del vector) |
| Área interior / exterior del sótano | — | 348.4 / 364.2 m² |

## Supuestos (el PDF no trae niveles)
- Calle N±0.00; plataforma NPT -1.00 (rampa de acceso 8.10 m ≈13.7 % con curvas de transición; "pend. %" en blanco en el PDF); nivel bajo NPT -2.16 (13.6 % × 8.50); losa podio N+1.50/1.70; piso 1 N+1.70 … piso 6 N+15.20; cubierta N+18.30.
- Sin lobby: entrada directa al parqueadero; escalera/ascensor suben al piso 1.
- Discrepancia: el plano del sótano dibuja la escalera ≈1.0 m al oeste de la de la torre (PL_A002). Se mantiene la de la torre; debe resolverla la arquitecta.
- Peatones del nivel bajo suben a la plataforma por la rampa (no hay escalera dibujada entre -2.16 y -1.00).
- Vehículos, acabados, URBAN: ilustrativos/propuesta.

## Revisión visual (Read)
- 07 planta: planta cenital con cotas, sin halos de marcadores. 08 lateral: corte de terreno limpio, sin bloque gris ni piezas colgando.
- 13 motos: verticales, alineadas, separadas, sobre el piso. 14/15: carros 7-8-9 apoyados, sin plataformas raras.
- Pendientes menores: cotas pequeñas en pantallas chicas; marcadores URBAN se ven a través del portón (etiquetas sin oclusión, como en v8).
