import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken, requireAdmin, auditLog } from '../middleware/auth.js';
import { validateIP, validateMAC, validateVLAN, sanitizeText } from '../middleware/validation.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, v.name as vlan_name, v.network_prefix
      FROM devices d 
      LEFT JOIN vlans v ON d.vlan_id = v.vlan_id 
      ORDER BY d.vlan_id, d.ip
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const ip = validateIP(req.body.ip);
    const mac = validateMAC(req.body.mac);
    const vlan_id = req.body.vlan_id ? validateVLAN(req.body.vlan_id) : null;
    const wan_access = req.body.wan_access !== undefined ? req.body.wan_access : true;
    const description = sanitizeText(req.body.description);
    const ports = req.body.ports ? JSON.stringify(req.body.ports.slice(0, 10)) : '[]'; // Max 10 ports

    const result = await pool.query(
      'INSERT INTO devices (ip, mac, vlan_id, wan_access, description, ports) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [ip, mac, vlan_id, wan_access, description, ports]
    );

    await auditLog(req.user.id, 'CREATE', 'devices', result.rows[0].id, { ip, mac, vlan_id, wan_access, ports }, req.clientIp);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const ip = validateIP(req.body.ip);
    const mac = validateMAC(req.body.mac);
    const vlan_id = req.body.vlan_id ? validateVLAN(req.body.vlan_id) : null;
    const wan_access = req.body.wan_access !== undefined ? req.body.wan_access : true;
    const description = sanitizeText(req.body.description);
    const ports = req.body.ports ? JSON.stringify(req.body.ports.slice(0, 10)) : '[]'; // Max 10 ports

    const result = await pool.query(
      'UPDATE devices SET ip = $1, mac = $2, vlan_id = $3, wan_access = $4, description = $5, ports = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
      [ip, mac, vlan_id, wan_access, description, ports, id]
    );

    await auditLog(req.user.id, 'UPDATE', 'devices', id, { ip, mac, vlan_id, wan_access, ports }, req.clientIp);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM devices WHERE id = $1', [id]);
    await auditLog(req.user.id, 'DELETE', 'devices', id, null, req.clientIp);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;