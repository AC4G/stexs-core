FROM alpine:3.17

ENV DEBIAN_FRONTEND=noninteractive

RUN apk update && apk add --no-cache \
    bash \
    curl \
    sudo \
    git \
    openssl \
    ca-certificates \
    libressl

WORKDIR /app

COPY scripts/setup.kong.sh /app/scripts/setup.kong.sh

RUN chmod +x /app/scripts/setup.kong.sh
