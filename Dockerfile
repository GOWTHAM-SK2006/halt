# syntax=docker/dockerfile:1
# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /build

# Copy only package files first (better layer caching)
COPY halt-charge-payment/package.json halt-charge-payment/package-lock.json ./
RUN npm ci

# Copy full source and build
COPY halt-charge-payment/ .
RUN npm run build

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy Next.js standalone server (server.js lives at the root of standalone/)
COPY --from=build /build/.next/standalone ./

# Copy static assets (CSS, JS chunks) into the right location
COPY --from=build /build/.next/static ./.next/static

# Copy public assets (logo, icons, etc.)
COPY --from=build /build/public ./public

EXPOSE 3000

# server.js is at /app/server.js after copying standalone
CMD ["node", "server.js"]
