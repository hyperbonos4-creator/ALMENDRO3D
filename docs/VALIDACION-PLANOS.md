# Validación contra los planos

## Plano nuevo de parqueadero y pisos (este cambio)

El sótano ya no sale de PL_A004. Lo reemplaza el plano de AutoCAD de una lámina (no se versiona el PDF). La escala se midió en los rectángulos blancos de las plazas: 171,8 pt = 2,50 m y 309,2 pt = 4,50 m, o sea **68,72 pt/m**. El origen (413,4 / 138,7) deja el pozo de 2,45 × 1,70 m encima del pozo de PL_A002, para que el ascensor siga siendo un solo hueco.

No hay piso esquemático ni lobby. El selector tiene sótano y **6 pisos** de apartamentos. El piso 1 de apartamentos queda en **N+3,70**, que es la primera cota de apartamento de PL_A006 (allí rotulada como piso 2). Los pisos 2 a 6 conservan N+6,40, 9,10, 11,80, 14,50 y 17,20. La cubierta sigue en N+20,30. Se quitó el volumen de N+1,00 y la puerta de vidrio del lobby. La puerta de bronce ED.ALMENDRA queda en el acceso oeste, a nivel de calle (N±0,00), del ancho de 3,33 m del acceso, abriendo hacia la rampa y el núcleo. El plano nuevo no dibuja otra puerta peatonal: se asume que la hoja peatonal va en ese portón.

La escalera en U de PL_A002 no se movió, para que el tramo llegue al mismo hueco en todos los pisos. En el plano nuevo el arranque queda unos 2 m más cerca del ascensor. El modelo conserva el hueco apilado. El tramo sótano → piso 1 salva N−2,96 a N+3,70 (6,66 m) con las mismas 16 contrahuellas: queda más empinado que un tramo de piso tipo. Está declarado aquí.

| Plaza | Medida en el vector | Pasillo | Notas |
|---|---|---|---|
| 1 | 5,22 × 2,50, en paralelo, al sur del acceso | norte, la rampa | pozo de 0,44 m en el extremo oriente, fuera de la boca |
| 2 | 4,82 × 2,40, en paralelo, al norte | sur | |
| 3 | 2,35 × 4,70 | sur | el módulo es 2,35 m, no 2,50: así está dibujado |
| 4 | 2,35 × 5,00 | sur | igual |
| 5 y 6 | 2,50 × 4,50 | sur, el pasillo de 3,76 m | la 6 al oeste, la 5 al este |
| 7 a 10 | 2,50 × 4,50 | norte, el mismo pasillo | fila sur, de oeste a este |
| Motos | 2,71 m de fondo; anchos 1,12 / 1,12 / 1,12 / 1,14 | el grupo abre al pasillo de 3,76 m | cuatro celdas al oeste de las plazas 5 y 6 |

Circulación, como las flechas del plano: se entra por el oeste hacia el oriente, se baja por el pasillo oriente de 2,64 m (flecha al sur, rótulo 13,6 %) y se sigue por el pasillo sur de 3,76 m (flecha al oriente). El rótulo del acceso oeste dice «pend. %» sin cifra. El modelo baja ese tramo solo lo necesario para empatar con la cota alta del 13,6 % (unos 0,38 m en 24 m, cerca del 1,6 %). C.ASEO y C.ELECTRICO/TELEC están en el borde norte, entre los ejes A y B. C.UTIL 1 y 2 quedan al norte del ascensor. No hay cuarto de basuras en el plano nuevo.

### Tubería URBAN

EMT de **3/4"** (diámetro exterior 23,4 mm), a la vista, grapada al muro norte del acceso. No va enterrada. El eje está a **2,25 m** sobre la rasante; el bajo del tubo queda a **2,24 m**, por encima de un vehículo. El tronco entra por la jamba oeste, hace un barrido de 90° con radio **200 mm** (más holgado que el mínimo usual de 114 mm para 3/4") y sigue recto hasta C. Eléctrico/Telecom, donde otro barrido de 90° entra al cuarto. En el tronco hay **180°** de curvatura.

