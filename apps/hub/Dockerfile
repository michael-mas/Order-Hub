# syntax=docker/dockerfile:1

# Base images pinned by digest; Dependabot proposes the updates.
FROM composer:2@sha256:9715c7f69044da2a212a5fbde29ee7da24e364d426560ae6367b060236f847d7 AS vendor
WORKDIR /app
COPY composer.json composer.lock symfony.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress
COPY . .
RUN composer dump-autoload --classmap-authoritative --no-dev

FROM dunglas/frankenphp:1-php8.4@sha256:035fcb2fab91aacf77d70ee555d51b9bb084d057b16cf8a644bf1f93e28d4e3e AS hub
RUN install-php-extensions pdo_pgsql intl opcache
ENV APP_ENV=prod \
    APP_DEBUG=0 \
    SERVER_NAME=:8000
WORKDIR /app
COPY --from=vendor /app /app
# Unprivileged at run time: it writes only to var/ and Caddy's state.
RUN rm -f .env.dev .env.test \
    && php bin/console cache:warmup \
    && chown -R www-data:www-data var /data/caddy /config/caddy
# www-data, by id: a numeric user satisfies runAsNonRoot checks.
USER 33:33
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD ["curl", "-fsS", "-o", "/dev/null", "http://127.0.0.1:8000/health"]
