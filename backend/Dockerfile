# ESTI AORMS backend (TypeScript / Fastify)
# Build context: repo root — @hcw/aorms-ai-kit is vendored under vendor/ (no sibling repos).
#   podman build -f backend/Dockerfile -t localhost/esti-backend:dev .
FROM node:20-alpine AS base
ENV IBM_TELEMETRY_DISABLED=true
RUN corepack enable
WORKDIR /app/esti

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY backend/package.json backend/
COPY vendor vendor/

RUN pnpm install --no-frozen-lockfile --ignore-scripts

COPY packages/contracts packages/contracts
COPY backend backend

EXPOSE 4000
CMD ["pnpm", "--filter", "@esti/backend", "dev"]