Cajas de paso: **CJ1** en la jamba del acceso, **CJ2** a mitad del tramo recto (x ≈ 6 m) y **CJ3** en la entrada del cuarto eléctrico. Entre dos cajas no se acumulan más de 90°. Las cámaras C1, C2 y C3, el kiosko, el ESP32, la cerradura, el sensor y el botón de salida bajan o suben hasta el tronco con un solo barrido de 90° cada uno. El largo del tronco y el largo con derivaciones los escribe el visor en el rótulo de la ruta («Ruta de tubería propuesta (a la vista, por aire)»).

## Validación geométrica (planta contra el dibujo anterior)

Lo que sigue describe el pase contra PL_A004, ya reemplazado en el sótano. Se conserva como historial del método.



## Validación geométrica (planta contra el dibujo)

Tolerancia: **0,10 m** para muros, columnas y huella del edificio (ruido de la vectorización, ya declarada en ±0,1 m). Las líneas de plaza que se leen directo en PL_A004 cierran a **0,01 m**. Un vehículo no puede salir de su celda: la trompa queda **0,22 m** detrás de la línea del pasillo y la cola **0,18 m** antes del muro. Eso es más estricto que 0,10 m.

Método: las láminas se rasterizaron y, con la misma escala del extractor (71,06 pt/m, origen 243,84 / 95,52; A002 desplazada 122 / −8 pt), se dibujó encima la planta del modelo. Los PDF no se versionan. Las superposiciones tampoco: llevan el dibujo del plano.

