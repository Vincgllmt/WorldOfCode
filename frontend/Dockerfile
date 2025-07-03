FROM node:24.3

# Dossier de travail
WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances (Next, Tailwind, etc.)
RUN npm install

# Copie du code source
COPY . .

# Exposition du port Next.js
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "run", "dev"]
