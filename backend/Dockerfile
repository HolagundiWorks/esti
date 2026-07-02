# ESTI AORMS backend (TypeScript / Fastify)
# Build context: parent repos folder (contains esti + hcw-*-kit siblings).
#   podman build -f esti/backend/Dockerfile -t localhost/esti-backend:dev .
FROM node:20-alpine AS base
ENV IBM_TELEMETRY_DISABLED=true
RUN corepack enable
WORKDIR /app/esti

COPY esti/package.json esti/pnpm-workspace.yaml esti/pnpm-lock.yaml esti/tsconfig.base.json ./
COPY esti/packages/contracts/package.json packages/contracts/
COPY esti/backend/package.json backend/
COPY hcw-aorms-ai-kit/package.json ../hcw-aorms-ai-kit/

RUN pnpm install --no-frozen-lockfile --ignore-scripts

COPY esti/packages/contracts packages/contracts
COPY esti/backend backend
COPY esti/scripts scripts
COPY hcw-aorms-ai-kit ../hcw-aorms-ai-kit

RUN pnpm --filter @hcw/aorms-ai-kit build

EXPOSE 4000
CMD ["pnpm", "--filter", "@esti/backend", "dev"]
