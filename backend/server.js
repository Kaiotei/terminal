const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database('./angelgotchi.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS step_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            steps INTEGER NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);
}

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Routes

// Register new user
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    if (username.length < 3 || password.length < 4) {
        return res.status(400).json({ error: 'Username must be at least 3 characters, password at least 4 characters' });
    }

    try {
        // Check if user already exists
        db.get('SELECT id FROM users WHERE username = ?', [username], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (row) {
                return res.status(409).json({ error: 'Username already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user
            db.run('INSERT INTO users (username, password) VALUES (?, ?)',
                [username, hashedPassword], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Error creating user' });
                }

                const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET);
                res.status(201).json({
                    message: 'User created successfully',
                    token,
                    user: { id: this.lastID, username }
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login user
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    db.get('SELECT id, username, password FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username }
        });
    });
});

// Get user data (protected route)
app.get('/api/user', authenticateToken, (req, res) => {
    const userId = req.user.id;

    // Get user records
    db.all(`
        SELECT steps, timestamp
        FROM step_records
        WHERE user_id = ?
        ORDER BY timestamp DESC
    `, [userId], (err, records) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        // Calculate total steps
        const totalSteps = records.reduce((sum, record) => sum + record.steps, 0);

        res.json({
            username: req.user.username,
            records: records,
            totalSteps: totalSteps
        });
    });
});

// Save step record (protected route)
app.post('/api/steps', authenticateToken, (req, res) => {
    const { steps } = req.body;
    const userId = req.user.id;

    if (!steps || steps <= 0) {
        return res.status(400).json({ error: 'Valid step count required' });
    }

    db.run('INSERT INTO step_records (user_id, steps) VALUES (?, ?)',
        [userId, steps], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Error saving steps' });
        }

        res.json({
            message: 'Steps recorded successfully',
            recordId: this.lastID
        });
    });
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
    db.all(`
        SELECT
            u.username,
            SUM(sr.steps) as totalSteps
        FROM users u
        LEFT JOIN step_records sr ON u.id = sr.user_id
        GROUP BY u.id, u.username
        ORDER BY totalSteps DESC
        LIMIT 10
    `, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        // Filter out users with 0 steps and ensure we have valid data
        const leaderboard = rows
            .filter(row => row.totalSteps > 0)
            .map(row => ({
                username: row.username,
                totalSteps: row.totalSteps
            }));

        res.json({
            users: leaderboard,
            lastUpdated: new Date().toISOString()
        });
    });
});

// Get all users (for admin purposes)
app.get('/api/users', authenticateToken, (req, res) => {
    db.all(`
        SELECT id, username, created_at
        FROM users
        ORDER BY created_at DESC
    `, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({ users: rows });
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`AngelGotchi API server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;