| Elemento | Plano (PL_A004, medido en el vector) | Modelo antes | Modelo ahora | Δ | Estado |
|---|---|---|---|---|---|
| Plaza carro, ancho | 2,50 m (16,86–19,35 y repetido en las 9) | el mismo rectángulo | sin cambio | 0,00 | Igual |
| Plaza carro, fondo | 4,50 m (p. ej. z 3,87–8,37; 12,69–17,19; 20,95–25,44) | el mismo rectángulo | sin cambio | 0,00 | Igual |
| 9 plazas | tres filas: 3 + 2 + 4, en esas coordenadas | `SPOTS` coincide | sin mover la celda | 0,01 | Igual |
| Bordillo entre plazas | 0,14 × 4,49 m en el dibujo | `YC` en esas coordenadas | sin cambio | 0,01 | Igual |
| Motos | 4 celdas, anchos 1,12 / 1,12 / 1,12 / 1,14 entre z 12,69 y 17,19, x 16,58–19,29 | igual | la moto (2,06 × 0,76 m de malla) cabe; escala 1 | 0,01 | Igual |
| Trompa plazas 1–3 | dentro de la celda, mirando al pasillo de la rampa; el bloque de tope está al fondo | malla más larga que la cota nominal y trompa a z = 3,93, encima del bordillo (z ≈ 3,81–3,97) | trompa en z = 4,09 (0,22 m dentro de 3,87); escala 0,93–0,94 | se corrige el rebase | Corregido |
| Trompa plazas 4–5 | el dibujo pone la trompa hacia el pasillo central (z alto, la flecha) y la cola contra el muro norte | `f = −1` las dejaba mirando al muro (trompa z = 12,91) | `aisle: 's'`, trompa z = 16,97 (0,22 m dentro de 17,19); cola z = 12,87; escala 0,88 | orientación | Corregido |
| Plazas 6–9 | el dibujo pone la trompa hacia el pasillo (z bajo) y el tope contra el muro | `f = +1` las ponía al revés y la cola salía de z = 20,95 | `f = −1`, trompa z = 21,17, cola z = 25,26, tope en z 25,28–25,40 | orientación y holgura | Corregido |
| Tope de rueda | bloque al fondo de la celda, detrás de la cola (se ve en el símbolo del plano) | topellantas junto al eje, a veces hacia el pasillo | barra al fondo, del lado del muro: z alto en las plazas 1–3 y 6–9, z bajo en las 4–5 | — | Corregido |
| Columnas del sótano | cuadrados del dibujo, ~0,5–0,6 m | `cols4` extruido | la superposición cae sobre el cuadrado azul del plano | ≤ 0,05 | Igual |
| Muros del sótano y cuartos | perímetro y divisiones de C. Útil 1/2, eléctrico y basuras | `walls4` / `sotx` | la línea roja del modelo sigue el muro negro | ≤ 0,10 | Igual |
| Rampa | 21,79 m, borde sur z ≈ 3,97 junto a los cuartos; las plazas 1–3 abren a ese pasillo sin sardinel | muro y bordillo amarillo/negro corrían también por delante de las plazas 1–3 | el muro, el bordillo y la línea amarilla del borde sur terminan en x = 16,64 (fin de C. Basuras). Delante de las plazas el piso empalma con la plataforma | el pasillo queda abierto | Corregido |
| Muros planta tipo | PL_A002 | `walls2` | superposición roja sobre el muro del plano en los cuatro apartamentos, balcón, puertas y ventanas | ≤ 0,10 | Igual |
| Columnas planta tipo | cuadrados del dibujo | `cols2` | coinciden (marca azul) | ≤ 0,05 | Igual |
| Escalera | 21,36–24,46 × 9,69–11,69 | `I.stair` | el rectángulo naranja cae sobre la escalera dibujada | 0,01 | Igual |
| Pozo del ascensor | 16,755–19,207 × 9,841–11,541 (2,45 × 1,70) | `I.shaft` | el rectángulo cyan cae sobre el pozo | 0,01 | Igual |
| Piso 1 | el N+1,00 sin planta se eliminó | volumen esquemático y lobby | el piso 1 de apartamentos es el N+3,70 (antes piso 2). No hay lobby | — | Corregido |
| Cubierta | no hay planta de cubierta; la huella es la de PL_A002 / el antepecho sigue `foot2` | igual | sin desvío nuevo; N+20.30 y antepecho 0,60 m se mantienen | ≤ 0,10 en planta | Igual |

La malla real del carro (no la cota nominal del tipo) mide: hatch 4,37 × 2,01 m, CUV 4,41 × 1,98 m, sedán 4,66 × 2,02 m, SUV 4,61 × 2,04 m. Por eso un sedán «de 4,55 m» no cabía en 4,50 m y la trompa pasaba el bordillo. Ahora se escala solo lo necesario para quedar dentro, sin mover la celda.

## Paso libre hasta el pasillo

Con `?qa=1` el visor mide, contra la malla del sótano, un rectángulo del ancho de la plaza desde la línea de la boca hasta 2,60 m dentro del pasillo, entre 0,04 m y 1,45 m sobre el piso. El piso y la pintura no cuentan. El bordillo amarillo de la línea de plaza (0,14 m, en el borde) tampoco: es el límite del módulo, no un obstáculo en medio. Una columna de `cols_in` es la del plano y se anota aparte; un muro, un bordillo o una baranda que cruce el rectángulo lo cierra. El resultado queda en `window.__app.access` y se dibuja en verde (pasa) o rojo (no pasa) sobre el piso.

Plazas 1–3 salen a la rampa (z bajo). Plazas 4–5 y 6–9, y las motos, salen al pasillo de la flecha (el plano lo acota 3,76 m entre las dos filas; los 2,80 m del rótulo son el tramo de 13,6 % al oriente, no esta circulación). Las motos del dibujo miran al muro oeste, con la cola hacia la línea amarilla; se dejaron así.

