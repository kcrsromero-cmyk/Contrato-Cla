FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
EXPOSE 4000

# Named stages so each process can be its own deployable unit with the command baked into the
# image (docker-compose and most PaaS "start command" overrides just append a command after the
# image name or rewrite the container's entrypoint at `docker run` time; some platforms don't
# reliably honor that override, so this doesn't depend on it). `server` is last/default so
# `docker build .` with no --target (docker-compose's own build, and anything else that doesn't
# ask for a target) keeps building the same image as before.
FROM base AS worker
CMD ["node", "dist/worker.js"]

FROM base AS migrator
CMD ["sh", "scripts/migrate.sh"]

FROM base AS server
CMD ["node", "dist/server.js"]
