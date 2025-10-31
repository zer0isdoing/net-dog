import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken, requireAdmin, auditLog } from '../middleware/auth.js';
import { validateVLAN, sanitizeText, validateAccessType } from '../middleware/validation.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vlans ORDER BY vlan_id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const vlan_id = validateVLAN(req.body.vlan_id);
    const name = sanitizeText(req.body.name);
    const description = sanitizeText(req.body.description);
    const wan_access = req.body.wan_access !== undefined ? req.body.wan_access : true;
    const network_prefix = req.body.network_prefix || '192.168';

    const result = await pool.query(
      'INSERT INTO vlans (vlan_id, name, description, wan_access, network_prefix) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [vlan_id, name, description, wan_access, network_prefix]
    );

    await auditLog(req.user.id, 'CREATE', 'vlans', result.rows[0].id, { vlan_id, name, wan_access }, req.clientIp);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const vlan_id = validateVLAN(req.body.vlan_id);
    const name = sanitizeText(req.body.name);
    const description = sanitizeText(req.body.description);
    const wan_access = req.body.wan_access !== undefined ? req.body.wan_access : true;
    const network_prefix = req.body.network_prefix || '192.168';

    const result = await pool.query(
      'UPDATE vlans SET vlan_id = $1, name = $2, description = $3, wan_access = $4, network_prefix = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [vlan_id, name, description, wan_access, network_prefix, id]
    );

    await auditLog(req.user.id, 'UPDATE', 'vlans', id, { vlan_id, name, wan_access }, req.clientIp);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM vlans WHERE id = $1', [id]);
    await auditLog(req.user.id, 'DELETE', 'vlans', id, null, req.clientIp);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get VLAN communication matrix
router.get('/communication', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vlan_communication');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Set VLAN communication rule
router.post('/communication', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const source_vlan_id = validateVLAN(req.body.source_vlan_id);
    const target_vlan_id = validateVLAN(req.body.target_vlan_id);
    const access_type = validateAccessType(req.body.access_type);

    const result = await pool.query(
      `INSERT INTO vlan_communication (source_vlan_id, target_vlan_id, access_type) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (source_vlan_id, target_vlan_id) 
       DO UPDATE SET access_type = $3 
       RETURNING *`,
      [source_vlan_id, target_vlan_id, access_type]
    );

    await auditLog(req.user.id, 'SET_VLAN_COMM', 'vlan_communication', result.rows[0].id, 
      { source_vlan_id, target_vlan_id, access_type }, req.clientIp);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error' });
  }
});

// Get limited device access for a communication rule
router.get('/communication/:commId/devices', authenticateToken, async (req, res) => {
  try {
    const { commId } = req.params;
    const result = await pool.query(
      'SELECT * FROM limited_device_access WHERE vlan_comm_id = $1',
      [commId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Set limited device access
router.post('/communication/:commId/devices', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { commId } = req.params;
    const { device_ids } = req.body;

    await client.query('BEGIN');

    await client.query('DELETE FROM limited_device_access WHERE vlan_comm_id = $1', [commId]);

    if (device_ids && device_ids.length > 0) {
      for (const device_id of device_ids) {
        await client.query(
          'INSERT INTO limited_device_access (vlan_comm_id, device_id) VALUES ($1, $2)',
          [commId, device_id]
        );
      }
    }

    await client.query('COMMIT');
    await auditLog(req.user.id, 'SET_LIMITED_DEVICES', 'limited_device_access', commId, 
      { device_ids }, req.clientIp);
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error' });
  } finally {
    client.release();
  }
});

export default router;