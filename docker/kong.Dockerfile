FROM alpine:3.17

RUN apk update && apk add --no-cache \
    bash \
    curl
