# Ed. Almendra 3D — v7 · Informe de QA

- **Build:** `ed_almendra_3d_v7.html` · md5 `20c9c5e9449cae81f3dd0ba588552a80` · 1.318.629 bytes. La base es v6 (`26ec18ed7e0f81ef569635fe77815789`).
- **Cómo se verificó:** Chrome headless con SwiftShader, es decir render por software. Los fps absolutos de estas pruebas no representan la GPU real. Ninguna prueba registró errores de página.
- **Leyenda:** ✅ = corregido y verificado en un shot o con una medición. ℹ️ = hallazgo que no causa un defecto visible, o una limitación.

## 1. Ascensor (físico, en primera persona)

| # | Hallazgo | Corrección | Evidencia |
|---|---|---|---|
| A1 | En el lobby, «Abrir» ponía el HUD en "abierto" pero las puertas seguían cerradas | El batching de v6 fusionaba en mallas estáticas las puertas de piso y las puertas de vidrio del lobby. Ahora se marcan `userData.dyn` y las puertas de piso viven en un `Group` propio. ✅ | shots7/15_lobby_abrir_cabina_visible.png |
| A2 | Franjas moiré en la puerta y placa de llamada que se veía "desgarrada" | Acero satinado sin textura rayada. Marcos y jambas sólidos, umbral de aluminio, placa con botón. ✅ | shots7/01, 02_angulo_captura_luisa |
| A3 | No se podía entrar ni elegir piso, y había teletransporte | Máquina de estados: reposo cerrado → llamada → viaje (≈1 m/s con aceleración) → apertura ≈1,2 s → ≈6 s abierta con sensor en el vano → cierre. El jugador viaja dentro de la cabina. ✅ | shots7/03–10, 16, 17 |
| A4 | El indicador iba un piso atrasado | El indicador se calcula a partir de la altura real de la cabina, y el loop actualiza el ascensor antes que al jugador. ✅ | shots7/08 (y = 11,42 → muestra 5) |
| A5 | Alineación de pisos | Puertas de piso en S, 1–7 a nivel de losa. Indicador consistente en los 8 pisos. ✅ | shots7/qa_ascensor_hall_{sot,p1…p7}.png |
| A6 | Cabina con traslape con el pozo | Se redujo la cabina y se quitó el forro este. Cabina sólida con pasamanos, techo LED, botonera iluminada y piso en granito. ✅ | shots7/06_dentro_cabina_botonera.png |

## 2. Escalera y losas

| # | Hallazgo | Corrección | Evidencia |
|---|---|---|---|
| E1 | Una "losa enorme" tapaba la vista entre los pisos 1 y 2 | Había dos causas: **(a)** el cielo raso del lobby cubría el hueco de la escalera, y ahora usa el polígono del lobby sin la escalera; **(b)** el volumen esquemático del piso 1 (`GT.blk`) tapaba el hueco visto desde el piso 2, y ahora se oculta cuando el interior del piso 1 es visible. ✅ | shots7/qa_escalera_desde_hall_p2.png |
| E2 | Barandas flotantes y un vidrio que cruzaba el tramo | Las barandas se rehicieron: pasamanos interior continuo con balaustres, y vidrio templado inclinado anclado con pasamanos, zócalo y postes en los bordes libres. Se quitaron las barras sueltas del descanso. Bajo el tramo 1 y el descanso hay un muro (cheek wall) que va del piso al intradós. ✅ | shots7/qa_escalera_hall_p2_frente.png, qa_escalera_descanso_p2_p3.png |
| E3 | Desde la escalera del sótano y del piso 1 se veía el exterior | Se añadió un muro de cerramiento en x = 24,46, en S y en 1. ✅ | shots7/qa_escalera_sotano_descanso.png |
| E4 | Altura libre (medición programática, raycast hacia arriba desde cada huella y descanso) | Mínimo **2,37 m** en los tramos 1→7 y **2,45 m** en S→1 (≥ 2,10 m). ✅ | v7/qachk7.json |
| E5 | La cámara atravesaba losas | La holgura mínima de la cámara a cualquier superficie en todo el recorrido S→7 es de **0,30 m** (el plano cercano es 0,10 m). ✅ | v7/qachk7.json |

