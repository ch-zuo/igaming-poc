const axios = require('axios');
const { exec } = require('child_process');
const path = require('path');

const API_URL = 'http://localhost:5000/api';
const TOKEN = 'valid-token'; // known test token
const SIMULATOR_PATH = path.join(__dirname, '../mock-game/simulator.js');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const getBalance = async () => {
    try {
        const res = await axios.get(`${API_URL}/balance`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        return res.data.amount;
    } catch (e) {
        throw new Error(`Failed to get balance: ${e.message}`);
    }
};

const runSimulator = () => {
    return new Promise((resolve, reject) => {
        console.log('Running Simulator...');
        const child = exec(`node "${SIMULATOR_PATH}"`);

        child.stdout.on('data', data => process.stdout.write(`[Sim] ${data}`));
        child.stderr.on('data', data => process.stderr.write(`[Sim Error] ${data}`));

        child.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`Simulator exited with code ${code}`));
        });
    });
};

const verify = async () => {
    console.log('--- Starting System Verification ---');

    // 1. Health Check
    try {
        await axios.get('http://localhost:5000/');
        console.log('[Check] Backend is responding.');
    } catch (e) {
        console.error('[Fatal] Backend not reachable. Is it running?');
        process.exit(1);
    }

    // 2. Initial Balance
    const startBalance = await getBalance();
    console.log(`[Check] Start Balance: ${startBalance}`);

    // 3. Run Simulator
    await runSimulator();

    // 4. Final Balance
    const endBalance = await getBalance();
    console.log(`[Check] End Balance: ${endBalance}`);

    if (startBalance !== endBalance) {
        console.log('[Success] Balance changed, indicating game activity.');
        console.log(`[Delta] ${endBalance - startBalance}`);
    } else {
        console.warn('[Warning] Balance did not change. Did the simulator run correctly?');
    }

    console.log('--- Verification Complete ---');
};

verify();
