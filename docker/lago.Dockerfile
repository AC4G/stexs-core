FROM alpine:3.17

ENV DEBIAN_FRONTEND=noninteractive

RUN apk update && apk add --no-cache \
    bash \
    curl \
    git \
    openssl \
    ca-certificates \
    libressl \
    && curl -L "https://github.com/docker/compose/releases/download/v2.33.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose \
    && chmod +x /usr/local/bin/docker-compose \
    && ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

WORKDIR /app

COPY scripts/setup.lago.sh /app/scripts/setup.lago.sh

RUN chmod +x /app/scripts/setup.lago.sh
