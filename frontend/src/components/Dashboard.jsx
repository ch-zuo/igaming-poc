import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ActivitySidebar from './ActivitySidebar';
import { getBalance, getBonusList, updateUser, creditBonus, triggerRegistration, logout as apiLogout } from '../services/api';

function Dashboard({ user: initialUser, token, onLogout }) {
    const [user, setUser] = useState(initialUser);
    const [balance, setBalance] = useState(0);
    const [bonusBalance, setBonusBalance] = useState(0);
    const [currency, setCurrency] = useState('EUR');
    const [status, setStatus] = useState('Dashboard Ready');
    const [firstName, setFirstName] = useState(user.first_name || '');
    const [lastName, setLastName] = useState(user.last_name || '');
    const [marketingOpted, setMarketingOpted] = useState(true);
    const [bonuses, setBonuses] = useState([]);
    const [inboundLogs, setInboundLogs] = useState([]);
    const [outboundLogs, setOutboundLogs] = useState([]);

    // Brand Settings for Fast Track On-Site
    const [brandName, setBrandName] = useState(user?.ft_brand_name || '');
    const [origin, setOrigin] = useState(user?.ft_origin || '');
    const [jwtSecret, setJwtSecret] = useState(user?.ft_jwt_secret || '');
    const [unreadCount, setUnreadCount] = useState(0);
    const [isFTInitialized, setIsFTInitialized] = useState(false);

    // Sync state if user prop changes (e.g. after login or update)
    useEffect(() => {
        if (user) {
            setBrandName(user.ft_brand_name || '');
            setOrigin(user.ft_origin || '');
            setJwtSecret(user.ft_jwt_secret || '');
        }
    }, [user]);

    // Poll for Backend <=> FT Activities (Source of Truth)
    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const response = await axios.get('/api/activities');
                const activities = response.data;

                const inbound = activities
                    .filter(a => a.type === 'inbound')
                    .map(a => ({
                        method: a.method,
                        endpoint: a.endpoint,
                        status: a.status,
                        payload: a.payload,
                        timestamp: a.timestamp
                    }));

                const outbound = activities
                    .filter(a => a.type === 'outbound')
                    .map(a => ({
                        method: a.method,
                        endpoint: a.endpoint,
                        status: a.status,
                        payload: a.payload,
                        timestamp: a.timestamp
                    }));

                setInboundLogs(inbound);
                setOutboundLogs(outbound);
            } catch (error) {
                console.error('Failed to fetch activity logs:', error);
            }
        };

        fetchActivities();
        const interval = setInterval(fetchActivities, 3000);
        return () => clearInterval(interval);
    }, []);

    // Fast Track On-Site Initializer
    useEffect(() => {
        // Only run if we HAVE settings and we HAVEN'T initialized yet
        // OR if the user object itself changes (meaning we just saved)
        const savedBrand = user.ft_brand_name;
        const savedOrigin = user.ft_origin;
        const savedSecret = user.ft_jwt_secret;

        if (!savedBrand || !savedOrigin || !savedSecret) return;

        const initFastTrack = async () => {
            try {
                // Prevent duplicate scripts
                const oldScript = document.getElementById('ft-onsite-script');
                if (oldScript) {
                    setIsFTInitialized(true);
                    return;
                }

                console.log('[FT OnSite] Initializing...');

                // 1. Get the JWT token from our backend
                const { data } = await axios.get('/api/ft-token', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // 2. Configure Fast Track
                window.fasttrackbrand = savedBrand;
                window.source = savedOrigin;
                window.fasttrack = {
                    enableJWT: true,
                    integrationVersion: 1.1,
                    autoInit: false,
                    inbox: { enable: true }
                };

                // 3. Load the script
                const script = document.createElement('script');
                script.id = 'ft-onsite-script';
                script.async = true;
                script.src = `https://lib-staging.rewards.tech/loader/fasttrack-crm.js?d=${new Date().setHours(0, 0, 0, 0)}`;

                script.onload = () => {
                    if (window.FastTrackLoader) {
                        new window.FastTrackLoader();
                        setTimeout(() => {
                            if (window.FasttrackCrm) {
                                window.FasttrackCrm.init(data.token);
                                console.log('[FT OnSite] Initialized with token');
                                setIsFTInitialized(true);
                            }
                        }, 1000);
                    }
                };

                document.body.appendChild(script);

                const badgeInterval = setInterval(() => {
                    const badge = document.getElementById('ft-crm-inbox-badge');
                    if (badge) setUnreadCount(parseInt(badge.innerText) || 0);
                }, 2000);

                return () => {
                    clearInterval(badgeInterval);
                };
            } catch (err) {
                console.error('[FT OnSite] Init Error:', err);
            }
        };

        initFastTrack();
    }, [user.ft_brand_name, user.ft_origin, user.ft_jwt_secret, token]);

    // Initial Data Fetch
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

    const deposit = async (token, amount) => {
        const res = await axios.post('/api/deposit', { amount }, { headers: { Authorization: `Bearer ${token}` } });
        return res.data;
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const res = await updateUser(token, { first_name: firstName, last_name: lastName });
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
                consents: [{ opted_in: newVal, type: 'email' }, { opted_in: newVal, type: 'sms' }]
            }, { headers: { Authorization: `Bearer ${token}` } });
            setStatus(`Consent updated: ${newVal ? 'Opted-In' : 'Opted-Out'}`);
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
                blocks: [{ active: true, type: 'Blocked', note: 'PoC Simulation' }]
            }, { headers: { Authorization: `Bearer ${token}` } });
            setStatus('Block Event Sent to FT');
        } catch (err) {
            setStatus('Block simulation failed');
        }
    };

    const handleLogoutSim = async () => {
        try {
            await apiLogout(token);
            setStatus('Logging out...');
            setTimeout(onLogout, 1000);
        } catch (err) {
            setStatus('Logout failed');
        }
    };

    const handleUpdateBrandSettings = async (e) => {
        e.preventDefault();
        try {
            const res = await updateUser(token, {
                ft_brand_name: brandName,
                ft_origin: origin,
                ft_jwt_secret: jwtSecret
            });
            setUser(res.user);
            setStatus('Brand settings saved! Fast Track re-initializing...');
        } catch (err) {
            setStatus('Failed to save brand settings');
        }
    };

    const handlePlayRound = async () => {
        try {
            setStatus('Spinning...');
            const betRes = await placeBet(token, user.user_id, 10);
            setBalance(betRes.balance);
            setBonusBalance(betRes.bonus_balance || 0);

            setTimeout(async () => {
                const isWin = Math.random() > 0.7;
                if (isWin) {
                    const winAmount = 20;
                    const winRes = await axios.post('/api/credit', {
                        user_id: user.user_id, amount: winAmount, transaction_id: `ctx-${Date.now()}`, game_id: 'slot-game-1'
                    }, { headers: { Authorization: `Bearer ${token}` } });
                    setBalance(winRes.data.balance);
                    setBonusBalance(winRes.data.bonus_balance || 0);
                    setStatus('BIG WIN: 20!');
                } else {
                    setStatus('No Win');
                    fetchBalance();
                }
            }, 800);
        } catch (err) {
            console.error(err);
            setStatus('Game Error');
        }
    };

    const placeBet = async (token, userId, amount) => {
        const res = await axios.post('/api/debit', { user_id: userId, amount, transaction_id: `tx-${Date.now()}`, game_id: 'slot-game-1' }, { headers: { Authorization: `Bearer ${token}` } });
        return res.data;
    };

    if (!user) return <div className="loading">Loading user session...</div>;

    return (
        <div className="dashboard">
            <header>
                <div>
                    <h1 className="logo-text">NeoStrike</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        ID: <span style={{ color: 'var(--accent-blue)' }}>{user?.user_id || user?.id || '---'}</span>
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    {/* Fast Track Inbox Button */}
                    <button
                        className="btn-outline"
                        onClick={() => window.FasttrackCrm?.toggleInbox()}
                        style={{ position: 'relative', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        Inbox
                        <span id="ft-crm-inbox-badge" className={`inbox-badge ${unreadCount > 0 ? 'active' : ''}`}>
                            {unreadCount}
                        </span>
                    </button>

                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 700 }}>{user?.username || 'Guest'}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Player Status: VIP</p>
                    </div>
                    <button className="btn-outline" onClick={handleLogoutSim} style={{ padding: '8px 16px' }}>Logout</button>
                </div>
            </header>

            {/* Fast Track Mandatory Container */}
            <div id="fasttrack-crm"></div>

            <div className="grid-layout">
                <div className="span-two">
                    <div className="wallets-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                        <div className="hero-balance floating">
                            <label>Real Balance</label>
                            <h2>{balance.toFixed(2)} <small style={{ fontSize: '1.2rem' }}>{currency}</small></h2>
                        </div>
                        <div className="hero-balance floating bonus-wallet">
                            <label>Bonus Balance</label>
                            <h2>{bonusBalance.toFixed(2)} <small style={{ fontSize: '1.2rem' }}>{currency}</small></h2>
                        </div>
                    </div>

                    <div className="status-banner glass-panel" style={{ marginBottom: '24px', padding: '12px', textAlign: 'center', color: 'var(--primary)' }}>
                        {status}
                    </div>

                    <div className="sub-grid-layout">
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
                                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Surname</label>
                                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
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
                                            <div style={{ flex: 1 }}>
                                                <h4>{b.text}</h4>
                                                <p>Limited time offer</p>
                                            </div>
                                            <button className="btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem' }} onClick={() => handleClaimBonus(b.value)}>
                                                Claim
                                            </button>
                                        </div>
                                    )) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No bonuses available.</p>}
                                </div>
                            </section>

                            <section className="glass-panel">
                                <div className="section-header">
                                    <h3>🏷️ Brand Configuration</h3>
                                </div>
                                <form onSubmit={handleUpdateBrandSettings} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Brand Name</label>
                                        <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. neostrike_dev" />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Origin / Source</label>
                                        <input type="text" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="e.g. igaming-poc" />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>JWT Secret (256-bit)</label>
                                        <input type="password" value={jwtSecret} onChange={(e) => setJwtSecret(e.target.value)} placeholder="Secret shared with FT" />
                                    </div>
                                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '8px' }}>Save & Init On-Site</button>
                                </form>
                            </section>
                        </div>
                    </div>
                </div>

                <ActivitySidebar inboundLogs={inboundLogs} outboundLogs={outboundLogs} />
            </div>
        </div>
    );
}

export default Dashboard;
