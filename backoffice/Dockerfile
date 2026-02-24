FROM node:24.3

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 2999
CMD ["npm", "run", "dev"]
