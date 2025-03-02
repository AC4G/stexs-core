#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define the full path to the 'lago' directory
LAGO_DIR="$SCRIPT_DIR/lago"

if [ ! -d "$LAGO_DIR" ]; then
  git clone https://github.com/getlago/lago.git
else
  echo "'lago' directory already exists. Skipping clone."
fi

cd "lago"

echo "LAGO_RSA_PRIVATE_KEY=$(openssl genrsa 2048 | base64 | tr -d '\n')" >> .env

source .env

docker-compose up -d api

docker-compose exec api rails db:create
docker-compose exec api rails db:migrate

docker-compose up -d