| Plaza | Pasillo | Ancho del paso | Libre de muro y bordillo | Si cuenta la columna de eje | Estado |
|---|---|---|---|---|---|
| 1 | rampa, al norte | 2,49 m (el vector da 16,86–19,35) | 2,49 m | 2,49 m | Pasa |
| 2 | rampa, al norte | 2,50 m | 2,50 m | 2,44 m | Pasa. La columna 21,82–22,22 × 3,88–4,28 roza la esquina |
| 3 | rampa, al norte | 2,50 m | 2,50 m | 2,10 m en la boca | Pasa en el pasillo. La misma columna queda dentro de la celda, en la esquina que el plano dibuja. El carro se corrió a x = 23,24 para no montarla (sigue dentro de la línea, holgura 0,17 m al este) |
| 4 | central, al sur | 2,50 m | 2,50 m | 2,46 m | Pasa |
| 5 | central, al sur | 2,50 m | 2,50 m | 2,04 m en la boca | Pasa en el pasillo. Columna de eje 21,76–22,29 × 16,78–17,20 en la línea. El carro se corrió a x = 23,19 |
| 6 | central, al norte | 2,50 m | 2,50 m | 2,50 m | Pasa |
| 7 | central, al norte | 2,50 m | 2,50 m | 2,50 m | Pasa |
| 8 | central, al norte | 2,50 m | 2,50 m | 2,50 m | Pasa |
| 9 | central, al norte | 2,50 m | 2,50 m | 2,50 m | Pasa |
| M1–M4 | central, al sur del grupo | celda 1,12 / 1,14 m; el frente del grupo mide 2,71 m | 2,46 m | 2,14 m | Pasa para la celda. No cabe un rectángulo de 2,50 m: el muro del lindero y la columna 16,71–17,14 × 16,73–17,25 están en el plano y comen el extremo oeste. El paso de cada moto (0,76 m de malla) queda libre |

El empalme de la rampa con las plazas 1–3 no es un escalón. En x ≥ 16,64 los últimos 2,60 m del borde sur bajan de la pendiente 10,9 % a la plataforma (N−2,37). En el extremo oeste de esa boca el desnivel es de unos 0,54 m, así que el empalme sale al 21 %. Es el acuerdo entre el rótulo 10,9 % × 21,79 m y la plataforma plana donde el plano dibuja las celdas; no se cambió la pendiente media ni la cota de la plataforma.

## Lectura de rótulos (pase anterior)

Fuente: los PDF PL_A002, PL_A004 y PL_A006 (no están en el repo). Se leyeron el rótulo, el cuadro de áreas, el cuadro de ventanas, las cotas de nivel de los cuatro alzados y las cotas de rampa, sótano, escalera y ascensor. La geometría en planta del modelo sale de `datos/scene.json` y `datos/interior.json`, extraídos del vector de esas mismas láminas (2835 × 2004 pt). Los módulos `vec`, `sheets` e `items` no están en el repositorio, así que no se reextrajo el PDF; esta vez la comprobación geométrica es la superposición de arriba, no solo el texto.

Fecha del rótulo en las tres láminas: **09/09/2022**. El README decía 05/09/2022; el visor ya decía 09/09/2022. Queda 09/09/2022 en los dos sitios. No hay otra fecha en los datos.

## Qué láminas hay

| PDF | Rótulo | Contenido |
|---|---|---|
| PL_A002 | plancha **2/6**, planta arquitectónica típica, escala 1:50 | Pisos tipo (aptos 201–701). No es el piso 1 |
| PL_A004 | plancha **4/6**, planta parqueadero | Sótano, rampa, 9 carros, 4 motos, cuartos de servicio |
| PL_A006 | plancha **6/6**, fachadas, escala 1:100 | Frontal, posterior, lateral derecha, lateral izquierda, niveles y cuadro de materiales |

No está la plancha **1/6**. Tampoco la 3/6 ni la 5/6. El piso 1 no se puede modelar desde estos PDF: no traen su planta. Sigue el volumen esquemático y el lobby supuesto que ya declaraba el modelo. No se inventaron muros ni vanos de ese piso.

