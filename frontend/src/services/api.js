import axios from 'axios';

// Use relative path for production (Vercel) and proxy for local dev
const API_URL = '/api';

export const login = async (username, token) => {
    const response = await axios.post(`${API_URL}/authenticate`, { username }, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const register = async (userData) => {
    const response = await axios.post(`${API_URL}/register`, userData);
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

export const getBonusList = async (token) => {
    const response = await axios.get(`${API_URL}/bonus/list`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const creditBonus = async (token, userId, bonusCode) => {
    const response = await axios.post(`${API_URL}/bonus/credit`, {
        user_id: userId,
        bonus_code: bonusCode
    }, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const creditBonusFunds = async (token, userId, amount, bonusCode) => {
    const response = await axios.post(`${API_URL}/bonus/credit/funds`, {
        user_id: userId,
        amount,
        bonus_code: bonusCode,
        currency: 'EUR'
    }, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const triggerRegistration = async (token) => {
    const response = await axios.post(`${API_URL}/registration`, {}, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const logout = async (token) => {
    const response = await axios.post(`${API_URL}/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const updateUser = async (token, userData) => {
    const response = await axios.post(`${API_URL}/user/update`, userData, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};
