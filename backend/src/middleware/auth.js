import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    try {
      const result = await pool.query(
        'SELECT id, username, role, locked_until FROM users WHERE id = $1',
        [user.id]
      );
      
      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'User not found' });
      }
      
      const dbUser = result.rows[0];
      
      if (dbUser.locked_until && new Date(dbUser.locked_until) > new Date()) {
        return res.status(403).json({ error: 'Account temporarily locked' });
      }
      
      req.user = user;
      req.clientIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip;
      next();
    } catch (error) {
      console.error('Auth verification error:', error);
      return res.status(500).json({ error: 'Authentication error' });
    }
  });
}

export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    pool.query(
      'INSERT INTO audit_log (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'UNAUTHORIZED_ACCESS', JSON.stringify({ path: req.path }), req.clientIp]
    ).catch(err => console.error('Audit log error:', err));
    
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export async function auditLog(userId, action, tableName, recordId, details, ipAddress) {
  try {
    await pool.query(
      'INSERT INTO audit_log (user_id, action, table_name, record_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, action, tableName, recordId, JSON.stringify(details), ipAddress]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}