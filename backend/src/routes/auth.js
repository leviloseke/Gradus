import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { requireAuth, signToken, cookieOptions } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id, username, email, created_at`,
      [username.trim(), email.trim().toLowerCase(), hash]
    );
    res.cookie('token', signToken(rows[0].id), cookieOptions);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Username or email already taken' });
    }
    throw e;
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const { rows } = await query(
    `SELECT id, username, email, password_hash FROM users
      WHERE username = $1 OR email = lower($1)`,
    [username?.trim() || '']
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.cookie('token', signToken(user.id), cookieOptions);
  res.json({ id: user.id, username: user.username, email: user.email });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', { ...cookieOptions, maxAge: 0 });
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query(
    'SELECT id, username, email, created_at FROM users WHERE id = $1',
    [req.userId]
  );
  if (!rows[0]) return res.status(401).json({ error: 'Not authenticated' });
  res.json(rows[0]);
});

export default router;
