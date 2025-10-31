import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken, requireAdmin, auditLog } from '../middleware/auth.js';
import { validateIP, sanitizeText, validatePortNumber, validateVLAN, validateTagType } from '../middleware/validation.js';

const router = express.Router();

// Get all switches
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM switches ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create switch
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const name = sanitizeText(req.body.name);
    const description = sanitizeText(req.body.description);
    const ip_address = req.body.ip_address ? validateIP(req.body.ip_address) : null;

    const result = await pool.query(
      'INSERT INTO switches (name, description, ip_address) VALUES ($1, $2, $3) RETURNING *',
      [name, description, ip_address]
    );

    await auditLog(req.user.id, 'CREATE', 'switches', result.rows[0].id, { name, ip_address }, req.clientIp);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error' });
  }
});

// Update switch
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const name = sanitizeText(req.body.name);
    const description = sanitizeText(req.body.description);
    const ip_address = req.body.ip_address ? validateIP(req.body.ip_address) : null;

    const result = await pool.query(
      'UPDATE switches SET name = $1, description = $2, ip_address = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, description, ip_address, id]
    );

    await auditLog(req.user.id, 'UPDATE', 'switches', id, { name, ip_address }, req.clientIp);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error' });
  }
});

// Delete switch
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM switches WHERE id = $1', [id]);
    await auditLog(req.user.id, 'DELETE', 'switches', id, null, req.clientIp);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all ports for a switch with VLAN configurations
router.get('/:id/ports', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const portsResult = await pool.query(
      'SELECT * FROM switch_ports WHERE switch_id = $1 ORDER BY port_number',
      [id]
    );

    const ports = await Promise.all(portsResult.rows.map(async (port) => {
      const vlansResult = await pool.query(
        'SELECT vlan_id, tag_type FROM switch_port_vlans WHERE port_id = $1',
        [port.id]
      );
      return {
        ...port,
        vlans: vlansResult.rows
      };
    }));

    res.json(ports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create port
router.post('/:id/ports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const port_number = validatePortNumber(req.body.port_number);
    const description = sanitizeText(req.body.description);
    const pvid = req.body.pvid ? validateVLAN(req.body.pvid) : null;

    const result = await pool.query(
      'INSERT INTO switch_ports (switch_id, port_number, description, pvid) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, port_number, description, pvid]
    );

    await auditLog(req.user.id, 'CREATE', 'switch_ports', result.rows[0].id, 
      { switch_id: id, port_number, pvid }, req.clientIp);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error' });
  }
});

// Update port
router.put('/:switchId/ports/:portId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { portId } = req.params;
    const port_number = validatePortNumber(req.body.port_number);
    const description = sanitizeText(req.body.description);
    const pvid = req.body.pvid ? validateVLAN(req.body.pvid) : null;

    const result = await pool.query(
      'UPDATE switch_ports SET port_number = $1, description = $2, pvid = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [port_number, description, pvid, portId]
    );

    await auditLog(req.user.id, 'UPDATE', 'switch_ports', portId, 
      { port_number, pvid }, req.clientIp);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error' });
  }
});

// Delete port
router.delete('/:switchId/ports/:portId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { portId } = req.params;
    await pool.query('DELETE FROM switch_ports WHERE id = $1', [portId]);
    await auditLog(req.user.id, 'DELETE', 'switch_ports', portId, null, req.clientIp);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Set port VLAN configuration
router.post('/:switchId/ports/:portId/vlans', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { portId } = req.params;
    const { vlan_configs } = req.body; // array of { vlan_id, tag_type }

    await client.query('BEGIN');

    // Remove existing VLAN configs
    await client.query('DELETE FROM switch_port_vlans WHERE port_id = $1', [portId]);

    // Add new VLAN configs
    if (vlan_configs && vlan_configs.length > 0) {
      for (const config of vlan_configs) {
        const vlan_id = validateVLAN(config.vlan_id);
        const tag_type = validateTagType(config.tag_type);

        await client.query(
          'INSERT INTO switch_port_vlans (port_id, vlan_id, tag_type) VALUES ($1, $2, $3)',
          [portId, vlan_id, tag_type]
        );
      }
    }

    await client.query('COMMIT');
    await auditLog(req.user.id, 'SET_PORT_VLANS', 'switch_port_vlans', portId, 
      { vlan_configs }, req.clientIp);
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