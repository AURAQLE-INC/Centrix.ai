/**
 * CENTRIX WALLET SERVER — Paystack + Monard Crypto API. Run: node centrix.wallet.server.js
 */

require('dotenv').config();
const express = require('express');
const app = express(); 
app.use(express.json());

const PORT = process.env.WALLET_PORT || 4002;
const PLANS = { '6H': 500, '12H': 900, '24H': 1500, '7D': 5000, '30D': 15000, '365D': 150000 };

app.post('/invoice', (req, res) => {
  const { uid, plan } = req.body; 
  const ref = uid + '-' + plan + '-' + Date.now().toString(36);
  
  // Paystack checkout payment link generation
  const paystackUrl = 'https://paystack.com/pay/centrix-checkout?ref=' + ref + '&amount=' + (PLANS[plan] || 500);
  
  // Monard block wallet destination address
  const address = process.env.OWNER_WALLET_USDT || 'USDT_TRC20_WALLET_ADDRESS';
  
  res.json({
    ref,
    paystackUrl,
    address,
    monardWallet: 'monard-inchat-' + uid
  });
});

app.post('/webhook/paystack', (req, res) => {
  console.log('Paystack webhook received:', req.body);
  // Verify signature and update lifeline expiration inside centrix.users.json
  res.json({ received: true });
});

app.post('/webhook/monard', (req, res) => {
  console.log('Monard webhook received:', req.body);
  res.json({ received: true });
});

app.get('/', (req, res) => res.send('Centrix Wallet Server active. POST /invoice {uid, plan}'));

app.listen(PORT, () => console.log('Wallet Server running on http://127.0.0.1:' + PORT));
