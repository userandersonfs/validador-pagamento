FROM node:22-slim

WORKDIR /app

# Instala deps primeiro (melhor cache)
COPY package.json ./
RUN npm install --omit=dev

# Copia o resto da app
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=America/Sao_Paulo
EXPOSE 3000

CMD ["node", "src/server.js"]
