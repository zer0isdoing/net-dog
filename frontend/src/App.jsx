import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import DeviceTable from './components/DeviceTable';
import VlanSettings from './components/VlanSettings';
import UserManagement from './components/UserManagement';
import SwitchConfig from './components/SwitchConfig';
import { LogOut, Settings, Users, Server, Network, Moon, Sun } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('devices');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) {
            throw new Error('Auth failed');
          }
          return res.json();
        })
        .then(data => {
          if (data.error) {
            throw new Error(data.error);
          }
          setUser(data);
        })
        .catch((err) => {
          console.error('Auth error:', err);
          localStorage.removeItem('token');
          setToken(null);
        });
    }
  }, [token]);

  const handleLogin = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  if (!token) {
    return <Login onLogin={handleLogin} darkMode={darkMode} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <nav style={{
        background: darkMode ? '#111827' : '#1f2937',
        color: 'white',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'var(--card-shadow)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Network size={28} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Net-Dog</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={toggleDarkMode}
            style={{
              background: darkMode ? '#374151' : '#4b5563',
              color: 'white',
              border: 'none',
              padding: '0.5rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <span style={{ opacity: 0.8 }}>{user?.username} ({user?.role})</span>
          <button
            onClick={handleLogout}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </nav>

      <div style={{ padding: '2rem' }}>
        <div style={{
          background: 'var(--bg-primary)',
          borderRadius: '0.5rem',
          boxShadow: 'var(--card-shadow)',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
            <TabButton
              active={activeTab === 'devices'}
              onClick={() => setActiveTab('devices')}
              icon={<Server size={18} />}
              label="Devices"
            />
            {user?.role === 'admin' && (
              <>
                <TabButton
                  active={activeTab === 'vlans'}
                  onClick={() => setActiveTab('vlans')}
                  icon={<Settings size={18} />}
                  label="VLANs"
                />
                <TabButton
                  active={activeTab === 'switches'}
                  onClick={() => setActiveTab('switches')}
                  icon={<Network size={18} />}
                  label="Switches"
                />
                <TabButton
                  active={activeTab === 'users'}
                  onClick={() => setActiveTab('users')}
                  icon={<Users size={18} />}
                  label="Users"
                />
              </>
            )}
          </div>
        </div>

        {activeTab === 'devices' && <DeviceTable token={token} isAdmin={user?.role === 'admin'} />}
        {activeTab === 'vlans' && <VlanSettings token={token} />}
        {activeTab === 'switches' && <SwitchConfig token={token} />}
        {activeTab === 'users' && <UserManagement token={token} />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '1rem 1.5rem',
        border: 'none',
        background: active ? 'var(--bg-secondary)' : 'transparent',
        borderBottom: active ? '2px solid var(--accent-color)' : '2px solid transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontWeight: active ? '600' : '400',
        color: active ? 'var(--accent-color)' : 'var(--text-secondary)',
        transition: 'all 0.2s'
      }}
    >
      {icon}
      {label}
    </button>
  );
}