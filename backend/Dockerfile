# ESTI AORMS backend (TypeScript / Fastify) — dev image.
# Build context: the repo root (kits are vendored under vendor/):
#   podman build -f backend/Dockerfile -t localhost/esti-backend:dev .
FROM node:20-alpine
ENV IBM_TELEMETRY_DISABLED=true
# Optional egress-proxy / corporate CA. No-op when the secret isn't provided:
#   docker build --secret id=extra_ca,src=/path/to/ca-bundle.crt …
RUN --mount=type=secret,id=extra_ca \
    touch /usr/local/share/extra-ca.crt && \
    if [ -f /run/secrets/extra_ca ]; then cp /run/secrets/extra_ca /usr/local/share/extra-ca.crt; fi
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/extra-ca.crt
RUN corepack enable
WORKDIR /app/esti

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY backend/package.json backend/
COPY vendor vendor/

RUN pnpm install --no-frozen-lockfile --ignore-scripts

COPY packages/contracts packages/contracts
COPY backend backend
COPY scripts scripts

RUN pnpm --filter @hcw/aorms-ai-kit build && node scripts/setup-carbon-kit.mjs

EXPOSE 4000
CMD ["pnpm", "--filter", "@esti/backend", "dev"]
