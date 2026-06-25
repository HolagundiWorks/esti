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
COPY hcw-carbon-agent-kit/package.json ../hcw-carbon-agent-kit/
COPY hcw-aorms-ai-kit/package.json ../hcw-aorms-ai-kit/
COPY hcw-master-dsr-kit/package.json ../hcw-master-dsr-kit/

RUN pnpm install --no-frozen-lockfile --ignore-scripts

COPY esti/packages/contracts packages/contracts
COPY esti/backend backend
COPY esti/scripts scripts
COPY hcw-carbon-agent-kit ../hcw-carbon-agent-kit
COPY hcw-aorms-ai-kit ../hcw-aorms-ai-kit
COPY hcw-master-dsr-kit ../hcw-master-dsr-kit

RUN pnpm --filter @hcw/aorms-ai-kit build && pnpm --filter @hcw/master-dsr-kit build && node scripts/setup-carbon-kit.mjs

EXPOSE 4000
CMD ["pnpm", "--filter", "@esti/backend", "dev"]
