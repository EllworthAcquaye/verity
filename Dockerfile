FROM node:24.8.0-bookworm-slim@sha256:cadbfafeb6baf87eaaffa40b3640209c4b7fd38cebde65059d15bc39cd636b85 AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:24.8.0-bookworm-slim@sha256:cadbfafeb6baf87eaaffa40b3640209c4b7fd38cebde65059d15bc39cd636b85
WORKDIR /app
RUN corepack enable && groupadd --system verity && useradd --system --gid verity verity
COPY --from=build --chown=verity:verity /app/dist ./dist
COPY --from=build --chown=verity:verity /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build --chown=verity:verity /app/node_modules ./node_modules
USER verity
EXPOSE 3000
CMD ["pnpm", "start", "--", "--ip", "0.0.0.0", "--port", "3000"]
