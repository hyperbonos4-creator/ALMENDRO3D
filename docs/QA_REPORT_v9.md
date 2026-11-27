# QA v9 — Edificio Almendra 3D

Build: `publicado/ed_almendra_3d.html` · md5 `600c9fff650aac2e3f8bb6a9633ad46a` · 1675 KB · base origin/main `f0782f0` (md5 de main `bc0a2e63…`).
Prueba headless: Chrome + SwiftShader (playwright-core), `?qa=1`. Runner `qa9.mjs`, capturas en `shots9/`.

## Qué cambió respecto a main
| Tema | Cambio |
|---|---|
| Acabado v8.1 | Carros `car8` y listones de pino con ranura **ya estaban en main** (diff sin duplicar). Solo se portaron los colores del video: plaza 5 sedán rojo oscuro, plaza 6 sedán gris. Se mantiene el tono #D6B997 de main (decisión de main: "roble claro de las fotos"). |
| Portón | Por defecto el dorado/bronce calado (`foto`). El grafito del video sigue en el selector *Estilo*. Probado: foto → render → foto. |
| Muros del acceso | Muro norte y sur del acceso movidos al eje del PDF (diferencia de 7–8 cm > 2 cm). |
| Motos | Fondo 2.57 → **2.71 m** (PDF). El control de paso libre de motos ahora usa ese mismo rango. |
| Sendero peatonal | Nuevo: portón → parqueadero → escalera/ascensor (ver abajo). |
| Lobby | Se borró la función `lobby()` sin uso y el texto "puerta del lobby" → "puerta peatonal". En el html solo quedan 3 menciones, y todas dicen "No hay lobby". |
| Terreno | **Bug de main corregido:** los dos huecos del plano de terreno (torre + tramo de rampa) se solapaban, el triangulado fallaba y el terreno (verde, a cota de calle) tapaba el sótano bajo la torre. Ahora es un solo hueco (unión). Se verificó con raycast: bajo la torre ya no hay superficie en y = −0.005. |

## Medidas: modelo vs PDF
| Elemento | PDF | Modelo | Δ |
|---|---|---|---|
| Acceso (portón) | 3.33 | 3.33 (z 0.63–3.96) | 0 |
| Plaza 1 | 5.22 × 2.50 | 5.221 × 2.501 | ≤ 0.1 cm |
| Plaza 2 | 4.82 × 2.40 | 4.820 × 2.397 | 0.3 cm |
| Plaza 3 | 2.35 × 4.70 | 2.348 × 4.699 | 0.2 cm |
| Plaza 4 | 2.35 × 5.00 | 2.350 × 5.000 | 0 |
| Plazas 5–10 | 2.50 × 4.50 | 2.498–2.502 × 4.497–4.499 | ≤ 0.3 cm |
| Motos (fondo) | 2.71 | 2.71 (x 16.68–19.39) | 0 (antes 2.57) |
| Pendiente pasillo oriente | 13.6 % | 13.6 % (`floorY`) | 0 |
| Pasillo oriente | cota 2.64 | 2.87 (línea plaza 5 → cara del muro) | **Hecho:** el dibujo del PDF mide 2.87 entre esas mismas líneas. El modelo copia el dibujo; la cota 2.64 no coincide con lo dibujado. Hay que confirmarlo con el arquitecto. |
| Pasillo 3.76 | cota 3.76 | sin medición automática en esta pasada | **Pendiente:** no se inventa el valor. |
| Pozo del ascensor | 2.45 × 1.70 | 2.45 × 1.70 (el origen del plano se calzó sobre ese pozo) | 0 |
| Gálibo bajo la viga del acceso | — | 2.197 m | — |

Las plazas y los carros se midieron con `__app` en el navegador. La bbox de cada carro cabe en su celda (escala 0.88–0.98). El paso libre da 14/14 OK.

## Sin lobby y recorrido peatonal
- **Hecho:** no hay lobby; no hay ninguna ruta, cámara, tour ni texto de lobby. Las 3 menciones que quedan dicen "No hay lobby".
- **Recorrido:** portón (hoja peatonal) → franja peatonal por el acceso → giro al sur en x = 19.95 → escalera/ascensor (z 9.62). El ascensor se probó en el sótano con `evRequest('sot')`: abre con etiqueta "S" (qa9b); la botonera del ascensor llega al piso 1 y hasta el 6.
- **Sendero:**
  - 0.90 m de ancho;
  - concreto pulido gris verdoso con bordes amarillos de 10 cm;
  - pictograma peatonal cada 4 m;
  - en el piso, el rótulo "ESCALERA · ASCENSOR".
- **Solo pintura:** no hay bolardos ni bordillo, porque reducirían el carril y los cajones por debajo del PDF.
- **Conflicto (hecho del PDF):** la lámina muestra **un solo vano de 3.33 m** con dos hojas y no dibuja una entrada peatonal separada. Se mantuvo la hoja peatonal dentro del portón, como en main. Si existe otra entrada peatonal, hace falta su plano para ubicarla con la medida exacta.

## Pruebas
- Consola: 0 `pageerror` y 0 `console.error`.
- Selector del portón: `{toRender:"render", backToFoto:"foto"}`.
- Carro: sale "out" y entra "parked".
- Portón vehicular: abre con v1 = 1 y la hoja peatonal queda en 0.
- Niveles: sot, p1–p6.
- Cantidades: 10 carros y 4 motos.
- Capturas revisadas: sin objetos flotando, sin carros dentro de muros y sin z-fighting visible en el sendero.

## Capturas (shots9/)
| Captura | Contenido |
|---|---|
| 01 | Fachada |
| 03 | Portón dorado + kiosko |
| 05 | Opción grafito |
| 06 | Sótano en planta |
| 07 | Rampa con carro |
| 08 | Parqueo en primera persona |
| 09, 10 | Interiores (sala 303, comedor/cocina) |
| 12 | Recorrido desde la entrada por el sendero |
| 13 | Sendero en planta |
| 14 | Sendero hasta la escalera |

## Hipótesis / pendientes
- **Visual (hipótesis):** con el hueco del terreno corregido, desde la esquina se ve el sótano bajo la torre (plazas 5–6) entre la calle y la losa del piso 1, que era la intención escrita en main ("el hueco del terreno es la torre"). Si se prefiere cerrado, falta un zócalo o muro perimetral hasta la losa.
- En primera persona dentro del sótano se ve cielo, porque `fpVis` oculta los otros niveles. Viene de main y no se cambió.
