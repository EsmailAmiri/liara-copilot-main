# Multi-stage Dockerfile for Liara Copilot Full-Stack (Next.js Web + Fastify Server)

# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (e.g. better-sqlite3)
RUN apk add --no-cache python3 make g++ gcc libc-dev

# Install pinned pnpm
RUN npm install -g pnpm@9.15.4

# Copy monorepo configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./

# Copy packages and apps needed for web & server
COPY packages/ ./packages/
COPY apps/server/ ./apps/server/
COPY apps/web/ ./apps/web/

# Install workspace dependencies
RUN pnpm install --frozen-lockfile

# Build server and web apps with their dependencies
RUN pnpm --filter @copilot/server... build
RUN pnpm --filter @copilot/web... build

# Stage 2: Production runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV SERVER_PORT=3001
ENV API_URL=http://127.0.0.1:3001

# Install runtime utilities & @liara/cli
RUN apk add --no-cache curl
RUN npm install -g pnpm@9.15.4 @liara/cli

# Prepare data directory with write permissions for SQLite
RUN mkdir -p /app/data && chmod 777 /app/data

# Copy built workspace and files
COPY --from=builder /app /app
COPY scripts/start-production.js ./scripts/start-production.js

# Expose web port (routed by Liara)
EXPOSE 3000

CMD ["node", "scripts/start-production.js"]
