import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

const COLORS = ['#6366f1', '#ec4899'];

// Household is exactly two people. Setup is only available while fewer than 2 accounts exist.
router.get('/setup-status', (req, res) => {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM users').get();
  res.json({ needsSetup: count < 2, existingCount: count });
});

router.post('/setup', async (req, res) => {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (count >= 2) {
    return res.status(400).json({ error: 'Setup already complete. This app is for two people only.' });
  }

  const { users } = req.body;
  if (!Array.isArray(users) || users.length !== 2) {
    return res.status(400).json({ error: 'Provide exactly two people to set up the household.' });
  }
  for (const u of users) {
    if (!u.name || !u.email || !u.password || u.password.length < 6) {
      return res.status(400).json({ error: 'Each person needs a name, email, and password (6+ chars).' });
    }
  }
  if (users[0].email.toLowerCase() === users[1].email.toLowerCase()) {
    return res.status(400).json({ error: 'The two accounts need different emails.' });
  }

  const insert = db.prepare(
    'INSERT INTO users (name, email, password_hash, color) VALUES (?, ?, ?, ?)'
  );
  const created = [];
  const tx = db.transaction(() => {
    users.forEach((u, i) => {
      const hash = bcrypt.hashSync(u.password, 10);
      const info = insert.run(u.name.trim(), u.email.trim().toLowerCase(), hash, COLORS[i]);
      created.push({ id: info.lastInsertRowid, name: u.name.trim(), email: u.email.trim().toLowerCase() });
    });
  });
  tx();

  res.json({ ok: true, users: created });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, color: user.color },
  });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, color FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const partner = db
    .prepare('SELECT id, name, email, color FROM users WHERE id != ?')
    .get(req.user.id);
  res.json({ user, partner: partner || null });
});

export default router;
