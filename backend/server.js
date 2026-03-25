// ============================================
// AngelGotchi API — Users, Scavenger Hunt, Scores
// JSON-file storage for ~15 users on Render
// ============================================
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Security: invite code (set in Render env vars)
// Only people with this code can register
// ============================================
const INVITE_CODE = process.env.INVITE_CODE || 'angel2026';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'adminangel2026';

// ============================================
// Paths
// ============================================
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure dirs exist
[DATA_DIR, UPLOADS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ============================================
// Multer — file upload config
// ============================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safe = `${req.body.username}_${Date.now()}${ext}`;
        cb(null, safe);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter: (req, file, cb) => {
        const allowedExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const allowedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExt.includes(ext) && allowedMime.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only image files (jpg, png, gif, webp) are allowed'));
    }
});

// ============================================
// Simple JSON Database
// ============================================
const SCAVENGER_ITEMS = [
    // ---- COMMON (5 pts) — easy to find ----
    { id: 'dandelion',       name: '🌼 Dandelion',              points: 5 },
    { id: 'ant_colony',      name: '🐜 Ant Colony',             points: 5 },
    { id: 'pinecone',        name: '🌲 Pinecone',               points: 5 },
    { id: 'fallen_leaf',     name: '🍂 Colorful Fallen Leaf',   points: 5 },
    { id: 'cloud_shape',     name: '☁️ Cool Cloud Shape',        points: 5 },

    // ---- UNCOMMON (10 pts) — requires some looking ----
    { id: 'fern',            name: '🌿 Fern',                   points: 10 },
    { id: 'white_oak',       name: '🌳 White Oak Tree',         points: 10 },
    { id: 'mushroom',        name: '🍄 Wild Mushroom',          points: 10 },
    { id: 'spider_web',      name: '🕸️ Spider Web',             points: 10 },
    { id: 'moss',            name: '🪨 Moss on a Rock',         points: 10 },
    { id: 'beetle',          name: '🪲 Beetle',                 points: 10 },
    { id: 'feather',         name: '🪶 Bird Feather',           points: 10 },
    { id: 'creek',           name: '💧 Creek or Stream',        points: 10 },

    // ---- RARE (20 pts) — harder to spot ----
    { id: 'monarch',         name: '🦋 Monarch Butterfly',      points: 20 },
    { id: 'ladybug',         name: '🐞 Ladybug',                points: 20 },
    { id: 'potato_bug',      name: '🐛 Potato Bug (Roly-Poly)', points: 20 },
    { id: 'frog',            name: '🐸 Frog or Toad',           points: 20 },
    { id: 'caterpillar',     name: '🐛 Caterpillar',            points: 20 },
    { id: 'animal_tracks',   name: '🐾 Animal Tracks',          points: 20 },
    { id: 'poison_ivy',      name: '☠️ Poison Ivy (DON\'T TOUCH!)', points: 20 },
    { id: 'sunset',          name: '🌅 Sunset or Sunrise',      points: 20 },

    // ---- EPIC (35 pts) — takes patience or luck ----
    { id: 'hummingbird',     name: '🐦 Hummingbird',            points: 35 },
    { id: 'praying_mantis',  name: '🦗 Praying Mantis',         points: 35 },
    { id: 'bee_on_flower',   name: '🐝 Bee on a Flower',        points: 35 },
    { id: 'hawk',            name: '🦅 Hawk or Eagle',          points: 35 },
    { id: 'deer',            name: '🦌 Deer',                   points: 35 },
    { id: 'night_sky',       name: '🌙 Night Sky with Stars',   points: 35 },

    // ---- LEGENDARY (50 pts) — extremely rare ----
    { id: 'owl',             name: '🦉 Owl',                    points: 50 },
    { id: 'snake',           name: '🐍 Snake',                  points: 50 },
    { id: 'fox_coyote',      name: '🦊 Fox or Coyote',          points: 50 },
    { id: 'rainbow',         name: '🌈 Rainbow',                points: 50 },
    { id: 'bonus_rare',      name: '✨ Mystery Bonus Find',     points: 50 }
];

function defaultDB() {
    return { users: {}, scoreboard: [] };
}

function loadDB() {
    try {
        if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) { console.error('DB read error, resetting:', e.message); }
    return defaultDB();
}

function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Initialise DB on first run
if (!fs.existsSync(DB_FILE)) saveDB(defaultDB());

