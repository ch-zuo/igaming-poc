const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const operatorRoutes = require('./routes/operator');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', operatorRoutes);

app.get('/', (req, res) => {
  res.send('iGaming Integration Platform Backend Running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