## 3. Alcobas y ventanas

| # | Hallazgo | Corrección | Evidencia |
|---|---|---|---|
| V1 | Bajo la ventana del Apto 203, alcoba 3, se veía un panel semitransparente punteado | **Causa raíz global:** el generador de prismas (`GB.prism`) creaba las cajas con las normales hacia adentro. Se veía la cara del fondo, que además hacía z-fighting con la piel de la fachada. Se corrigió el signo, lo que arregla todos los antepechos, dinteles y cajas del modelo. ✅ | shots7/qa_alcoba3_203_antepecho.png |

## 4. Aparatos y amoblado (ilustrativo, no especificado en planos)

Todo se reemplazó por modelos procedurales en `src/fur7.js`. La etiqueta "amoblado ilustrativo" se mantiene en el HUD.

- **Sanitario de una pieza**
  - Taza torneada (lathe) con agua.
  - Aro de asiento y tapa levantada con bisagras cromadas.
  - Tanque con tapa, pulsador cromado y llave de paso.
- **Ducha**
  - Plato con sifón.
  - Vidrio templado de 8 mm con perfil de muro, zócalo cromado, barra estabilizadora y vano de entrada. El vidrio usa `MeshPhysical` con transmisión en Alta y translúcido en Media/Baja.
  - Columna termostática con regadera de lluvia, ducha de mano y repisa.
  - Enchape de acento gris piedra en los muros de la ducha.
- **Lavamanos:** se ubican automáticamente en los 8 baños. Los bloques del plano quedaban dentro de muros, entre duchas, y en v6 aparecían como placas blancas flotantes. Cada uno lleva:
  - mueble flotante en nogal con cajón y tirador;
  - mesón de cuarzo;
  - lavamanos de sobreponer;
  - grifería alta cromada;
  - espejo con marco y retroiluminación LED.
- **Enchapes:** piso de baño gris grafito 60×60 y muro claro 30×60 con junta visible. Ya no hay blanco sobre blanco.
- **Cocinas**
  - Zócalo, muebles bajos con puertas y cajones con tirador, y mesón de cuarzo con hueco.
  - Poceta de acero con grifo de cuello de cisne.
  - Cubierta vitrocerámica con quemadores y campana de acero.
  - Alacenas en roble con LED bajo alacena; se interrumpen sobre la campana y las ventanas.
  - Nevera de acero cuando el mesón mide ≥ 2,15 m.
  - Isla en el Apto x04.
- **Alcobas**
  - Cama: cabecero tapizado, base con patas, colchón, edredón, pie de cama y almohadas.
  - Mesas de noche con cajón y lámpara.
  - Clósets con puertas de roble, tiradores y zócalo.
- **Sala y comedor**
  - Sofá con brazos, cojines de asiento y espaldar, y cojines decorativos.
  - Poltronas, y tapete con mesa de centro si caben.
  - TV de 55" en muro con mueble y barra de sonido, o TV sobre base en un mueble exento.
  - Mesa de comedor (rectangular o redonda) con sillas.
- **Puertas:** se añadieron 3 bisagras y rosetas en la manija.
- **Ventanas:** las de fachada conservan el marco de aluminio y el vidrio de la piel. Las interiores conservan su marco de aluminio.
- **Niveles de calidad:**
  - Alta: vidrio con transmisión y todos los herrajes.
  - Media: vidrio translúcido y todos los herrajes.
  - Baja: se ocultan herrajes y detalles (verificado programáticamente).
- **Shots:** shots7/qa_bano_*, qa_ducha_202, qa_cocina_303/302, qa_alcoba3_303_cama, qa_sala_303, qa_sala_comedor_302.

