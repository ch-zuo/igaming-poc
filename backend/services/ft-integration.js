const axios = require('axios');

const FT_API_URL = process.env.FT_API_URL || 'https://api.fasttrack-integration.com/v1';
const FT_API_KEY = process.env.FT_API_KEY;
const PLATFORM_ORIGIN = process.env.PLATFORM_ORIGIN || 'igaming-poc';

const activityBuffer = [];
const MAX_BUFFER_SIZE = 50;

const cleanPayload = (obj) => {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        const cleanedArr = obj.map(cleanPayload).filter(v => v !== null && v !== undefined);
        return cleanedArr.length > 0 ? cleanedArr : null;
    }
    const entries = Object.entries(obj)
        .map(([k, v]) => [k, cleanPayload(v)])
        .filter(([_, v]) => v !== null && v !== undefined && (typeof v !== 'object' || Object.keys(v).length > 0));
    return entries.length > 0 ? Object.fromEntries(entries) : null;
};

const logActivity = (type, data) => {
    activityBuffer.unshift({
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        type, // 'inbound' or 'outbound'
        ...cleanPayload(data)
    });
    if (activityBuffer.length > MAX_BUFFER_SIZE) {
        activityBuffer.pop();
    }
};

const getActivities = () => activityBuffer;

// Endpoint mapping based on FT Documentation
const EVENT_CONFIG = {
    'login': { path: '/v2/integration/login', method: 'POST' },
    'consents': { path: '/v2/integration/user/consents', method: 'PUT' },
    'blocks': { path: '/v2/integration/user/blocks', method: 'PUT' },
    'registration': { path: '/v2/integration/user', method: 'POST' },
    'user_update': { path: '/v2/integration/user', method: 'PUT' },
    'logout': { path: '/v2/integration/logout', method: 'POST' },
    'payment': { path: '/v1/integration/payment', method: 'POST' },
    'casino': { path: '/v1/integration/casino', method: 'POST' },
    'bonus': { path: '/v1/integration/bonus', method: 'POST' },
    'balance': { path: '/v1/integration/user/balances', method: 'POST' },

    'deposit': { path: '/v1/integration/payment', method: 'POST' },
    'bet': { path: '/v1/integration/casino', method: 'POST' },
    'win': { path: '/v1/integration/casino', method: 'POST' }
};

