# syntax=docker/dockerfile:1
# Build context: the repository root (npm workspaces share one lockfile).

FROM node:22-slim AS build
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

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/apps/console/.next/standalone ./
COPY --from=build /app/apps/console/.next/static ./apps/console/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/console/server.js"]