## Niveles (PL_A006, los cuatro alzados)

Cota en el alzado y cota en `LEVY` (`src/src/interior.js`) y en `LV` (`src/src/main.js`).

| Elemento | Plano | Modelo | Estado |
|---|---|---|---|
| Calle / N+0.00 | N+0.00 | 0 | Igual |
| Piso 1 | N+1.00 | 1.00 | Igual |
| Pisos 2 a 7 | N+3.70, 6.40, 9.10, 11.80, 14.50, 17.20 | los mismos | Igual |
| Cubierta | N+20.30 | 20.30 | Igual |
| Sótano | N−2.96 | −2.96 | Igual |
| Altura libre de piso | 2.50 m, losa 0.20 m (cadena repetida en los cuatro alzados) | `H = 2.50`, entrepiso 2.70 | Igual |
| Antepecho de cubierta | 0.60 m | remate desde el cielo del piso 7 hasta N+20.30 + 0.75, con los 0.60 m del rótulo | Igual en la cota; el espesor del muro es de modelo |
| Altura libre del sótano bajo la losa del piso 1 | 3.76 m en el alzado lateral (N−2.96 hasta el bajo de la losa en N+0.80) | cielo de sótano en N+1.00 − 0.20 | Igual |

De N+0.00 a N+1.00 el alzado mide ~29 pt y de N+1.00 a N+3.70 el salto de texto coincide con 2.70 m a la escala 1:100 de la lámina (~28.3 pt/m). No hay un nivel intermedio no modelado entre el 2 y la cubierta.

## Planta tipo (PL_A002)

Cuadro de áreas del rótulo contra `datos/interior.json` (el modelo rotula esas áreas).

| Apartamento | Total en plano | En el modelo (`APT`) | Estado |
|---|---|---|---|
| Tipo 1 (201/202 … 701/702) | 60.85 m² | 60.85 | Igual |
| Tipo 2 (203 … 703) | 60.95 m² | 60.95 | Igual |
| Tipo 3 (204 … 704) | 62.06 m² | 62.06 | Igual |

Recintos del cuadro que coinciden con el JSON al centésimo: sala, cocina, ropas, alcobas, baños y balcón (3.31 m²) de los tres tipos, y la circulación del tipo 3 (2.84 m²). El tipo 1 no tiene recinto de circulación en el cuadro ni en el JSON (sala abierta). Ascensor del cuadro: 4.16 m²; el recinto `cabina` del JSON es 4.16 m².

| Recinto | Plano | JSON | Estado |
|---|---|---|---|
| Circulación tipo 2 | 5.16 m² (cuadro) | 5.19 m² (polígono) | Diferencia 0.03 m². Se deja el polígono del vector. Está por debajo de la tolerancia que ya declaraba la extracción (±0.1 m) y no da para mover un muro |

Ventanas, cuadro de la misma lámina (sillar / dintel) contra `skin` y `wins` del JSON, que el modelo extruye sin cambiar el sillar ni el dintel:

| Código | Sillar | Dintel | En el JSON / modelo | Estado |
|---|---|---|---|---|
| V-1, V-3, V-4, V-5, V-6 | 0.80 | 2.20 | 0.80 / 2.20 | Igual |
| V-2 | 1.70 | 2.20 | 1.70 / 2.20 | Igual |
| V-7, V-8 | 0.00 | 2.20 | 0.00 / 2.20 | Igual |

Hay vanos del vector sin código (`approx: true` en el JSON). El modelo los trata como vano genérico, igual que ya decía el panel «Qué es aproximado». No se les asignó un código que la lámina no trae.

