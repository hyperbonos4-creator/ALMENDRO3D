# Configuración recomendada del servidor de /almendra

Este repositorio solo genera `publicado/ed_almendra_3d.html`. Quien sirve https://visionyx.duckdns.org/almendra es otro proyecto (la app Next.js) y el proxy delante de ella. **No se cambia ese servidor desde aquí.** Lo que sigue es la configuración que conviene aplicar allá.

El HTML es un archivo estático, sin llamadas de red propias. Puede cachearse fuerte. El HTML de la app que lo envuelve, no.

## Cabeceras

En el virtual host o en la capa que responde `/almendra`:

```nginx
# El HTML del modelo cambia solo cuando se publica una versión.
location /almendra {
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; worker-src 'none'; connect-src 'none'; font-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'" always;
    add_header Cache-Control "public, max-age=3600, must-revalidate" always;
}
```

Notas:

- `script-src 'unsafe-inline'` y `style-src 'unsafe-inline'` hacen falta porque el visor es un solo HTML con el JS y el CSS embebidos. No carga dominios externos.
- `img-src data:` cubre las texturas en data-URI. No hay que abrir `https:`.
- HSTS en un año asume que todo el sitio ya responde solo por HTTPS. Si algún subdominio todavía usa HTTP, no incluyas `includeSubDomains` hasta cerrarlo.
- `max-age=3600` con `must-revalidate` evita que un visitante se quede días con un HTML viejo después de un deploy, y aun así ahorra la descarga en la misma hora. Si el deploy es poco frecuente y se purga la caché al publicar, se puede subir a un día (`86400`).
- No hace falta CORS: la página no la consumen otros orígenes.

## robots.txt

El sitio público debería servir un `robots.txt` real en la raíz, no el del framework por defecto si ese no dice nada útil. Propuesta mínima, en el repo que sirve el dominio (no en este):

```text
User-agent: *
Allow: /almendra
Disallow: /api/
```

`/almendra` puede indexarse: es una página pública del proyecto. Las rutas de API no.

## Qué no hace este repo

No hay configuración de nginx, ni de Next.js, ni de certificados. Aplicar HSTS, CSP, caché y `robots.txt` es un cambio del host, con su propio despliegue y su propia prueba de que el visor sigue abriendo.
