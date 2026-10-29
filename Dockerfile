# syntax=docker/dockerfile:1
# ── Halt & Charge Frontend — nginx static file server ────────────────────────
# Plain HTML/CSS/JS — no Node.js build step. Backend is a separate service.
#
# WHY a startup script instead of baking in the port:
#   Railway injects $PORT dynamically at runtime (not at build time).
#   nginx cannot use bash ${PORT:-80} syntax in its config.
#   envsubst would also replace nginx variables like $uri, $host, $request_uri.
#   Solution: write the config with a safe placeholder (__PORT__) and use
#   sed in a startup script — sed only replaces __PORT__, leaves all nginx
#   variables ($uri, $host, etc.) completely untouched.

FROM nginx:1.27-alpine

# ── Static files ─────────────────────────────────────────────────────────────
RUN rm -rf /usr/share/nginx/html/*
COPY index.html        /usr/share/nginx/html/
COPY css/              /usr/share/nginx/html/css/
COPY js/               /usr/share/nginx/html/js/
COPY assets/           /usr/share/nginx/html/assets/
COPY pages/            /usr/share/nginx/html/pages/

# ── nginx config template ─────────────────────────────────────────────────────
# Uses __PORT__ as a placeholder — safe because it contains no $ or nginx-
# variable syntax, so sed substitution is completely unambiguous.
RUN printf 'server {\n\
    listen __PORT__;\n\
    server_name _;\n\
\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    location /healthz {\n\
        access_log off;\n\
        return 200 "ok";\n\
        add_header Content-Type text/plain;\n\
    }\n\
\n\
    gzip on;\n\
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;\n\
}\n' > /etc/nginx/conf.d/default.conf.template

# ── Startup script ────────────────────────────────────────────────────────────
# Reads $PORT (Railway injects this; default 80 if absent).
# sed replaces __PORT__ with the actual numeric port, writes the final config,
# validates with nginx -t, then exec's nginx in the foreground.
RUN printf '#!/bin/sh\n\
set -e\n\
: "${PORT:=80}"\n\
echo "==> Configuring nginx to listen on port ${PORT}"\n\
sed "s/__PORT__/${PORT}/g" /etc/nginx/conf.d/default.conf.template \\\n\
    > /etc/nginx/conf.d/default.conf\n\
echo "==> Validating nginx config"\n\
nginx -t\n\
echo "==> Starting nginx"\n\
exec nginx -g "daemon off;"\n' > /start.sh && chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
