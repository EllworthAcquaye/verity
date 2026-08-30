FROM node:24.8.0-bookworm-slim@sha256:cadbfafeb6baf87eaaffa40b3640209c4b7fd38cebde65059d15bc39cd636b85 AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY apps/control/package.json ./apps/control/package.json
COPY apps/target/package.json ./apps/target/package.json
RUN pnpm install --frozen-lockfile
COPY apps/control ./apps/control
RUN pnpm --filter @verity/control build

FROM node:24.8.0-bookworm-slim@sha256:cadbfafeb6baf87eaaffa40b3640209c4b7fd38cebde65059d15bc39cd636b85
WORKDIR /app
RUN groupadd --system verity && useradd --system --gid verity verity
COPY --from=build --chown=verity:verity /app/apps/control/.next/standalone ./
COPY --from=build --chown=verity:verity /app/apps/control/.next/static ./apps/control/.next/static
USER verity
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "apps/control/server.js"]
