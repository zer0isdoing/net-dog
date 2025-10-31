import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

export default function VlanSettings({ token }) {
  const [vlans, setVlans] = useState([]);
  const [devices, setDevices] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ vlan_id: '', name: '', description: '', wan_access: true, network_prefix: '192.168' });
  const [error, setError] = useState('');
  const [showMatrix, setShowMatrix] = useState(false);

  useEffect(() => {
    fetchVlans();
    fetchDevices();
    fetchCommunications();
  }, []);

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

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/devices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setDevices(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCommunications = async () => {
    try {
      const res = await fetch('/api/vlans/communication', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCommunications(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingId ? `/api/vlans/${editingId}` : '/api/vlans';
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
        fetchVlans();
        setShowForm(false);
        setEditingId(null);
        setFormData({ vlan_id: '', name: '', description: '', wan_access: true, network_prefix: '192.168' });
      } else {
        setError(data.error || 'Operation failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleEdit = (vlan) => {
    setEditingId(vlan.id);
    setFormData({
      vlan_id: vlan.vlan_id,
      name: vlan.name,
      description: vlan.description || '',
      wan_access: vlan.wan_access,
      network_prefix: vlan.network_prefix || '192.168'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure? This will unassign VLAN from all devices.')) return;

    try {
      const res = await fetch(`/api/vlans/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchVlans();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ vlan_id: '', name: '', description: '', wan_access: true, network_prefix: '192.168' });
    setError('');
  };

  const getCommunicationType = (sourceId, targetId) => {
    const comm = communications.find(c => c.source_vlan_id === sourceId && c.target_vlan_id === targetId);
    return comm ? comm.access_type : 'blocked';
  };

  const handleCommunicationChange = async (sourceId, targetId, accessType) => {
    try {
      await fetch('/api/vlans/communication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          source_vlan_id: sourceId,
          target_vlan_id: targetId,
          access_type: accessType
        })
      });
      fetchCommunications();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ background: 'var(--bg-primary)', borderRadius: '0.5rem', boxShadow: 'var(--card-shadow)', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>VLAN Settings</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowMatrix(!showMatrix)}
            style={{
              background: showMatrix ? 'var(--accent-color)' : '#6b7280',
              color: 'white',
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            {showMatrix ? 'Hide' : 'Show'} Communication Matrix
          </button>
          {!showForm && (
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
              Add VLAN
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: 'var(--bg-secondary)',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>
            {editingId ? 'Edit VLAN' : 'Add New VLAN'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                VLAN ID * (1-4094)
              </label>
              <input
                type="number"
                value={formData.vlan_id}
                onChange={(e) => setFormData({ ...formData, vlan_id: e.target.value })}
                min="1"
                max="4094"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.375rem',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
                required
                disabled={!!editingId}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Management, Guest, etc."
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
                Network Prefix
              </label>
              <input
                type="text"
                value={formData.network_prefix}
                onChange={(e) => setFormData({ ...formData, network_prefix: e.target.value })}
                placeholder="192.168"
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

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                rows="2"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.375rem',
                  resize: 'vertical',
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

      {showMatrix && vlans.length > 0 && (
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-color)',
          overflowX: 'auto'
        }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>Inter-VLAN Communication Matrix</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Rows = Source VLAN, Columns = Target VLAN
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th style={{ padding: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                  Source → Target
                </th>
                {vlans.map(vlan => (
                  <th key={vlan.vlan_id} style={{ padding: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', minWidth: '120px' }}>
                    <strong>{vlan.name}</strong><br/>
                    <small style={{ fontSize: '0.75rem', opacity: 0.7 }}>VLAN {vlan.vlan_id}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vlans.map(sourceVlan => (
                <tr key={sourceVlan.vlan_id}>
                  <td style={{ padding: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', fontWeight: '500' }}>
                    <strong>{sourceVlan.name}</strong><br/>
                    <small style={{ fontSize: '0.75rem', opacity: 0.7 }}>VLAN {sourceVlan.vlan_id}</small>
                  </td>
                  {vlans.map(targetVlan => (
                    <td key={targetVlan.vlan_id} style={{ padding: '0.5rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      {sourceVlan.vlan_id === targetVlan.vlan_id ? (
                        <span style={{ color: 'var(--text-tertiary)' }}>Same VLAN</span>
                      ) : (
                        <select
                          value={getCommunicationType(sourceVlan.vlan_id, targetVlan.vlan_id)}
                          onChange={(e) => handleCommunicationChange(sourceVlan.vlan_id, targetVlan.vlan_id, e.target.value)}
                          style={{
                            padding: '0.25rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            background: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            width: '100%'
                          }}
                        >
                          <option value="blocked">🚫 Blocked</option>
                          <option value="full">✅ Full</option>
                          <option value="limited">⚠️ Limited</option>
                        </select>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>VLAN ID</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>Name</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>Network</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>WAN</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>Description</th>
              <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', fontSize: '0.875rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vlans.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No VLANs configured. Click "Add VLAN" to get started.
                </td>
              </tr>
            ) : (
              vlans.map(vlan => (
                <tr key={vlan.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      background: '#dbeafe',
                      color: '#1e40af',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}>
                      {vlan.vlan_id}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontWeight: '600', fontSize: '1rem' }}>{vlan.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>VLAN {vlan.vlan_id}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {vlan.network_prefix}.{vlan.vlan_id}.0/24
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {vlan.wan_access ? (
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
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{vlan.description || '-'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleEdit(vlan)}
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
                        onClick={() => handleDelete(vlan.id)}
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}