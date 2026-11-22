# Ed. Almendra 3D — v8.1 (pulido: carros + listones) — QA

- Archivo: `v8/ed_almendra_3d_v8.html` (v8.1) — md5 `bfb94b4735c4243c33c0a8d8507450d4`, 1,355,377 bytes (≈1.29 MB, offline). v8.0 anterior: md5 `387266a6…` (respaldo `v8/ed_almendra_3d_v80_backup.html`, fuentes `v8/src_v80_backup/`)
- Base: v7 md5 `20c9c5e9449cae81f3dd0ba588552a80` (sin tocar: `v7/ed_almendra_3d_v7.html`)
- Paquete: `almendra-v8-src.tgz` → `app/almendra/almendra.html` (mismo md5 que arriba)
- v8.1: tgz y copia principal actualizados al md5 bfb94b4735c4243c33c0a8d8507450d4; deploy_almendra_v8.sh sigue verificando base v7 20c9c5e9449cae81f3dd0ba588552a80 (no ejecutado). Sin pkill amplio: solo se usaron procesos propios.
- Deploy: `deploy_almendra_v8.sh` (no ejecutado; lo corre Luisa/parent)

## Qué cambió (solo estilo/material/mobiliario; geometría de planos intacta)
- **Fachada** (style8.js): paneles por familias según renders — paneles caramelo/estuco, listones de madera clara, gris, banda azul-noche en el lado largo oriental (ref_01), cara trasera blanca, caras traseras tan; antepechos oscuros entre ventanas (aprox. de las franjas continuas), pilastras y esquinas. Fusionado por color de vértice (4 draw calls/piso en vez de ~11).
- Vidrio oscuro reflectivo, perfilería negra, alféizar delgado; antepecho de cubierta caramelo/carbón; volumen de cubierta; lucernario sobre la ranura (vacío) de escalera.
- **Balcones** (ref_02/03): postes blancos redondos, 5 cables, pasamanos amarillo, matera con planta tropical, silla blanca; visibles desde órbita (grupo exterior); fascia sin rendija.
- Ranura: materas + hiedra colgante por piso.
- **Portón** (video): grafito con arriostramiento en X, letrero oscuro "ED. ALMENDRA" letras blancas, hiedra encima. Selector *Estilo* conserva el calado bronce de v7.
- **Sótano**: muro/columnas concreto con marcas de formaleta, luminarias LED redondas, topellantas, baranda de vidrio en el borde del hall, piso de gravilla, dos jardineras-banca con plantas tropicales (ref_04/ref_10).
- **Interiores**: muros blancos, mármol en sala/comedor/cocina/circulación, porcelanato gris alcobas, LED perimetral (cove), cuadros en circulación y hall, puertas roble, manijas plata; sofá gris con cojines azul claro, mesas madera clara, sillas crema, credenza rosa, cocina con bajos madera clara/altos blancos y grifería negra; escalera con huella clara y cuerpo oscuro.
- Panel "Qué es aproximado": nueva sección *ESTILO v8* con los conflictos.

## v8.1 — pulido (22-nov-2026)
**Carros** (`src/src/car8.js`, nuevo; `vehicles.js` lo usa): carrocería por secciones redondeadas (loft de 26 puntos por estación con radio superior/inferior), pasos de rueda semicirculares recortados en el perfil, caras delantera/trasera redondeadas; habitáculo de vidrio tintado con caída lateral, parabrisas y luneta inclinados; techo y pilares A/C pintados, pilar B negro; faros envolventes, calaveras, rejilla, toma inferior, difusor, faldones, cortes de puerta, manijas cromadas, espejos, placas con marco; portón trasero pintado + 3.ª luz de freno en hatch/SUV; llantas con hombro, rines de aleación de 5 radios dobles, disco de freno, pasos de rueda oscuros. Tipos/colores: hatch vino tipo Golf (celda 3, el de la animación), sedán rojo oscuro (5), sedán blanco (9), SUV negra (8), sedán gris (4), más hatch blanco/plata, CUV grafito, sedán negro. Todo fundido por material: **draw calls sin cambio** (general 383, apto Alta 678, sótano 238). Triángulos: general 109k → 161k, sótano → 150k, apto Alta 468k → 557k (estimación: sin impacto relevante en GPU dedicada).
**Listones de madera**: todos los paños de madera (incluido el costado azul/grafito, antes café oscuro) usan pino claro con ranuras: textura nueva (16 listones/1,2 m, ranura oscura + canto iluminado) + normal map de ranuras; repetición en metros (UV mundial) → igual escala en cualquier tamaño de paño. Color medido en captura: sol #D1B175, sombra #A88A5B (objetivo ≈ #C9A46E).
**Revisión rápida**: captura 04 re-tomada (cámara en sótano). Nueva 06b (parqueo amplio, ref_10).
**Regresiones v8.1** (todas OK, `shots8/_log.txt`): ascensor `st: open` · carro sale/entra → `st: parked` en celda 3 · portón `v1:1, ped:0` · kiosko `s1 ok → s2 open, ped:1, v1:0` · headroom escalera 2.37–3.07 m (igual) · cámara ≥0.305 m · 0 errores de página · z-fighting qachk8 idéntico a v8.0 (p3 2529 / p1 630 / sot 235 / cubierta 0).
**Capturas re-tomadas v8.1**: las 29 de `shots8/` se sobrescribieron con el build v8.1 + nueva `06b_parqueo_amplio_ref10.png`.
**No se pudo igualar (carros)**: marcas/modelos exactos y logos (genéricos a propósito), interiores de cabina (vidrio tintado opaco), luces con textura interna.

