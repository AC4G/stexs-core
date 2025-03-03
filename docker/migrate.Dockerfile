FROM alpine:3.17

RUN apk update && apk add --no-cache \
    bash \
    curl \
    postgresql-client

RUN curl -L https://github.com/golang-migrate/migrate/releases/download/v4.18.2/migrate.linux-amd64.tar.gz \
    | tar -xz -C /usr/local/bin
