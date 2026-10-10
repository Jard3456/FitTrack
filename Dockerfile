FROM node:20-bookworm-slim

WORKDIR /app

COPY server/package*.json ./server/
RUN npm --prefix server ci --omit=dev

COPY server ./server
COPY database ./database

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server/index.js"]
