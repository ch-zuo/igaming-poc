import React, { useState } from 'react';

function Login({ onLogin }) {
    const [token, setToken] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(token);
    };

    return (
        <div className="login-page">
            <div className="login-card glass-panel floating">
                <h1 className="logo-text" style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '16px' }}>NeoStrike</h1>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '40px', textAlign: 'center' }}>
                    ENTER THE GATEWAY
                </h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Identity Token</label>
                        <input
                            type="text"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            placeholder="Enter your access token..."
                            autoFocus
                        />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', padding: '16px' }}>
                        AUTHENTICATE
                    </button>
                </form>

                <div style={{ marginTop: '32px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Development Hint: Use <span style={{ color: 'var(--primary)' }}>'valid-token'</span> for mock access.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;

