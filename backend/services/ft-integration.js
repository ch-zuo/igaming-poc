const axios = require('axios');

const FT_API_URL = process.env.FT_API_URL || 'https://api.fasttrack-integration.com/v1';
const FT_API_KEY = process.env.FT_API_KEY;
const PLATFORM_ORIGIN = process.env.PLATFORM_ORIGIN || 'igaming-poc';

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
        const origin = PLATFORM_ORIGIN;
        const timestamp = new Date().toISOString();
        let requestBody = {};

        // Event-specific data enrichment
        if (eventType === 'login') {
            requestBody = {
                user_id: userId,
                is_impersonated: payload.is_impersonated || false,
                ip_address: payload.ip_address || '127.0.0.1',
                user_agent: payload.user_agent || 'Mozilla/5.0',
                timestamp: timestamp,
                origin: origin
            };
        } else if (eventType === 'registration' || eventType === 'register') {
            requestBody = {
                user_id: userId,
                note: payload.note || 'New user registration',
                user_agent: payload.user_agent || 'Mozilla/5.0',
                ip_address: payload.ip_address || '127.0.0.1',
                timestamp: timestamp,
                origin: origin
            };
        } else if (['consents', 'blocks', 'user_update'].includes(eventType)) {
            requestBody = {
                user_id: userId,
                timestamp: timestamp,
                origin: origin
            };
        } else if (eventType === 'deposit' || eventType === 'payment') {
            requestBody = {
                user_id: userId,
                payment_id: payload.transaction_id || `tx-${Date.now()}`,
                type: 'Credit', // Fast Track expects 'Credit' for Deposits
                status: payload.status || 'Approved', // Requested, Approved, Rejected, Rollback, Cancelled
                cashtype: 'cash',
                amount: parseFloat(payload.amount),
                currency: payload.currency || 'EUR',
                exchange_rate: payload.exchange_rate || 1.0,
                fee_amount: payload.fee_amount || 0.0,
                vendor_id: payload.vendor_id || 'mock-bank-1',
                vendor_name: payload.provider || 'MockBank',
                origin: origin,
                timestamp: timestamp
            };
            console.log(`[FT Integration] Payment payload: ${JSON.stringify(requestBody, null, 2)}`);
        } else if (eventType === 'bet' || eventType === 'win' || eventType === 'casino') {
            requestBody = {
                user_id: userId,
                activity_id: payload.transaction_id || `ctx-${Date.now()}`,
                type: eventType === 'win' ? 'Win' : 'Bet',
                status: 'Approved',
                amount: parseFloat(payload.amount),
                balance_after: parseFloat(payload.balance_after),
                balance_before: parseFloat(payload.balance_after) + (eventType === 'win' ? -parseFloat(payload.amount) : parseFloat(payload.amount)),
                currency: payload.currency || 'EUR',
                exchange_rate: payload.exchange_rate || 1.0,
                game_id: payload.game_id || 'unknown',
                game_name: payload.game_name || 'Mock Slot Game',
                game_type: payload.game_type || 'Slot',
                vendor_id: payload.vendor_id || 'mock-vendor-1',
                vendor_name: payload.game_provider || 'MockProvider',
                round_id: payload.round_id || (payload.transaction_id ? `round-${payload.transaction_id}` : `round-${Date.now()}`),
                is_round_end: payload.is_round_end !== undefined ? payload.is_round_end : true,
                origin: origin,
                timestamp: timestamp
            };
        } else if (eventType === 'bonus') {
            requestBody = {
                user_id: userId,
                bonus_id: payload.bonus_id || '9821',
                user_bonus_id: payload.user_bonus_id || `ub-${Date.now()}`,
                type: payload.type || 'WelcomeBonus',
                status: payload.status || 'Created',
                amount: parseFloat(payload.amount),
                currency: payload.currency || 'EUR',
                exchange_rate: payload.exchange_rate || 1.0,
                locked_amount: payload.locked_amount || 0.0,
                bonus_turned_real: payload.bonus_turned_real || 0,
                required_wagering_amount: payload.required_wagering_amount || 0.0,
                product: payload.product || 'Casino',
                origin: origin,
                timestamp: timestamp,
                meta: payload.meta || {},
                fasttrack_references: payload.fasttrack_references || {}
            };
        } else if (eventType === 'balance') {
            requestBody = {
                user_id: userId,
                balances: payload.balances || [
                    {
                        amount: parseFloat(payload.amount || 0),
                        currency: payload.currency || 'EUR',
                        key: 'real_money',
                        exchange_rate: 1
                    },
                    {
                        amount: parseFloat(payload.bonus_amount || 0),
                        currency: payload.currency || 'EUR',
                        key: 'bonus_money',
                        exchange_rate: 1
                    }
                ],
                origin: origin,
                timestamp: timestamp
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
