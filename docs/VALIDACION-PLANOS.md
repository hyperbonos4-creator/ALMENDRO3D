# Validación contra los planos originales

Fuente: los PDF PL_A002, PL_A004 y PL_A006 enviados por el propietario (no están en el repo; ver la nota al final). Se leyeron el rótulo, el cuadro de áreas, el cuadro de ventanas, las cotas de nivel de los cuatro alzados y las cotas de rampa, sótano, escalera y ascensor. La geometría en planta del modelo sale de `datos/scene.json` y `datos/interior.json`, extraídos antes del vector de esas mismas láminas (tamaño de página 2835 × 2004 pt, el que usa `herramientas/extract.py`). No se reextrajo vértice a vértice: los módulos `vec`, `sheets` e `items` que necesita esa extracción no están en el repositorio. Donde el JSON ya trae el número del plano, el modelo lo consume tal cual.

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
