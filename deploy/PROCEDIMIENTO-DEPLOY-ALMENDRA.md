# Publicar cambios de /almendra (visionyx.duckdns.org/almendra)

Sin secretos aquí. La llave SSH NO está en la caja: vive en la PC de Luisa
(máquina Windows 65a278c5-2b1e-4d84-9a44-08e3e7571ff0, usuario Hide):
  <RUTA_LLAVE_SSH>
Por eso todo paso hacia el droplet se ejecuta desde esa PC (PowerShell, con aprobación de Luisa en cada comando).

## Datos
- Droplet: root@<IP_SERVIDOR>, opciones: -i <llave> -o IdentitiesOnly=yes -o BatchMode=yes
- Repo en el droplet: /opt/Gym/gym-web  (compose demo: /opt/Gym/docker-compose.demo.yml)
- Contenedor a reconstruir: SOLO gym_web_demo (:3101). NUNCA gym_web (prod :3100, debe responder 307).
- Archivos de /almendra: app/almendra/almendra.html (el modelo) y app/almendra/route.ts; middleware.ts tiene |almendra| en el matcher.
- Repo GitHub: hyperbonos4-creator/gym, rama main (último commit almendra: 382ce21). Push normal, sin force; solo stagear app/almendra/*.
- Respaldos: /opt/Gym_backups/  (rollback actual: rollback_almendra_LATEST.sh). No tocar rollback_urban_LATEST.sh.

## Pasos para reemplazar almendra.html (vN)
1. En la caja: copiar el nuevo HTML a gym-web/app/almendra/almendra.html, revisar que no tenga secretos ni URLs externas,
   empaquetar: tar czf almendra-vN-src.tgz app/almendra/almendra.html   (desde la raíz de gym-web)
2. Escribir deploy_almendra_vN.sh basado en /workspace/almendra/3d/deploy_almendra_v1.sh, cambiando:
   - precheck: md5 del almendra.html actual en el server (v1 = md5 922e9114…; leer el completo con md5sum antes) en vez de "app/almendra no existe"
   - backup: cp app/almendra/almendra.html y middleware.ts a /opt/Gym_backups/almendra_vN_<ts>/
   - rollback: restaurar ese almendra.html, re-tag de la imagen gym/web-demo:rollback-almendra-vN-<ts>, recrear solo el demo;
     ln -sfn al nuevo script como rollback_almendra_LATEST.sh
3. CopyFromBox del .tgz y el .sh a C:\Users\Hide\Documents\ ; desde la PC:
   scp -i <llave> -o IdentitiesOnly=yes -o BatchMode=yes <archivos> root@<IP_SERVIDOR>:/root/
   ssh ... "sed -i 's/\r$//' /root/deploy_almendra_vN.sh && bash /root/deploy_almendra_vN.sh"
4. Build/redeploy (lo hace el script):
   cd /opt/Gym && docker compose -f docker-compose.demo.yml build <servicio de gym_web_demo>
   docker compose -f docker-compose.demo.yml up -d --no-build --no-deps --force-recreate <servicio>
5. Verificar: /almendra 200 + tamaño esperado, /urban 200, /gemelo 200, prod :3100 = 307, imagen prod sin cambios.
6. Commit en main solo app/almendra/almendra.html, push normal.

## Revertir
ssh -i <llave> -o IdentitiesOnly=yes -o BatchMode=yes root@<IP_SERVIDOR> "bash /opt/Gym_backups/rollback_almendra_LATEST.sh"