Puertas: el JSON trae hojas de ~0.60, ~0.68 y ~0.77 m (el arco dibujado). En la planta las cotas nominales que se leen son 0.70 y 0.80 m, módulo de hoja con marco. No se sustituyó el arco medido por el módulo redondo: el vector es la geometría y la cota redonda incluye el marco. El alto 2.10 m no está en esta lámina; sigue como supuesto, declarado en el visor.

## Escalera y ascensor (PL_A002 y PL_A004)

| Elemento | Plano | Modelo | Estado |
|---|---|---|---|
| Tramo | 7 huellas × 0.30 m (la cadena `.30` siete veces) | `NT = 7`, `TW = 0.30`; `x1 − x0 = 23.46 − 21.36 = 2.10` | Igual |
| Ancho de tramo y descanso | 1.00 m y 1.00 m en la cadena junto al núcleo; desarrollo en X del descanso `xl − x1 = 1.00` | `z` del JSON: 9.69 / 10.69 / 11.69 (dos tramos de 1.00) | Igual |
| Pozo | 2.45 × 1.70 m (PL_A004, cota junto al núcleo) | `shaft` 16.755–19.207 × 9.841–11.541 = 2.452 × 1.700 | Igual |
| Puerta de piso | vano 1.00 m (19.207–19.355 en X es el muro; en Z, 10.192–11.192 = 1.00) | `edoor` del JSON, sin reescalar | Igual |
| Contrahuella pisos 2–7 | no está acotada; el entrepiso de PL_A006 es 2.70 m | 16 contrahuellas × 2.70/16 = 0.16875 m | Derivada del entrepiso, no inventada |
| Tramo sótano → piso 1 | misma planta (las huellas de 0.30 se dibujan también en PL_A004); el desnivel es N−2.96 → N+1.00 = 3.96 m | las mismas 16 huellas, contrahuella ≈ 0.247 m | La lámina no da otra cantidad de huellas. Se mantiene la planta y se reparte el desnivel. Sigue más empinado que un tramo de piso tipo; está declarado en el visor |

La escalera en U no se cambió por la zanca única del video. Las huellas siguen en las cotas de la planta. Lo que cambió es el aspecto: huella abierta de concreto claro y zanca de acero, que es el acabado de la foto del hall, no una cota nueva.

## Sótano, rampa y parqueaderos (PL_A004)

| Elemento | Plano | Modelo | Estado |
|---|---|---|---|
| Rampa, largo | 21.79 m | `RAMP.x1 = 21.79` | Igual |
| Pendiente tramo 1 | rótulo 10.9 % | `s1 = 0.109` | Igual |
| Pendiente tramo 2 | rótulo 13.6 % | `s2 = 0.136` | Igual |
| Ancho de rampa en el acceso | 3.33 m | franja vehicular entre el muro norte y z ≈ 3.97 | Igual en orden de magnitud; el borde sur lo da el vector |
| Plazas de carro | 9, módulo 2.50 × 4.50 m en las cotas | 9 rectángulos del vector, largo 4.50 m y ancho ≈ 2.49 m | Igual |
| Motos | 4, anchos 1.12 / 1.12 / 1.14 / 1.12 m | `MOTO_Z` con esos intervalos | Igual |
| C. Útil 1 / 2 | 3.29 / 3.26 m² | iguales en `sotx.rooms` | Igual |
| C. Eléctrico / telecom | 3.67 m² | igual | Igual |
| C. Basuras / aseo | 9.77 m² | igual | Igual |
| Lote | 359.77 m² | no se modela el lote como sólido; la cifra no entra al 3D | No aplica al sólido |

### Plataforma N−2.00 y el producto 10.9 % × 21.79 m

PL_A006 rotula **N−2.00** en los cuatro alzados, entre N+0.00 y N−2.96 (el texto cae ~2.0 m bajo N+0.00 a la escala de la lámina). PL_A004 rotula 10.9 % y 21.79 m en el primer tramo, y 13.6 % en el segundo.

