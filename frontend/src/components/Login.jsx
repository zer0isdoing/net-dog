import React, { useState } from 'react';
import { LogIn, Network } from 'lucide-react';

export default function Login({ onLogin, darkMode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok) {
        onLogin(data.token, data.user);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: darkMode 
        ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: darkMode ? '#1f2937' : 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: '400px',
        border: darkMode ? '1px solid #374151' : 'none'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Network size={48} color={darkMode ? '#3b82f6' : '#667eea'} />
          </div>
          <h1 style={{ 
            fontSize: '1.875rem', 
            fontWeight: 'bold', 
            color: darkMode ? '#f9fafb' : '#1f2937'
          }}>
            Net-Dog
          </h1>
          <p style={{ color: darkMode ? '#d1d5db' : '#6b7280', marginTop: '0.5rem' }}>
            Network Device Management
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '500',
              color: darkMode ? '#d1d5db' : '#374151'
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                borderRadius: '0.375rem',
                fontSize: '1rem',
                background: darkMode ? '#111827' : 'white',
                color: darkMode ? '#f9fafb' : '#1f2937'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '500',
              color: darkMode ? '#d1d5db' : '#374151'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                borderRadius: '0.375rem',
                fontSize: '1rem',
                background: darkMode ? '#111827' : 'white',
                color: darkMode ? '#f9fafb' : '#1f2937'
              }}
              required
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

          <button
            type="submit"
            style={{
              width: '100%',
              background: '#3b82f6',
              color: 'white',
              padding: '0.75rem',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <LogIn size={18} />
            Sign In
          </button>
        </form>

        <div style={{ 
          marginTop: '1rem', 
          textAlign: 'center', 
          fontSize: '0.875rem', 
          color: darkMode ? '#9ca3af' : '#6b7280'
        }}>
          Default: admin / admin123
        </div>
      </div>
    </div>
  );
}