import React, { useState } from 'react';

function Login({ onLogin }) {
    const [token, setToken] = useState('valid-token');

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(token);
    };

    return (
        <div className="login-container">
            <h2>Welcome to Fast Track Casino</h2>
            <form onSubmit={handleSubmit}>
                <label>
                    Enter User Token:
                    <input
                        type="text"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                    />
                </label>
                <button type="submit">Login</button>
            </form>
            <p>Hint: Use 'valid-token' for mock user.</p>
        </div>
    );
}

export default Login;
