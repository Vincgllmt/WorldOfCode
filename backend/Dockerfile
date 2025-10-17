FROM php:8.3-cli

RUN curl -sS https://get.symfony.com/cli/installer | bash && \
    mv /root/.symfony*/bin/symfony /usr/local/bin/symfony

WORKDIR /var/www/backend

# RUN apt-get update && apt-get install -y git unzip libicu-dev && \
#     docker-php-ext-install intl pdo pdo_mysql


RUN apt-get update && apt-get install -y \
    git unzip libicu-dev iputils-ping ca-certificates && \
    docker-php-ext-install intl pdo pdo_mysql

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh


ENTRYPOINT ["entrypoint.sh"]

CMD ["bash"]

EXPOSE 8090
