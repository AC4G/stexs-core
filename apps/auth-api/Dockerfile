FROM node:20.8-alpine3.18 AS base

RUN npm install -g pnpm
RUN npm install -g turbo
RUN npm install -g pm2

FROM base AS builder
RUN apk add --no-cache libc6-compat
RUN apk update

WORKDIR /app
COPY . .
RUN turbo prune auth-api --docker

FROM base AS installer
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app

COPY .gitignore  .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install

COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

RUN pnpm build --filter=auth-api || true

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 expressjs
RUN adduser --system --uid 1001 expressjs

RUN chown -R expressjs:expressjs /app

USER expressjs
COPY --from=installer /app .

COPY .env .

CMD ["pm2-runtime", "apps/auth-api/dist/app/server.js"]
