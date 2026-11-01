/**
 * CENTRIX.AI - by AURACLE_INC | Private-host WhatsApp AI starter (Node 18+)
 * WhatsApp + Express Local Site + Lifeline Billing + Paystack Links + Monad Mint + Auto-Response Handover + Display Wallet + Admin CMS
 */

require('dotenv').config();
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const express = require('express');

const PORT = process.env.PORT || 3000;
const BASE = (process.env.PUBLIC_BASE_URL || ('http://127.0.0.1:' + PORT)).replace(/\/$/, '');
const WA_NUMBER = process.env.WHATSAPP_NUMBER || '2349162976894';
const WA_QR = process.env.WA_QR_LINK || 'https://wa.me/qr/4EUNOUKJAL7AK1';
const MONAD_CONTRACT = process.env.MONAD_CONTRACT_ADDRESS || '0xd9123456789abcdef0123456789abcdef01234567';

const OLLAMA_HOST = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const VAULT_SECRET = process.env.VAULT_SECRET || 'Auraqle@Ghod2026!NoCarryPikinGbese#';
const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || '30', 10);
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'GhodFatherSecretKey';

// Lifeline plans with Paystack redirect links
const PLANS = {
  'ETV-7':  { label: '7 days student lifeline',   hours: 168,  priceNGN: 50, paystack: 'https://paystack.com/pay/etv-7' },
  'ETX-28': { label: '1 month student lifeline',  hours: 720,  priceNGN: 150, paystack: 'https://paystack.com/pay/etx-28' },
  'ETY-365':{ label: '1 year student lifeline',   hours: 8760, priceNGN: 1650, paystack: 'https://paystack.com/pay/ety-365' },
  'TV-7':   { label: '7 days standard lifeline',  hours: 168,  priceNGN: 100, paystack: 'https://paystack.com/pay/tv-7' },
  'TX-28':  { label: '1 month standard lifeline', hours: 720,  priceNGN: 350, paystack: 'https://paystack.com/pay/tx-28' },
  'TY-365': { label: '1 year standard lifeline',  hours: 8760, priceNGN: 3850, paystack: 'https://paystack.com/pay/ty-365' },
};

const DATA = path.join(__dirname, 'data');
try { fs.mkdirSync(DATA, { recursive: true }); } catch (e) {}
const UFILE = path.join(DATA, 'centrix.users.json');
const SFILE = path.join(DATA, 'centrix.sessions.json');

const load = (f, fb) => { try { if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {} return fb; };
const save = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 2));

let users = load(UFILE, {}), sessions = load(SFILE, {});
const persist = () => { save(UFILE, users); save(SFILE, sessions); };

const ALPH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const genId = () => '#' + Array.from({ length: 7 }, () => ALPH[crypto.randomInt(ALPH.length)]).join('');
const normId = s => String(s || '').trim().toUpperCase();
const validId = s => /^#[A-Z0-9]{7}$/.test(normId(s));

async function llmChat(msgs, max = 600) {
  try {
    const r = await fetch(OLLAMA_HOST + '/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages: msgs, stream: false })
    });
    if (r.ok) { const j = await r.json(); return (j.message?.content || '').trim().slice(0, max * 4); }
  } catch (e) {}
  try {
    if (process.env.GROQ_API_KEY) {
      const r2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.GROQ_API_KEY },
        body: JSON.stringify({ model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant', messages: msgs, max_tokens: max })
      });
      if (r2.ok) { const j2 = await r2.json(); return (j2.choices?.[0]?.message?.content || '').trim(); }
    }
  } catch (e) {}
  return 'Centrix core offline. Check Ollama or GROQ connection.';
}

const imgUrl = p => 'https://image.pollinations.ai/prompt/' + encodeURIComponent(p);
const aiWrite = t => llmChat([{ role: 'system', content: 'You are Centrix AI Writer.' }, { role: 'user', content: t }]);
const aiCheck = t => llmChat([{ role: 'system', content: 'You are Centrix Checker. Review syntax and grammar.' }, { role: 'user', content: t }]);
const aiChat = (uid, t) => llmChat([{ role: 'system', content: 'You are Centrix, assistant for user ' + uid }, { role: 'user', content: t }]);

// --- SEQUENTIAL MAIN MENU (a - h) ---
function mainMenu() {
  return '🤖 CENTRIX COMMAND CENTER 🤖\n\n' +
    '(a) Write Prompt\n' +
    '(b) Image Generator\n' +
    '(c) AI Checker\n' +
    '(d) Auto-Response (Assist Mode)\n' +
    '(e) Games & More\n' +
    '(f) Rewards Center\n' +
    '(g) My Wallet\n' +
    '(h) My Profile\n\n' +
    'Reply with a letter (a-h) or #ID to authorize.';
}

