const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabase');
const ftService = require('../services/ft-integration');

const PLATFORM_ORIGIN = process.env.PLATFORM_ORIGIN || 'igaming-poc';

// Middleware to mock authentication or extract token
const authenticateUser = async (req, res, next) => {
    const token = req.headers['authorization']; // Expecting "Bearer <token>"

    // For simplicity in this PoC, we might accept just the token string or Bearer
    const actualToken = token && token.startsWith('Bearer ') ? token.slice(7) : token;

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

// 1. Registrations
router.post('/register', async (req, res) => {
    const { user_id, email, currency } = req.body;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    // In a real app, we would create the user in Supabase here.
    // For the PoC, we just trigger the FT event.
    await ftService.pushEvent(user_id, 'register', {
        note: `New user registration: ${email || user_id}`,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
    });

    res.json({
        message: 'User registered (PoC)',
        user_id,
        origin: PLATFORM_ORIGIN
    });
});

// 2. User Consents
router.post('/user/consents', authenticateUser, async (req, res) => {
    await ftService.pushEvent(req.user.id, 'consents', {
        timestamp: new Date().toISOString()
    });

    res.json({
        message: 'Consents updated',
        user_id: req.user.id,
        origin: PLATFORM_ORIGIN
    });
});

// 3. User Blocks
router.post('/user/blocks', authenticateUser, async (req, res) => {
    const { blocked } = req.body; // boolean
    await ftService.pushEvent(req.user.id, 'blocks', {
        status: blocked ? 'Blocked' : 'Unblocked',
        timestamp: new Date().toISOString()
    });

    res.json({
        message: `User ${blocked ? 'blocked' : 'unblocked'}`,
        user_id: req.user.id,
        origin: PLATFORM_ORIGIN
    });
});

// 4. User Updates
router.post('/user/update', authenticateUser, async (req, res) => {
    const { first_name, last_name } = req.body;
    await ftService.pushEvent(req.user.id, 'user_update', {
        first_name,
        last_name,
        timestamp: new Date().toISOString()
    });

    res.json({
        message: 'User profile updated',
        user_id: req.user.id,
        origin: PLATFORM_ORIGIN
    });
});

// 5. Bonus
router.post('/bonus', authenticateUser, async (req, res) => {
    const { bonus_id, amount } = req.body;
    await ftService.pushEvent(req.user.id, 'bonus', {
        bonus_id: bonus_id || 'WELCOME_POC',
        amount: parseFloat(amount || 50),
        currency: req.user.currency,
        status: 'Created'
    });

    res.json({
        message: 'Bonus awarded',
        user_id: req.user.id,
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

module.exports = router;
