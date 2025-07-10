FROM php:8.3-cli


RUN curl -sS https://get.symfony.com/cli/installer | bash && \
    mv /root/.symfony*/bin/symfony /usr/local/bin/symfony

WORKDIR /var/www/backend


RUN apt-get update && apt-get install -y git unzip libicu-dev && \
    docker-php-ext-install intl pdo pdo_mysql


COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

CMD ["bash"]

EXPOSE 9000
