import React, { useState } from 'react';
import { login, register } from '../services/api';

function Login({ onLogin }) {
    const [activeTab, setActiveTab] = useState('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Login State
    const [username, setUsername] = useState('');
    const [token, setToken] = useState('');

    // Signup State
    const [signupData, setSignupData] = useState({
        username: 'Test User',
        first_name: '',
        last_name: '',
        email: ''
    });

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await login(username, token);
            onLogin(token, data);
        } catch (err) {
            setError('Invalid credentials. Please check your username and token.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await register(signupData);
            // Automatic login after signup
            onLogin(data.token, data.user);
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card glass-panel floating">
                <h1 className="logo-text" style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '8px' }}>NeoStrike</h1>
                <h2 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '32px', textAlign: 'center', letterSpacing: '4px' }}>
                    THE CORE PLATFORM
                </h2>

                <div className="auth-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
                    <button
                        className={`btn-tab ${activeTab === 'login' ? 'active' : ''}`}
                        onClick={() => setActiveTab('login')}
                        style={{ flex: 1, padding: '12px', background: activeTab === 'login' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: activeTab === 'login' ? 'var(--bg-dark)' : 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        SIGN IN
                    </button>
                    <button
                        className={`btn-tab ${activeTab === 'signup' ? 'active' : ''}`}
                        onClick={() => setActiveTab('signup')}
                        style={{ flex: 1, padding: '12px', background: activeTab === 'signup' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: activeTab === 'signup' ? 'var(--bg-dark)' : 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        SIGN UP
                    </button>
                </div>

                {error && <div className="error-message" style={{ color: '#ff4d4d', background: 'rgba(255,77,77,0.1)', padding: '12px', borderRadius: '4px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                {activeTab === 'login' ? (
                    <form onSubmit={handleLoginSubmit}>
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Access Token</label>
                            <input
                                type="password"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="Enter token"
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '16px', marginTop: '12px' }} disabled={loading}>
                            {loading ? 'AUTHENTICATING...' : 'ENTER ARENA'}
                        </button>
                        <div style={{ marginTop: '24px', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Use <span style={{ color: 'var(--primary)' }}>Test User</span> / <span style={{ color: 'var(--primary)' }}>valid-token</span>
                            </p>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleSignupSubmit}>
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                value={signupData.username}
                                onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                                placeholder="Choose a username"
                                required
                            />
                        </div>
                        <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label>First Name</label>
                                <input
                                    type="text"
                                    value={signupData.first_name}
                                    onChange={(e) => setSignupData({ ...signupData, first_name: e.target.value })}
                                    placeholder="First Name"
                                    required
                                />
                            </div>
                            <div>
                                <label>Surname</label>
                                <input
                                    type="text"
                                    value={signupData.last_name}
                                    onChange={(e) => setSignupData({ ...signupData, last_name: e.target.value })}
                                    placeholder="Surname"
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                value={signupData.email}
                                onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '16px', marginTop: '12px' }} disabled={loading}>
                            {loading ? 'CREATING IDENTITY...' : 'CREATE ACCOUNT'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default Login;

