import { pool } from '../config/database.js';
import bcrypt from 'bcrypt';

export async function initDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'viewer')),
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vlans (
        id SERIAL PRIMARY KEY,
        vlan_id INTEGER UNIQUE NOT NULL CHECK (vlan_id >= 1 AND vlan_id <= 4094),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        wan_access BOOLEAN DEFAULT true,
        network_prefix VARCHAR(15) DEFAULT '192.168',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_vlans_vlan_id ON vlans(vlan_id)`);

    // Add missing columns if they don't exist (migration for existing databases)
    await client.query(`
      ALTER TABLE vlans 
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS wan_access BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS network_prefix VARCHAR(15) DEFAULT '192.168',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // Update existing records
    await client.query(`
      UPDATE vlans 
      SET 
        wan_access = COALESCE(wan_access, true),
        network_prefix = COALESCE(network_prefix, '192.168'),
        created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
        updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
      WHERE wan_access IS NULL OR network_prefix IS NULL
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        ip VARCHAR(45) NOT NULL,
        mac VARCHAR(17) NOT NULL CHECK (mac ~ '^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$'),
        vlan_id INTEGER REFERENCES vlans(vlan_id) ON DELETE SET NULL,
        wan_access BOOLEAN DEFAULT true,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_ip_vlan UNIQUE (ip, vlan_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip);
      CREATE INDEX IF NOT EXISTS idx_devices_mac ON devices(mac);
      CREATE INDEX IF NOT EXISTS idx_devices_vlan_id ON devices(vlan_id);
    `);

    // Add missing columns to devices table if they don't exist
    await client.query(`
      ALTER TABLE devices 
      ADD COLUMN IF NOT EXISTS wan_access BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS ports JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS interface VARCHAR(20) DEFAULT 'WLAN',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // Update existing records
    await client.query(`
      UPDATE devices 
      SET 
        wan_access = COALESCE(wan_access, true),
        created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
        updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
      WHERE wan_access IS NULL
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vlan_communication (
        id SERIAL PRIMARY KEY,
        source_vlan_id INTEGER REFERENCES vlans(vlan_id) ON DELETE CASCADE,
        target_vlan_id INTEGER REFERENCES vlans(vlan_id) ON DELETE CASCADE,
        access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('full', 'limited', 'blocked')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_vlan_pair UNIQUE (source_vlan_id, target_vlan_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vlan_comm_source ON vlan_communication(source_vlan_id);
      CREATE INDEX IF NOT EXISTS idx_vlan_comm_target ON vlan_communication(target_vlan_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS limited_device_access (
        id SERIAL PRIMARY KEY,
        vlan_comm_id INTEGER REFERENCES vlan_communication(id) ON DELETE CASCADE,
        device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_comm_device UNIQUE (vlan_comm_id, device_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vlan_reservations (
        id SERIAL PRIMARY KEY,
        vlan_id INTEGER REFERENCES vlans(vlan_id) ON DELETE CASCADE,
        device_type VARCHAR(100) NOT NULL,
        group_range VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_vlan_reservations_vlan_id ON vlan_reservations(vlan_id)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS switches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS switch_ports (
        id SERIAL PRIMARY KEY,
        switch_id INTEGER REFERENCES switches(id) ON DELETE CASCADE,
        port_number INTEGER NOT NULL,
        description TEXT,
        pvid INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_switch_port UNIQUE (switch_id, port_number)
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_switch_ports_switch ON switch_ports(switch_id)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS switch_port_vlans (
        id SERIAL PRIMARY KEY,
        port_id INTEGER REFERENCES switch_ports(id) ON DELETE CASCADE,
        vlan_id INTEGER REFERENCES vlans(vlan_id) ON DELETE CASCADE,
        tag_type VARCHAR(20) NOT NULL CHECK (tag_type IN ('tagged', 'untagged', 'not_member')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_port_vlan UNIQUE (port_id, vlan_id)
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_port_vlans_port ON switch_port_vlans(port_id)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        table_name VARCHAR(50),
        record_id INTEGER,
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
    `);

    const adminCheck = await client.query('SELECT * FROM users WHERE username = $1', ['admin']);

    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await client.query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
        ['admin', hashedPassword, 'admin']
      );
      console.log('⚠️  Default admin user created (username: admin, password: admin123)');
      console.log('⚠️  PLEASE CHANGE THE DEFAULT PASSWORD IMMEDIATELY!');
    }

    await client.query('COMMIT');
    console.log('✓ Database initialized successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    client.release();
  }
}