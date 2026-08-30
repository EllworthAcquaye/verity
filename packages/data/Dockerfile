FROM node:24.8.0-bookworm-slim@sha256:cadbfafeb6baf87eaaffa40b3640209c4b7fd38cebde65059d15bc39cd636b85
WORKDIR /app
ENV COREPACK_HOME=/opt/corepack
ENV PRISMA_CLI_BINARY_TARGETS=linux-arm64-openssl-3.0.x
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack install --global pnpm@11.19.0 \
    && groupadd --system verity \
    && useradd --system --gid verity verity
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/data/package.json ./packages/data/package.json
RUN --mount=type=cache,id=verity-pnpm,target=/root/.local/share/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --filter @verity/data... --fetch-timeout=300000 --fetch-retries=5 \
    && node node_modules/.pnpm/@prisma+engines@7.10.0/node_modules/@prisma/engines/scripts/postinstall.js
COPY packages/data ./packages/data
RUN chmod +x ./packages/data/docker-entrypoint.sh \
    && chown -R verity:verity /app /opt/corepack
USER verity
ENTRYPOINT ["./packages/data/docker-entrypoint.sh"]
