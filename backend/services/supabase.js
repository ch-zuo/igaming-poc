const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase;

// Mock DB for development if credentials are missing
const mockDB = {
    users: new Map([
        ['test-user', {
            id: 'test-user',
            username: 'Test User',
            balance: 1000,
            currency: 'EUR',
            token: 'valid-token',
            country: 'MT',
            first_name: 'John',
            last_name: 'Doe',
            email: 'test-user@example.com'
        }]
    ]),
};

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.warn('Supabase credentials not found. Using Mock DB.');
}

const getUser = async (token) => {
    const cleanToken = token ? token.trim() : '';
    console.log(`[Auth] Attempting login with token: "${cleanToken.substring(0, 5)}..."`);

    // Diagnostic logs for environment variables
    console.log('[Supabase Diagnostic] process.env keys:', Object.keys(process.env).filter(k => k.startsWith('SUPABASE') || k.startsWith('FT_')));
    console.log('[Supabase Diagnostic] SUPABASE_URL present:', !!process.env.SUPABASE_URL);
    console.log('[Supabase Diagnostic] SUPABASE_ANON_KEY present:', !!process.env.SUPABASE_ANON_KEY);

    if (supabase) {
        console.log('[Supabase] Using Supabase Client');
        // Look up custom 'users' table by token
        const { data, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('token', cleanToken)
            .single();

        if (data) return data;

        // Fallback to Supabase Auth only if table lookup fails
        try {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (user) return user;
        } catch (e) {
            // Ignore auth errors if token is not a JWT
        }

        return null;
    } else {
        console.warn('[Auth] Supabase client not initialized. Falling back to Mock DB.');
        // Mock lookup
        for (const user of mockDB.users.values()) {
            if (user.token === cleanToken) return user;
        }
        return null;
    }
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

const updateBalance = async (userId, newBalance) => {
    if (supabase) {
        const { data, error } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', userId)
            .select();
        if (error) throw error;
        return data[0];
    } else {
        const user = mockDB.users.get(userId);
        if (user) {
            user.balance = newBalance;
            mockDB.users.set(userId, user);
            return user;
        }
        throw new Error('User not found');
    }
};

module.exports = {
    getUser,
    getUserById,
    updateBalance
};
