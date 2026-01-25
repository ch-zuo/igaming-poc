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
            user_id: 'test-user',
            username: 'Test User',
            balance: 1000,
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

const getUser = async (token) => {
    const cleanToken = token ? token.trim() : '';
    console.log(`[Auth] Attempting login with token: "${cleanToken.substring(0, 5)}..."`);

    // 1. Check Mock DB first for PoC/Testing
    for (const user of mockDB.users.values()) {
        if (user.token === cleanToken) {
            console.log('[Auth] Mock user found');
            return user;
        }
    }

    // 2. Fallback to Supabase if initialized
    if (supabase) {
        console.log('[Supabase] Using Supabase Client');
        const { data, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('token', cleanToken)
            .single();

        if (data) return data;

        try {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (user) return user;
        } catch (e) { }
    }

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

const updateBalance = async (userId, newBalance) => {
    return updateUser(userId, { balance: newBalance });
};

module.exports = {
    getUser,
    getUserById,
    updateBalance,
    updateUser
};
