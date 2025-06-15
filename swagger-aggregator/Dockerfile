# swagger-aggregator/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Installer curl pour les health checks
RUN apk add --no-cache curl

# Copier package.json et installer les dépendances
COPY package.json ./
RUN npm install --production

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 3005

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Démarrer l'application
CMD ["npm", "start"]