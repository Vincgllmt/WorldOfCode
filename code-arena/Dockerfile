# syntax=docker/dockerfile:1
FROM php:8.4-cli

# Dépendances système + extensions PHP nécessaires (DB MySQL, intl, zip)
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y \
    git \
    unzip \
    libicu-dev \
    libzip-dev \
    ca-certificates \
    curl \
    && docker-php-ext-install -j"$(nproc)" intl pdo pdo_mysql zip opcache

# Symfony CLI (serveur de dev) + Composer
COPY --link --from=ghcr.io/symfony-cli/symfony-cli:latest /usr/local/bin/symfony /usr/local/bin/symfony
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

COPY docker/opcache.ini /usr/local/etc/php/conf.d/opcache.ini

WORKDIR /app

# Cache des dépendances
COPY composer.json composer.lock ./
RUN --mount=type=cache,target=/root/.composer/cache \
    composer install --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress \
    && composer dump-autoload --optimize

COPY . .

COPY ./entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["symfony", "serve", "--no-tls", "--port=8082", "--allow-all-ip"]

EXPOSE 8082
