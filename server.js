// server.js

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cron = require('node-cron');
const { Expo } = require('expo-server-sdk');

const app = express();
app.use(express.json());
app.use(cors());

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  JWT_SECRET,
  PORT,
} = process.env;

if (
  !DB_HOST ||
  !DB_USER ||
  DB_PASSWORD === undefined ||
  !DB_NAME ||
  !JWT_SECRET ||
  !PORT
) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// ─── SETUP EXPO PUSH SDK ────────────────────────────────────────────────────
const expo = new Expo();

// ─── MULTER SETUP FOR PROFILE PICTURES ───────────────────────────────────────
const uploadDir = path.join(__dirname, 'uploads', 'profile');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `user_${req.user.id}${ext}`);
  },
});
const upload = multer({ storage });

// ─── MYSQL POOL ──────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT || 3306,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// ─── JWT AUTH MIDDLEWARE ────────────────────────────────────────────────────
async function authenticateToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ message: 'No token provided' });
  const token = auth.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Malformed token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.id };
    next();
  } catch {
    res.status(403).json({ message: 'Invalid or expired token' });
  }
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

// Register
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: 'Name, email, password required.' });
  }
  try {
    const [exists] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    if (exists.length) {
      return res.status(409).json({ message: 'Email already registered.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), email.toLowerCase(), hash]
    );
    res
      .status(201)
      .json({ message: 'User registered.', userId: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: 'Email & password required.' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT id, password_hash FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    if (!rows.length) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: '24h',
    });
    res.json({ message: 'Logged in successfully.', token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─── PROFILE PICTURE & PUSH TOKEN ROUTES ───────────────────────────────────────

// Get current profile picture + push token
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT profile_picture, expo_push_token FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({
      profile_picture: rows[0]?.profile_picture || null,
      expo_push_token: rows[0]?.expo_push_token || null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Upload new profile picture
app.post(
  '/api/profile/picture',
  authenticateToken,
  upload.single('profile_picture'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    const relPath = `/uploads/profile/${req.file.filename}`;
    try {
      await pool.query(
        'UPDATE users SET profile_picture = ? WHERE id = ?',
        [relPath, req.user.id]
      );
      res.json({ profile_picture: relPath });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// Register/Update Expo Push Token
app.post('/api/profile/push-token', authenticateToken, async (req, res) => {
  const { expo_push_token } = req.body;
  if (!expo_push_token || !Expo.isExpoPushToken(expo_push_token)) {
    return res.status(400).json({ message: 'Invalid Expo push token.' });
  }
  try {
    await pool.query(
      'UPDATE users SET expo_push_token = ? WHERE id = ?',
      [expo_push_token, req.user.id]
    );
    res.json({ message: 'Push token registered.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Serve uploaded profile images
app.use(
  '/uploads/profile',
  express.static(path.join(__dirname, 'uploads', 'profile'))
);

// ─── TASK ROUTES ──────────────────────────────────────────────────────────────

// GET all tasks
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, text, category, priority,
              due_date, due_time, notes, completed,
              created_at, updated_at
       FROM tasks
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST new task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  const { text, category, priority, due_date, due_time, notes = null, completed = 0 } =
    req.body;
  if (!text || !category || !priority || !due_date || !due_time) {
    return res.status(400).json({ message: 'Required fields missing.' });
  }
  try {
    const [r] = await pool.query(
      `INSERT INTO tasks
         (user_id, text, category, priority, due_date, due_time, notes, completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, text.trim(), category, priority, due_date, due_time, notes?.trim() || null, completed]
    );
    await pool.query(
      `INSERT INTO history (user_id, action, text)
       VALUES (?, 'added', ?)`,
      [req.user.id, `${text.trim()} (Cat:${category}, Prio:${priority})`]
    );
    res.status(201).json({ message: 'Task added.', taskId: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH existing task (partial update, including mark-as-done)
app.patch('/api/tasks/:id', authenticateToken, async (req, res) => {
  const allowed = [
    'text',
    'category',
    'priority',
    'due_date',
    'due_time',
    'notes',
    'completed',
  ];
  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      sets.push(`${key} = ?`);
      params.push(req.body[key]);
    }
  }
  if (!sets.length) {
    return res.status(400).json({ message: 'No valid fields to update.' });
  }
  params.push(req.params.id, req.user.id);

  try {
    // Get original for history
    const [origRows] = await pool.query(
      'SELECT text, completed FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!origRows.length) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    const orig = origRows[0];

    // Apply partial update
    await pool.query(
      `UPDATE tasks SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    // Log edits
    if (req.body.text && req.body.text !== orig.text) {
      await pool.query(
        `INSERT INTO history (user_id, action, text) VALUES (?, 'edited', ?)`,
        [req.user.id, `${orig.text} → ${req.body.text}`]
      );
    }
    // Log completion
    if (req.body.completed === 1 || req.body.completed === true) {
      if (!orig.completed) {
        await pool.query(
          `INSERT INTO history (user_id, action, text) VALUES (?, 'completed', ?)`,
          [req.user.id, orig.text]
        );
      }
    }

    res.json({ message: 'Task updated.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT existing task (full update)
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  const { text, category, priority, due_date, due_time, notes = null, completed = 0 } =
    req.body;
  if (!text || !category || !priority || !due_date || !due_time) {
    return res.status(400).json({ message: 'Required fields missing.' });
  }
  try {
    const [orig] = await pool.query(
      'SELECT text FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!orig.length) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    await pool.query(
      `UPDATE tasks
         SET text = ?, category = ?, priority = ?, due_date = ?,
             due_time = ?, notes = ?, completed = ?
       WHERE id = ? AND user_id = ?`,
      [text.trim(), category, priority, due_date, due_time, notes?.trim() || null, completed, req.params.id, req.user.id]
    );
    await pool.query(
      `INSERT INTO history (user_id, action, text)
       VALUES (?, 'edited', ?)`,
      [req.user.id, `${orig[0].text} → ${text.trim()}`]
    );
    res.json({ message: 'Task updated.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE a task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT text FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    await pool.query(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    await pool.query(
      `INSERT INTO history (user_id, action, text) VALUES (?, 'deleted', ?)`,
      [req.user.id, rows[0].text]
    );
    res.json({ message: 'Task deleted.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─── HISTORY ROUTES ─────────────────────────────────────────────────────────

// GET history entries
app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, action, text, date
       FROM history
       WHERE user_id = ?
       ORDER BY date DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE single history entry
app.delete('/api/history/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id FROM history WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'Not found.' });
    }
    await pool.query(
      'DELETE FROM history WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Entry deleted.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE all history
app.delete('/api/history', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM history WHERE user_id = ?', [
      req.user.id,
    ]);
    res.json({ message: 'All history cleared.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─── CRON JOB PARA SA PUSH NOTIFICATIONS ──────────────────────────────────
//
// Tumakbo tuwing bawat minuto at titingnan kung may task na due in 5 minutes.
// Kapag may nakita, kukunin ang user’s expo_push_token at ipapadala ang push.

cron.schedule(
  '* * * * *',
  async () => {
    try {
      const now = new Date();
      const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000);

      const year = fiveMinLater.getFullYear();
      const month = String(fiveMinLater.getMonth() + 1).padStart(2, '0');
      const day = String(fiveMinLater.getDate()).padStart(2, '0');
      const hours = String(fiveMinLater.getHours()).padStart(2, '0');
      const mins = String(fiveMinLater.getMinutes()).padStart(2, '0');
      const secs = String(fiveMinLater.getSeconds()).padStart(2, '0');

      const dueDate = `${year}-${month}-${day}`; // ex: "2025-05-27"
      const dueTime = `${hours}:${mins}:${secs}`; // ex: "10:06:00"

      // Gawing window ng 60 segundos (minutos +/- 1 min)
      const prevMin = String(fiveMinLater.getMinutes() - 1).padStart(2, '0');
      const windowStart = `${hours}:${prevMin}:${secs}`; // fiveMinLater - 1 min
      const windowEnd = `${hours}:${mins}:${secs}`; // exactly fiveMinLater

      const [rows] = await pool.query(
        `
        SELECT t.id, t.text, t.user_id, u.expo_push_token
        FROM tasks AS t
        JOIN users AS u ON u.id = t.user_id
        WHERE t.completed = 0
          AND t.due_date = ?
          AND TIME(t.due_time) BETWEEN TIME(?) AND TIME(?)
          AND u.expo_push_token IS NOT NULL
        `,
        [dueDate, windowStart, windowEnd]
      );

      const messages = [];
      for (const task of rows) {
        const pushToken = task.expo_push_token;
        if (!Expo.isExpoPushToken(pushToken)) {
          continue;
        }
        messages.push({
          to: pushToken,
          sound: 'default',
          title: 'Reminder: 5 Minutes Left',
          body: `"${task.text}" ay due in 5 minutes.`,
          data: { taskId: task.id },
        });
      }

      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (err) {
          console.error('Error sending notification chunk:', err);
        }
      }
    } catch (err) {
      console.error('Cron job error:', err);
    }
  },
  {
    timezone: 'Asia/Manila',
  }
);

// ─── 404 HANDLER ───────────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ message: 'Route not found.' }));

// ─── START SERVER ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
