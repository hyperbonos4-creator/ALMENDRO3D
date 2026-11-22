#!/bin/bash
# Publica el HTML de Almendra solo en el contenedor demo.
# No lleva secretos ni hashes fijos: el precheck compara contra lo que el
# operador declara que está publicado AHORA, así el siguiente deploy no queda
# amarrado a una versión vieja.
#
# Obligatorio antes de correr:
#   export EXPECT_HTML_MD5=<md5 del almendra.html que está en el servidor>
#   export EXPECT_ROUTE_MD5=<md5 de app/almendra/route.ts>
#   export EXPECT_MW_MD5=<md5 de middleware.ts>
#   export GYM_WEB=<raíz del repo en el servidor>
#   export GYM_ROOT=<directorio padre, donde vive docker-compose del demo>
#   export COMPOSE_FILE=<ruta del compose del demo>
#   export BACKUP_ROOT=<directorio de respaldos>
#   export DEMO_CONTAINER=<nombre del contenedor demo>
#   export PROD_CONTAINER=<nombre del contenedor de producción, solo se lee>
#   export ALMENDRA_TGZ=<tarball ya copiado al servidor>
# Opcional:
#   export ALMENDRA_VER=vN          (etiqueta del respaldo; default: next)
#   export PUBLIC_URL=https://…/almendra
#   export DEMO_PORT=3101
#   export PROD_PORT=3100
set -euo pipefail
: "${EXPECT_HTML_MD5:?Define EXPECT_HTML_MD5 con el md5 del HTML publicado ahora}"
: "${EXPECT_ROUTE_MD5:?Define EXPECT_ROUTE_MD5}"
: "${EXPECT_MW_MD5:?Define EXPECT_MW_MD5}"
: "${GYM_WEB:?Define GYM_WEB}"
: "${GYM_ROOT:?Define GYM_ROOT}"
: "${COMPOSE_FILE:?Define COMPOSE_FILE}"
: "${BACKUP_ROOT:?Define BACKUP_ROOT}"
: "${DEMO_CONTAINER:?Define DEMO_CONTAINER}"
: "${PROD_CONTAINER:?Define PROD_CONTAINER}"
: "${ALMENDRA_TGZ:?Define ALMENDRA_TGZ}"
VER=${ALMENDRA_VER:-next}
PUBLIC_URL=${PUBLIC_URL:-https://visionyx.duckdns.org/almendra}
DEMO_PORT=${DEMO_PORT:-3101}
PROD_PORT=${PROD_PORT:-3100}
cd "$GYM_WEB"
TS=$(date -u +%Y%m%d_%H%M%S)
chk() { local m; m=$(tr -d '\r' < "$1" | md5sum | cut -d' ' -f1); [ "$m" = "$2" ] || { echo "BASE MISMATCH $1 esperado $2 obtuvo $m"; exit 1; }; }
echo "precheck $VER — html esperado $EXPECT_HTML_MD5"
chk app/almendra/almendra.html "$EXPECT_HTML_MD5"
chk app/almendra/route.ts "$EXPECT_ROUTE_MD5"
chk middleware.ts "$EXPECT_MW_MD5"
SVC=$(docker inspect "$DEMO_CONTAINER" --format '{{index .Config.Labels "com.docker.compose.service"}}')
[ -n "$SVC" ] || { echo "no service label"; exit 1; }
PROD_IMG_BEFORE=$(docker inspect "$PROD_CONTAINER" --format '{{.Image}}')
BK=$BACKUP_ROOT/almendra_${VER}_$TS; mkdir -p "$BK"
cp app/almendra/almendra.html "$BK/almendra_previo.html"
RBIMG=gym/web-demo:rollback-almendra-$VER-$TS
docker tag "$(docker inspect --format '{{.Image}}' "$DEMO_CONTAINER")" "$RBIMG"
DEMO_TAG=$(docker inspect "$DEMO_CONTAINER" --format '{{.Config.Image}}')
RB=$BACKUP_ROOT/rollback_almendra_${VER}_$TS.sh
cat > "$RB" <<RBE
#!/bin/bash
set -e
cp $BK/almendra_previo.html $GYM_WEB/app/almendra/almendra.html
docker tag $RBIMG $DEMO_TAG
cd $GYM_ROOT && docker compose -f $COMPOSE_FILE up -d --no-build --no-deps --force-recreate $SVC
echo "rolled back almendra $VER (demo)"
RBE
chmod +x "$RB"; ln -sfn "$RB" "$BACKUP_ROOT/rollback_almendra_LATEST.sh"
tar xzf "$ALMENDRA_TGZ" -C "$GYM_WEB"
md5sum app/almendra/almendra.html
cd "$GYM_ROOT"
docker compose -f "$COMPOSE_FILE" build "$SVC" 2>&1 | tail -3
docker compose -f "$COMPOSE_FILE" up -d --no-build --no-deps --force-recreate "$SVC" 2>&1 | tail -2
for i in $(seq 1 40); do c=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${DEMO_PORT}/almendra" || true); [ "$c" = 200 ] && break; sleep 2; done
echo "local demo /almendra: $c"
echo "https /almendra: $(curl -s -o /dev/null -w '%{http_code} %{size_download}' "$PUBLIC_URL")"
echo "https /almendra md5: $(curl -s "$PUBLIC_URL" | md5sum | cut -d' ' -f1)"
echo "prod /: $(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PROD_PORT}/")"
echo "prod image unchanged: $([ "$(docker inspect "$PROD_CONTAINER" --format '{{.Image}}')" = "$PROD_IMG_BEFORE" ] && echo yes || echo NO)"
docker ps --format '{{.Names}} {{.Status}}' | grep -E "${DEMO_CONTAINER}|${PROD_CONTAINER}" || true
echo BACKUP=$BK ROLLBACK=$RB RBIMG=$RBIMG
echo DEPLOY_DONE
