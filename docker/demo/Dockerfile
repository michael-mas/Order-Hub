# syntax=docker/dockerfile:1
# The public demo: hub, worker, simulator and console in one image, on an
# ephemeral SQLite database. Build from the repository root:
#   docker build -f docker/demo/Dockerfile -t order-hub-demo .
#   docker run -p 3000:3000 order-hub-demo

FROM composer:2 AS hub
WORKDIR /hub
COPY apps/hub/composer.json apps/hub/composer.lock apps/hub/symfony.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress
COPY apps/hub/ ./
RUN composer dump-autoload --classmap-authoritative --no-dev && rm -f .env.test

FROM node:22-bookworm-slim AS simulator
WORKDIR /build
COPY package.json package-lock.json ./
COPY apps/marketplace/package.json apps/marketplace/
COPY apps/console/package.json apps/console/
COPY e2e/package.json e2e/
# An optional extra CA (a TLS-inspecting proxy); absent everywhere else.
RUN --mount=type=secret,id=extra_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca npm ci --workspace @order-hub/marketplace --omit=dev --no-audit --no-fund
COPY apps/marketplace apps/marketplace

FROM node:22-bookworm-slim AS console
WORKDIR /build
COPY package.json package-lock.json ./
COPY apps/marketplace/package.json apps/marketplace/
COPY apps/console/package.json apps/console/
COPY e2e/package.json e2e/
RUN --mount=type=secret,id=extra_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca npm ci --workspace @order-hub/console --no-audit --no-fund
COPY apps/console apps/console
RUN npm run build --workspace @order-hub/console

FROM dunglas/frankenphp:1-php8.4
RUN install-php-extensions intl opcache
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node
RUN node --version

ENV APP_ENV=prod APP_DEBUG=0 NODE_ENV=production PORT=3000
COPY --from=hub /hub /app/hub
RUN cd /app/hub && php bin/console cache:warmup
COPY --from=simulator /build/node_modules /app/node/node_modules
COPY --from=simulator /build/apps/marketplace /app/node/apps/marketplace
COPY --from=console /build/apps/console/.next/standalone /app/console
COPY --from=console /build/apps/console/.next/static /app/console/apps/console/.next/static
COPY docker/demo/start.sh /usr/local/bin/order-hub-demo

EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=4 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/api/health" || exit 1
ENTRYPOINT ["order-hub-demo"]
