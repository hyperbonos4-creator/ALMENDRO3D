# Publicar cambios de /almendra

Sin secretos, sin nombres de usuario, sin identificadores de máquina y sin rutas reales del servidor. Quien despliega exporta esos datos en su entorno; no se escriben aquí.

La llave SSH no está en este repositorio. Vive en la PC de quien opera el servidor:

- usuario de Windows: `<USUARIO_WINDOWS>`
- identificador de la máquina: `<ID_MAQUINA>`
- llave: `<RUTA_LLAVE_SSH>` (por ejemplo `C:\Users\<USUARIO_WINDOWS>\.ssh\<NOMBRE_LLAVE>`)

Cada paso hacia el servidor se ejecuta desde esa PC, con aprobación de quien opera.

## Datos que hay que conocer (no van en el repo)

| Variable | Qué es |
|---|---|
| `<USUARIO_SSH>` | Usuario SSH del servidor |
| `<IP_SERVIDOR>` | Dirección del servidor |
| `<RUTA_REPO>` | Copia del repo web en el servidor |
| `<RUTA_COMPOSE_DEMO>` | Compose del entorno demo |
| `<CONTENEDOR_DEMO>` | Único contenedor que se reconstruye |
| `<CONTENEDOR_PROD>` | Producción: no se recrea; solo se comprueba que sigue respondiendo |
| `<RUTA_RESPALDOS>` | Carpeta de respaldos y scripts de rollback |
| `<REPO_WEB>` | Repositorio que sirve `/almendra` (no es este) |
| `<RAMA>` | Rama de ese repositorio |

En el script `deploy_almendra.sh` esos valores entran por entorno: `GYM_WEB`, `GYM_ROOT`, `COMPOSE_FILE`, `BACKUP_ROOT`, `DEMO_CONTAINER`, `PROD_CONTAINER`, `ALMENDRA_TGZ`, `PUBLIC_URL`.

Archivos que el demo sirve en `/almendra`: el HTML del modelo y la ruta de la app. El matcher del middleware incluye `almendra`. Solo se reemplaza el HTML.

## Precheck del HTML que está publicado

El script no trae un md5 fijo. Antes de cada deploy se mide el archivo que **hoy** responde el sitio y se exporta:

```bash
export EXPECT_HTML_MD5=$(curl -s https://visionyx.duckdns.org/almendra | md5sum | cut -d' ' -f1)
export EXPECT_ROUTE_MD5=$(md5sum app/almendra/route.ts | cut -d' ' -f1)
export EXPECT_MW_MD5=$(md5sum middleware.ts | cut -d' ' -f1)
```

Esos `md5sum` de `route.ts` y `middleware.ts` se calculan en la copia del servidor, no en esta máquina. Si el HTML publicado cambió, el precheck usa el hash nuevo: no hay que editar el script.

Al documentar este procedimiento, el HTML en línea era la v8.1 (`bfb94b4735c4243c33c0a8d8507450d4`). Eso es un ejemplo de lo que había que medir, no un valor que el script deba seguir exigiendo.

## Pasos para reemplazar el HTML

1. En la máquina de build: copiar `publicado/ed_almendra_3d.html` al archivo que sirve `/almendra`, revisar que no tenga secretos ni URLs externas, y empaquetar solo ese archivo.
2. Subir el paquete y `deploy/deploy_almendra.sh` a una carpeta de trabajo de la PC operadora, por ejemplo `C:\Users\<USUARIO_WINDOWS>\Documents\`.
3. Desde esa PC, con la llave local:

```bash
scp -i <RUTA_LLAVE_SSH> -o IdentitiesOnly=yes -o BatchMode=yes <archivos> <USUARIO_SSH>@<IP_SERVIDOR>:<CARPETA_TEMP>/
ssh -i <RUTA_LLAVE_SSH> -o IdentitiesOnly=yes -o BatchMode=yes <USUARIO_SSH>@<IP_SERVIDOR> \
  "sed -i 's/\r$//' <CARPETA_TEMP>/deploy_almendra.sh && bash <CARPETA_TEMP>/deploy_almendra.sh"
```

En el servidor, el script tiene que ver las variables de la tabla (hashes, rutas, contenedores, tarball).

4. El script hace respaldo, etiqueta la imagen actual para rollback, descomprime el HTML, reconstruye solo el servicio demo y comprueba el código HTTP.
5. Verificar: `/almendra` responde 200 con el tamaño esperado; las otras rutas públicas siguen en 200; producción no cambia de imagen.
6. El commit del HTML publicado se hace en `<REPO_WEB>`, rama `<RAMA>`, solo el archivo de `/almendra`. Sin force.

## Revertir

```bash
ssh -i <RUTA_LLAVE_SSH> -o IdentitiesOnly=yes -o BatchMode=yes <USUARIO_SSH>@<IP_SERVIDOR> \
  "bash <RUTA_RESPALDOS>/rollback_almendra_LATEST.sh"
```

No se toca el rollback de otros proyectos.
