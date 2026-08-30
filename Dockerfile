FROM node:24.8.0-bookworm-slim@sha256:cadbfafeb6baf87eaaffa40b3640209c4b7fd38cebde65059d15bc39cd636b85 AS build
WORKDIR /app
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/control/package.json ./apps/control/package.json
COPY apps/target/package.json ./apps/target/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/data/package.json ./packages/data/package.json
COPY packages/domain/package.json ./packages/domain/package.json
RUN --mount=type=cache,id=verity-pnpm,target=/root/.local/share/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --fetch-timeout=300000 --fetch-retries=5
COPY apps/control ./apps/control
COPY packages/contracts ./packages/contracts
COPY packages/data ./packages/data
COPY packages/domain ./packages/domain
RUN pnpm turbo run build --filter=@verity/control...

FROM node:24.8.0-bookworm-slim@sha256:cadbfafeb6baf87eaaffa40b3640209c4b7fd38cebde65059d15bc39cd636b85
WORKDIR /app
RUN groupadd --system verity && useradd --system --gid verity verity
COPY --from=build --chown=verity:verity /app/apps/control/.next/standalone ./
COPY --from=build --chown=verity:verity /app/apps/control/.next/static ./apps/control/.next/static
USER verity
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "apps/control/server.js"]
