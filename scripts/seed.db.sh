#!/bin/bash

set -e

echo "Seeding database started..."

for file in /data/seeds/*.sql; do
  relpath=${file#/data/seeds/}
  echo "Executing $relpath..."
  psql "$PGRST_DB_URI" -f "$file"
  echo "Finished executing ./$relpath"
done

echo "Database seeding complete!"
