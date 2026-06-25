# syntax=docker/dockerfile:1
FROM php:8.4-cli

# Installer dépendances système + extensions PHP
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && \
    apt-get install -y \
    git \
    unzip \
    libicu-dev \
    libzip-dev \
    libxml2-dev \
    libpng-dev \
    libjpeg62-turbo-dev \
    libwebp-dev \
    libfreetype6-dev \
    iputils-ping \
    ca-certificates \
    curl \
    wget \
    sqlite3 \
    libsqlite3-dev \
    cron \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) intl pdo pdo_mysql pdo_sqlite zip gd exif \
    && pecl install pcov \
    && docker-php-ext-enable pcov

# Augmenter les limites d'upload PHP + OPcache
RUN echo "upload_max_filesize = 10M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 12M" >> /usr/local/etc/php/conf.d/uploads.ini
COPY docker/opcache.ini /usr/local/etc/php/conf.d/opcache.ini

# Installer Symfony CLI
COPY --link \
    --from=ghcr.io/symfony-cli/symfony-cli:latest \
    /usr/local/bin/symfony /usr/local/bin/symfony

# Installer Composer depuis l'image officielle
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Définir le répertoire de travail
WORKDIR /var/www/backend

# Copier uniquement les fichiers composer pour profiter du cache
COPY composer.json composer.lock ./

# Installer les dépendances PHP (cache persisté entre les builds)
RUN --mount=type=cache,target=/root/.composer/cache \
    composer install --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress && \
    composer dump-autoload --optimize

# Copier le reste du code
COPY . .

# .env requis par le runtime Symfony (bootEnv) — non tracké dans git depuis SEC-1.
# On le génère depuis le template ; les secrets réels sont injectés via Vault/env au runtime.
RUN cp .env.example .env

# Copier le script d'entrée et le rendre exécutable
COPY ./entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bash"]

EXPOSE 8090
