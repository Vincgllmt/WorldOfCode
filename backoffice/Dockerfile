# syntax=docker/dockerfile:1
FROM node:24.3

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

EXPOSE 2999
CMD ["npm", "run", "dev"]
