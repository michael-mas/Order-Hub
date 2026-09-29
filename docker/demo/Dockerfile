# syntax=docker/dockerfile:1
# The public demo: hub, worker, simulator and console in one image, on an
# ephemeral SQLite database. Build from the repository root:
#   docker build -f docker/demo/Dockerfile -t order-hub-demo .
#   docker run -p 3000:3000 order-hub-demo

# Base images pinned by digest; Dependabot proposes the updates.
FROM composer:2@sha256:9715c7f69044da2a212a5fbde29ee7da24e364d426560ae6367b060236f847d7 AS hub
WORKDIR /hub
COPY apps/hub/composer.json apps/hub/composer.lock apps/hub/symfony.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress
COPY apps/hub/ ./
RUN composer dump-autoload --classmap-authoritative --no-dev && rm -f .env.dev .env.test

FROM node:22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c AS simulator
WORKDIR /build
COPY package.json package-lock.json ./
COPY apps/marketplace/package.json apps/marketplace/
COPY apps/console/package.json apps/console/
COPY e2e/package.json e2e/
# An optional extra CA (a TLS-inspecting proxy); absent everywhere else.
RUN --mount=type=secret,id=extra_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca npm ci --workspace @order-hub/marketplace --omit=dev --no-audit --no-fund
COPY apps/marketplace apps/marketplace

FROM node:22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c AS console
WORKDIR /build
COPY package.json package-lock.json ./
COPY apps/marketplace/package.json apps/marketplace/
COPY apps/console/package.json apps/console/
COPY e2e/package.json e2e/
RUN --mount=type=secret,id=extra_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca npm ci --workspace @order-hub/console --no-audit --no-fund
COPY apps/console apps/console
RUN npm run build --workspace @order-hub/console

FROM dunglas/frankenphp:1-php8.4@sha256:035fcb2fab91aacf77d70ee555d51b9bb084d057b16cf8a644bf1f93e28d4e3e
RUN install-php-extensions intl opcache
COPY --from=node:22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c /usr/local/bin/node /usr/local/bin/node
RUN node --version

ENV APP_ENV=prod APP_DEBUG=0 NODE_ENV=production PORT=3000
COPY --from=hub /hub /app/hub
RUN php /app/hub/bin/console cache:warmup
COPY --from=simulator /build/node_modules /app/node/node_modules
COPY --from=simulator /build/apps/marketplace /app/node/apps/marketplace
COPY --from=console /build/apps/console/.next/standalone /app/console
COPY --from=console /build/apps/console/.next/static /app/console/apps/console/.next/static
COPY docker/demo/start.sh /usr/local/bin/order-hub-demo
# Everything runs unprivileged; it writes only to var/, Caddy's state, the
# console's cache and /tmp (the SQLite file). The upstream FrankenPHP binary
# carries a file capability (bind ports < 1024) that hosts dropping every
# capability refuse to exec (Render does); port 8000 needs none, so a plain
# copy replaces it.
RUN cp /usr/local/bin/frankenphp /tmp/frankenphp && mv /tmp/frankenphp /usr/local/bin/frankenphp \
    && chown -R www-data:www-data /app/hub/var /data/caddy /config/caddy /app/console/apps/console/.next
# www-data, by id: a numeric user satisfies runAsNonRoot checks.
USER 33:33

EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=4 \
  CMD ["sh", "-c", "curl -fsS -o /dev/null \"http://127.0.0.1:${PORT}/api/health\""]
ENTRYPOINT ["order-hub-demo"]