10.9 % × 21.79 m = 2.375 m, o sea una plataforma en **N−2.37**, no en N−2.00. El segundo tramo dibujado (`lane2`, de z ≈ 8.3 a z ≈ 12.6, 4.3 m) × 13.6 % = 0.585 m. 2.375 + 0.585 = 2.96, que cierra exactamente en **N−2.96**.

Las dos lecturas no caben a la vez:

- Si la plataforma es N−2.00 y el largo es 21.79 m, la pendiente media es 9.18 %, no 10.9 %.
- Si la pendiente es 10.9 % y el nivel es N−2.00, el largo sería 18.35 m, no 21.79 m.
- Si además el segundo tramo mide los ~4.3 m del dibujo a 13.6 %, desde N−2.00 bajaría a N−2.58, no a N−2.96.

El modelo se deja en la lectura que cierra: 10.9 % en 21.79 m y 13.6 % en el tramo dibujado, llegando a N−2.96. N−2.00 queda como conflicto del propio plano, ya anotado en el visor («plataforma ≈ N−2.37, por verificar»). No se movió el piso para forzar un rótulo que deshace las otras tres cotas.

## Fachada (PL_A006)

El cuadro de materiales nombra revoque, concreto café, listón beige, gris, blanco, vidrio templado opaco, cortagoteras, losa y cubierta termoacústica. No da códigos de color hex. La posición de los vanos sale de la planta (PL_A002). El reparto de listón, gris y café sobre los paños ciegos es interpretación del alzado: la lámina muestra la fachada frontal con el balcón a la izquierda y bahías verticales alternas de ventana y listón, que es el esquema que arma `style8.js`, no un calco panel por panel de las cuatro caras.

Lo que sí se ajustó, sin mover un vano:

- Marcos de fachada al moca de las fotos (`#A69382`), dentro del «café» del cuadro. El video pedía el mismo tono.
- Listón al roble claro de las fotos (`#D6B997`), que es el «beige» del cuadro. El video pedía un pino más amarillo; mandan las fotos.
- Bahías de ventana oscuras (`#4E545C`) y perfilería `#1A1A1A`.
- Vidrio un poco azulado y reflectivo, como las fotos. Sigue siendo el vidrio opaco del cuadro, no un muro.
- Cuatro cables en el balcón y pasamanos amarillo-oro. El video pedía cobre y cinco cables; las fotos muestran amarillo-oro y postes blancos.
- Cubierta: adoquín gris claro y tapajunta metálico oscuro sobre el antepecho moca. La cota de cubierta sigue en N+20.30. El lucernario sobre la ranura del punto fijo **no está en los planos**; sigue marcado como supuesto.

## Puerta de acceso

No está dibujada en ninguna de las tres láminas. El ancho del hueco (~6.10 m, del muro norte de la rampa al lindero) sale del vector de PL_A004 y no se cambió. El aspecto (bronce, calado, dintel «ED.ALMENDRA», manija, teclado) sale de la referencia fotográfica, no de una cota. El alto sigue siendo estimado; la opción de 2.6 m se conserva.

## Qué no se pudo verificar y por qué

- Planta del piso 1, escalera de acceso N+0.00 → N+1.00 y puerta de vidrio del lobby: haría falta la plancha 1/6. No está. No se modeló.
- Planchas 3/6 y 5/6: no vinieron. Si traen cortes o detalles de fachada, no se contrastaron.
- Cada vértice de muro contra el PDF: la extracción original no se puede repetir aquí sin `vec.py` / `sheets.py`. Las cotas, áreas, niveles, ventanas, pozo y escalera de arriba sí se leyeron en el PDF.
- Acabados interiores, amoblado, cabina del ascensor, velocidad y el sistema URBAN: no están en estas láminas. Siguen ilustrativos.
- Los PDF pueden guardarse en privado y correrse con `python3 herramientas/extract.py --planos <carpeta> --pypath <módulos>`. No se suben a este repo público.
