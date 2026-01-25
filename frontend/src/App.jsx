import React, { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { login } from './services/api';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [error, setError] = useState('');

  const handleLogin = (token, userData) => {
    setUser(userData);
    setToken(token);
    setError('');
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <div className="app-container">
      {error && <div className="error-banner">{error}</div>}

      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard user={user} token={token} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
