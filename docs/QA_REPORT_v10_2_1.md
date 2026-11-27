# ESTADO v10.2.1 (05:50 COT) — LISTO, NO PUBLICADO
- HTML: ed_almendra_3d_v10_2.html md5 8b29682da2cbac7c96101152d1336ea8
- Paquete: almendra-v10_2-src.tgz md5 74718f1ff15787105b31042d3c505b74 (app/almendra/almendra.html = 8b29682d…)
- Deploy (NO ejecutado): deploy_almendra_v10_2.sh md5 37eebc72fd1469b36e02a6f8976648fb — NEW_MD5=8b29682d…; sigue verificando publicado = f449df66 (disco y https), ≥5G, backup, rollback.
- Publicado hoy: f449df66 (v10.1).

## v10.2.1 (04:40 COT) EN CURSO: (1) artefacto en escalera sótano→p1 (volumen negro/puntos cian/cámara en losa) (2) puertas NO deben abrirse por proximidad. NO publicar.

### Avance v10.2.1 (05:30 COT)
- HECHO en fuente + build (html md5 8b29682d…, aún no empaquetado): stairD claro y no metálico (volumen negro), intradós en concreto claro; sin apertura por proximidad (apartamentos, SV, balcones; no existe puerta vidrio lobby en el build); kiosko solo inicia con tecla F; ruta del sistema manual por defecto (◀ ▶, "Reproducir solo" opcional); fpVis robusto en caja de escalera (niveles vecinos ±2 visibles); depthTest=true en marcadores MK, esferas SRV/APP; burbujas HTML ocultas si el ancla está >2.4 m de la cámara en vertical.
- QA: qa/doortest.js → v10.2.1: 170 puertas, 864 caminadas, 0 cambios (control v10.1: 162 cambios). Climb sot→p6 (shots/climb1, climb2): analyze.py 0 marcadas en 53 primeras.
- PENDIENTE: terminar climb2 (p4–p6), climbB (mirando al frente), regresión, 0 errores consola, empaquetar tgz, NEW_MD5 en deploy, informe.

### CIERRE v10.2.1 (05:50 COT)
- QA: climb 6 tramos sot→p7 (shots/climb1, climb2; 94 capturas cada 0.3 m, 0 marcadas), climbB mirando al frente sot y p4 (shots/climbB, 28, 0 marcadas, 0 errores), regresión 105 capturas (shots/reg1021, 0 errores). Antes: shots/climb0 y climb0_sheet_sot_antes.png. Después: climbB_sheet_sot.png.
- Puertas: qa/doortest.js → 170 puertas, 864 caminadas, 0 cambios (control v10.1: 162). E abre (qa/eopen.js).
- Nota: capturas adjuntas de Luisa ilegibles para el subagente; se trabajó con la descripción en texto.
