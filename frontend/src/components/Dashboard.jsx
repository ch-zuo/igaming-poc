import React, { useState, useEffect } from 'react';
import { getBalance, deposit, placeBet, winPrize } from '../services/api';

function Dashboard({ user, token, onLogout }) {
    const [balance, setBalance] = useState(0);
    const [currency, setCurrency] = useState('EUR');
    const [status, setStatus] = useState('');

    useEffect(() => {
        fetchBalance();
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

    const handleDeposit = async () => {
        try {
            const data = await deposit(token, 100);
            setBalance(data.balance);
            setStatus('Deposited 100 ' + data.currency);
        } catch (err) {
            setStatus('Deposit failed');
        }
    };

    // Simple in-dashboard game simulator
    const handlePlayRound = async () => {
        try {
            setStatus('Spinning...');
            // 1. Bet 10
            await placeBet(token, user.user_id, 10);
            setBalance(b => b - 10); // Optimistic update or refetch

            // 2. Random Win
            setTimeout(async () => {
                const isWin = Math.random() > 0.7;
                if (isWin) {
                    const winAmount = 20;
                    await winPrize(token, user.user_id, winAmount);
                    setBalance(b => b + winAmount);
                    setStatus('You Won 20!');
                } else {
                    setStatus('No Win');
                    // Re-fetch to sync
                    fetchBalance();
                }
            }, 1000);
        } catch (err) {
            console.error(err);
            setStatus('Game Error: ' + err.response?.data?.error);
        }
    };

    return (
        <div className="dashboard">
            <header>
                <h1>Player Dashboard</h1>
                <button onClick={onLogout}>Logout</button>
            </header>

            <div className="stats">
                <h2>Balance: {balance} {currency}</h2>
                <p className="status">{status}</p>
            </div>

            <div className="actions">
                <button className="btn-primary" onClick={handleDeposit}>Deposit 100</button>
                <button className="btn-secondary" onClick={handlePlayRound}>Play Slot (Bet 10)</button>
            </div>
        </div>
    );
}

export default Dashboard;
