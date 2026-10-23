FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9.15.4
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/server/ ./apps/server/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @copilot/server... build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
RUN npm install -g pnpm@9.15.4 @liara/cli
COPY --from=builder /app /app
EXPOSE 3001
CMD ["node", "apps/server/dist/index.js"]
