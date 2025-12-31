#!/bin/bash

# Wait for SQL Server to start
echo "Waiting for SQL Server to start..."
sleep 30s

# Create database
echo "Creating database..."
/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P ${SA_PASSWORD} -Q "IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'IOSGodsDB') CREATE DATABASE IOSGodsDB"

# Run migrations in order
echo "Running migrations..."
for file in /docker-entrypoint-initdb.d/*.sql; do
    if [ -f "$file" ]; then
        echo "Executing $file..."
        /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P ${SA_PASSWORD} -d IOSGodsDB -i "$file"
    fi
done

echo "Database initialization completed!"
