// ============================================
// AngelGotchi Scoreboard API — No Auth
// Simple name + score storage on Render
// ============================================
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Setup CORS
app.use(cors({
    origin: '*', // Allow all origins for now as we transition
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Log all incoming requests to help debug
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.get('Origin')}`);
    next();
});

// ============================================
// In-memory scoreboard (resets on dyno restart)
// ============================================
let scoreboard = [];
// Each entry: { username: string, steps: number, timestamp: string }

// ============================================
// Routes
// ============================================

// POST /api/score — Submit a score (no auth needed)
// Body: { username: "displayName", steps: 1234 }
app.post('/api/score', (req, res) => {
    const { username, steps } = req.body;

    // Validate
    if (!username || typeof username !== 'string' || username.trim().length < 1) {
        return res.status(400).json({ error: 'Username is required (1+ characters)' });
    }
    if (username.trim().length > 20) {
        return res.status(400).json({ error: 'Username must be 20 characters or fewer' });
    }
    if (!steps || typeof steps !== 'number' || steps < 1) {
        return res.status(400).json({ error: 'Steps must be a positive number' });
    }

    const cleanName = username.trim();
    const entry = {
        username: cleanName,
        steps: steps,
        timestamp: new Date().toISOString()
    };

    scoreboard.push(entry);
    console.log(`Score submitted: ${cleanName} — ${steps} steps`);

    res.json({ success: true, entry });
});

// GET /api/leaderboard — Get aggregated leaderboard
// Returns top scores grouped by username (sum of all their submissions)
app.get('/api/leaderboard', (req, res) => {
    // Aggregate steps per username
    const totals = {};
    scoreboard.forEach(entry => {
        if (!totals[entry.username]) {
            totals[entry.username] = 0;
        }
        totals[entry.username] += entry.steps;
    });

    // Convert to sorted array
    const users = Object.entries(totals)
        .map(([username, totalSteps]) => ({ username, totalSteps }))
        .sort((a, b) => b.totalSteps - a.totalSteps);

    res.json({ users });
});

// GET /api/scores — Get raw score history (most recent first)
app.get('/api/scores', (req, res) => {
    const recent = [...scoreboard].reverse().slice(0, 50);
    res.json({ scores: recent, total: scoreboard.length });
});

// GET /api/health — Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        totalScores: scoreboard.length
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`AngelGotchi Scoreboard API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
