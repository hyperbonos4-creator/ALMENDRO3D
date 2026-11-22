# Edificio Almendra — Modelo 3D (VISIONYX · URBAN)

Modelo 3D interactivo del Edificio Almendra (PLANEX · Cocorná, Antioquia): 7 pisos + sótano, recorrido en primera persona, ascensor animado, portón de 2 hojas con puerta peatonal y kiosco facial URBAN (propuesta).

**Ver en línea:** https://visionyx.duckdns.org/almendra (usar calidad *Alta* y "Recorrer por dentro").

## Estructura
| Carpeta | Contenido |
|---|---|
| `src/` | Código fuente three.js + script de build con esbuild (`build.mjs`) |
| `publicado/ed_almendra_3d.html` | Archivo final, un solo HTML offline (lo que está publicado) |
| `datos/` | Geometría extraída de los planos (JSON) |
| `texturas/` | Texturas usadas en el build |
| `herramientas/` | Scripts Python de extracción de planos |
| `deploy/` | Script y procedimiento de publicación (sin credenciales) |
| `docs/` | Reportes de QA por versión |

## Compilar
```bash
cd src
npm install          # three, esbuild (playwright solo para capturas de QA)
node build.mjs       # genera el HTML único
```

## Publicar
Ver `deploy/PROCEDIMIENTO-DEPLOY-ALMENDRA.md`. Siempre: respaldo antes, rollback listo, solo se toca el contenedor `gym_web_demo` (nunca producción). Las llaves SSH y la IP del servidor **no** están en este repo.

## Versiones
Cada versión es un commit con su tag (`v5`, `v6`, `v7`, `v8`…). Para volver a una: `git checkout v7`.

## Aclaraciones
Modelo informativo basado en los planos PL_A002, PL_A004 y PL_A006 (Arq. Andrea Ramírez Arango, 05/09/2022). No apto para construcción. Medidas del ascensor y amoblado son ilustrativos; el piso 1 es esquemático (falta plancha 1/6). Los elementos URBAN están en ubicación propuesta.
