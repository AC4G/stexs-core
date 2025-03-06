#!/bin/bash

curl -i -X POST "$KONG_ADMIN_URL/services" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "rest_v1",
        "host": "host.docker.internal",
        "port": '"$REST_PORT"',
        "tags": ["rest", "postgrest", "rest-api", "v1"]
    }'

curl -i -X POST "$KONG_ADMIN_URL/routes" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "rest_v1",
        "service": { "name": "rest_v1" },
        "tags": ["rest", "postgrest", "rest-api"],
        "methods": ["GET", "PUT", "POST", "PATCH", "DELETE", "OPTIONS", "HEAD"],
        "paths": ["'"$REST_API_PATH"'"]
    }'


curl -i -X POST "$KONG_ADMIN_URL/services" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "api_v1",
        "host": "host.docker.internal",
        "port": '"$API_PORT"',
        "tags": ["api", "auth", "storage", "billing", "v1"]
    }'

curl -i -X POST "$KONG_ADMIN_URL/routes" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "api_v1",
        "service": { "name": "api_v1" },
        "tags": ["api", "auth", "storage", "billing", "v1"],
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "paths": ["'"$API_PATH"'"]
    }'
