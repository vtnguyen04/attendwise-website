#!/bin/bash

# This script sets up the databases for the project.

# PostgreSQL
echo "Running PostgreSQL migrations..."

# Check if migrate command is available
if ! [ -x "$(command -v migrate)" ]; then
  echo 'Error: migrate is not installed. Please install it by following the instructions at https://github.com/golang-migrate/migrate' >&2
  exit 1
fi

cd /home/quynhthu/Documents/internship/backend && migrate -database "${DATABASE_URL}" -path migrations up

# Neo4j
echo "Creating Neo4j indexes..."
./scripts/setup_neo4j.sh

echo "Database setup complete."
