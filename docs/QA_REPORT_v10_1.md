# Almendra 3D v10.1 — QA (NO publicada)

## Causa raíz
`extract.py/colrects()` tomaba como columna cualquier rectángulo trazado a 0.6 pt de 0.17–0.98 m, sin mirar el color del trazo.
En A002 las columnas y ductos reales tienen trazo negro y rayado. Las lavadoras y lavaderos (gris 0.33) y las neveras y mesas de noche (gris 0.46) también cumplían ese filtro.
Por eso salían como muros (caps y caras) de 2.5 m: el "volumen gris alto" en los ropas, bloques en las cocinas y en la alcoba principal.

## Correcciones (tools/fix_interior.py + src/src/fur7.js)
- 20 rectángulos falsos fuera de los muros: 4 lavadoras, 4 neveras, 4 mesas de noche, 4 lavaderos y 4 pocetas. Caps 33→25, caras −68/+6.
- Recintos reparados: área libre = polígono de piso del vector menos los muros del plano. Diferencia con el plano: 0.00–0.01 m² en los 35 recintos.
- Aparatos según el plano:
  - lavadora: 0.85 m, puerta redonda, mira al espacio libre;
  - nevera: 1.78 m;
  - mesa de noche;
  - lavadero 0.56×0.37 en el apto 03 (antes había una poceta de 0.34×0.25).
  - Todos con colisión.
- La cocina ya no inventa una nevera cuando el plano la dibuja.
- Puertas corredizas de 0.70 en los ropas 03 y 04 (hoja gris 0.73 en el vector; el extractor solo leía puertas batientes). Se muestran abiertas.
- Ropas 03: la franja de 0.77 m al oeste de la corrediza es paso de la cocina, no ropas.

## Auditoría (audit/)
- cotas_A002.csv: 256 cotas, cada una contra su tramo medido en el vector a la escala del modelo (71.06 pt/m).
  - 250 dentro de ±3 cm.
  - 2 marcadas en el punto fijo (cadena .40/1.01 con una marca intermedia en el plano; es ambigua del propio dibujo).
  - 4 sin tramo legible.
- recintos_plano_vs_modelo.csv: área libre del plano vs v10 vs v10.1, por recinto.
- aparatos_v10_vs_v101.csv: inventario de aparatos.
- overlay_v10_apto0X.png / overlay_v10_1_apto0X.png: PDF con el modelo encima.

## Hipótesis, sin cambio
- Rótulos de área frente a la geometría:
  - Ropas 01/02: 3.07/3.10 = 2.36/2.38 × 1.30 a caras interiores. El modelo da 3.21 porque incluye el nicho de la ventana V-2 de fachada y el umbral.
  - Ropas 03/04: 2.56/2.60 incluyen el ducto y la hoja (área bruta). El modelo, libre, da 2.37.
- Cocina/sala abiertas (01, 02, 03, 04): la suma de las dos coincide con el plano (±0.3 m²); solo cambia la línea divisoria, que en el plano no es un muro.
- Ventanas de fachada (skin): 3 cm por lado más angostas que el vano, de forma sistemática (marco). No se cambió.
- Ventana interior cocina–ropas (1.00 m corrediza) de los aptos 01/02: el plano no le pone rótulo propio. El modelo usa 1.70/2.20.
- Lectura de Luisa "ventanas 1.58/1.56 con machones de 0.80": según el vector, 1.58/1.56 son cotas que incluyen la ventana de 1.00 m más los machones, y el .80 es el vano de la puerta (hoja 0.70).

## QA
- Headless Chrome (swiftshader), `?qa=1`, calidad Alta. Errores de consola: 0 en v10.1 (16 vistas) y 0 en v10 (15 vistas). Solo aparecen advertencias de Canvas2D, que no son errores.
- Capturas:
  - shots/antes/ y shots/despues/;
  - comparativas en shots/comparacion/ (antes_despues_*.png y plano_vs_modelo_apto0X.png).
