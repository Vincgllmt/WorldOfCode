FROM php:8.3-cli

# Installer dépendances système + extensions PHP
RUN apt-get update && \
    apt-get install -y \
    git \
    unzip \
    libicu-dev \
    libzip-dev \
    libxml2-dev \
    iputils-ping \
    ca-certificates \
    curl \
    && docker-php-ext-install intl pdo pdo_mysql zip \
    && rm -rf /var/lib/apt/lists/*

# Installer Symfony CLI
RUN curl -sS https://get.symfony.com/cli/installer | bash && \
    mv /root/.symfony*/bin/symfony /usr/local/bin/symfony

# Installer Composer depuis l'image officielle
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Définir le répertoire de travail
WORKDIR /var/www/backend

# Copier uniquement les fichiers composer pour profiter du cache
COPY composer.json composer.lock ./

# Installer les dépendances PHP
# - ajouter --no-dev si prod
RUN composer install --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress && \
    composer dump-autoload --optimize

# Copier le reste du code
COPY . .

# Copier le script d'entrée et le rendre exécutable
COPY ./entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bash"]

EXPOSE 8090
