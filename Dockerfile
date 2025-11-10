# syntax = docker/dockerfile:1

ARG NODE_VERSION=22.20.0
FROM node:${NODE_VERSION}-slim AS base

WORKDIR /app
ENV NODE_ENV="production"

# --------------------------------------
FROM base AS build
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3
COPY package-lock.json package.json ./
# ignore-scriptsと異なり、postinstallスクリプトのみを回避する
RUN NO_POSTINSTALL=1 npm ci --include=dev
COPY . .

# --------------------------------------
RUN npm run build
RUN npm prune --omit=dev

FROM base
COPY --from=build /app /app
CMD ["dist/main"]
