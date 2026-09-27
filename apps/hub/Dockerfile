# syntax=docker/dockerfile:1

FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock symfony.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress
COPY . .
RUN composer dump-autoload --classmap-authoritative --no-dev

FROM dunglas/frankenphp:1-php8.4 AS hub
RUN install-php-extensions pdo_pgsql intl opcache
ENV APP_ENV=prod \
    APP_DEBUG=0 \
    SERVER_NAME=:8000
WORKDIR /app
COPY --from=vendor /app /app
RUN rm -f .env.test && php bin/console cache:warmup && chown -R www-data:www-data var
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD curl -fsS http://127.0.0.1:8000/health || exit 1
