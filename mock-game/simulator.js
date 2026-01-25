const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const API_KEY = 'fasttrack-demo-key'; // Matches .env OPERATOR_API_KEY
const USER_ID = 'test-user';
const ROUNDS = 5;
const BET_AMOUNT = 10;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const runSimulation = async () => {
    console.log('--- Starting Compliant Game Simulation ---');
    console.log('Mode: Ready for Fast Track v1/v2 Events');
    console.log(`User: ${USER_ID}, Rounds: ${ROUNDS}`);

    try {
        // 1. Initial Balance Check
        // Note: Simulator typically uses S2S, but we can verify balance via the same or different endpoint if we had access.
        // For now, just fire events.

        for (let i = 1; i <= ROUNDS; i++) {
            console.log(`\nRound ${i}/${ROUNDS}`);

            // Place Bet
            const txId = `sim-tx-${Date.now()}-${i}`;
            console.log(`[Bet] Placing bet of ${BET_AMOUNT}...`);

            try {
                const betRes = await axios.post(`${API_URL}/debit`, {
                    user_id: USER_ID,
                    amount: BET_AMOUNT,
                    transaction_id: txId,
                    game_id: 'mock-slot-1'
                }, {
                    headers: { 'x-api-key': API_KEY }
                });
                console.log(`[Bet] Success. New Balances: Real=${betRes.data.balance}, Bonus=${betRes.data.bonus_balance || 0} ${betRes.data.currency}`);
            } catch (e) {
                console.error('[Bet] Failed:', e.response?.data || e.message);
                continue; // Skip rest of round if bet failed
            }

            await delay(500); // Spin time

            // Determine Win
            const isWin = Math.random() > 0.6; // 40% win chance
            if (isWin) {
                const winAmount = BET_AMOUNT * (Math.floor(Math.random() * 3) + 2); // 2x-4x win
                console.log(`[Win] User won ${winAmount}!`);

                try {
                    const winRes = await axios.post(`${API_URL}/credit`, {
                        user_id: USER_ID,
                        amount: winAmount,
                        transaction_id: txId, // usually link to the same game round or tx
                        game_id: 'mock-slot-1'
                    }, {
                        headers: { 'x-api-key': API_KEY }
                    });
                    console.log(`[Win] Credit Success. New Balances: Real=${winRes.data.balance}, Bonus=${winRes.data.bonus_balance || 0}`);
                } catch (e) {
                    console.error('[Win] Failed:', e.response?.data || e.message);
                }
            } else {
                console.log('[Loss] No win this round.');
            }

            await delay(1000); // Inter-round delay
        }

        console.log('\n--- Simulation Complete ---');

    } catch (error) {
        console.error('Simulation Error:', error.message);
    }
};

runSimulation();
