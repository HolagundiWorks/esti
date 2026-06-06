# ESTI AORMS backend (TypeScript / Fastify)
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# Workspace manifests (better layer caching)
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY backend/package.json backend/
RUN pnpm install --frozen-lockfile || pnpm install

# Source
COPY packages/contracts packages/contracts
COPY backend backend

EXPOSE 4000
CMD ["pnpm", "--filter", "@esti/backend", "dev"]
