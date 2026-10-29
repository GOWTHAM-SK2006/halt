# syntax=docker/dockerfile:1
# ── Halt & Charge Frontend — Static site served by nginx ──────────────────────
# Plain HTML/CSS/JS — no Node.js build step. Backend is a separate service.
#
# Railway routes external HTTPS traffic to port 80 inside this container.
# We hardcode port 80 — no runtime env substitution needed.

FROM nginx:1.27-alpine

# Write the nginx config directly (no template/envsubst — avoids $uri substitution issues)
# mime.types is included by the base nginx.conf at http{} level, so JS/CSS/PNG
# all get correct Content-Type headers.
RUN printf 'server {\n\
    listen 80;\n\
    server_name _;\n\
\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    # Correct MIME types are inherited from http{} include mime.types in nginx.conf.\n\
    # Serve files exactly; only fall back to index.html when path does not exist.\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    # Health check used by Railway\n\
    location /healthz {\n\
        access_log off;\n\
        return 200 "ok";\n\
        add_header Content-Type text/plain;\n\
    }\n\
\n\
    gzip on;\n\
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;\n\
}\n' > /etc/nginx/conf.d/default.conf

# Verify config is valid before proceeding
RUN nginx -t

# Remove default nginx placeholder page, then copy frontend files
RUN rm -rf /usr/share/nginx/html/*

COPY index.html        /usr/share/nginx/html/
COPY css/              /usr/share/nginx/html/css/
COPY js/               /usr/share/nginx/html/js/
COPY assets/           /usr/share/nginx/html/assets/
COPY pages/            /usr/share/nginx/html/pages/

# Final config check with all files present
RUN nginx -t

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