// ============================================
// Middleware
// ============================================
const ALLOWED_ORIGINS = [
    'https://1333covenant.com',
    'https://www.1333covenant.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

app.use(cors({
    origin: (origin, cb) => {
        // Allow requests with no origin (curl, server-to-server, mobile)
        if (!origin || ALLOWED_ORIGINS.includes(origin)) cb(null, true);
        else cb(new Error('CORS blocked'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token']
}));

app.use(express.json({ limit: '1mb' }));

// Rate limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 15,                   // 15 attempts per window
    message: { error: 'Too many attempts — try again in 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false
});

const uploadLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 min
    max: 10,                   // 10 uploads per window
    message: { error: 'Upload limit reached — try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

const scoreLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,  // 5 min
    max: 10,                   // 10 score submissions per window
    message: { error: 'Too many score submissions — slow down' },
    standardHeaders: true,
    legacyHeaders: false
});

// Serve uploaded images
app.use('/uploads', express.static(UPLOADS_DIR));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ============================================
// Auth helpers (simple token = hash of user+pass)
// ============================================
function hashPassword(pass) {
    // Salt with a fixed app secret — sufficient for 15-user hobby project
    const salt = process.env.PASS_SALT || 'angelgotchi_1333';
    return crypto.createHash('sha256').update(salt + pass).digest('hex');
}

function makeToken(username, passHash) {
    return crypto.createHash('sha256').update(username + ':' + passHash).digest('hex');
}

function authenticate(req, res) {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) { res.status(401).json({ error: 'Not logged in' }); return null; }
    const db = loadDB();
    const user = Object.values(db.users).find(u => makeToken(u.username, u.passHash) === token);
    if (!user) { res.status(401).json({ error: 'Invalid session' }); return null; }
    return user;
}

// ============================================
// Routes — Auth
// ============================================

// POST /api/register  { username, password, inviteCode }
app.post('/api/register', authLimiter, (req, res) => {
    const { username, password, inviteCode } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    // Invite code gate — prevents random signups
    if (!inviteCode || inviteCode.trim() !== INVITE_CODE) {
        return res.status(403).json({ error: 'Invalid invite code' });
    }

    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean.length < 2 || clean.length > 20) return res.status(400).json({ error: 'Username must be 2-20 alphanumeric characters' });
    if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

    const db = loadDB();
    if (db.users[clean]) return res.status(409).json({ error: 'Username already taken' });
    if (Object.keys(db.users).length >= 20) return res.status(403).json({ error: 'Max users reached' });

    const passHash = hashPassword(password);
    db.users[clean] = {
        username: clean,
        passHash,
        displayName: username.trim().slice(0, 20),
        createdAt: new Date().toISOString(),
        totalSteps: 0,
        stepRecords: [],
        huntSubmissions: [],
        huntScore: 0
    };
    saveDB(db);

    const token = makeToken(clean, passHash);
    res.json({ success: true, token, username: clean, displayName: db.users[clean].displayName });
});

// POST /api/login  { username, password }
app.post('/api/login', authLimiter, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const db = loadDB();
    const user = db.users[clean];
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (user.passHash !== hashPassword(password)) return res.status(401).json({ error: 'Wrong password' });

    const token = makeToken(clean, user.passHash);
    res.json({ success: true, token, username: clean, displayName: user.displayName });
});

// ============================================
// Routes — Profile
// ============================================

// GET /api/profile/:username
app.get('/api/profile/:username', (req, res) => {
    const db = loadDB();
    const user = db.users[req.params.username.toLowerCase()];
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
        username: user.username,
        displayName: user.displayName,
        totalSteps: user.totalSteps,
        huntScore: user.huntScore,
        overallScore: user.totalSteps + (user.huntScore * 100),
        huntSubmissions: user.huntSubmissions.map(s => ({
            itemId: s.itemId,
            itemName: s.itemName,
            points: s.points,
            status: s.status,
            photo: s.photo,
            submittedAt: s.submittedAt
        })),
        stepRecords: user.stepRecords.slice(-10),
        createdAt: user.createdAt
    });
});

// ============================================
// Routes — Steps (existing flow, now persisted)
// ============================================

// POST /api/score  { username, steps }  (legacy compat + new auth)
app.post('/api/score', scoreLimiter, (req, res) => {
    const { username, steps } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 1)
        return res.status(400).json({ error: 'Username is required' });
    if (!steps || typeof steps !== 'number' || steps < 1 || steps > 100000)
        return res.status(400).json({ error: 'Steps must be 1-100,000' });

    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const db = loadDB();

    // Create user on-the-fly if they don't exist (backward compat)
    if (!db.users[clean]) {
        db.users[clean] = {
            username: clean,
            passHash: '',
            displayName: username.trim().slice(0, 20),
            createdAt: new Date().toISOString(),
            totalSteps: 0,
            stepRecords: [],
            huntSubmissions: [],
            huntScore: 0
        };
    }

    const record = { steps, timestamp: new Date().toISOString() };
    db.users[clean].stepRecords.push(record);
    db.users[clean].totalSteps += steps;

    db.scoreboard.push({ username: clean, steps, timestamp: record.timestamp });
    saveDB(db);

    res.json({ success: true, totalSteps: db.users[clean].totalSteps });
});

// GET /api/leaderboard — combined score (steps + hunt)
app.get('/api/leaderboard', (req, res) => {
    const db = loadDB();
    const users = Object.values(db.users)
        .map(u => ({
            username: u.username,
            displayName: u.displayName,
            totalSteps: u.totalSteps,
            huntScore: u.huntScore,
            overallScore: u.totalSteps + (u.huntScore * 100)
        }))
        .sort((a, b) => b.overallScore - a.overallScore);

    res.json({ users });
});

