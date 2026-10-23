FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9.15.4
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/web/ ./apps/web/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @copilot/web... build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN npm install -g pnpm@9.15.4
COPY --from=builder /app /app
EXPOSE 3000
CMD ["pnpm", "--filter", "@copilot/web", "start"]
