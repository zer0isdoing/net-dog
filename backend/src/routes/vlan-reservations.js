import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken, requireAdmin, auditLog } from '../middleware/auth.js';
import { sanitizeText } from '../middleware/validation.js';

const router = express.Router();

// Get all reservations for a VLAN
router.get('/:vlan_id', authenticateToken, async (req, res) => {
  try {
    const { vlan_id } = req.params;
    const result = await pool.query(
      'SELECT * FROM vlan_reservations WHERE vlan_id = $1 ORDER BY id',
      [vlan_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new reservation
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { vlan_id, device_type, group_range } = req.body;
    
    if (!vlan_id || !device_type || !group_range) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sanitizedDeviceType = sanitizeText(device_type);
    const sanitizedGroupRange = sanitizeText(group_range);

    const result = await pool.query(
      'INSERT INTO vlan_reservations (vlan_id, device_type, group_range) VALUES ($1, $2, $3) RETURNING *',
      [vlan_id, sanitizedDeviceType, sanitizedGroupRange]
    );

    await auditLog(req.user.id, 'CREATE', 'vlan_reservations', result.rows[0].id, { vlan_id, device_type: sanitizedDeviceType, group_range: sanitizedGroupRange }, req.clientIp);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error' });
  }
});

// Update reservation
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { device_type, group_range } = req.body;

    if (!device_type || !group_range) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sanitizedDeviceType = sanitizeText(device_type);
    const sanitizedGroupRange = sanitizeText(group_range);

    const result = await pool.query(
      'UPDATE vlan_reservations SET device_type = $1, group_range = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [sanitizedDeviceType, sanitizedGroupRange, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    await auditLog(req.user.id, 'UPDATE', 'vlan_reservations', id, { device_type: sanitizedDeviceType, group_range: sanitizedGroupRange }, req.clientIp);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error' });
  }
});

// Delete reservation
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM vlan_reservations WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    await auditLog(req.user.id, 'DELETE', 'vlan_reservations', id, null, req.clientIp);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;