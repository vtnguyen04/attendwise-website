#!/bin/bash

# This script creates the necessary indexes in the Neo4j database.

NEO4J_CONTAINER_NAME="attendwise_neo4j"
NEO4J_USERNAME="neo4j"
NEO4J_PASSWORD="nguyenthu1122334455"

echo "Creating Neo4j indexes..."

# Create index for User nodes
echo "Creating index for User nodes..."
docker exec $NEO4J_CONTAINER_NAME cypher-shell -u $NEO4J_USERNAME -p $NEO4J_PASSWORD "CREATE INDEX user_id_index IF NOT EXISTS FOR (n:User) ON (n.id)"

# Create index for Community nodes
echo "Creating index for Community nodes..."
docker exec $NEO4J_CONTAINER_NAME cypher-shell -u $NEO4J_USERNAME -p $NEO4J_PASSWORD "CREATE INDEX community_id_index IF NOT EXISTS FOR (n:Community) ON (n.id)"

echo "Neo4j indexes created successfully."
