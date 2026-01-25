const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const TOKEN = 'valid-token'; // test-user token in mock DB

const testEvents = async () => {
    console.log('--- Starting Compliance & Identity Event Test ---');

    const headers = { Authorization: `Bearer ${TOKEN}` };

    try {
        // 1. Registration
        console.log('\n[Test] Triggering Registration Event...');
        const regRes = await axios.post(`${API_URL}/registration`, {}, { headers });
        console.log('Registration Response:', regRes.data);

        // 2. User Update
        console.log('\n[Test] Triggering User Update Event...');
        const updateRes = await axios.post(`${API_URL}/user/update`, {
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane.smith@example.com'
        }, { headers });
        console.log('User Update Response:', updateRes.data);

        // 3. Consents
        console.log('\n[Test] Triggering Consents Event...');
        const consentRes = await axios.put(`${API_URL}/userconsents/test-user`, {
            consents: [{ opted_in: false, type: 'email' }]
        }, { headers });
        console.log('Consents Response:', consentRes.data);

        // 4. Blocks
        console.log('\n[Test] Triggering Blocks Event...');
        const blockRes = await axios.put(`${API_URL}/userblocks/test-user`, {
            blocks: [{ active: true, type: 'Excluded', note: 'Testing blocks' }]
        }, { headers });
        console.log('Blocks Response:', blockRes.data);

        // 5. Logout
        console.log('\n[Test] Triggering Logout Event...');
        const logoutRes = await axios.post(`${API_URL}/logout`, {}, { headers });
        console.log('Logout Response:', logoutRes.data);

        console.log('\n--- All Tests Completed Successfully ---');
        console.log('Check backend console logs to verify [FT Integration] pushEvent calls.');

    } catch (error) {
        console.error('\n[Error] Test failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
};

testEvents();
