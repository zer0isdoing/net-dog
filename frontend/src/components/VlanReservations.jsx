import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

export default function VlanReservations({ vlanId, token }) {
  const [reservations, setReservations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ device_type: '', group_range: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (vlanId) {
      fetchReservations();
    }
  }, [vlanId]);

  const fetchReservations = async () => {
    try {
      const res = await fetch(`/api/vlan-reservations/${vlanId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReservations(data);
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingId 
        ? `/api/vlan-reservations/${editingId}` 
        : '/api/vlan-reservations';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...formData, vlan_id: vlanId })
      });

      const data = await res.json();
      if (res.ok) {
        await fetchReservations();
        setShowForm(false);
        setEditingId(null);
        setFormData({ device_type: '', group_range: '' });
        setError('');
      } else {
        setError(data.error || 'Operation failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleEdit = (reservation) => {
    setEditingId(reservation.id);
    setFormData({
      device_type: reservation.device_type,
      group_range: reservation.group_range
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this reservation?')) return;

    try {
      const res = await fetch(`/api/vlan-reservations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchReservations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ device_type: '', group_range: '' });
    setError('');
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
          IP Range Reservations
        </h4>
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: 'var(--accent-color)',
            color: 'white',
            padding: '0.375rem 0.75rem',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          <Plus size={14} />
          Add Reservation
        </button>
      </div>

      {showForm && (
        <div style={{
          background: 'var(--bg-primary)',
          padding: '1rem',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-color)',
          marginBottom: '1rem'
        }}>
          <h5 style={{ marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: '600' }}>
            {editingId ? 'Edit Reservation' : 'Add Reservation'}
          </h5>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.75rem', fontWeight: '500' }}>
                  Device Type *
                </label>
                <input
                  type="text"
                  value={formData.device_type}
                  onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                  placeholder="PC, IoT, Server, etc."
                  style={{
                    width: '100%',
                    padding: '0.375rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.375rem',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.75rem', fontWeight: '500' }}>
                  Group Range *
                </label>
                <input
                  type="text"
                  value={formData.group_range}
                  onChange={(e) => setFormData({ ...formData, group_range: e.target.value })}
                  placeholder="100-120"
                  style={{
                    width: '100%',
                    padding: '0.375rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.375rem',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                  required
                />
              </div>
            </div>

            {error && (
              <div style={{
                padding: '0.5rem',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: '0.375rem',
                marginBottom: '0.75rem',
                fontSize: '0.75rem'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                style={{
                  background: 'var(--accent-color)',
                  color: 'white',
                  padding: '0.375rem 0.75rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}
              >
                <Save size={14} />
                {editingId ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  padding: '0.375rem 0.75rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
            <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem' }}>Device</th>
            <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem' }}>Group Range</th>
            <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', fontSize: '0.75rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reservations.length === 0 ? (
            <tr>
              <td colSpan="3" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                No reservations yet. Click "Add Reservation" to get started.
              </td>
            </tr>
          ) : (
            reservations.map(reservation => (
              <tr key={reservation.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '0.5rem' }}>{reservation.device_type}</td>
                <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{reservation.group_range}</td>
                <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleEdit(reservation)}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem'
                      }}
                    >
                      <Edit2 size={12} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(reservation.id)}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem'
                      }}
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}