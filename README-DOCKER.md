# Docker Setup Guide

## Prerequisites

- Docker Desktop installed
- Docker Compose installed

## Quick Start

### 1. Start the services

```bash
docker-compose up -d
```

This will start:
- **MSSQL Server** on port `1433`
- **Backend API** on port `3000`

### 2. Check service status

```bash
docker-compose ps
```

### 3. View logs

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Database only
docker-compose logs -f db
```

### 4. Initialize database with migrations

The database will be automatically created when the container starts. To run migrations manually:

```bash
# Connect to database container
docker exec -it iosgods-db /bin/bash

# Run migrations
for file in /docker-entrypoint-initdb.d/*.sql; do
    /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'YourStrong@Password123' -d IOSGodsDB -i "$file"
done
```

Or use the helper script:

```bash
docker exec -it iosgods-db /scripts/init-db.sh
```

### 5. Seed sample data

```bash
docker exec -it iosgods-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'YourStrong@Password123' -d IOSGodsDB -i /scripts/seed-data.sql
```

## Database Connection

- **Host**: `localhost` (from host machine) or `db` (from Docker network)
- **Port**: `1433`
- **Database**: `IOSGodsDB`
- **User**: `sa`
- **Password**: `YourStrong@Password123`

## Sample Users (after seeding)

1. **Admin User**
   - Email: `admin@iosgods.com`
   - Password: `admin123`
   - Privileges: Admin + VIP

2. **VIP User**
   - Email: `vip@test.com`
   - Password: `test123`
   - Privileges: VIP (1 month)

3. **Regular User**
   - Email: `user@test.com`
   - Password: `test123`
   - Privileges: None

⚠️ **Note**: You'll need to update the password hashes in `scripts/seed-data.sql` with actual bcrypt hashes.

## Environment Variables

You can customize environment variables by creating a `.env` file:

```bash
# Copy example env
cp .env.example .env

# Edit the .env file with your values
```

Relevant variables for Docker:
- `API_KEY` - Your IOSGods API key
- `DOWNLOAD_TOKEN` - Your download token
- `JWT_SECRET` - Secret for JWT tokens

## Useful Commands

### Stop all services
```bash
docker-compose down
```

### Stop and remove volumes (⚠️ will delete all data)
```bash
docker-compose down -v
```

### Restart a specific service
```bash
docker-compose restart backend
docker-compose restart db
```

### Rebuild services
```bash
docker-compose up -d --build
```

### Access backend container shell
```bash
docker exec -it iosgods-backend sh
```

### Access database container shell
```bash
docker exec -it iosgods-db /bin/bash
```

### Connect to MSSQL from container
```bash
docker exec -it iosgods-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'YourStrong@Password123' -d IOSGodsDB
```

## Migrations

All SQL migration files in the `migrations/` folder are automatically available in the container at `/docker-entrypoint-initdb.d/`.

To run migrations in order:

```bash
docker exec -it iosgods-db bash -c "cd /docker-entrypoint-initdb.d && for f in *.sql; do /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'YourStrong@Password123' -d IOSGodsDB -i \$f; done"
```

## Troubleshooting

### Backend can't connect to database

1. Check if database is healthy:
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   docker-compose logs db
   ```

3. Verify database is accepting connections:
   ```bash
   docker exec -it iosgods-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'YourStrong@Password123' -Q "SELECT 1"
   ```

### Port already in use

If port 3000 or 1433 is already in use, modify the port mappings in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Use port 3001 on host instead
```

### Permission denied errors

Make sure the init script is executable:
```bash
chmod +x scripts/init-db.sh
```

## Production Considerations

⚠️ **Before deploying to production:**

1. Change `SA_PASSWORD` to a strong password
2. Update `JWT_SECRET` with a secure random string
3. Set `NODE_ENV=production`
4. Use proper SSL certificates
5. Update MoMo credentials with production keys
6. Implement proper backup strategy for the database
7. Use Docker secrets for sensitive data

## Data Persistence

Database data is persisted in a Docker volume named `mssql_data`. This means:
- Data survives container restarts
- Data is deleted only when you run `docker-compose down -v`

To backup the database:
```bash
# Create backup directory
mkdir -p backups

# Backup database
docker exec -it iosgods-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'YourStrong@Password123' -Q "BACKUP DATABASE IOSGodsDB TO DISK = '/var/opt/mssql/backup/IOSGodsDB.bak'"

# Copy backup to host
docker cp iosgods-db:/var/opt/mssql/backup/IOSGodsDB.bak ./backups/
```
