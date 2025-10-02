FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY src ./src

# pour dev avec reload (nodemon), sinon remplace par "npm run start"
ENV NODE_ENV=development
EXPOSE 8081
CMD ["npm","run","start:dev"]
