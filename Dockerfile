# syntax=docker/dockerfile:1
# ── Halt & Charge Frontend — Static site served by nginx ──────────────────────
# The frontend is plain HTML/CSS/JS (no Node.js build step needed).
# The backend is a separate Railway service (halt-charge-backend/Dockerfile).

FROM nginx:1.27-alpine

# Remove default nginx placeholder page
RUN rm -rf /usr/share/nginx/html/*

# Copy all static frontend files into nginx's serve directory
COPY index.html        /usr/share/nginx/html/
COPY css/              /usr/share/nginx/html/css/
COPY js/               /usr/share/nginx/html/js/
COPY assets/           /usr/share/nginx/html/assets/
COPY pages/            /usr/share/nginx/html/pages/

# nginx config: serve static files, route all 404s back to index.html
# so that direct links to /pages/dashboard.html still work
RUN printf 'server {\n\
    listen ${PORT:-80};\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    # Serve files directly; fall back to index.html for client-side navigation\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    # Health check endpoint used by Railway\n\
    location /healthz {\n\
        return 200 "ok";\n\
        add_header Content-Type text/plain;\n\
    }\n\
\n\
    gzip on;\n\
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
