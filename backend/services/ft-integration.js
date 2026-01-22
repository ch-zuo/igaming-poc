const axios = require('axios');

const FT_API_URL = process.env.FT_API_URL || 'https://api.fasttrack-integration.com/v1';
const FT_API_KEY = process.env.FT_API_KEY;

// Endpoint mapping based on FT Documentation
const EVENT_CONFIG = {
    'login': { path: '/v2/integration/login', method: 'POST' },
    'consents': { path: '/v2/integration/user/consents', method: 'PUT' },
    'blocks': { path: '/v2/integration/user/blocks', method: 'PUT' },
    'user_update': { path: '/v2/integration/user', method: 'PUT' }, // 'User Updates'
    'payment': { path: '/v1/integration/payment', method: 'POST' },
    'casino': { path: '/v1/integration/casino', method: 'POST' },
    'bonus': { path: '/v1/integration/bonus', method: 'POST' },
    'balance': { path: '/v1/integration/user/balances', method: 'POST' },

    // Aliases for internal events
    'deposit': { path: '/v1/integration/payment', method: 'POST' },
    'bet': { path: '/v1/integration/casino', method: 'POST' },
    'win': { path: '/v1/integration/casino', method: 'POST' }
};

const pushEvent = async (userId, eventType, payload) => {
    console.log(`[FT Integration] Pushing event: ${eventType} for user: ${userId}`, payload);

    if (!FT_API_KEY) {
        console.warn('[FT Integration] No API Key provided. Skipping actual HTTP request.');
        return;
    }

    const config = EVENT_CONFIG[eventType];
    if (!config) {
        console.error(`[FT Integration] Unknown event type: ${eventType}`);
        return;
    }

    try {
        const baseUrl = FT_API_URL.endsWith('/') ? FT_API_URL.slice(0, -1) : FT_API_URL;
        const targetUrl = `${baseUrl}${config.path}`;

        console.log(`[FT Integration] Target URL: ${targetUrl} [${config.method}]`);

        // Refine payload based on Fast Track documentation
        let requestBody = {
            user_id: userId,
            ...payload
        };

        // Event-specific data enrichment
        if (eventType === 'login') {
            requestBody = {
                user_id: userId,
                session_id: payload.session_id || `sess-${Date.now()}`,
                ip_address: payload.ip_address || '127.0.0.1',
                user_agent: payload.user_agent || 'Mozilla/5.0',
                device_type: payload.device_type || 'Desktop',
                timestamp: new Date().toISOString()
            };
        } else if (eventType === 'deposit' || eventType === 'payment') {
            requestBody = {
                user_id: userId,
                type: 'Deposit',
                status: 'Approved',
                amount: parseFloat(payload.amount),
                currency: payload.currency || 'EUR',
                transaction_id: payload.transaction_id || `tx-${Date.now()}`,
                provider: payload.provider || 'MockBank',
                balance_after: parseFloat(payload.balance_after),
                timestamp: new Date().toISOString()
            };
        } else if (eventType === 'bet' || eventType === 'win' || eventType === 'casino') {
            // Mapping to Fast Track Casino Schema
            requestBody = {
                user_id: userId,
                activity_id: payload.transaction_id || `ctx-${Date.now()}`,
                amount: parseFloat(payload.amount),
                balance_after: parseFloat(payload.balance_after),
                balance_before: parseFloat(payload.balance_after) + (eventType === 'win' ? -parseFloat(payload.amount) : parseFloat(payload.amount)),
                currency: payload.currency || 'EUR',
                game_id: payload.game_id || 'unknown',
                game_name: payload.game_id || 'Mock Slot Game',
                game_type: 'Slot',
                is_round_end: true,
                status: 'Approved',
                type: eventType === 'win' ? 'Win' : 'Bet',
                vendor_id: 'mock-vendor-1',
                vendor_name: payload.game_provider || 'MockProvider',
                timestamp: new Date().toISOString(), // .toISOString() is RFC3339 compliant (e.g., 2023-11-24T12:34:56.789Z)
                round_id: payload.transaction_id ? `round-${payload.transaction_id}` : `round-${Date.now()}`
            };
        }

        const response = await axios({
            method: config.method,
            url: targetUrl,
            data: requestBody,
            headers: {
                'X-API-Key': FT_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log('[FT Integration] Event pushed successfully:', response.data);
    } catch (error) {
        console.error('[FT Integration] Failed to push event:', error.message);
        if (error.response) {
            console.error('[FT Integration] Status:', error.response.status);
            console.error('[FT Integration] Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
};

module.exports = {
    pushEvent
};
