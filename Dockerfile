# Build the React client
FROM node:22-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Install server dependencies (build tools as a fallback in case better-sqlite3's
# prebuilt binary isn't available for the target platform)
FROM node:22-slim AS server-deps
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

# Final runtime image
FROM node:22-slim
WORKDIR /app
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=4000
ENV DB_DIR=/data

EXPOSE 4000
CMD ["node", "server/src/index.js"]
