import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/database.js';
import { authenticateToken, requireAdmin, auditLog } from '../middleware/auth.js';
import { validateUsername, validatePassword, validateRole } from '../middleware/validation.js';

const router = express.Router();

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role, last_login, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const username = validateUsername(req.body.username);
    const password = validatePassword(req.body.password);
    const role = validateRole(req.body.role);

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
      [username, hashedPassword, role]
    );

    await auditLog(req.user.id, 'CREATE', 'users', result.rows[0].id, { username, role }, req.clientIp);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    await auditLog(req.user.id, 'DELETE', 'users', id, null, req.clientIp);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password
router.put('/:id/password', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { current_password, new_password } = req.body;

    // Users can only change their own password, unless admin
    if (parseInt(id) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Validate new password
    const validatedPassword = validatePassword(new_password);

    // If changing own password, verify current password
    if (parseInt(id) === req.user.id) {
      const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [id]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const validCurrentPassword = await bcrypt.compare(current_password, userResult.rows[0].password);
      if (!validCurrentPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(validatedPassword, 12);
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, id]
    );

    await auditLog(req.user.id, 'CHANGE_PASSWORD', 'users', id, null, req.clientIp);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error' });
  }
});

export default router;