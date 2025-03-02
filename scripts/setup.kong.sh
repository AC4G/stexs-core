#!/bin/bash

KONG_ADMIN_URL="${KONG_ADMIN_URL:-http://localhost:8001}"

curl -i -X POST "$KONG_ADMIN_URL/services" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "rest_v1",
        "host": "host.docker.internal",
        "port": 3000,
        "tags": [
            "rest", 
            "postgrest", 
            "rest-api", 
            "api"
        ]
    }'

curl -i -X POST "$KONG_ADMIN_URL/routes" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "rest_v1",
        "service": {
            "name": "rest_v1"
        },
        "tags": [
            "rest", 
            "postgrest", 
            "rest-api", 
            "api"
        ],
        "methods": [
            "GET", 
            "PUT", 
            "POST", 
            "PATCH",
            "DELETE", 
            "OPTIONS",
            "HEAD"
        ],
        "paths": [
            "/rest/v1"
        ]
    }'


curl -i -X POST "$KONG_ADMIN_URL/services" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "auth_v1",
        "host": "host.docker.internal",
        "port": 3001,
        "tags": [
            "auth", 
            "auth-api", 
            "api"
        ]
    }'

curl -i -X POST "$KONG_ADMIN_URL/routes" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "auth_v1",
        "service": {
            "name": "auth_v1"
        },
        "tags": [
            "auth", 
            "auth-api", 
            "api"
        ],
        "methods": [
            "GET",  
            "POST", 
            "DELETE", 
            "OPTIONS"
        ],
        "paths": [
            "/auth/v1"
        ]
    }'


curl -i -X POST "$KONG_ADMIN_URL/services" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "storage_v1",
        "host": "host.docker.internal",
        "port": 3002,
        "tags": [
            "storage", 
            "storage-api", 
            "api"
        ]
    }'

curl -i -X POST "$KONG_ADMIN_URL/routes" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "storage_v1",
        "service": {
            "name": "storage_v1"
        },
        "tags": [
            "storage", 
            "storage-api", 
            "api"
        ],
        "methods": [
            "GET",  
            "POST", 
            "DELETE", 
            "OPTIONS"
        ],
        "paths": [
            "/storage/v1"
        ]
    }'


curl -i -X POST "$KONG_ADMIN_URL/services" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "graphql_v1",
        "host": "host.docker.internal",
        "port": 5000,
        "tags": [
            "graphql", 
            "graphql-api", 
            "api"
        ],
        "path": "/graphql"
    }'

curl -i -X POST "$KONG_ADMIN_URL/routes" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "graphql_v1",
        "service": {
            "name": "graphql_v1"
        },
        "tags": [
            "graphql", 
            "graphql-api", 
            "api"
        ],
        "methods": [
            "POST",
            "OPTIONS"
        ],
        "paths": [
            "/graphql/v1",
            "/graphql
        ]
    }'

curl -i -X POST "$KONG_ADMIN_URL/services" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "ws_graphql_v1",
        "host": "host.docker.internal",
        "protocol": "ws",
        "port": 5000,
        "tags": [
            "ws",
            "graphql", 
            "graphql-api", 
            "api"
        ],
        "path": "/graphql"
    }'

curl -i -X POST "$KONG_ADMIN_URL/routes" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "ws_graphql_v1",
        "service": {
            "name": "ws_graphql_v1"
        },
        "tags": [
            "ws",
            "graphql", 
            "graphql-api", 
            "api"
        ],
        "protocols": [
            "ws"
        ],
        "paths": [
            "/graphql/v1",
            "/graphql"
        ]
    }'

curl -i -X POST "$KONG_ADMIN_URL/services" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "graphql_v1_gui",
        "host": "host.docker.internal",
        "port": 5000,
        "tags": [
            "graphql", 
            "graphql-gui", 
            "gui"
        ],
        "path": "/graphiql"
    }'

curl -i -X POST "$KONG_ADMIN_URL/routes" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "ws_graphql_v1",
        "service": {
            "name": "ws_graphql_v1"
        },
        "tags": [
            "graphql", 
            "graphql-gui", 
            "gui"
        ],
        "methods": [
            "GET",
            "PATCH",
            "DELETE",
            "POST",
            "OPTIONS"
        ],
        "paths": [
            "/graphiql/v1"
        ]
    }'