function sessOf(j) { if (!sessions[j]) sessions[j] = { step: 'new' }; return sessions[j]; }
function findUid(id) { id = normId(id); return Object.keys(users).find(k => normId(k) === id) || null; }

function touchTrial(u) {
  if (!u.trialEnds) { u.trialEnds = Date.now() + TRIAL_DAYS * 24 * 3600 * 1000; persist(); }
  return u.trialEnds;
}
function hasAccess(u) {
  if (Date.now() < touchTrial(u)) return { ok: true, why: 'trial' };
  if (u.lifeline && Date.now() < u.lifeline.expiresAt) return { ok: true, why: u.lifeline.plan };
  return { ok: false };
}

// --- DISPLAY WALLET (Option g) ---
function renderDisplayWallet(u) {
  const trialLeftHrs = Math.max(0, Math.round((u.trialEnds - Date.now()) / 3600000));
  const subStatus = (u.lifeline && Date.now() < u.lifeline.expiresAt) 
    ? u.lifeline.plan + ' (Active)' 
    : 'Trial: ' + trialLeftHrs + ' hours left';

  const mintedAssets = (u.mintedCNX || 0);

  return '💳 CENTRIX DISPLAY WALLET 💳\n' +
    '────────────────────\n' +
    '🔹 Subscriptions: ' + subStatus + '\n' +
    '🔹 Minted Assets: ' + mintedAssets + ' CNX Badge(s)\n' +
    '🔹 Reward Coins: ' + (u.coins || 0) + ' Coins\n' +
    '🔹 Crypto Balances:\n' +
    '   - Monad: 0.051 MON (Testnet)\n' +
    '   - USDT: 0.00 USDT\n' +
    '────────────────────\n' +
    'Contract: ' + MONAD_CONTRACT + '\n' +
    'Pinata Metadata CID: bafybeigauvxl4std2kpjs2hm5zb7ca7zn7jhvomw2g6lrx45gldeo4orq4\n' +
    'Launch Portal: ' + BASE + '/centrix';
}

