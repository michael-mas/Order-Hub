# syntax=docker/dockerfile:1
# Build context: the repository root (npm workspaces share one lockfile).

FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/marketplace/package.json apps/marketplace/
COPY apps/console/package.json apps/console/
COPY e2e/package.json e2e/
# An optional extra CA (a TLS-inspecting proxy); absent everywhere else.
RUN --mount=type=secret,id=extra_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca npm ci --workspace @order-hub/marketplace --omit=dev --no-audit --no-fund
COPY apps/marketplace apps/marketplace
ENV NODE_ENV=production PORT=8100
USER node
EXPOSE 8100
CMD ["npm", "run", "start", "--workspace", "@order-hub/marketplace"]
