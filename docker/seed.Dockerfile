FROM alpine:3.17

RUN apk add --no-cache \
    bash \
    postgresql-client
