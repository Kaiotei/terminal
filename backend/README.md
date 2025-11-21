# AngelGotchi Backend API

## Overview
Node.js/Express backend for the AngelGotchi Step Monitor with SQLite database.

## Features
- User registration and authentication
- JWT token-based security
- Step tracking and storage
- Leaderboard generation
- CORS enabled for frontend integration

## Setup

### Local Development
1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Create `.env` file:
   ```
   PORT=3000
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

3. Start the server:
   ```bash
   npm run dev  # Development mode with nodemon
   # or
   npm start    # Production mode
   ```

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user

### Protected Routes (require JWT token)
- `GET /api/user` - Get user data and step records
- `POST /api/steps` - Save step record
- `GET /api/users` - Get all users (admin)

### Public Routes
- `GET /api/leaderboard` - Get top 10 leaderboard
- `GET /api/health` - Health check

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Step Records Table
```sql
CREATE TABLE step_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    steps INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## Deployment on Render

### 1. Create Render Account
Go to [render.com](https://render.com) and create an account.

### 2. Connect Repository
- Push this backend code to GitHub
- Connect your GitHub repo to Render

### 3. Create Web Service
- Choose "Web Service"
- Select your repository
- Configure build settings:
  - **Runtime**: Node.js
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`

### 4. Environment Variables
Add these environment variables in Render:
- `JWT_SECRET`: A long random string for JWT signing
- `NODE_ENV`: `production`

### 5. Database
SQLite will create a local database file. For production, consider upgrading to PostgreSQL on Render.

## Security Notes
- Change the JWT_SECRET in production
- Passwords are hashed with bcrypt
- CORS is enabled for all origins (restrict in production)
- Consider rate limiting for production use

## Testing the API

### Register a user:
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### Login:
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### Get leaderboard:
```bash
curl http://localhost:3000/api/leaderboard
```