import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const login = async (token) => {
    const response = await axios.post(`${API_URL}/authenticate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const getBalance = async (token) => {
    const response = await axios.get(`${API_URL}/balance`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const deposit = async (token, amount) => {
    const response = await axios.post(`${API_URL}/deposit`, { amount }, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

// Simulation of Game Provider calling Backend
export const placeBet = async (token, userId, amount) => {
    // In real life, Game Client calls Game Server -> Game Server calls Core.
    // We will call Core directly here for simplicity, or use this in Game Simulator.
    // Note: Backend 'debit' requires 'user_id' in body, not token auth (S2S).
    const response = await axios.post(`${API_URL}/debit`, {
        user_id: userId,
        amount,
        transaction_id: `tx-${Date.now()}`,
        game_id: 'slot-game-1'
    }, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const winPrize = async (token, userId, amount) => {
    const response = await axios.post(`${API_URL}/credit`, {
        user_id: userId,
        amount,
        transaction_id: `tx-${Date.now()}`,
        game_id: 'slot-game-1'
    }, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};
