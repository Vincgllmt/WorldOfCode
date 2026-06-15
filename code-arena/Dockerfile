FROM php:8.4-cli

# Dépendances système + extensions PHP nécessaires (DB MySQL, intl, zip)
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libicu-dev \
    libzip-dev \
    ca-certificates \
    curl \
    && docker-php-ext-install -j"$(nproc)" intl pdo pdo_mysql zip opcache \
    && rm -rf /var/lib/apt/lists/*

# Symfony CLI (serveur de dev) + Composer
COPY --link --from=ghcr.io/symfony-cli/symfony-cli:latest /usr/local/bin/symfony /usr/local/bin/symfony
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Cache des dépendances
COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress \
    && composer dump-autoload --optimize

COPY . .

COPY ./entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["symfony", "serve", "--no-tls", "--port=8082", "--allow-all-ip"]

EXPOSE 8082
