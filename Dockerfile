# syntax=docker/dockerfile:1
# ── Halt & Charge Frontend — Static site served by nginx ──────────────────────
# The frontend is plain HTML/CSS/JS (no Node.js build step needed).
# The backend is a separate Railway service (halt-charge-backend/Dockerfile).

FROM nginx:1.27-alpine

# Default port — Railway overrides this with its own $PORT at runtime.
# Must be set so envsubst always has a numeric value to substitute.
ENV PORT=80

# Remove default nginx placeholder page
RUN rm -rf /usr/share/nginx/html/*

# Copy all static frontend files into nginx's serve directory
COPY index.html        /usr/share/nginx/html/
COPY css/              /usr/share/nginx/html/css/
COPY js/               /usr/share/nginx/html/js/
COPY assets/           /usr/share/nginx/html/assets/
COPY pages/            /usr/share/nginx/html/pages/

# Write the config as a TEMPLATE (not a final config).
# The official nginx image's entrypoint calls envsubst on /etc/nginx/templates/
# at container startup, which substitutes ${PORT} with the real numeric value
# and writes the result to /etc/nginx/conf.d/default.conf before nginx starts.
# This is the correct way to use runtime env vars with the official nginx image.
RUN mkdir -p /etc/nginx/templates && printf '\
server {\n\
    listen ${PORT};\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    # Serve files directly; fall back to index.html for direct page links\n\
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
}\n\
' > /etc/nginx/templates/default.conf.template

# Remove the static default.conf so only the template-generated one is used
RUN rm -f /etc/nginx/conf.d/default.conf

EXPOSE 80

# No custom CMD — the base image entrypoint handles envsubst then starts nginx
