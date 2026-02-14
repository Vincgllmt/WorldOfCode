FROM node:22-bookworm-slim

# Needed for mediasoup when it compiles locally
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    python3 python3-pip make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY src ./src
COPY config ./config

ENV NODE_ENV=development
EXPOSE 8081
CMD ["npm","run","start:dev"]