const pushEvent = async (userId, eventType, payload) => {
    console.log(`[FT Integration] Pushing event: ${eventType} for user: ${userId}`, payload);

    if (!FT_API_KEY) {
        console.warn('[FT Integration] No API Key provided. Skipping actual HTTP request.');
        const config = EVENT_CONFIG[eventType];
        const mockLog = {
            method: config?.method || 'POST',
            url: `MOCK_URL${config?.path || ''}`,
            path: config?.path?.replace(/^\/v[12]\/integration/, '') || 'unknown',
            request: { info: 'API Key missing', type: eventType, userId },
            response: { status: 'mocked', message: 'No API Key' },
            status: 200
        };
        logActivity('outbound', {
            method: mockLog.method,
            endpoint: mockLog.path,
            status: mockLog.status,
            payload: { request: mockLog.request, response: mockLog.response }
        });
        return mockLog;
    }

    const config = EVENT_CONFIG[eventType];
    if (!config) {
        console.error(`[FT Integration] Unknown event type: ${eventType}`);
        return;
    }

    const baseUrl = FT_API_URL.endsWith('/') ? FT_API_URL.slice(0, -1) : FT_API_URL;
    const targetUrl = `${baseUrl}${config.path}`;
    const timestamp = new Date().toISOString();
    let requestBody = {};

    // Logic to build requestBody based on eventType (simplified for brevity here, but I'll restore the full logic)
    if (eventType === 'login') {
        requestBody = { user_id: userId, is_impersonated: payload.is_impersonated || false, ip_address: payload.ip_address || '127.0.0.1', user_agent: payload.user_agent || 'Mozilla/5.0', timestamp, origin: PLATFORM_ORIGIN };
    } else if (eventType === 'registration') {
        requestBody = { user_id: userId, note: payload.note || 'New user registration', user_agent: payload.user_agent || 'Mozilla/5.0', ip_address: payload.ip_address || '127.0.0.1', timestamp, origin: PLATFORM_ORIGIN };
    } else if (eventType === 'user_update' || eventType === 'consents' || eventType === 'blocks' || eventType === 'logout') {
        requestBody = { user_id: userId, timestamp, origin: PLATFORM_ORIGIN };
    } else if (eventType === 'deposit' || eventType === 'payment') {
        requestBody = { user_id: userId, payment_id: payload.transaction_id || `tx-${Date.now()}`, type: 'Credit', status: payload.status || 'Approved', cashtype: 'cash', amount: parseFloat(payload.amount), currency: payload.currency || 'EUR', exchange_rate: payload.exchange_rate || 1.0, fee_amount: payload.fee_amount || 0.0, vendor_id: payload.vendor_id || 'mock-bank-1', vendor_name: payload.provider || 'MockBank', origin: PLATFORM_ORIGIN, timestamp };
    } else if (eventType === 'bet' || eventType === 'win' || eventType === 'casino') {
        requestBody = { user_id: userId, activity_id: payload.transaction_id || `ctx-${Date.now()}`, type: eventType === 'win' ? 'Win' : 'Bet', status: 'Approved', amount: parseFloat(payload.amount), bonus_wager_amount: parseFloat(payload.bonus_wager_amount || 0), wager_amount: parseFloat(payload.wager_amount || 0), balance_after: payload.balance_after, balance_before: payload.balance_before, bonus_balance_after: payload.bonus_balance_after, bonus_balance_before: payload.bonus_balance_before, currency: payload.currency || 'EUR', exchange_rate: payload.exchange_rate || 1.0, game_id: payload.game_id || 'unknown', game_name: payload.game_name || 'Mock Slot Game', game_type: payload.game_type || 'Slot', vendor_id: payload.vendor_id || 'mock-vendor-1', vendor_name: payload.game_provider || 'MockProvider', round_id: payload.round_id || (payload.transaction_id ? `round-${payload.transaction_id}` : `round-${Date.now()}`), is_round_end: payload.is_round_end !== undefined ? payload.is_round_end : true, origin: PLATFORM_ORIGIN, timestamp };
    } else if (eventType === 'bonus') {
        requestBody = { user_id: userId, bonus_id: payload.bonus_id || '9821', user_bonus_id: payload.user_bonus_id || `${userId}-${payload.bonus_id || '9821'}`, type: payload.type || 'WelcomeBonus', status: payload.status || 'Created', amount: parseFloat(payload.amount || 0), bonus_code: payload.bonus_code || 'WELCOME100', currency: payload.currency || 'EUR', exchange_rate: payload.exchange_rate || 1.0, locked_amount: parseFloat(payload.locked_amount || 0.0), bonus_turned_real: parseFloat(payload.bonus_turned_real || 0.0), required_wagering_amount: parseFloat(payload.required_wagering_amount || 0.0), product: payload.product || 'Casino', origin: PLATFORM_ORIGIN, timestamp, meta: payload.meta || {}, fasttrack_references: payload.fasttrack_references || {} };
    } else if (eventType === 'balance') {
        requestBody = { user_id: userId, balances: payload.balances || [{ amount: parseFloat(payload.amount || 0), currency: payload.currency || 'EUR', key: 'real_money', exchange_rate: 1 }, { amount: parseFloat(payload.bonus_amount || 0), currency: payload.currency || 'EUR', key: 'bonus_money', exchange_rate: 1 }], origin: PLATFORM_ORIGIN, timestamp };
    }

    try {
        const response = await axios({
            method: config.method,
            url: targetUrl,
            data: requestBody,
            headers: { 'X-API-Key': FT_API_KEY, 'Content-Type': 'application/json' }
        });

        const telemetry = {
            method: config.method,
            url: targetUrl,
            path: config.path.replace(/^\/v[12]\/integration/, ''), // Shortened path for display
            request: requestBody,
            response: response.data,
            status: response.status
        };
        logActivity('outbound', {
            method: telemetry.method,
            endpoint: telemetry.path,
            status: telemetry.status,
            payload: { request: telemetry.request, response: telemetry.response }
        });
        return telemetry;
    } catch (error) {
        const errorData = {
            method: config?.method || 'POST',
            url: targetUrl,
            path: config?.path?.replace(/^\/v[12]\/integration/, '') || 'unknown',
            request: requestBody,
            error: error.message,
            status: error.response?.status || 500,
            response: error.response?.data
        };
        logActivity('outbound', {
            method: errorData.method,
            endpoint: errorData.path,
            status: errorData.status,
            payload: { request: errorData.request, response: errorData.response || { error: error.message } }
        });
        return errorData;
    }
};

module.exports = {
    pushEvent,
    logActivity,
    getActivities
};
