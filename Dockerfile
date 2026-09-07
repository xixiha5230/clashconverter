FROM node:22-bookworm-slim AS base

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml ./
RUN pnpm install

COPY . .

ENV NODE_ENV=production
RUN pnpm build

# TODO: run as non-root once the host data/ dir has been chowned 1000:1000.
# RUN chown -R node:node /app
# USER node

EXPOSE 3000
CMD ["pnpm", "start", "-H", "0.0.0.0"]