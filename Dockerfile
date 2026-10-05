# syntax=docker/dockerfile:1

# ---- 1. Frontend: build statico con Vite ----
FROM node:24-slim AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- 2. Backend: compilazione TypeScript ----
FROM node:24-slim AS server
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npm run build && npm prune --omit=dev

# ---- 3. Immagine finale: solo ciò che serve a runtime ----
FROM node:24-slim
ENV NODE_ENV=production \
    PORT=3000 \
    UPLOAD_DIR=/data/uploads \
    CLIENT_DIST=/app/client/dist
WORKDIR /app/server
COPY --from=server /app/server/package.json ./
COPY --from=server /app/server/node_modules ./node_modules
COPY --from=server /app/server/dist ./dist
COPY --from=server /app/server/migrations ./migrations
COPY --from=client /app/client/dist /app/client/dist
RUN mkdir -p /data/uploads
EXPOSE 3000
CMD ["node", "dist/index.js"]
