#!/bin/bash

set -e

PG_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@db:$PGPORT/$POSTGRES_DB?sslmode=disable"

TABLE_EXISTS=$(psql $PG_URL -Atc "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schema_migrations');")

if [ "$TABLE_EXISTS" = "f" ]; then
  CURRENT_VERSION="0"
else
  CURRENT_VERSION=$(psql $PG_URL -Atc \
  "SELECT COALESCE((SELECT version FROM public.schema_migrations ORDER BY version DESC LIMIT 1), '0');")
fi

LATEST_VERSION=$(ls /data/migrations/*.up.sql | sed -E 's/.*\/([0-9]+)_.*\.up\.sql/\1/' | sort -n | tail -n 1)
LATEST_VERSION=$(echo $LATEST_VERSION | sed 's/^0*//')

echo "Current DB version: $CURRENT_VERSION"
echo "Latest migration version: $LATEST_VERSION"

if [ "$CURRENT_VERSION" -lt "$LATEST_VERSION" ]; then
  echo "Running database migrations..."
  migrate -path /data/migrations -database $PG_URL -verbose goto $LATEST_VERSION
  echo "Migrations completed!"
else
  echo "No new migrations found. Skipping."
fi
