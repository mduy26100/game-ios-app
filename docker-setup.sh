#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 IOSGods Backend Docker Setup${NC}"
echo "=================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Build and start services
echo -e "${YELLOW}📦 Building and starting services...${NC}"
docker-compose up -d --build

# Wait for database to be healthy
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
MAX_TRIES=30
TRIES=0
while [ $TRIES -lt $MAX_TRIES ]; do
    if docker-compose ps | grep -q "healthy"; then
        echo -e "${GREEN}✓ Database is ready${NC}"
        break
    fi
    TRIES=$((TRIES+1))
    echo -n "."
    sleep 2
done

if [ $TRIES -eq $MAX_TRIES ]; then
    echo -e "${RED}❌ Database did not become healthy in time${NC}"
    echo "Check logs with: docker-compose logs db"
    exit 1
fi

echo ""

# Create database and run migrations
echo -e "${YELLOW}📊 Creating database and running migrations...${NC}"
docker exec -it iosgods-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'YourStrong@Password123' -Q "IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'IOSGodsDB') CREATE DATABASE IOSGodsDB"

sleep 2

# Run each migration file
for file in migrations/*.sql; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        echo -e "  Running ${filename}..."
        docker exec -i iosgods-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'YourStrong@Password123' -d IOSGodsDB < "$file"
    fi
done

echo -e "${GREEN}✓ Migrations completed${NC}"
echo ""

# Seed data
echo -e "${YELLOW}🌱 Seeding database...${NC}"
docker exec -i iosgods-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'YourStrong@Password123' -d IOSGodsDB < scripts/seed-data.sql
echo -e "${GREEN}✓ Database seeded${NC}"
echo ""

# Show status
echo -e "${GREEN}✅ Setup completed!${NC}"
echo ""
echo "Services running:"
docker-compose ps
echo ""
echo -e "${GREEN}📝 Test accounts:${NC}"
echo "  Admin: admin@iosgods.com / admin123"
echo "  VIP:   vip@test.com / test123"
echo "  User:  user@test.com / test123"
echo ""
echo -e "${GREEN}🌐 URLs:${NC}"
echo "  Backend API: http://localhost:3000"
echo "  Database:    localhost:1433"
echo ""
echo -e "${YELLOW}💡 Useful commands:${NC}"
echo "  View logs:      docker-compose logs -f"
echo "  Stop services:  docker-compose down"
echo "  Restart:        docker-compose restart"
echo ""
