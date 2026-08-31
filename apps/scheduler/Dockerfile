FROM node:24.8.0-bookworm-slim@sha256:cadbfafeb6baf87eaaffa40b3640209c4b7fd38cebde65059d15bc39cd636b85
WORKDIR /app
RUN groupadd --system verity && useradd --system --gid verity verity
COPY index.mjs .
USER verity
CMD ["node", "index.mjs"]
