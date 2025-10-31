import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, ArrowUpDown } from 'lucide-react';

export default function DeviceTable({ token, isAdmin }) {
  const [devices, setDevices] = useState([]);
  const [vlans, setVlans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ip: '', mac: '', vlan_id: '', wan_access: true, description: '', ports: [], interface: 'ETH' });
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('vlan');
  const [filterWan, setFilterWan] = useState('all');
  const [selectedVlan, setSelectedVlan] = useState(null);

  useEffect(() => {
    fetchDevices();
    fetchVlans();
  }, []);

  useEffect(() => {
    // Auto-select smallest VLAN when vlans load
    if (vlans.length > 0 && selectedVlan === null) {
      const smallestVlan = vlans.reduce((min, vlan) => 
        vlan.vlan_id < min.vlan_id ? vlan : min
      );
      setSelectedVlan(smallestVlan.vlan_id);
    }
  }, [vlans]);

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/devices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      // Parse ports if it's a string
      const parsedData = data.map(device => ({
        ...device,
        ports: typeof device.ports === 'string' ? JSON.parse(device.ports) : (device.ports || [])
      }));
      console.log('Devices loaded:', parsedData.length);
      setDevices(parsedData);
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError('Failed to load devices');
    }
  };

  const fetchVlans = async () => {
    try {
      const res = await fetch('/api/vlans', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setVlans(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVlanChange = (vlanId) => {
    setFormData(prev => {
      const selectedVlanObj = vlans.find(v => v.vlan_id === parseInt(vlanId));
      if (selectedVlanObj && vlanId) {
        // Auto-fill IP based on VLAN: 192.168.{vlan_id}.
        const prefix = selectedVlanObj.network_prefix || '192.168';
        return {
          ...prev,
          vlan_id: vlanId,
          ip: `${prefix}.${vlanId}.`
        };
      }
      return { ...prev, vlan_id: vlanId };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingId ? `/api/devices/${editingId}` : '/api/devices';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        await fetchDevices(); // await ekledim
        setShowForm(false);
        setEditingId(null);
        setFormData({ ip: '', mac: '', vlan_id: '', wan_access: true, description: '', ports: [], interface: 'ETH' });
        setError('');
      } else {
        setError(data.error || 'Operation failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleEdit = (device) => {
    setEditingId(device.id);
    setFormData({
      ip: device.ip,
      mac: device.mac,
      vlan_id: device.vlan_id || '',
      wan_access: device.wan_access,
      description: device.description || '',
      ports: device.ports || [],
      interface: device.interface || 'ETH'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this device?')) return;

    try {
      const res = await fetch(`/api/devices/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchDevices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ ip: '', mac: '', vlan_id: '', wan_access: true, description: '', ports: [], interface: 'ETH' });
    setError('');
  };

  // Filter and sort devices
  const filteredDevices = devices
    .filter(device => {
      // VLAN filter
      if (selectedVlan !== null && selectedVlan !== 'all') {
        if (device.vlan_id !== selectedVlan) return false;
      }
      
      // WAN filter
      if (filterWan === 'all') return true;
      if (filterWan === 'wan') return device.wan_access;
      if (filterWan === 'no-wan') return !device.wan_access;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'vlan') {
        return (a.vlan_id || 9999) - (b.vlan_id || 9999);
      } else if (sortBy === 'ip') {
        return a.ip.localeCompare(b.ip, undefined, { numeric: true });
      } else if (sortBy === 'wan') {
        return (b.wan_access ? 1 : 0) - (a.wan_access ? 1 : 0);
      }
      return 0;
    });

  return (
    <div style={{ background: 'var(--bg-primary)', borderRadius: '0.5rem', boxShadow: 'var(--card-shadow)', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Devices</h2>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <ArrowUpDown size={16} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '0.375rem',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="vlan">Sort by VLAN</option>
              <option value="ip">Sort by IP</option>
              <option value="wan">Sort by WAN Access</option>
            </select>
          </div>

          <select
            value={filterWan}
            onChange={(e) => setFilterWan(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--border-color)',
              borderRadius: '0.375rem',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="all">All Devices</option>
            <option value="wan">WAN Access Only</option>
            <option value="no-wan">No WAN Access</option>
          </select>

          {isAdmin && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: 'var(--accent-color)',
                color: 'white',
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500'
              }}
            >
              <Plus size={18} />
              Add Device
            </button>
          )}
        </div>
      </div>

      {/* VLAN Filter Buttons */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>
          Filter by VLAN:
        </span>
        <button
          onClick={() => setSelectedVlan('all')}
          style={{
            background: selectedVlan === 'all' ? 'var(--accent-color)' : 'var(--bg-secondary)',
            color: selectedVlan === 'all' ? 'white' : 'var(--text-primary)',
            padding: '0.5rem 1rem',
            border: `1px solid ${selectedVlan === 'all' ? 'var(--accent-color)' : 'var(--border-color)'}`,
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          All VLANs
        </button>
        {vlans.sort((a, b) => a.vlan_id - b.vlan_id).map(vlan => (
          <button
            key={vlan.vlan_id}
            onClick={() => setSelectedVlan(vlan.vlan_id)}
            style={{
              background: selectedVlan === vlan.vlan_id ? '#dbeafe' : 'var(--bg-secondary)',
              color: selectedVlan === vlan.vlan_id ? '#1e40af' : 'var(--text-primary)',
              padding: '0.5rem 1rem',
              border: `1px solid ${selectedVlan === vlan.vlan_id ? '#3b82f6' : 'var(--border-color)'}`,
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: selectedVlan === vlan.vlan_id ? '600' : '500',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.125rem'
            }}
          >
            <span>{vlan.name}</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>VLAN {vlan.vlan_id}</span>
          </button>
        ))}
      </div>

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} style={{
          background: 'var(--bg-secondary)',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>
            {editingId ? 'Edit Device' : 'Add New Device'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                VLAN
              </label>
              <select
                value={formData.vlan_id}
                onChange={(e) => handleVlanChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.375rem',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="">No VLAN</option>
                {vlans.map(vlan => (
                  <option key={vlan.vlan_id} value={vlan.vlan_id}>
                    {vlan.name} (VLAN {vlan.vlan_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                IP Address *
              </label>
              <input
                type="text"
                value={formData.ip}
                onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                placeholder="192.168.10.100"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.375rem',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                MAC Address *
              </label>
              <input
                type="text"
                value={formData.mac}
                onChange={(e) => setFormData({ ...formData, mac: e.target.value })}
                placeholder="AA:BB:CC:DD:EE:FF"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.375rem',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Interface *
              </label>
              <select
                value={formData.interface}
                onChange={(e) => setFormData({ ...formData, interface: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.375rem',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
                required
              >
                <option value="ETH">Ethernet (ETH)</option>
                <option value="Wi-Fi">Wi-Fi</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional notes"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.375rem',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.wan_access}
                onChange={(e) => setFormData({ ...formData, wan_access: e.target.checked })}
                style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>WAN Access</span>
            </label>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Open Ports (up to 10)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
                <input
                  key={index}
                  type="number"
                  value={formData.ports[index] || ''}
                  onChange={(e) => {
                    const newPorts = [...formData.ports];
                    const value = e.target.value;
                    if (value === '') {
                      newPorts.splice(index, 1);
                    } else {
                      const port = parseInt(value);
                      if (port >= 1 && port <= 65535) {
                        newPorts[index] = port;
                      }
                    }
                    setFormData({ ...formData, ports: newPorts.filter(p => p !== undefined && p !== null && p !== '') });
                  }}
                  placeholder={`Port ${index + 1}`}
                  min="1"
                  max="65535"
                  style={{
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.375rem',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                />
              ))}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
              Enter port numbers (1-65535). Leave empty for unused slots.
            </p>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              style={{
                background: 'var(--success-color)',
                color: 'white',
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500'
              }}
            >
              <Save size={16} />
              {editingId ? 'Update' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                background: '#6b7280',
                color: 'white',
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500'
              }}
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>IP Address</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>MAC Address</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>Interface</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>VLAN</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>Ports</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>WAN</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>Description</th>
              {isAdmin && (
                <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', fontSize: '0.875rem' }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredDevices.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No devices found. {isAdmin && 'Click "Add Device" to get started.'}
                </td>
              </tr>
            ) : (
              filteredDevices.map(device => (
                <tr key={device.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{device.ip}</td>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{device.mac}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      background: device.interface === 'Wi-Fi' ? '#fef3c7' : '#e0e7ff',
                      color: device.interface === 'Wi-Fi' ? '#92400e' : '#3730a3',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}>
                      {device.interface || 'ETH'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {device.vlan_id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{
                          background: '#dbeafe',
                          color: '#1e40af',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>
                          {device.vlan_name || `VLAN ${device.vlan_id}`}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {device.ports && device.ports.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {device.ports.map((port, idx) => (
                          <span key={idx} style={{
                            background: '#fef3c7',
                            color: '#92400e',
                            padding: '0.125rem 0.375rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                            fontWeight: '600'
                          }}>
                            {port}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {device.wan_access ? (
                      <span style={{
                        background: '#d1fae5',
                        color: '#065f46',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem'
                      }}>
                        Yes
                      </span>
                    ) : (
                      <span style={{
                        background: '#fee2e2',
                        color: '#991b1b',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem'
                      }}>
                        No
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{device.description || '-'}</td>
                  {isAdmin && (
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleEdit(device)}
                          style={{
                            background: 'var(--warning-color)',
                            color: 'white',
                            padding: '0.375rem',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(device.id)}
                          style={{
                            background: 'var(--error-color)',
                            color: 'white',
                            padding: '0.375rem',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}