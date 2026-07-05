FROM node:20-alpine

WORKDIR /app

# Copié séparément pour profiter du cache Docker : si seul le code change
# (pas package.json), Docker réutilise la couche npm install déjà construite.
COPY package.json ./
RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "run", "dev"]
