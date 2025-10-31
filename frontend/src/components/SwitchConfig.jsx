import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Settings } from 'lucide-react';

export default function SwitchConfig({ token }) {
  const [switches, setSwitches] = useState([]);
  const [vlans, setVlans] = useState([]);
  const [selectedSwitch, setSelectedSwitch] = useState(null);
  const [ports, setPorts] = useState([]);
  const [showSwitchForm, setShowSwitchForm] = useState(false);
  const [showPortModal, setShowPortModal] = useState(false);
  const [editingSwitchId, setEditingSwitchId] = useState(null);
  const [switchFormData, setSwitchFormData] = useState({ name: '', description: '', ip_address: '' });
  const [portFormData, setPortFormData] = useState({ port_number: '', description: '', pvid: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSwitches();
    fetchVlans();
  }, []);

  const fetchSwitches = async () => {
    try {
      const res = await fetch('/api/switches', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSwitches(data);
    } catch (err) {
      console.error(err);
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

  const fetchPorts = async (switchId) => {
    try {
      const res = await fetch(`/api/switches/${switchId}/ports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPorts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwitchSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingSwitchId ? `/api/switches/${editingSwitchId}` : '/api/switches';
      const method = editingSwitchId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(switchFormData)
      });

      const data = await res.json();
      if (res.ok) {
        fetchSwitches();
        setShowSwitchForm(false);
        setEditingSwitchId(null);
        setSwitchFormData({ name: '', description: '', ip_address: '' });
      } else {
        setError(data.error || 'Operation failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handlePortSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`/api/switches/${selectedSwitch}/ports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(portFormData)
      });

      const data = await res.json();
      if (res.ok) {
        fetchPorts(selectedSwitch);
        setShowPortModal(false);
        setPortFormData({ port_number: '', description: '', pvid: '' });
      } else {
        setError(data.error || 'Operation failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleDeleteSwitch = async (id) => {
    if (!confirm('Delete this switch and all its ports?')) return;

    try {
      const res = await fetch(`/api/switches/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchSwitches();
        if (selectedSwitch === id) {
          setSelectedSwitch(null);
          setPorts([]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePort = async (portId) => {
    if (!confirm('Delete this port?')) return;

    try {
      const res = await fetch(`/api/switches/${selectedSwitch}/ports/${portId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchPorts(selectedSwitch);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVlanTagChange = async (portId, vlanId, tagType) => {
    try {
      const port = ports.find(p => p.id === portId);
      const updatedVlans = port.vlans.filter(v => v.vlan_id !== vlanId);
      
      if (tagType !== 'not_member') {
        updatedVlans.push({ vlan_id: vlanId, tag_type: tagType });
      }

      await fetch(`/api/switches/${selectedSwitch}/ports/${portId}/vlans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vlan_configs: updatedVlans })
      });

      fetchPorts(selectedSwitch);
    } catch (err) {
      console.error(err);
    }
  };

  const getVlanTagType = (port, vlanId) => {
    const vlanConfig = port.vlans?.find(v => v.vlan_id === vlanId);
    return vlanConfig ? vlanConfig.tag_type : 'not_member';
  };

  const selectSwitch = (switchId) => {
    setSelectedSwitch(switchId);
    fetchPorts(switchId);
  };

  return (
    <div style={{ background: 'var(--bg-primary)', borderRadius: '0.5rem', boxShadow: 'var(--card-shadow)', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Switch Configuration</h2>
        {!showSwitchForm && (
          <button
            onClick={() => setShowSwitchForm(true)}
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
            Add Switch
          </button>
        )}
      </div>

      {showSwitchForm && (
        <form onSubmit={handleSwitchSubmit} style={{
          background: 'var(--bg-secondary)',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>
            {editingSwitchId ? 'Edit Switch' : 'Add New Switch'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Name *
              </label>
              <input
                type="text"
                value={switchFormData.name}
                onChange={(e) => setSwitchFormData({ ...switchFormData, name: e.target.value })}
                placeholder="Main Switch"
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
                IP Address
              </label>
              <input
                type="text"
                value={switchFormData.ip_address}
                onChange={(e) => setSwitchFormData({ ...switchFormData, ip_address: e.target.value })}
                placeholder="192.168.1.1"
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
              <input
                type="text"
                value={switchFormData.description}
                onChange={(e) => setSwitchFormData({ ...switchFormData, description: e.target.value })}
                placeholder="Optional description"
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
              {editingSwitchId ? 'Update' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSwitchForm(false);
                setEditingSwitchId(null);
                setSwitchFormData({ name: '', description: '', ip_address: '' });
                setError('');
              }}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {switches.map(sw => (
          <div
            key={sw.id}
            onClick={() => selectSwitch(sw.id)}
            style={{
              background: selectedSwitch === sw.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: `2px solid ${selectedSwitch === sw.id ? 'var(--accent-color)' : 'var(--border-color)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
              <h3 style={{ fontWeight: '600', fontSize: '1.125rem' }}>{sw.name}</h3>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSwitchId(sw.id);
                    setSwitchFormData({ name: sw.name, description: sw.description || '', ip_address: sw.ip_address || '' });
                    setShowSwitchForm(true);
                  }}
                  style={{
                    background: 'var(--warning-color)',
                    color: 'white',
                    padding: '0.25rem',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSwitch(sw.id);
                  }}
                  style={{
                    background: 'var(--error-color)',
                    color: 'white',
                    padding: '0.25rem',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            {sw.ip_address && (
              <p style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                {sw.ip_address}
              </p>
            )}
            {sw.description && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {sw.description}
              </p>
            )}
          </div>
        ))}
      </div>

      {selectedSwitch && (
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: '600', fontSize: '1.125rem' }}>
              Port Configuration - {switches.find(s => s.id === selectedSwitch)?.name}
            </h3>
            <button
              onClick={() => setShowPortModal(true)}
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
                fontSize: '0.875rem'
              }}
            >
              <Plus size={16} />
              Add Port
            </button>
          </div>

          {showPortModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: 'var(--bg-primary)',
                padding: '2rem',
                borderRadius: '0.5rem',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
              }}>
                <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>Add Port</h3>
                <form onSubmit={handlePortSubmit}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                      Port Number * (1-128)
                    </label>
                    <input
                      type="number"
                      value={portFormData.port_number}
                      onChange={(e) => setPortFormData({ ...portFormData, port_number: e.target.value })}
                      min="1"
                      max="128"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.375rem',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                      }}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                      PVID
                    </label>
                    <select
                      value={portFormData.pvid}
                      onChange={(e) => setPortFormData({ ...portFormData, pvid: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.375rem',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="">No PVID</option>
                      {vlans.map(vlan => (
                        <option key={vlan.vlan_id} value={vlan.vlan_id}>
                          {vlan.name} (VLAN {vlan.vlan_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                      Description
                    </label>
                    <input
                      type="text"
                      value={portFormData.description}
                      onChange={(e) => setPortFormData({ ...portFormData, description: e.target.value })}
                      placeholder="Optional"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.375rem',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                      }}
                    />
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
                        flex: 1,
                        background: 'var(--success-color)',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Add Port
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPortModal(false);
                        setPortFormData({ port_number: '', description: '', pvid: '' });
                        setError('');
                      }}
                      style={{
                        flex: 1,
                        background: '#6b7280',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600' }}>Port</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600' }}>Description</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600' }}>PVID</th>
                  {vlans.map(vlan => (
                    <th key={vlan.vlan_id} style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600', minWidth: '100px' }}>
                      {vlan.name}<br/><small style={{ fontSize: '0.7rem', opacity: 0.7 }}>VLAN {vlan.vlan_id}</small>
                    </th>
                  ))}
                  <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ports.length === 0 ? (
                  <tr>
                    <td colSpan={vlans.length + 4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No ports configured. Click "Add Port" to get started.
                    </td>
                  </tr>
                ) : (
                  ports.map(port => (
                    <tr key={port.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: '500' }}>{port.port_number}</td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{port.description || '-'}</td>
                      <td style={{ padding: '0.5rem' }}>
                        {port.pvid ? (
                          <span style={{
                            background: '#dbeafe',
                            color: '#1e40af',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem'
                          }}>
                            {port.pvid}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      {vlans.map(vlan => (
                        <td key={vlan.vlan_id} style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <select
                            value={getVlanTagType(port, vlan.vlan_id)}
                            onChange={(e) => handleVlanTagChange(port.id, vlan.vlan_id, e.target.value)}
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
                            <option value="not_member">Not Member</option>
                            <option value="tagged">Tagged</option>
                            <option value="untagged">Untagged</option>
                          </select>
                        </td>
                      ))}
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeletePort(port.id)}
                          style={{
                            background: 'var(--error-color)',
                            color: 'white',
                            padding: '0.25rem',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}