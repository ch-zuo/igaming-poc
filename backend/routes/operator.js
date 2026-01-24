const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabase');
const ftService = require('../services/ft-integration');

const PLATFORM_ORIGIN = process.env.PLATFORM_ORIGIN || 'igaming-poc';

// Middleware to mock authentication or extract token
const authenticateUser = async (req, res, next) => {
    const token = req.headers['authorization'];
    const actualToken = token && token.startsWith('Bearer ') ? token.slice(7) : token;

    console.log(`[Middleware] Extracted Token: "${actualToken ? actualToken.substring(0, 5) : 'null'}..."`);

    if (!actualToken) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const user = await supabaseService.getUser(actualToken);
    if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
};

router.post('/authenticate', authenticateUser, async (req, res) => {
    // If middleware passes, user is authenticated
    // Push 'login' and 'balance' events to FT
    await ftService.pushEvent(req.user.id, 'login', { session_id: 'mock-session-' + Date.now() });
    await ftService.pushEvent(req.user.id, 'balance', {
        amount: req.user.balance,
        currency: req.user.currency
    });

    res.json({
        sid: 'session-' + req.user.id + '-' + Date.now(),
        user_id: req.user.id,
        currency: req.user.currency,
        origin: PLATFORM_ORIGIN
    });
});

router.get('/balance', authenticateUser, async (req, res) => {
    res.json({
        amount: req.user.balance,
        currency: req.user.currency,
        origin: PLATFORM_ORIGIN
    });
});

// Mock Game Provider calls these, likely with a different auth mechanism (Server-to-Server)
// For PoC, we'll assume the same auth for simplicity or a specific "Game Provider" secret.
// Let's implement a simple "Game Provider" check or just reuse user auth if the simulator acts on behalf of user.
// The prompt said "Mock Game Provider... hits the Core Platform's casino endpoint".
// Usually this is S2S. Let's assume a secret key check for debit/credit.

const verifyGameProviderOrUser = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const validKey = process.env.OPERATOR_API_KEY;

    // 1. Check if valid API Key is provided (Server-to-Server)
    if (validKey && apiKey === validKey) {
        return next();
    }

    // 2. Fallback: Check for User Token (Client-side Dashboard)
    // Reuse the logic from authenticateUser but handle the error/next flow carefully
    const token = req.headers['authorization'];
    const actualToken = token && token.startsWith('Bearer ') ? token.slice(7) : token;

    if (actualToken) {
        const user = await supabaseService.getUser(actualToken);
        if (user) {
            req.user = user;
            return next();
        }
    }

    // 3. Fail if neither
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key or Token' });
};

router.post('/debit', verifyGameProviderOrUser, async (req, res) => {
    const { user_id, amount, transaction_id, game_id } = req.body;

    if (!user_id || !amount) {
        return res.status(400).json({ error: 'Missing user_id or amount' });
    }

    const user = await supabaseService.getUserById(user_id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    if (user.balance < amount) {
        return res.status(402).json({ error: 'Insufficient funds' });
    }

    const newBalance = user.balance - amount;
    await supabaseService.updateBalance(user.id, newBalance);

    // Push bet and balance events
    await ftService.pushEvent(user.id, 'bet', {
        amount,
        transaction_id,
        game_id,
        balance_after: newBalance,
        currency: user.currency
    });
    await ftService.pushEvent(user.id, 'balance', {
        amount: newBalance,
        currency: user.currency
    });

    res.json({
        transaction_id,
        balance: newBalance,
        currency: user.currency,
        origin: PLATFORM_ORIGIN
    });
});

router.post('/credit', verifyGameProviderOrUser, async (req, res) => {
    const { user_id, amount, transaction_id, game_id } = req.body;

    if (!user_id || amount === undefined) {
        return res.status(400).json({ error: 'Missing user_id or amount' });
    }

    const user = await supabaseService.getUserById(user_id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const newBalance = user.balance + amount;
    await supabaseService.updateBalance(user.id, newBalance);

    // Push win and balance events
    await ftService.pushEvent(user.id, 'win', {
        amount,
        transaction_id,
        game_id,
        balance_after: newBalance,
        currency: user.currency
    });
    await ftService.pushEvent(user.id, 'balance', {
        amount: newBalance,
        currency: user.currency
    });

    res.json({
        transaction_id,
        balance: newBalance,
        currency: user.currency,
        origin: PLATFORM_ORIGIN
    });
});

// Helper for PoC Frontend "Deposit" button
router.post('/deposit', authenticateUser, async (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const newBalance = req.user.balance + amount;
    await supabaseService.updateBalance(req.user.id, newBalance);

    await ftService.pushEvent(req.user.id, 'deposit', {
        amount,
        balance_after: newBalance,
        currency: req.user.currency
    });
    await ftService.pushEvent(req.user.id, 'balance', {
        amount: newBalance,
        currency: req.user.currency
    });

    res.json({
        balance: newBalance,
        currency: req.user.currency,
        origin: PLATFORM_ORIGIN
    });
});

/**
 * 1. GET /userdetails/:userid
 * Returns user profile, balance, and currency.
 * Used by FT to verify user data on login or session start.
 */
router.get('/userdetails/:userid', verifyGameProviderOrUser, async (req, res) => {
    const { userid } = req.params;
    const user = await supabaseService.getUserById(userid);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({
        user_id: user.id,
        currency: user.currency,
        balance: user.balance,
        country: user.country || 'MT',
        first_name: user.first_name || 'John',
        last_name: user.last_name || 'Doe',
        email: user.email || `${user.id}@example.com`,
        origin: PLATFORM_ORIGIN
    });
});

/**
 * 2. GET /userblocks/:userid
 * Returns player account blocks (mocked for PoC).
 */
router.get('/userblocks/:userid', verifyGameProviderOrUser, async (req, res) => {
    // For PoC, we return an empty array (no blocks)
    res.json([]);
});

/**
 * 3. GET /userconsents/:userid
 * Returns marketing/data consents (mocked for PoC).
 */
router.get('/userconsents/:userid', verifyGameProviderOrUser, async (req, res) => {
    // For PoC, we return standard marketing consents
    res.json([
        { id: 'marketing_email', name: 'Email Marketing', value: true },
        { id: 'marketing_sms', name: 'SMS Marketing', value: false }
    ]);
});

/**
 * 4. POST /bonus/credit
 * Processes bonus crediting from FT.
 */
router.post('/bonus/credit', verifyGameProviderOrUser, async (req, res) => {
    const { user_id, amount, reward_id, transaction_id } = req.body;

    if (!user_id || amount === undefined) {
        return res.status(400).json({ error: 'Missing user_id or amount' });
    }

    const user = await supabaseService.getUserById(user_id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const newBalance = user.balance + parseFloat(amount);
    await supabaseService.updateBalance(user.id, newBalance);

    // Push 'bonus' event back to FT to confirm
    await ftService.pushEvent(user.id, 'bonus', {
        amount: amount,
        bonus_id: reward_id,
        transaction_id: transaction_id || `ft-bonus-${Date.now()}`,
        status: 'Created',
        type: 'Reward',
        currency: user.currency
    });

    // Also sync balance
    await ftService.pushEvent(user.id, 'balance', {
        amount: newBalance,
        currency: user.currency
    });

    res.json({
        transaction_id: transaction_id || `platform-bonus-${Date.now()}`,
        balance: newBalance,
        currency: user.currency,
        origin: PLATFORM_ORIGIN
    });
});

module.exports = router;
