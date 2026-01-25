const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Top-level diagnostics for Vercel
console.log('[Supabase Init] SUPABASE_URL length:', supabaseUrl ? supabaseUrl.length : 'undefined');
console.log('[Supabase Init] SUPABASE_ANON_KEY length:', supabaseKey ? supabaseKey.length : 'undefined');
console.log('[Supabase Init] All ENV keys starting with SUPA:', Object.keys(process.env).filter(k => k.startsWith('SUPA')));

let supabase;

// Mock DB for development if credentials are missing
const mockDB = {
    users: new Map([
        ['test-user', {
            id: 'test-user',
            'user_update': { path: '/v2/integration/user', method: 'POST' }, // Changed from PUT to POST for upsert pattern
            user_id: 'test-user',
            username: 'Test User',
            balance: 1000,
            bonus_balance: 0,
            currency: 'EUR',
            token: 'valid-token',
            country: 'MT',
            language: 'en',
            first_name: 'John',
            last_name: 'Doe',
            email: 'test-user@example.com',
            address: 'Tower Road, 120A',
            birth_date: '1990-01-01',
            city: 'Sliema',
            mobile: '21435678',
            mobile_prefix: '+356',
            registration_date: '2023-01-01T08:00:00Z',
            postal_code: 'SLM 1030',
            sex: 'Male',
            title: 'Mr',
            is_blocked: false,
            is_excluded: false,
            market: 'gb',
            roles: ["VIP", "TEST_USER"],
            registration_code: "ABC123",
            verified_at: "2023-01-01T08:00:00Z",
            affiliate_reference: "AFF_1234A_UK"
        }]
    ]),
};

if (supabaseUrl && supabaseKey) {
    console.log('[Supabase Init] Initializing Supabase Client...');
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.warn('[Supabase Init] Supabase credentials not found. Falling back to Mock DB.');
}

const getUser = async (username, token) => {
    const cleanToken = token ? token.trim() : '';
    const cleanUsername = username ? username.trim().toLowerCase() : '';

    console.log(`[Supabase Service] getUser Attempt:
        Username: "${cleanUsername}"
        Token: "${cleanToken.substring(0, 10)}..."
    `);

    // 1. Check Mock DB first for PoC/Testing
    for (const user of mockDB.users.values()) {
        if (user.token === cleanToken && user.username.toLowerCase() === cleanUsername) {
            console.log('[Supabase Service] Success: Found in Mock DB');
            return user;
        }
    }

    // 2. Fallback to Supabase if initialized
    if (supabase) {
        console.log('[Supabase Service] Querying Supabase users table...');
        const { data, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('token', cleanToken)
            .single();

        if (dbError) {
            console.log(`[Supabase Service] DB Error or No Row found by token: ${dbError.message}`);
        }

        if (data) {
            console.log(`[Supabase Service] Success: Found in Supabase table. Username in DB: ${data.username}`);
            return data;
        }

        console.log('[Supabase Service] Row not found in users table. Trying Supabase Auth fallback...');
        try {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (user) {
                console.log('[Supabase Service] Success: Found via Supabase Auth');
                return user;
            }
        } catch (e) {
            console.log(`[Supabase Service] Auth fallback error: ${e.message}`);
        }
    }

    console.log('[Supabase Service] Fail: User not found in Mock DB, Supabase table, or Auth fallback');
    return null;
};

const getUserById = async (userId) => {
    if (supabase) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) return null;
        return data;
    } else {
        return mockDB.users.get(userId) || null;
    }
}

const updateUser = async (userId, updates) => {
    // 1. Check Mock DB first
    const mockUser = mockDB.users.get(userId);
    if (mockUser) {
        console.log('[Supabase] Updating user in Mock DB');
        const updatedUser = { ...mockUser, ...updates };
        mockDB.users.set(userId, updatedUser);
        return updatedUser;
    }

    // 2. Fallback to Supabase
    if (supabase) {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select();
        if (error) throw error;
        return data[0];
    }

    throw new Error('User not found');
};

const createUser = async (userData) => {
    const id = userData.username || `user_${Date.now()}`;
    const newUser = {
        id,
        user_id: id,
        balance: 1000,
        currency: 'EUR',
        registration_date: new Date().toISOString(),
        ...userData
    };

    if (supabase) {
        const { data, error } = await supabase
            .from('users')
            .insert([newUser])
            .select();
        if (error) throw error;
        return data[0];
    } else {
        mockDB.users.set(id, newUser);
        return newUser;
    }
};

const updateBalance = async (userId, newBalance) => {
    return updateUser(userId, { balance: newBalance });
};

module.exports = {
    getUser,
    getUserById,
    updateBalance,
    updateUser,
    createUser
};
