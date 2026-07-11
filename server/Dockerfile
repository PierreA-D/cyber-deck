FROM node:20-alpine

WORKDIR /app

# Manifestes d'abord pour bénéficier du cache de couches et lier les workspaces.
COPY package*.json ./
COPY packages/engine/package.json ./packages/engine/
COPY server/package.json ./server/
RUN npm install

COPY . .

EXPOSE 8081

CMD ["npm", "run", "dev", "--workspace", "@cyber-deck/server"]
