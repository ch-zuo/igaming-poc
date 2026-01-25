import React, { useState, useEffect } from 'react';
import { getBalance, deposit, placeBet, getBonusList, creditBonus, creditBonusFunds } from '../services/api';
import axios from 'axios';

function Dashboard({ user, token, onLogout }) {
    const [balance, setBalance] = useState(0);
    const [currency, setCurrency] = useState('EUR');
    const [status, setStatus] = useState('');
    const [bonuses, setBonuses] = useState([]);
    const [marketingOpted, setMarketingOpted] = useState(true);

    useEffect(() => {
        fetchBalance();
        loadBonuses();
    }, []);

    const fetchBalance = async () => {
        try {
            const data = await getBalance(token);
            setBalance(data.amount);
            setCurrency(data.currency);
        } catch (err) {
            console.error(err);
        }
    };

    const loadBonuses = async () => {
        try {
            const res = await getBonusList(token);
            setBonuses(res.Data || []);
        } catch (err) {
            console.error('Failed to load bonuses');
        }
    };

    const handleDeposit = async () => {
        try {
            const data = await deposit(token, 100);
            setBalance(data.balance);
            setStatus('Deposited 100 ' + data.currency);
        } catch (err) {
            setStatus('Deposit failed');
        }
    };

    const handleToggleConsent = async () => {
        try {
            const newVal = !marketingOpted;
            setMarketingOpted(newVal);
            // Simulate triggering the 'consents' event to FT via a backend proxy or direct call if implemented
            await axios.put('/api/userconsents/' + user.user_id, {
                consents: [{ opted_in: newVal, type: 'email' }]
            }, { headers: { Authorization: `Bearer ${token}` } });
            setStatus(`Marketing Consent set to: ${newVal}`);
        } catch (err) {
            setStatus('Consent update failed');
        }
    };

    const handleClaimBonus = async (code) => {
        try {
            await creditBonus(token, user.user_id, code);
            setStatus(`Bonus ${code} claimed!`);
            fetchBalance();
        } catch (err) {
            setStatus('Bonus claim failed');
        }
    };

    const handleSimulateRegistration = async () => {
        try {
            // We use a backend endpoint that proxies to ftService.pushEvent(..., 'registration')
            // For PoC, let's assume we implement a generic 'trace-event' or trigger it via a mock 'register' action
            await axios.post('/api/authenticate', {}, { headers: { Authorization: `Bearer ${token}` } });
            setStatus('Registration event simulated (via Login)');
        } catch (err) {
            setStatus('Registration simulation failed');
        }
    };

    // Simple in-dashboard game simulator
    const handlePlayRound = async () => {
        try {
            setStatus('Spinning...');
            await placeBet(token, user.user_id, 10);
            setBalance(b => b - 10);

            setTimeout(async () => {
                const isWin = Math.random() > 0.7;
                if (isWin) {
                    const winAmount = 20;
                    // In a real flow, the Game Provider calls the Credit endpoint.
                    // Here we mock it via the dashboard for PoC simplicity.
                    await axios.post('/api/credit', {
                        user_id: user.user_id,
                        amount: winAmount,
                        transaction_id: `ctx-${Date.now()}`,
                        game_id: 'slot-game-1'
                    }, { headers: { Authorization: `Bearer ${token}` } });

                    setBalance(b => b + winAmount);
                    setStatus('You Won 20!');
                } else {
                    setStatus('No Win');
                    fetchBalance();
                }
            }, 1000);
        } catch (err) {
            console.error(err);
            setStatus('Game Error');
        }
    };

    return (
        <div className="dashboard">
            <header>
                <h1>Player Dashboard</h1>
                <p>Welcome, {user.first_name} ({user.user_id})</p>
                <button onClick={onLogout}>Logout</button>
            </header>

            <div className="stats" style={{ background: '#f4f4f4', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <h2>Balance: {balance.toFixed(2)} {currency}</h2>
                <p className="status" style={{ fontWeight: 'bold', color: '#2c3e50' }}>{status}</p>
            </div>

            <div className="action-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <section className="main-actions">
                    <h3>Game Actions</h3>
                    <button className="btn-primary" onClick={handleDeposit}>Deposit 100</button>
                    <button className="btn-secondary" onClick={handlePlayRound} style={{ marginTop: '10px' }}>Play Slot (Bet 10)</button>
                </section>

                <section className="simulation-center">
                    <h3>Simulation Center (FT Events)</h3>

                    <div className="sim-box" style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '5px' }}>
                        <p><strong>Compliance & Identity</strong></p>
                        <button onClick={handleToggleConsent} style={{ marginRight: '5px' }}>
                            Toggle Marketing: {marketingOpted ? 'ON' : 'OFF'}
                        </button>
                        <button onClick={handleSimulateRegistration}>
                            Simulate Reg Event
                        </button>
                    </div>

                    <div className="sim-box" style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '5px', marginTop: '10px' }}>
                        <p><strong>Available Bonuses</strong></p>
                        {bonuses.map(b => (
                            <button key={b.value} onClick={() => handleClaimBonus(b.value)} style={{ marginRight: '5px', fontSize: '12px' }}>
                                Claim {b.text}
                            </button>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Dashboard;
