# syntax=docker/dockerfile:1
# Build context: the repository root (npm workspaces share one lockfile).
# Base image pinned by digest; Dependabot proposes the updates.

FROM node:26-bookworm-slim@sha256:662933cf47f013bc8e4beb31a6116448427a82057ba7c42c97e4c5ba766504c2
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/marketplace/package.json apps/marketplace/
COPY apps/console/package.json apps/console/
COPY e2e/package.json e2e/
# An optional extra CA (a TLS-inspecting proxy); absent everywhere else.
RUN --mount=type=secret,id=extra_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca npm ci --workspace @order-hub/marketplace --omit=dev --no-audit --no-fund
COPY apps/marketplace apps/marketplace
# Runs with node alone: npm and its dependencies leave the image.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
WORKDIR /app/apps/marketplace
ENV NODE_ENV=production PORT=8100
# node, by id: a numeric user satisfies runAsNonRoot checks.
USER 1000:1000
EXPOSE 8100
CMD ["node", "--import", "tsx", "src/main.ts"]
