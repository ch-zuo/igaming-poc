const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase;

// Mock DB for development if credentials are missing
const mockDB = {
    users: new Map([
        ['test-user', { id: 'test-user', username: 'Test User', balance: 1000, currency: 'EUR', token: 'valid-token' }]
    ]),
};

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.warn('Supabase credentials not found. Using Mock DB.');
}

const getUser = async (token) => {
    if (supabase) {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        // Note: This assumes standard Supabase Auth. 
        // For this custom integration, we might look up a custom 'users' table by token if implementing custom auth.
        // Let's assume for this PoC we check a 'users' table.
        const { data, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('token', token)
            .single();

        if (dbError) {
            console.error('[Supabase] Error fetching user:', dbError);
        }
        if (dbError || !data) return null;
        return data;
    } else {
        // Mock lookup
        for (const user of mockDB.users.values()) {
            if (user.token === token) return user;
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
