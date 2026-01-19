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

        // Standardize payload wrapping if needed, or pass 'payload' directly as 'data' 
        // Note: The specific schemas vary, but typically include user_id at top level.
        // Merging user_id into payload if not present.
        let requestBody = {
            user_id: userId,
            timestamp: new Date().toISOString(),
            ...payload
        };

        if (eventType === 'deposit') {
            requestBody = { ...requestBody, type: 'Credit', status: 'Approved', provider: 'MockBank' };
        } else if (eventType === 'bet') {
            requestBody = { ...requestBody, type: 'Bet', status: 'Approved', game_provider: 'MockProvider' };
        } else if (eventType === 'win') {
            requestBody = { ...requestBody, type: 'Win', status: 'Approved', game_provider: 'MockProvider' };
        }

        // For some endpoints like 'login', 'data' might be a specific object. 
        // Given the generic usage in operator.js, we assume 'payload' contains the specific fields 
        // required by the endpoint (or is the 'data' property itself).
        // For safety/flexibility, we just spread it.

        const response = await axios({
            method: config.method,
            url: targetUrl,
            data: requestBody,
            headers: {
                'Authorization': `Bearer ${FT_API_KEY}`,
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
