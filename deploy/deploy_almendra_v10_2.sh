#!/bin/bash
# ALMENDRA 3D v10.2 (sistema de acceso completo L1–L8 interactivo con fichas + ruta del sistema + correcciones de capturas) -> solo gym_web_demo. Prod (gym_web) no se toca.
# NO EJECUTAR sin aprobación de Luisa.
set -euo pipefail
NEW_MD5=8b29682da2cbac7c96101152d1336ea8
cd /opt/Gym/gym-web
TS=$(date -u +%Y%m%d_%H%M%S)
chk() { local m; m=$(tr -d '\r' < "$1" | md5sum | cut -d' ' -f1); [ "$m" = "$2" ] || { echo "BASE MISMATCH $1 $m"; exit 1; }; }
chk app/almendra/almendra.html f449df66c090236b21cca7db0d9c6442  # vivo hoy = v10.1
chk app/almendra/route.ts b277bb1309d64f99ac087e74fab3e2c8
chk middleware.ts ce780a7eccf377be028c1c086d08333b
LIVE0=$(curl -s https://visionyx.duckdns.org/almendra | md5sum | cut -d' ' -f1); echo "publicado hoy: $LIVE0"
[ "$LIVE0" = f449df66c090236b21cca7db0d9c6442 ] || { echo "LO PUBLICADO NO ES v10.1 (f449df66): no se despliega"; exit 1; }
[ -f /root/almendra-v10_2-src.tgz ] || { echo "falta /root/almendra-v10_2-src.tgz"; exit 1; }
# espacio: la v10 se quedó sin disco en el build; exigir >= 5 GB libres (no se borra nada automáticamente)
AV=$(df --output=avail -BG / | tail -1 | tr -dc '0-9'); echo "disco libre: ${AV}G"
[ "$AV" -ge 5 ] || { echo "ESPACIO INSUFICIENTE (${AV}G < 5G): no se despliega. Liberar build cache con aprobación (docker builder prune -f)"; exit 1; }
SVC=$(docker inspect gym_web_demo --format '{{index .Config.Labels "com.docker.compose.service"}}')
[ -n "$SVC" ] || { echo "no service label"; exit 1; }
PROD_IMG_BEFORE=$(docker inspect gym_web --format '{{.Image}}')
BK=/opt/Gym_backups/almendra_v10_2_$TS; mkdir -p "$BK"
cp app/almendra/almendra.html "$BK/almendra_previo_f449df66.html"
RBIMG=gym/web-demo:rollback-almendra-v10-2-$TS
docker tag "$(docker inspect --format '{{.Image}}' gym_web_demo)" "$RBIMG"
DEMO_TAG=$(docker inspect gym_web_demo --format '{{.Config.Image}}')
RB=/opt/Gym_backups/rollback_almendra_v10_2_$TS.sh
cat > "$RB" <<RBE
#!/bin/bash
# Vuelve /almendra al html f449df66 (v10.1) en el demo
set -e
cp $BK/almendra_previo_f449df66.html /opt/Gym/gym-web/app/almendra/almendra.html
docker tag $RBIMG $DEMO_TAG
cd /opt/Gym && docker compose -f docker-compose.demo.yml up -d --no-build --no-deps --force-recreate $SVC
echo "rolled back almendra v10.2 -> f449df66 (demo)"
RBE
chmod +x "$RB"; ln -sfn "$RB" /opt/Gym_backups/rollback_almendra_LATEST.sh
tar xzf /root/almendra-v10_2-src.tgz -C /opt/Gym/gym-web
m=$(md5sum app/almendra/almendra.html | cut -d' ' -f1); echo "html en disco: $m (esperado $NEW_MD5)"
[ "$m" = "$NEW_MD5" ] || { echo "TGZ MISMATCH -> rollback"; bash "$RB"; exit 1; }
cd /opt/Gym
if ! docker compose -f docker-compose.demo.yml build "$SVC" 2>&1 | tail -3; then echo "BUILD FALLÓ -> rollback"; bash "$RB"; exit 1; fi
docker compose -f docker-compose.demo.yml up -d --no-build --no-deps --force-recreate "$SVC" 2>&1 | tail -2
c=000; for i in $(seq 1 40); do c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3101/almendra || true); [ "$c" = 200 ] && break; sleep 2; done
echo "local demo /almendra: $c"
LIVE=$(curl -s https://visionyx.duckdns.org/almendra | md5sum | cut -d' ' -f1)
echo "https /almendra: $(curl -s -o /dev/null -w '%{http_code} %{size_download}' https://visionyx.duckdns.org/almendra) md5 $LIVE"
if [ "$c" != 200 ] || [ "$LIVE" != "$NEW_MD5" ]; then echo "VERIFICACIÓN FALLÓ -> rollback"; bash "$RB"; exit 1; fi
echo "https /urban: $(curl -s -o /dev/null -w '%{http_code}' https://visionyx.duckdns.org/urban)"
echo "https /gemelo: $(curl -s -o /dev/null -w '%{http_code}' https://visionyx.duckdns.org/gemelo)"
echo "prod gym_web /: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3100/)"
echo "prod image unchanged: $([ "$(docker inspect gym_web --format '{{.Image}}')" = "$PROD_IMG_BEFORE" ] && echo yes || echo NO)"
docker ps --format '{{.Names}} {{.Status}}' | grep gym_web
df -h / | tail -1
echo BACKUP=$BK ROLLBACK=$RB RBIMG=$RBIMG LATEST=$(readlink /opt/Gym_backups/rollback_almendra_LATEST.sh)
echo DEPLOY_DONE
