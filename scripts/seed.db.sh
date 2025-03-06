#!/bin/bash

set -e

PGRST_DB_URI="${PGRST_DB_URI:-postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$PGPORT/$POSTGRES_DB?sslmode=disable}"

echo "Seeding database started..."

for file in /data/seeds/*.sql; do
  relpath=${file#/data/seeds/}
  echo "Executing $relpath..."
  psql $PGRST_DB_URI -f "$file"
  echo "Finished executing ./$relpath"
done

echo "Database seeding complete!"
