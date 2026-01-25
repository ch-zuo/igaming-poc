import React, { useState, useEffect } from 'react';
import {
    getBalance,
    deposit,
    placeBet,
    getBonusList,
    creditBonus,
    triggerRegistration,
    updateUser,
    logout as apiLogout
} from '../services/api';
import axios from 'axios';

function Dashboard({ user: initialUser, token, onLogout }) {
    const [user, setUser] = useState(initialUser);
    const [balance, setBalance] = useState(0);
    const [bonusBalance, setBonusBalance] = useState(0);
    const [currency, setCurrency] = useState('EUR');
    const [status, setStatus] = useState('System ready');
    const [bonuses, setBonuses] = useState([]);
    const [marketingOpted, setMarketingOpted] = useState(true);

    const [firstName, setFirstName] = useState(user.first_name || '');
    const [lastName, setLastName] = useState(user.last_name || '');

    useEffect(() => {
        fetchBalance();
        loadBonuses();
    }, []);

    const fetchBalance = async () => {
        try {
            const data = await getBalance(token);
            setBalance(data.amount);
            setBonusBalance(data.bonus_amount || 0);
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
            setBonusBalance(data.bonus_amount || 0);
            setStatus('Deposit Success: +100 ' + data.currency);
        } catch (err) {
            setStatus('Deposit failed');
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const res = await updateUser(token, {
                first_name: firstName,
                last_name: lastName
            });
            setUser(res.user);
            setStatus('Profile updated & FT event sent!');
        } catch (err) {
            setStatus('Profile update failed');
        }
    };

    const handleToggleConsent = async () => {
        try {
            const newVal = !marketingOpted;
            setMarketingOpted(newVal);
            await axios.put('/api/userconsents/' + user.user_id, {
                consents: [
                    { opted_in: newVal, type: 'email' },
                    { opted_in: newVal, type: 'sms' }
                ]
            }, { headers: { Authorization: `Bearer ${token}` } });
            setStatus(`Consent [FT Consents] updated: ${newVal ? 'Opted-In' : 'Opted-Out'}`);
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

    const handleToggleBlock = async () => {
        try {
            await axios.put('/api/userblocks/' + user.user_id, {
                blocks: [
                    { active: true, type: 'Blocked', note: 'PoC Simulation' }
                ]
            }, { headers: { Authorization: `Bearer ${token}` } });
            setStatus('Block [FT Blocks] Event Sent');
        } catch (err) {
            setStatus('Block simulation failed');
        }
    };

    const handleRegistrationSim = async () => {
        try {
            await triggerRegistration(token);
            setStatus('Registration [FT Registration] Event Sent');
        } catch (err) {
            setStatus('Registration simulation failed');
        }
    };

    const handleLogoutSim = async () => {
        try {
            await apiLogout(token);
            setStatus('Logout [FT Logout] Event Sent');
            setTimeout(onLogout, 1500);
        } catch (err) {
            setStatus('Logout simulation failed');
        }
    };

    const handlePlayRound = async () => {
        try {
            setStatus('Spinning...');
            const betRes = await placeBet(token, user.user_id, 10);

            // Sync balances from server response immediately after bet
            setBalance(betRes.balance);
            setBonusBalance(betRes.bonus_balance || 0);

            setTimeout(async () => {
                const isWin = Math.random() > 0.7;
                if (isWin) {
                    const winAmount = 20;
                    const winRes = await axios.post('/api/credit', {
                        user_id: user.user_id,
                        amount: winAmount,
                        transaction_id: `ctx-${Date.now()}`,
                        game_id: 'slot-game-1'
                    }, { headers: { Authorization: `Bearer ${token}` } });

                    // Sync balances from server response after win
                    setBalance(winRes.data.balance);
                    setBonusBalance(winRes.data.bonus_balance || 0);
                    setStatus('BIG WIN: 20!');
                } else {
                    setStatus('No Win');
                    fetchBalance(); // Final sync
                }
            }, 800);
        } catch (err) {
            console.error(err);
            setStatus('Game Error');
        }
    };

    return (
        <div className="dashboard">
            <header>
                <div>
                    <h1 className="logo-text">NeoStrike</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        ID: <span style={{ color: 'var(--accent-blue)' }}>{user.user_id}</span>
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 700 }}>{user.username}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Player Status: VIP</p>
                    </div>
                    <button className="btn-outline" onClick={handleLogoutSim} style={{ padding: '8px 16px' }}>
                        Logout
                    </button>
                </div>
            </header>

            <div className="wallets-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div className="hero-balance floating">
                    <label>Real Balance</label>
                    <h2>{balance.toFixed(2)} <small style={{ fontSize: '1.2rem' }}>{currency}</small></h2>
                </div>
                <div className="hero-balance floating bonus-wallet" style={{ borderLeft: '4px solid var(--accent-gold, #ffd700)' }}>
                    <label>Bonus Balance</label>
                    <h2>{bonusBalance.toFixed(2)} <small style={{ fontSize: '1.2rem' }}>{currency}</small></h2>
                </div>
            </div>

            <div className="status-banner glass-panel" style={{ marginBottom: '24px', padding: '12px', textAlign: 'center', color: 'var(--primary)' }}>
                {status}
            </div>

            <div className="grid-layout">
                <div className="main-column">
                    <section className="glass-panel">
                        <div className="section-header">
                            <h3>🎰 Game Actions</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                            <button className="btn-primary" onClick={handleDeposit} style={{ height: '100px', fontSize: '1.1rem' }}>
                                Deposit 100 {currency}
                            </button>
                            <button className="btn-secondary" onClick={handlePlayRound} style={{ height: '100px', fontSize: '1.4rem' }}>
                                Play Slot (Bet 10)
                            </button>
                        </div>
                    </section>

                    <section className="glass-panel">
                        <div className="section-header">
                            <h3>👤 User Profile</h3>
                        </div>
                        <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>First Name</label>
                                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Surname</label>
                                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Surname" />
                            </div>
                            <button type="submit" className="btn-primary" style={{ padding: '14px 24px' }}>Update Profile</button>
                        </form>
                    </section>
                </div>

                <div className="side-column">
                    <section className="glass-panel">
                        <div className="section-header">
                            <h3>⚡ Simulation</h3>
                        </div>
                        <div className="sim-grid">
                            <button className="btn-outline" onClick={handleToggleBlock} style={{ gridColumn: 'span 2' }}>Sim Block Event</button>
                            <button className="btn-outline" onClick={handleToggleConsent} style={{ gridColumn: 'span 2' }}>
                                Marketing: {marketingOpted ? 'OPT-IN' : 'OPT-OUT'}
                            </button>
                        </div>
                    </section>

                    <section className="glass-panel">
                        <div className="section-header">
                            <h3>🎁 Active Bonuses</h3>
                        </div>
                        <div className="bonus-list">
                            {bonuses.length > 0 ? bonuses.map(b => (
                                <div key={b.value} className="bonus-card">
                                    <div>
                                        <h4>{b.text}</h4>
                                        <p>Limited time offer</p>
                                    </div>
                                    <button className="btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem' }} onClick={() => handleClaimBonus(b.value)}>
                                        Claim
                                    </button>
                                </div>
                            )) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No bonuses available at the moment.</p>}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;