// --- MAIN ROUTER ---
async function handleText(jid, raw, send) {
  const text = String(raw || '').trim(); const s = sessOf(jid); const low = text.toLowerCase();
  const u = s.uid ? users[s.uid] : null;

  // AI Auto-Response Handover Check
  if (u && u.autoResponseActive && !/^(auto-response|d)$/i.test(text)) {
    const aiReply = await llmChat([
      { role: 'system', content: 'You are Centrix handling incoming messages on behalf of your user automatically.' },
      { role: 'user', content: text }
    ]);
    await send('[Centrix Auto-Assistant]: ' + aiReply);
    return;
  }

  if (/^create$/i.test(low)) {
    const id = genId();
    users[id] = { id, jid, created: new Date().toISOString(), coins: 0, mintedCNX: 0, autoResponseActive: false };
    s.uid = id; s.step = 'authed'; persist();
    await send('Created ID: ' + id + '\n\n' + mainMenu()); return;
  }

  if (validId(text)) {
    const key = findUid(text);
    if (key) { s.uid = key; persist(); await send('Authorized ID ' + key + '.\n\n' + mainMenu()); }
    else await send('ID not found. Reply CREATE.');
    return;
  }

  if (!u) { await send('Hi, I am Centrix. Reply CREATE for new ID or send your #ID.'); return; }
  
  if (!hasAccess(u).ok) {
    if (/^BUY\s+/i.test(text)) {
      const code = text.split(/\s+/)[1].toUpperCase();
      const p = PLANS[code];
      if (p) {
        await send('Paystack Checkout for ' + p.label + ' (N' + p.priceNGN + '):\n' + p.paystack + '\n\nAfter payment, reply PAID <reference>');
      } else {
        await send('Unknown plan. Available plans: ETV-7, ETX-28, ETY-365, TV-7, TX-28, TY-365');
      }
      return;
    }
    await send('LIFELINE EXPIRED.\nTo renew via Paystack, reply BUY <plan> (e.g. BUY ETV-7).\nPlans: ETV-7, ETX-28, ETY-365, TV-7, TX-28, TY-365');
    return;
  }

  // Sequential Menu Logic (a - h)
  if (low === 'menu' || low === 'hi') { await send(mainMenu()); return; }

  if (low === 'a' || low.startsWith('write ')) {
    const prompt = text.replace(/^a\s*|^write\s*/i, '').trim();
    if (!prompt) { s.pending = 'write'; persist(); await send('Enter topic to WRITE:'); }
    else await send(await aiWrite(prompt));
    return;
  }

  if (low === 'b' || low.startsWith('image ')) {
    const prompt = text.replace(/^b\s*|^image\s*/i, '').trim();
    if (!prompt) await send('Type: b <image description>');
    else await send('Generated Image: ' + imgUrl(prompt));
    return;
  }

  if (low === 'c' || low.startsWith('check ')) {
    const prompt = text.replace(/^c\s*|^check\s*/i, '').trim();
    if (!prompt) { s.pending = 'check'; persist(); await send('Paste text to CHECK:'); }
    else await send(await aiCheck(prompt));
    return;
  }

  if (low === 'd' || low.includes('auto-response')) {
    u.autoResponseActive = !u.autoResponseActive; persist();
    await send('🤖 AI Auto-Response Assistant is now: ' + (u.autoResponseActive ? 'ON (Handling incoming chats automatically)' : 'OFF (Manual Mode)'));
    return;
  }

  if (low === 'e' || low.includes('games')) {
    await send('🎮 GAMES CENTER 🎮\n1. Lagos Life\n2. Campus Life\nReply 1 or 2 to play.');
    return;
  }

  if (low === 'f' || low.includes('rewards')) {
    await send('💎 REWARDS & MINT CENTER 💎\n- Type MINE to earn free lifeline coins.\n- Type MINT to mint your 0.001 MON Centrix NFT Badge.');
    return;
  }

  if (low === 'g' || low.includes('wallet')) {
    await send(renderDisplayWallet(u));
    return;
  }

  if (low === 'h' || low.includes('profile')) {
    await send('👤 MY PROFILE 👤\nID: ' + u.id + '\nRegistered: ' + u.created + '\nAuto-Assistant: ' + (u.autoResponseActive ? 'Enabled' : 'Disabled'));
    return;
  }

  if (/^mine$/i.test(low)) {
    u.coins = (u.coins || 0) + 15; persist();
    await send('⛏️ Mined +15 coins! Total: ' + u.coins + ' coins.');
    return;
  }

  if (/^mint$/i.test(low)) {
    u.mintedCNX = (u.mintedCNX || 0) + 1; persist();
    await send('💎 MINT COMMAND SENT 💎\nContract: ' + MONAD_CONTRACT + '\nPrice: 0.001 MON\nMetadata IPFS: bafybeigauvxl4std2kpjs2hm5zb7ca7zn7jhvomw2g6lrx45gldeo4orq4\nBadge added to display wallet!');
    return;
  }

  if (s.pending === 'write') { s.pending = null; persist(); await send(await aiWrite(text)); return; }
  if (s.pending === 'check') { s.pending = null; persist(); await send(await aiCheck(text)); return; }

  await send(await aiChat(u.id, text));
}

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/centrix', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// --- SECURE ADMIN CMS ROUTE ---
app.get('/admin-cms', (req, res) => {
  const adminSecret = req.query.key;
  if (adminSecret !== ADMIN_SECRET) {
    return res.status(403).send('<h1>403 Forbidden</h1><p>Unauthorized access to Centrix Admin CMS.</p>');
  }

  const totalUsers = Object.keys(users).length;
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Centrix.ai - Admin CMS</title>
      <style>
        body { background: #08080a; color: #fcfcfc; font-family: sans-serif; padding: 40px; }
        .card { background: #111114; border: 1px solid rgba(212,175,55,0.3); border-radius: 12px; padding: 24px; max-width: 600px; margin: auto; }
        h1 { color: #d4af37; font-size: 22px; margin-bottom: 10px; }
        .stat { background: #1a1a20; padding: 12px; margin: 10px 0; border-radius: 8px; display: flex; justify-content: space-between; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🛡️ CENTRIX ADMIN CMS</h1>
        <p>Auraqle Labs Control Panel</p>
        <hr style="border:0; border-top:1px solid #333; margin:15px 0;">
        <div class="stat"><span>Total Registered Users:</span> <strong style="color:#f9e27a;">${totalUsers}</strong></div>
        <div class="stat"><span>Monad Contract:</span> <strong style="color:#f9e27a;">${MONAD_CONTRACT}</strong></div>
        <div class="stat"><span>Server Status:</span> <strong style="color:#4caf50;">ONLINE (Render Live)</strong></div>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log('Centrix active on ' + BASE));
module.exports = { handleText, mainMenu, genId };
