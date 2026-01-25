const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabase');
const ftService = require('../services/ft-integration');

const PLATFORM_ORIGIN = process.env.PLATFORM_ORIGIN || 'igaming-poc';

// Middleware to mock authentication or extract token
const authenticateUser = async (req, res, next) => {
    const token = req.headers['authorization'];
    const xUsername = req.headers['x-username'];
    const bodyUsername = req.body ? req.body.username : undefined;
    const username = xUsername || bodyUsername;
    const actualToken = token && token.startsWith('Bearer ') ? token.slice(7) : token;

    console.log(`[Middleware] Auth Attempt:
        Path: ${req.path}
        Method: ${req.method}
        Token: "${actualToken ? actualToken.substring(0, 10) + '...' : 'null'}"
        Header X-Username: "${xUsername}"
        Body Username: "${bodyUsername}"
        Final Username: "${username}"
    `);

    if (!actualToken) {
        console.log('[Middleware] Fail: No token provided');
        return res.status(401).json({ error: 'No token provided' });
    }

    const user = await supabaseService.getUser(username, actualToken);
    if (!user) {
        console.log(`[Middleware] Fail: User not found for token: ${actualToken.substring(0, 10)}... and username: ${username}`);
        return res.status(401).json({ error: 'Invalid username or token' });
    }

    console.log(`[Middleware] Success: User ${user.username || user.id} authenticated`);
    req.user = user;
    next();
};

