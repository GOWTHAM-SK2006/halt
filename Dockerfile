# syntax=docker/dockerfile:1
# ── Halt & Charge Frontend — nginx static file server ────────────────────────
# Plain HTML/CSS/JS — no Node.js build step. Backend is a separate Railway service.
#
# PORT handling (how Railway's dynamic port is handled):
#   - ENV PORT=80 sets a safe default for local use.
#   - Railway overrides PORT at runtime with its assigned value (e.g. 3000).
#   - The official nginx:alpine image's ENTRYPOINT runs envsubst at container
#     startup over every file in /etc/nginx/templates/*.conf.template, writing
#     results to /etc/nginx/conf.d/. This substitutes ${PORT} with the actual
#     numeric port BEFORE nginx reads any config.
#   - nginx's own variables ($uri, $host, $args, etc.) are NOT shell env vars,
#     so envsubst leaves them completely untouched.
#   - No custom startup scripts, no printf, no heredoc — avoids all escape
#     sequence ambiguity that caused past build failures.

FROM nginx:1.27-alpine

# Default port. Railway overrides this at runtime via its $PORT env var.
ENV PORT=80

# ── Remove default nginx placeholder page ────────────────────────────────────
RUN rm -rf /usr/share/nginx/html/*

# ── Copy static frontend files ───────────────────────────────────────────────
COPY index.html        /usr/share/nginx/html/
COPY css/              /usr/share/nginx/html/css/
COPY js/               /usr/share/nginx/html/js/
COPY assets/           /usr/share/nginx/html/assets/
COPY pages/            /usr/share/nginx/html/pages/

# ── Verify files made it into the image (visible in Railway build logs) ───────
RUN echo "=== /usr/share/nginx/html layout ===" \
 && find /usr/share/nginx/html -type f | sort \
 && echo "=== verifying js/utils.js exists ===" \
 && test -f /usr/share/nginx/html/js/utils.js \
 && echo "PASS: js/utils.js present" \
 || (echo "FAIL: js/utils.js MISSING — build aborted" && exit 1)

# ── Copy nginx config template (version-controlled, not generated) ────────────
# The official nginx entrypoint substitutes ${PORT} at startup and writes
# the result to /etc/nginx/conf.d/default.conf.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

# Use the base image's default CMD — the entrypoint handles template processing.
CMD ["nginx", "-g", "daemon off;"]
