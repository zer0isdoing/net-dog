import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { authenticateToken, auditLog } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/security.js';
import { validateUsername, validatePassword } from '../middleware/validation.js';

const router = express.Router();
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000;

router.post('/login', authRateLimiter, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const sanitizedUsername = validateUsername(username);
    
    const result = await client.query(
      'SELECT * FROM users WHERE username = $1',
      [sanitizedUsername]
    );

    if (result.rows.length === 0) {
      await auditLog(null, 'LOGIN_FAILED', 'users', null, { username: sanitizedUsername, reason: 'user_not_found' }, req.ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: 'Account temporarily locked. Try again later.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      const failedAttempts = user.failed_login_attempts + 1;
      const lockUntil = failedAttempts >= MAX_FAILED_ATTEMPTS 
        ? new Date(Date.now() + LOCK_TIME) 
        : null;

      await client.query(
        'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
        [failedAttempts, lockUntil, user.id]
      );

      await auditLog(user.id, 'LOGIN_FAILED', 'users', user.id, { reason: 'invalid_password', attempts: failedAttempts }, req.ip);

      if (lockUntil) {
        return res.status(423).json({ error: 'Too many failed attempts. Account locked for 15 minutes.' });
      }

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await client.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h', issuer: 'net-dog', audience: 'net-dog-api' }
    );

    await auditLog(user.id, 'LOGIN_SUCCESS', 'users', user.id, null, req.ip);

    res.json({ 
      token, 
      user: { id: user.id, username: user.username, role: user.role } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, role, last_login FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;