## 5. Chequeos programáticos (`build/qachk7.mjs` → `v7/qachk7.json`)

- **Coplanaridad de caras alineadas a ejes, piso típico p3:** 17.796 triángulos y 2.546 pares coplanares superpuestos.
  - Más del 95 % son de la **misma malla y el mismo material** (geometría fusionada: marcos de puertas, perfiles de aluminio, piezas del sofá o del sanitario que se interpenetran), así que no producen parpadeo visible.
  - Se corrigieron los cruces entre materiales distintos que sí se veían: zócalo del clóset vs. cuerpo, y lavadero vs. muro (con 6–12 mm de holgura).
  - Quedan ℹ️ caras ocultas: la cara inferior del perfil de las ventanas interiores sobre el alféizar, y el dintel de la puerta de piso del ascensor vs. el marco. Ninguna se ve desde un punto accesible.
- **Mobiliario fuera de recintos:** se encontró una "silla" del plano dentro del muro entre Ropas y Sala del Apto x03, y ahora se descarta. Quedan 4 elementos válidos fuera de los polígonos de recinto: 3 lavaderos en patios de ropas que no están en la lista de recintos, y el lavadero de Ropas x04 en el borde.
- **Altura libre y holgura de cámara en la escalera:** ver E4 y E5.

## 6. Regresión (lo aprobado sigue funcionando)

- **Rampa, celda 3 y portón:** shots7/reg_01…11, reg_50. El carro termina estacionado en la celda 3.
- **Kiosko facial (demo/simulación) y puerta peatonal integrada:** shots7/reg_5x. Los logs de los flujos (apertura, paso, cierre y re-enclavado; el vehículo bloquea la peatonal) terminan OK.
- **Ascensor completo:** shots7/01–17, regenerados con este build salvo diferencias menores.

## 7. Rendimiento e inventario (antes v6 → después v7)

- **Luces:** Hemisphere 2, Directional 2 (1 con sombra) y Point 4 → **2**. El ascensor ya no tiene PointLight propia; la luz de primera persona se reposiciona en la cabina.
- **Mallas:** 956 → 1.146.
- **Materiales**
  - MeshStandard 138 + 49 T → 160 + 50 T.
  - MeshBasic 37 + 81 T → 39 + 81 T.
  - MeshPhysical 2 → 4: cerámica clearcoat, asiento y vidrio de ducha en Alta.
- **Texturas:** 165 (13,5 Mpx), sin cambio relevante.
- **Draw calls y triángulos (SwiftShader, `v7/inventario_rendimiento.txt`)**

| Vista | v6 Baja | v7 Baja | v7 Alta |
|---|---|---|---|
| Hall p3 | 351 calls / 118 k tris | 354 / 183 k | 665 / 457 k |
| Baño | 179 / 99 k | 183 / 155 k | 350 / 398 k |

  - En Alta se duplican los calls por el pase de transmisión del vidrio físico.
  - Para compensar, el amoblado solo se dibuja en el piso actual y los segmentos de las geometrías redondeadas son moderados.
- **Arranque y GPU:**
  - `powerPreference: 'high-performance'`.
  - La calidad Auto arranca en Media.
  - La GPU real (UNMASKED_RENDERER_WEBGL) aparece junto a los fps, con aviso "⚠ render por software" si Chrome no usa la GPU.

## 8. Limitaciones

- Las medidas de la cabina, la capacidad ("por definir") y todo el mobiliario y los aparatos son **supuestos ilustrativos**. No vienen en los planos.
- Los lavamanos se ubicaron automáticamente, sin dato del plano. En el baño social x04 queda a ≈0,23 m frente al sanitario, que es un espacio estrecho.
- Las pruebas headless se hicieron con SwiftShader: los tiempos y fps no representan la GPU de Luisa.
- La transmisión del vidrio en Alta cuesta un pase extra de render. En su RX 9060 XT no debería notarse, pero no se midió en ese equipo.
- El volumen del piso 1 (lobby) sigue siendo esquemático por fuera.