router.post('/authenticate', authenticateUser, async (req, res) => {
    // If middleware passes, user is authenticated
    // Push 'login' and 'balance' events to FT
    await ftService.pushEvent(req.user.id, 'login', { session_id: 'mock-session-' + Date.now() });
    await ftService.pushEvent(req.user.id, 'balance', {
        amount: req.user.balance,
        bonus_amount: req.user.bonus_balance || 0,
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
        bonus_amount: req.user.bonus_balance || 0,
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
        const user = await supabaseService.getUser(null, actualToken);
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

    const totalBalance = (user.balance || 0) + (user.bonus_balance || 0);

    if (totalBalance < amount) {
        return res.status(402).json({ error: 'Insufficient funds' });
    }

    const bonus_balance_before = user.bonus_balance || 0;
    const balance_before = user.balance || 0;

    let remainingDebit = amount;
    let newBonusBalance = bonus_balance_before;
    let newBalance = balance_before;
    let bonus_wager_amount = 0;
    let real_wager_amount = 0;

    // 1. Deduct from Bonus Wallet first
    if (newBonusBalance > 0) {
        bonus_wager_amount = Math.min(newBonusBalance, remainingDebit);
        newBonusBalance -= bonus_wager_amount;
        remainingDebit -= bonus_wager_amount;
    }

    // 2. Deduct remaining from Real Wallet
    if (remainingDebit > 0) {
        real_wager_amount = remainingDebit;
        newBalance -= real_wager_amount;
    }

    await supabaseService.updateUser(user.id, {
        balance: newBalance,
        bonus_balance: newBonusBalance
    });

    // Push bet and balance events
    await ftService.pushEvent(user.id, 'bet', {
        amount,
        bonus_wager_amount,
        wager_amount: real_wager_amount,
        transaction_id,
        game_id,
        balance_before: balance_before,
        bonus_balance_before: bonus_balance_before,
        balance_after: newBalance,
        bonus_balance_after: newBonusBalance,
        currency: user.currency
    });

    await ftService.pushEvent(user.id, 'balance', {
        amount: newBalance,
        bonus_amount: newBonusBalance,
        currency: user.currency
    });

    res.json({
        transaction_id,
        balance: newBalance,
        bonus_balance: newBonusBalance,
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

    // Wins always go to Real balance
    const newBalance = user.balance + amount;
    const currentBonusBalance = user.bonus_balance || 0;

    await supabaseService.updateUser(user.id, { balance: newBalance });

    // Push win and balance events
    await ftService.pushEvent(user.id, 'win', {
        amount,
        transaction_id,
        game_id,
        balance_before: user.balance,
        bonus_balance_before: currentBonusBalance,
        balance_after: newBalance,
        bonus_balance_after: currentBonusBalance,
        currency: user.currency
    });

    await ftService.pushEvent(user.id, 'balance', {
        amount: newBalance,
        bonus_amount: currentBonusBalance,
        currency: user.currency
    });

    res.json({
        transaction_id,
        balance: newBalance,
        bonus_balance: currentBonusBalance,
        currency: user.currency,
        origin: PLATFORM_ORIGIN
    });
});

/**
 * 0. POST /registration
 * Explicitly triggers a registration event to FT.
 */
router.post('/registration', authenticateUser, async (req, res) => {
    await ftService.pushEvent(req.user.id, 'registration', {
        note: 'User registered via PoC platform',
        user_agent: req.headers['user-agent'],
        ip_address: req.ip
    });
    res.json({ status: 'success', message: 'Registration event pushed' });
});

/**
 * NEW Post /register
 * Handles signup process
 */
router.post('/register', async (req, res) => {
    const { username, first_name, last_name, email } = req.body;

    if (!username || !email) {
        return res.status(400).json({ error: 'Username and Email are required' });
    }

    // Generate a mock token for the user
    const token = `token-${username}-${Date.now()}`;

    try {
        const newUser = await supabaseService.createUser({
            username,
            first_name,
            last_name,
            email,
            token
        });

        // Push 'registration' event to FT
        await ftService.pushEvent(newUser.id, 'registration', {
            note: 'User registered via NeoStrike Gate',
            user_agent: req.headers['user-agent'],
            ip_address: req.ip,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            email: newUser.email
        });

        res.json({ status: 'success', user: newUser, token });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

/**
 * 0.5 POST /logout
 * Triggers a logout event to FT.
 */
router.post('/logout', authenticateUser, async (req, res) => {
    await ftService.pushEvent(req.user.id, 'logout', {});
    res.json({ status: 'success', message: 'Logout event pushed' });
});

/**
 * 0.6 POST /user/update
 * Updates user profile and triggers user_update event to FT.
 */
router.post('/user/update', authenticateUser, async (req, res) => {
    const { first_name, last_name, email } = req.body;

    const updates = {};
    if (first_name) updates.first_name = first_name;
    if (last_name) updates.last_name = last_name;
    if (email) updates.email = email;

    try {
        const updatedUser = await supabaseService.updateUser(req.user.id, updates);

        await ftService.pushEvent(req.user.id, 'user_update', {});

        res.json({ status: 'success', user: updatedUser });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user', details: error.message });
    }
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
        user_id: user.user_id || user.id,
        username: user.username || `user_${user.id}`,
        first_name: user.first_name || 'John',
        last_name: user.last_name || 'Doe',
        email: user.email || `${user.id}@example.com`,
        address: user.address || 'Tower Road, 120A',
        city: user.city || 'Sliema',
        country: user.country || 'MT',
        postal_code: user.postal_code || 'SLM 1030',
        language: user.language || 'en',
        currency: user.currency || 'EUR',
        birth_date: user.birth_date || '1990-01-01',
        registration_date: user.registration_date || '2023-01-01T08:00:00Z',
        mobile: user.mobile || '21435678',
        mobile_prefix: user.mobile_prefix || '+356',
        sex: user.sex || 'Male',
        title: user.title || 'Mr',
        is_blocked: user.is_blocked || false,
        is_excluded: user.is_excluded || false,
        market: user.market || 'gb',
        origin: user.origin || PLATFORM_ORIGIN,
        roles: user.roles || ["VIP", "TEST_USER"],
        registration_code: user.registration_code || "ABC123",
        affiliate_reference: user.affiliate_reference || "AFF_DEFAULT",
        verified_at: user.verified_at || '2023-01-01T08:00:00Z',
        bonus_balance: user.bonus_balance || 0,
        segmentation: user.segmentation || {
            vip_level: 1,
            special_segmentation: "PoC"
        }
    });
});

/**
 * 2. GET /userblocks/:userid
 * Returns player account blocks (mocked for PoC).
 */
router.get('/userblocks/:userid', verifyGameProviderOrUser, async (req, res) => {
    // For PoC, we return a compliant blocks object
    res.json({
        blocks: [
            {
                active: false,
                type: "Excluded",
                note: "Not excluded in PoC"
            },
            {
                active: false,
                type: "Blocked",
                note: "Not blocked in PoC"
            }
        ]
    });
});

/**
 * 2.5 PUT /userblocks/:userid
 * Receives block updates/simulations and pushes to FT.
 */
router.put('/userblocks/:userid', authenticateUser, async (req, res) => {
    const { userid } = req.params;
    const { blocks } = req.body;

    // Push 'blocks' event to FT
    await ftService.pushEvent(userid, 'blocks', { blocks });

    res.json({ status: 'success', origin: PLATFORM_ORIGIN });
});

/**
 * 3. GET /userconsents/:userid
 * Returns marketing/data consents (mocked for PoC).
 */
router.get('/userconsents/:userid', verifyGameProviderOrUser, async (req, res) => {
    // For PoC, we return standard marketing consents in compliant object format
    res.json({
        consents: [
            { opted_in: true, type: 'email' },
            { opted_in: true, type: 'sms' },
            { opted_in: false, type: 'telephone' },
            { opted_in: true, type: 'postMail' },
            { opted_in: true, type: 'siteNotification' },
            { opted_in: true, type: 'pushNotification' }
        ]
    });
});

/**
 * 3.5 POST /userconsents/:userid
 * Receives consent updates from FT.
 */
router.post('/userconsents/:userid', verifyGameProviderOrUser, async (req, res) => {
    const { userid } = req.params;
    const { consents } = req.body;

    console.log(`[Operator API] Consents updated for user ${userid}:`, consents);

    // Push 'consents' event to FT
    await ftService.pushEvent(userid, 'consents', { consents });

    // In dynamic PoC, we would update the DB here.
    // For now, we acknowledge success.
    res.json({ status: 'success', origin: PLATFORM_ORIGIN });
});

/**
 * 3.6 PUT /userconsents/:userid
 * Dashboard uses PUT to sync with FT events.
 */
router.put('/userconsents/:userid', authenticateUser, async (req, res) => {
    const { userid } = req.params;
    const { consents } = req.body;

    await ftService.pushEvent(userid, 'consents', { consents });

    res.json({ status: 'success', origin: PLATFORM_ORIGIN });
});

/**
 * 4. POST /bonus/credit
 * Processes bonus code-based crediting from FT.
 */
router.post('/bonus/credit', verifyGameProviderOrUser, async (req, res) => {
    const { user_id, bonus_code } = req.body;

    if (!user_id || !bonus_code) {
        return res.status(400).json({ error: 'Missing user_id or bonus_code' });
    }

    const user = await supabaseService.getUserById(user_id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // In dynamic PoC, validate bonus_code...
    // For now, we assume fixed $10 reward for any valid code
    const bonusAmount = 10.0;
    const currentBonusBalance = user.bonus_balance || 0;
    const newBonusBalance = currentBonusBalance + bonusAmount;

    await supabaseService.updateUser(user.id, { bonus_balance: newBonusBalance });

    // Push 'bonus' event back to FT
    await ftService.pushEvent(user.id, 'bonus', {
        amount: bonusAmount,
        bonus_code: bonus_code,
        bonus_id: 'POC-BONUS-101',
        status: 'Created',
        type: 'WelcomeBonus',
        currency: user.currency
    });

    // Sync balances (Both Real and Bonus)
    await ftService.pushEvent(user.id, 'balance', {
        amount: user.balance,
        bonus_amount: newBonusBalance,
        currency: user.currency
    });

    res.status(200).send('OK');
});

/**
 * 5. GET /bonus/list
 * Returns list of available bonuses for FT to display.
 */
router.get('/bonus/list', verifyGameProviderOrUser, async (req, res) => {
    res.json({
        "Data": [
            { "text": "Welcome Bonus 100%", "value": "WELCOME100" },
            { "text": "Free Spin Reward", "value": "FREESPIN20" },
            { "text": "Loyalty Credit", "value": "LOYALTY-VAL" }
        ],
        "Success": true,
        "Errors": []
    });
});

/**
 * 6. POST /bonus/credit/funds
 * Processes specific monetary bonus crediting from FT.
 */
router.post('/bonus/credit/funds', verifyGameProviderOrUser, async (req, res) => {
    const { user_id, bonus_code, amount, currency } = req.body;

    if (!user_id || amount === undefined) {
        return res.status(400).json({ error: 'Missing user_id or amount' });
    }

    const user = await supabaseService.getUserById(user_id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Note: Currency conversion could happen here if currency !== user.currency
    const currentBonusBalance = user.bonus_balance || 0;
    const newBonusBalance = currentBonusBalance + parseFloat(amount);

    await supabaseService.updateUser(user.id, { bonus_balance: newBonusBalance });

    // Push 'bonus' event
    await ftService.pushEvent(user.id, 'bonus', {
        amount: amount,
        bonus_code: bonus_code || 'FUNDS-REWARD',
        bonus_id: 'POC-FUNDS-REWARD',
        status: 'Created',
        type: 'ReloadBonus',
        currency: currency || user.currency
    });

    // Sync balances (Both Real and Bonus)
    await ftService.pushEvent(user.id, 'balance', {
        amount: user.balance,
        bonus_amount: newBonusBalance,
        currency: user.currency
    });

    res.status(200).send('OK');
});

module.exports = router;
