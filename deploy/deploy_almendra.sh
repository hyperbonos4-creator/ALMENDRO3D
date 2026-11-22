#!/bin/bash
# ALMENDRA 3D v8 (pase de estilo según renders y video promocional: fachada café/listones/gris/azul, portón grafito con X y letrero oscuro, sótano en concreto a la vista con topellantas y jardineras, interiores blancos con mármol y LED; geometría del plano sin cambios) -> solo gym_web_demo. Prod (gym_web) no se toca.
set -euo pipefail
cd /opt/Gym/gym-web
TS=$(date -u +%Y%m%d_%H%M%S)
chk() { local m; m=$(tr -d '\r' < "$1" | md5sum | cut -d' ' -f1); [ "$m" = "$2" ] || { echo "BASE MISMATCH $1 $m"; exit 1; }; }
chk app/almendra/almendra.html 20c9c5e9449cae81f3dd0ba588552a80
chk app/almendra/route.ts b277bb1309d64f99ac087e74fab3e2c8
chk middleware.ts ce780a7eccf377be028c1c086d08333b
SVC=$(docker inspect gym_web_demo --format '{{index .Config.Labels "com.docker.compose.service"}}')
[ -n "$SVC" ] || { echo "no service label"; exit 1; }
PROD_IMG_BEFORE=$(docker inspect gym_web --format '{{.Image}}')
BK=/opt/Gym_backups/almendra_v8_$TS; mkdir -p "$BK"
cp app/almendra/almendra.html "$BK/almendra_v7.html"
RBIMG=gym/web-demo:rollback-almendra-v8-$TS
docker tag "$(docker inspect --format '{{.Image}}' gym_web_demo)" "$RBIMG"
DEMO_TAG=$(docker inspect gym_web_demo --format '{{.Config.Image}}')
RB=/opt/Gym_backups/rollback_almendra_v8_$TS.sh
cat > "$RB" <<RBE
#!/bin/bash
# Vuelve /almendra a la v7 (html 20c9c5e9) en el demo
set -e
cp $BK/almendra_v7.html /opt/Gym/gym-web/app/almendra/almendra.html
docker tag $RBIMG $DEMO_TAG
cd /opt/Gym && docker compose -f docker-compose.demo.yml up -d --no-build --no-deps --force-recreate $SVC
echo "rolled back almendra v8 -> v7 (demo)"
RBE
chmod +x "$RB"; ln -sfn "$RB" /opt/Gym_backups/rollback_almendra_LATEST.sh
tar xzf /root/almendra-v8-src.tgz -C /opt/Gym/gym-web
md5sum app/almendra/almendra.html
cd /opt/Gym
docker compose -f docker-compose.demo.yml build "$SVC" 2>&1 | tail -3
docker compose -f docker-compose.demo.yml up -d --no-build --no-deps --force-recreate "$SVC" 2>&1 | tail -2
for i in $(seq 1 40); do c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3101/almendra || true); [ "$c" = 200 ] && break; sleep 2; done
echo "local demo /almendra: $c"
echo "https /almendra: $(curl -s -o /dev/null -w '%{http_code} %{size_download}' https://visionyx.duckdns.org/almendra)"
echo "https /almendra md5: $(curl -s https://visionyx.duckdns.org/almendra | md5sum | cut -d' ' -f1)"
echo "https /urban: $(curl -s -o /dev/null -w '%{http_code}' https://visionyx.duckdns.org/urban)"
echo "https /gemelo: $(curl -s -o /dev/null -w '%{http_code}' https://visionyx.duckdns.org/gemelo)"
echo "prod gym_web /: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3100/)"
echo "prod image unchanged: $([ "$(docker inspect gym_web --format '{{.Image}}')" = "$PROD_IMG_BEFORE" ] && echo yes || echo NO)"
docker ps --format '{{.Names}} {{.Status}}' | grep gym_web
echo BACKUP=$BK ROLLBACK=$RB RBIMG=$RBIMG LATEST=$(readlink /opt/Gym_backups/rollback_almendra_LATEST.sh) URBAN_LATEST=$(readlink /opt/Gym_backups/rollback_urban_LATEST.sh)
echo DEPLOY_DONE
