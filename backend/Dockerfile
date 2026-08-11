FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript code (if we added a build step. Since package.json runs tsx, we can just run tsx in production or build it. Let's use tsx for now for simplicity, or we can compile.)
RUN npm install -g typescript tsx
# In a real app we would `tsc` here.

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN npm install -g tsx prisma

EXPOSE 4000

# Push the schema to the database before starting the server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx tsx src/server.ts"]
