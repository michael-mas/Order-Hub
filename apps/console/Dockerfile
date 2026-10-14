# syntax=docker/dockerfile:1
# Build context: the repository root (npm workspaces share one lockfile).
# Base image pinned by digest; Dependabot proposes the updates.

FROM node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392 AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/marketplace/package.json apps/marketplace/
COPY apps/console/package.json apps/console/
COPY e2e/package.json e2e/
# An optional extra CA (a TLS-inspecting proxy); absent everywhere else.
RUN --mount=type=secret,id=extra_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca npm ci --workspace @order-hub/console --no-audit --no-fund
COPY apps/console apps/console
RUN npm run build --workspace @order-hub/console

FROM node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/apps/console/.next/standalone ./
COPY --from=build /app/apps/console/.next/static ./apps/console/.next/static
# The server needs node alone: npm and its dependencies leave the image.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
# node, by id: a numeric user satisfies runAsNonRoot checks.
USER 1000:1000
EXPOSE 3000
CMD ["node", "apps/console/server.js"]