// ============================================
// Routes — Scavenger Hunt
// ============================================

// GET /api/hunt/items — list all hunt items
app.get('/api/hunt/items', (req, res) => {
    res.json({ items: SCAVENGER_ITEMS });
});

// POST /api/hunt/submit — upload a photo for a hunt item
app.post('/api/hunt/submit', uploadLimiter, upload.single('photo'), (req, res) => {
    const user = authenticate(req, res);
    if (!user) {
        // Clean up uploaded file if auth fails
        if (req.file) fs.unlink(req.file.path, () => {});
        return;
    }

    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });

    const item = SCAVENGER_ITEMS.find(i => i.id === itemId);
    if (!item) return res.status(400).json({ error: 'Invalid hunt item' });

    if (!req.file) return res.status(400).json({ error: 'Photo is required' });

    // Check if already submitted this item
    const existing = user.huntSubmissions.find(s => s.itemId === itemId);
    if (existing) return res.status(409).json({ error: `You already submitted "${item.name}"` });

    const db = loadDB();
    const submission = {
        itemId: item.id,
        itemName: item.name,
        points: item.points,
        photo: `/uploads/${req.file.filename}`,
        status: 'pending',
        submittedAt: new Date().toISOString()
    };

    db.users[user.username].huntSubmissions.push(submission);
    // Points NOT awarded yet — admin must approve first
    saveDB(db);

    res.json({ success: true, submission, message: 'Photo submitted! Waiting for admin approval.' });
});

// GET /api/hunt/gallery — all approved submissions
app.get('/api/hunt/gallery', (req, res) => {
    const db = loadDB();
    const gallery = [];
    Object.values(db.users).forEach(u => {
        u.huntSubmissions
            .filter(s => s.status === 'approved')
            .forEach(s => gallery.push({
                username: u.displayName,
                itemId: s.itemId,
                itemName: s.itemName,
                points: s.points,
                photo: s.photo,
                submittedAt: s.submittedAt
            }));
    });
    gallery.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    res.json({ gallery });
});

// ============================================
// Routes — Utility
// ============================================

// ============================================
// Admin endpoints
// ============================================
function adminAuth(req, res) {
    const token = (req.headers['x-admin-token'] || '').trim();
    if (!token || token !== ADMIN_TOKEN) {
        res.status(403).json({ error: 'Unauthorized' });
        return false;
    }
    return true;
}

// GET /api/admin/submissions — list all pending submissions
app.get('/api/admin/submissions', (req, res) => {
    if (!adminAuth(req, res)) return;
    const db = loadDB();
    const pending = [];
    Object.entries(db.users).forEach(([username, u]) => {
        u.huntSubmissions.forEach((s, index) => {
            if (s.status === 'pending') {
                pending.push({
                    username,
                    displayName: u.displayName,
                    index,
                    ...s
                });
            }
        });
    });
    pending.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    res.json({ submissions: pending });
});

// POST /api/admin/approve — approve a submission
app.post('/api/admin/approve', (req, res) => {
    if (!adminAuth(req, res)) return;
    const { username, index } = req.body;
    if (!username || index === undefined) return res.status(400).json({ error: 'username and index required' });

    const db = loadDB();
    const user = db.users[username];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const sub = user.huntSubmissions[index];
    if (!sub) return res.status(404).json({ error: 'Submission not found' });
    if (sub.status !== 'pending') return res.status(400).json({ error: `Already ${sub.status}` });

    sub.status = 'approved';
    user.huntScore += sub.points;
    saveDB(db);

    res.json({ success: true, message: `Approved ${sub.itemName} from ${user.displayName} (+${sub.points} pts)` });
});

// POST /api/admin/reject — reject a submission
app.post('/api/admin/reject', (req, res) => {
    if (!adminAuth(req, res)) return;
    const { username, index } = req.body;
    if (!username || index === undefined) return res.status(400).json({ error: 'username and index required' });

    const db = loadDB();
    const user = db.users[username];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const sub = user.huntSubmissions[index];
    if (!sub) return res.status(404).json({ error: 'Submission not found' });
    if (sub.status !== 'pending') return res.status(400).json({ error: `Already ${sub.status}` });

    // Remove the photo file
    const photoPath = path.join(__dirname, sub.photo);
    if (fs.existsSync(photoPath)) fs.unlink(photoPath, () => {});

    sub.status = 'rejected';
    saveDB(db);

    res.json({ success: true, message: `Rejected ${sub.itemName} from ${user.displayName}` });
});

app.get('/api/scores', (req, res) => {
    const db = loadDB();
    const recent = [...db.scoreboard].reverse().slice(0, 50);
    res.json({ scores: recent, total: db.scoreboard.length });
});

app.get('/api/health', (req, res) => {
    const db = loadDB();
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        totalUsers: Object.keys(db.users).length,
        totalScores: db.scoreboard.length,
        huntItems: SCAVENGER_ITEMS.length
    });
});

// Error handling
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
    }
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`AngelGotchi API running on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;
