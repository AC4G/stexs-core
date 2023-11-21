FROM node:20.8-alpine3.18 AS base

RUN npm install -g pnpm
RUN npm install -g turbo
RUN npm install -g pm2

FROM base AS builder
RUN apk add --no-cache libc6-compat
RUN apk update

WORKDIR /src
COPY . .
RUN turbo prune storage-api --docker

FROM base AS installer
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /src

COPY .gitignore  .gitignore
COPY --from=builder /src/out/json/ .
COPY --from=builder /src/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install

COPY --from=builder /src/out/full/ .
COPY turbo.json turbo.json

RUN pnpm build --filter=storage-api || true

FROM base AS runner
WORKDIR /src

RUN addgroup --system --gid 1001 expressjs
RUN adduser --system --uid 1001 expressjs

RUN chown -R expressjs:expressjs /src

USER expressjs
COPY --from=installer /src .

COPY .env .

CMD ["pm2-runtime", "apps/storage-api/dist/src/server.js"]
