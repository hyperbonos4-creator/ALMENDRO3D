# Edificio Almendra — Modelo 3D (VISIONYX · URBAN)

Modelo 3D interactivo del Edificio Almendra (PLANEX · Cocorná, Antioquia): 7 pisos + sótano, recorrido en primera persona, ascensor animado, portón con puerta peatonal y kiosco facial URBAN (propuesta).

**Ver en línea:** https://visionyx.duckdns.org/almendra (calidad *Alta* y «Recorrer por dentro»).

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/` | Código fuente Three.js 0.170 y el build (`src/build.mjs`) |
| `publicado/ed_almendra_3d.html` | HTML único offline. Es lo que se publica |
| `datos/` | Geometría extraída de los planos (JSON). `geom.json` es el intermedio de `herramientas/`; el visor usa `scene.json` e `interior.json` |
| `texturas/` | Texturas que el build incrusta (puerta de referencia, letrero, calado anterior) |
| `herramientas/` | Extracción de planos. Los PDF no están en el repo |
| `deploy/` | Procedimiento de publicación, sin credenciales ni rutas reales |
| `docs/` | QA, validación contra planos y recomendaciones de servidor |

## Compilar

Desde la raíz de un clon nuevo:

```bash
npm run build
```

Eso instala las dependencias en `src/` y escribe `publicado/ed_almendra_3d.html`.

Equivalente, dentro de `src/`:

```bash
cd src
npm install
npm run build
```

`three` y `esbuild` son dependencias de build. `playwright` es `devDependency` y solo hace falta para las capturas de `src/scripts/`. El HTML publicado no lo usa.

Los scripts de QA resuelven el HTML con `src/scripts/html-url.mjs` (o con la variable `ALMENDRA_HTML`). Añaden `?qa=1`, que es el único modo en el que el visor expone `window.__app`.

## Publicar

Ver `deploy/PROCEDIMIENTO-DEPLOY-ALMENDRA.md`. El precheck del script compara el HTML del servidor con `EXPECT_HTML_MD5`, no con un hash fijo. Siempre: respaldo antes, rollback listo, solo el contenedor demo. Las llaves SSH, la IP y las rutas del servidor no están en este repo.

Las cabeceras HSTS, CSP, caché y `robots.txt` viven en el host. La recomendación está en `docs/SERVIDOR-RECOMENDADO.md`. Este repo no las aplica.

## Versiones y etiquetas

`v5`, `v6`, `v7` y `v8` están en la historia lineal de `main` (`v5` → `v6` → `v7` → README → `v8`). `git merge-base --is-ancestor v5 main` (y lo mismo con `v6` y `v7`) sale verdadero en este clon: sí son ancestros de `main`, no instantáneas sueltas. Para mirar una: `git checkout v7`.

## Licencia

No hay una elegida. El campo `license` de un `package.json` de plantilla no cuenta: este repositorio no adopta ISC ni ninguna otra. La elige el propietario.

## Aclaraciones

Modelo informativo basado en los planos PL_A002 (plancha 2/6), PL_A004 (4/6) y PL_A006 (6/6), Arq. Andrea Ramírez Arango, **09/09/2022**. No apto para construcción. La plancha 1/6 (piso 1) no está entre esos PDF; el piso 1 sigue esquemático. Medidas del ascensor (cabina, velocidad) y el amoblado son ilustrativos. Los elementos URBAN están en ubicación propuesta.

El detalle de qué se contrastó con los PDF está en `docs/VALIDACION-PLANOS.md`. Los PDF originales no se versionan: el repo es público. Se pueden guardar en privado y pasarlos a `herramientas/extract.py --planos <carpeta>`.
