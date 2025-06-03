const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const port = 3000;

// Serve static files
app.use(express.static('public'));

// API keys (stored in .env)
const API_KEYS = {
  etherscan: process.env.ETHERSCAN_API_KEY || 'YOUR_ETHERSCAN_API_KEY',
  bscscan: process.env.BSCSCAN_API_KEY || 'YOUR_BSCSCAN_API_KEY'
};

// Route to get wallet addresses
app.get('/api/wallets', async (req, res) => {
  try {
    const wallets = await fs.readFile('wallets.json', 'utf8');
    res.json(JSON.parse(wallets));
  } catch (error) {
    res.status(500).json({ error: 'Failed to load wallets' });
  }
});

// Proxy route for blockchain transactions
app.get('/api/transactions/:currency/:address', async (req, res) => {
  const { currency, address } = req.params;

  try {
    let transactions = [];

    if (currency === 'btc') {
      const response = await axios.get(
        `https://api.blockchair.com/bitcoin/dashboards/address/${address}?limit=10`
      );
      const data = response.data;
      if (data.data && data.data[address]) {
        transactions = data.data[address].transactions
          .filter(tx => tx.balance_change > 0)
          .map(tx => ({
            amount: tx.balance_change, // Satoshi
            timestamp: new Date(tx.time).toISOString()
          }));
      }
    } else if (currency === 'eth') {
      const apiUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&page=1&offset=10&apikey=${API_KEYS.etherscan}`;
      const response = await axios.get(apiUrl);
      const data = response.data;
      if (data.status === '1') {
        transactions = data.result
          .filter(tx => tx.to.toLowerCase() === address.toLowerCase())
          .map(tx => ({
            amount: tx.value, // Wei (string)
            timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString()
          }));
      }
    } else if (currency === 'sol') {
      const response = await axios.get(
        `https://public-api.solscan.io/account/transactions?account=${address}&limit=10`
      );
      transactions = response.data
        .filter(tx => tx.dest === address && tx.lamports > 0) // Incoming SOL
        .map(tx => ({
          amount: tx.lamports, // Lamports (1 SOL = 10^9 lamports)
          timestamp: new Date(tx.blockTime * 1000).toISOString()
        }));
    } else if (currency === 'bnb') {
      const apiUrl = `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&page=1&offset=10&apikey=${API_KEYS.bscscan}`;
      const response = await axios.get(apiUrl);
      const data = response.data;
      if (data.status === '1') {
        transactions = data.result
          .filter(tx => tx.to.toLowerCase() === address.toLowerCase())
          .map(tx => ({
            amount: tx.value, // Wei (same as ETH, 1 BNB = 10^18 wei)
            timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString()
          }));
      }
    } else if (currency === 'usdt') {
      const apiUrl = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=0xdAC17F958D2ee523a2206206994597C13D831ec7&address=${address}&startblock=0&endblock=99999999&sort=desc&page=1&offset=10&apikey=${API_KEYS.etherscan}`;
      const response = await axios.get(apiUrl);
      const data = response.data;
      if (data.status === '1') {
        transactions = data.result
          .filter(tx => tx.to.toLowerCase() === address.toLowerCase())
          .map(tx => ({
            amount: tx.value, // USDT (6 decimals)
            timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString()
          }));
      }
    } else {
      return res.status(400).json({ error: 'Unsupported currency' });
    }

    res.json({
      currency,
      unit: currency === 'btc' ? 'satoshi' : currency === 'sol' ? 'lamports' : 'wei', // USDT uses wei-like decimals
      transactions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
