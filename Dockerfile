FROM node:22-bookworm-slim AS base

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml ./
RUN pnpm install

COPY . .

ENV NODE_ENV=production
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start", "-H", "0.0.0.0"]