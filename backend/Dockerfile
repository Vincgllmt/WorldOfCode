FROM php:8.3-cli

# Installer dépendances nécessaires + extensions PHP
RUN apt-get update && \
    apt-get install -y git unzip libicu-dev libzip-dev libxml2-dev && \
    docker-php-ext-install intl pdo pdo_mysql zip && \
    docker-php-ext-enable intl pdo_mysql zip && \
    rm -rf /var/lib/apt/lists/*

# Installer Symfony CLI
RUN curl -sS https://get.symfony.com/cli/installer | bash && \
    mv /root/.symfony*/bin/symfony /usr/local/bin/symfony

# Installer Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Définir le répertoire de travail
WORKDIR /var/www/backend

# Copier les fichiers composer en premier pour tirer parti du cache Docker
COPY composer.json composer.lock ./

# Installer les dépendances PHP (dont rate-limiter)
RUN composer install --no-scripts --no-autoloader && \
    composer require symfony/rate-limiter && \
    composer dump-autoload --optimize

# Copier le reste du code
COPY . .

# Copier le script d'entrée et le rendre exécutable
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]
CMD ["bash"]

EXPOSE 8090
