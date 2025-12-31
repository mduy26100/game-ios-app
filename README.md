# IOSGods API Scraper to MSSQL

A Node.js application that scrapes game data from the IOSGods API and stores it in a Microsoft SQL Server database.

## Features

- Fetches game data from IOSGods API (pages 1-100)
- Stores data in MSSQL Server with automatic database/table creation
- **Generates download URLs with authentication token for each game**
- Handles duplicates intelligently (updates existing records)
- Retry logic with exponential backoff for failed API requests
- Rate limiting to avoid overwhelming the API
- Progress tracking and detailed statistics
- Error handling and logging

## Prerequisites

- Node.js (v14 or higher)
- Microsoft SQL Server (local or remote)
- SQL Server credentials with database creation permissions

## Installation

1. Clone or download this project

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env`:
```env
DB_USER=sa
DB_PASSWORD=Abcd@123
DB_SERVER=localhost
DB_DATABASE=iosgods_data
DB_PORT=1433
```

## Usage

### Run the scraper:
```bash
npm start
```

### Test database connection:
```bash
npm run test:db
```

### Test API fetching:
```bash
npm run test:api
```

## Project Structure

```
game/
├── src/
│   ├── config/
│   │   └── database.js       # Database configuration and setup
│   ├── services/
│   │   ├── apiService.js     # API fetching logic
│   │   └── databaseService.js # Database operations
│   └── index.js              # Main entry point
├── .env                      # Environment configuration
├── package.json
└── README.md
```

## Database Schema

The scraper creates a `games` table with the following structure:

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Game ID from API |
| title | NVARCHAR(500) | Game title |
| icon_100 | NVARCHAR(1000) | Icon URL |
| group_name | NVARCHAR(50) | Group (free/vip) |
| description | NVARCHAR(MAX) | Full description |
| type | NVARCHAR(50) | Content type |
| updated_at | DATETIME2 | Last update from API |
| short_description | NVARCHAR(MAX) | Short description |
| slug | NVARCHAR(500) | URL slug |
| created_at | DATETIME2 | Record creation time |
| last_synced_at | DATETIME2 | Last sync time |

## Configuration

All configuration is done via environment variables in `.env`:

- `DB_USER`, `DB_PASSWORD` - Database credentials
- `DB_SERVER` - Database server address
- `DB_DATABASE` - Database name
- `START_PAGE`, `END_PAGE` - Page range to scrape (default: 1-100)
- `REQUEST_DELAY_MS` - Delay between API requests (default: 500ms)
- `MAX_RETRIES` - Maximum retry attempts for failed requests (default: 3)

## Error Handling

- API failures are retried up to 3 times with exponential backoff
- Invalid game records are skipped with warnings
- Database errors are logged but don't stop the entire process
- Progress is tracked so you can resume if interrupted

## License

ISC
# game-ios-app