## Regresiones v8.0 (todas OK)
| prueba | resultado |
|---|---|
| Ascensor Abrir + cabina | `st: open` (20) |
| Carro sale y vuelve a celda 3 | `st: parked` (24) |
| Portón vehicular abierto, peatonal cerrada | `v1:1, ped:0` (26) |
| Kiosko facial URBAN abre peatonal | `s1: ok → s2: open, ped:1, v1:0` (27) |
| Escalera headroom | 2.37–3.07 m (igual a v7); cámara ≥0.305 m (igual a v7 en sótano) |
| Muebles fuera de recinto | 4 (idénticos a v7) · 85 muebles · 8 lavamanos |
| Errores de página | 0 (solo avisos Canvas2D willReadFrequently) |

## Z-fighting (qachk8, solapes coplanares)
v8: p3 2529 / p1 630 / sot 235 / cubierta 0 (v7: 2471 / 572 / 172). La diferencia es mayormente renombre de material de pares v7 ya existentes del mismo material (benignos). Pares nuevos reales corregidos: huella × lateral oscuro de escalera, cove × cielo raso. Queda `muro blanco × cuerpo oscuro escalera` en x 21.36/z 9.69: caras espalda-con-espalda contra el muro (no visibles; verificado en 21/22). Fachada style8: 0 solapes.

## Rendimiento (SwiftShader, draw calls / triángulos)
| vista | v7 | v8 |
|---|---|---|
| Alta general | 317 / 97k | 383 / 109k |
| Alta apto p4 | 560 / 441k | 678 / 468k |
| Media apto | 328 | 393 |
| Baja apto | 316 | 380 |
| Sótano | 234 | 238 |
≈ +20% draw calls, +5–12% triángulos. Estimación (no medido en su GPU): en la RX 9060 XT debería seguir muy por encima de 144 fps en Alta; ms de SwiftShader no son representativos.

## Capturas (`shots8/`, 1600×900)
01 fachada esquina (ref_01) · 01b general Alta · 01c general Media · 01d general Baja · 02 balcón cerca (ref_02) · 03 esquina balcones (ref_03) · 04 hall escalera parqueo (ref_04) · 04b hall jardineras + baranda (ref_10) · 05 ranura/lucernario (ref_05) · 06 parqueo topellantas · 07 corredor (ref_06) · 08 comedor-cocina (ref_07) · 09 cocina (ref_09) · 10 sala 303 · 11 alcoba · 12 baño · 13 balcón desde sala · 14 portón/letrero/kiosko · 15 kiosko cerca · 16 hall con cuadros · 17 portón estilo calado v7 · 20 ascensor abrir · 21 escalera · 22 tramo escalera · 23 rampa · 24 carro en celda 3 · 25 todas las celdas · 26 portón abierto peatonal cerrada · 27 flujo kiosko → peatonal.

## No se pudo igualar
Personas, silla giratoria, lámpara de pie, franjas de ventana continuas exactas, volumetría exacta del render, escalera de huella abierta con zanca única.

## Conflictos con los planos (se mantuvieron los planos)
1. Volumetría del render (varias alas, más alto) vs planta en L de los planos.
2. Ventanería corrida del render vs ventanas discretas → aproximado con antepechos oscuros.
3. Muros ciegos del plano reciben paneles opacos.
4. Escalera abierta de zanca única (render) vs escalera en U (plano) → U conservada, re-estilizada.
5. Lucernario: no aparece en planos (asumido de ref_05).
6. Jardineras del hall de parqueo ubicadas en la franja libre entre borde del deck y escalera (supuesto).
7. Distribución de colores por panel = interpretación; caras no visibles en renders inferidas.
8. Portón: video (grafito X) vs referencia previa de Luisa (calado bronce) → video por defecto, calado como opción.
9. Piso 1 sigue esquemático (falta plancha 1/6).

## Notas de proceso
- Durante pruebas se ejecutó `pkill -f chrome` para matar un perf colgado; pudo cerrar otros Chrome del box compartido (un proceso pid 191 no se pudo matar: sin permiso).
- Las corridas de capturas se partieron en dos por timeouts de carga en SwiftShader; log de consola en `v8/shots8_console_log.txt` (parte 2; parte 1 sin errores según qachk8).
- Captura 04 re-tomada (la primera quedó en el lobby de Piso 1 mirando muros por altura no especificada): ahora `fpPose(24.3,8.0,2.68,-0.28,-2.375)` en sótano, muestra escalera huella clara/cuerpo oscuro, baranda vidrio, muros con formaleta, jardinera. Mismo HTML, md5 sin cambios.
- Rebuild desde `v8/src` reproduce exactamente md5 `387266a637dee23fe171beca3319d50b`.
