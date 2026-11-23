# node:sqlite için Node 22.13 ve üzeri gerekir. "node:22-slim" bu sürümü içerir.
FROM node:22-slim

WORKDIR /app

# Arayüzü derle
COPY client/package*.json client/
RUN cd client && npm install
COPY client client
RUN cd client && npm run build && rm -rf node_modules

# Sunucu bağımlılıkları
COPY server/package*.json server/
RUN cd server && npm install --omit=dev
COPY server server

ENV NODE_ENV=production
ENV PORT=3001
# Veritabanı kalıcı diskte tutulur (hosting ayarında /data bağlanır)
ENV DB_PATH=/data/triko.db
ENV YEDEK_KLASORU=/data/yedekler
EXPOSE 3001
WORKDIR /app/server
CMD ["node", "src/index.js"]