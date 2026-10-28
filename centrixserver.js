/**
 * CENTRIX.AI - by AURACLE_INC | Private-host WhatsApp AI starter (Node 18+)
 * WhatsApp + Express Local Site + Free Open-Source AI + Anti-Share Security + Lifeline Billing
 */

require('dotenv').config();
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const express = require('express');

const PORT = process.env.PORT || 3000;
const BASE = (process.env.PUBLIC_BASE_URL || ('http://127.0.0.1:' + PORT)).replace(/\/$/, '');
const WA_NUMBER = process.env.WHATSAPP_NUMBER || '2349162976894';
const WA_QR = process.env.WA_QR_LINK || 'https://wa.me/qr/4EUNOUKJAL7AK1';
const WA_LINK = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent('Hi Centrix');

const OLLAMA_HOST = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const VAULT_SECRET = process.env.VAULT_SECRET || 'CHANGE-ME-32-CHARS-MINIMUM';
const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || '30', 10);

const PLANS = {
  '6H':  { label: '6 hours lifeline',  hours: 6,    priceNGN: 500 },
  '12H': { label: '12 hours lifeline', hours: 12,   priceNGN: 900 },
  '24H': { label: '24 hours lifeline', hours: 24,   priceNGN: 1500 },
  '7D':  { label: '7 days lifeline',   hours: 168,  priceNGN: 5000 },
  '30D': { label: '1 month lifeline',  hours: 720,  priceNGN: 15000 },
  '365D':{ label: '12 months lifeline (discount)', hours: 8760, priceNGN: 150000 },
};
const COINS_PER_HOUR = 100; // 100 reward coins = 1 hour lifeline

const DATA = path.join(__dirname, 'data');
try { fs.mkdirSync(DATA, { recursive: true }); } catch (e) {}
const UFILE = path.join(DATA, 'centrix.users.json');
const SFILE = path.join(DATA, 'centrix.sessions.json');

const load = (f, fb) => { try { if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {} return fb; };
const save = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 2));

let users = load(UFILE, {}), sessions = load(SFILE, {});
const persist = () => { save(UFILE, users); save(SFILE, sessions); };

// --- ID: # + 7 alphanumeric ---
const ALPH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const genId = () => '#' + Array.from({ length: 7 }, () => ALPH[crypto.randomInt(ALPH.length)]).join('');
const normId = s => String(s || '').trim().toUpperCase();
const validId = s => /^#[A-Z0-9]{7}$/.test(normId(s));
const numOf = jid => String(jid || '').split('@')[0].split(':')[0];

// --- Vault (portal passwords encryption) ---
function vaultEnc(p) {
  const k = crypto.createHash('sha256').update(VAULT_SECRET).digest();
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', k, iv);
  const e = Buffer.concat([c.update(String(p), 'utf8'), c.final()]);
  return iv.toString('hex') + ':' + c.getAuthTag().toString('hex') + ':' + e.toString('hex');
}
function vaultDec(b) {
  const k = crypto.createHash('sha256').update(VAULT_SECRET).digest();
  const pr = String(b).split(':');
  const x = crypto.createDecipheriv('aes-256-gcm', k, Buffer.from(pr[0], 'hex'));
  x.setAuthTag(Buffer.from(pr[1], 'hex'));
  return Buffer.concat([x.update(Buffer.from(pr[2], 'hex')), x.final()]).toString('utf8');
}

// --- FREE OPEN-SOURCE AI ---
async function llmChat(msgs, max) {
  max = max || 600;
  try {
    const r = await fetch(OLLAMA_HOST + '/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages: msgs, stream: false })
    });
    if (r.ok) { const j = await r.json(); const t = ((j.message && j.message.content) || '').trim(); if (t) return t.slice(0, max * 4); }
  } catch (e) {}
  try {
    if (process.env.GROQ_API_KEY) {
      const r2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.GROQ_API_KEY },
        body: JSON.stringify({ model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant', messages: msgs, max_tokens: max })
      });
      if (r2.ok) { const j2 = await r2.json(); const t2 = ((j2.choices && j2.choices[0] && j2.choices[0].message.content) || '').trim(); if (t2) return t2; }
    }
  } catch (e) {}
  return 'Centrix core offline. Start Ollama (ollama serve + ollama pull ' + OLLAMA_MODEL + ') or set GROQ_API_KEY.';
}

const imgUrl = p => 'https://image.pollinations.ai/prompt/' + encodeURIComponent(p);
const aiWrite = t => llmChat([{ role: 'system', content: 'You are Centrix, helpful writing assistant.' }, { role: 'user', content: 'Write on: ' + t }]);
const aiCheck = t => llmChat([{ role: 'system', content: 'You are Centrix Checker. Check grammar, facts, tone briefly.' }, { role: 'user', content: t }]);
const aiChat = (uid, t) => llmChat([{ role: 'system', content: 'You are Centrix, private WhatsApp AI for ' + uid + '. Concise, helpful.' }, { role: 'user', content: t }], 500);

// --- Menus ---
function mainMenu() {
  return 'CENTRIX MENU\n1 My Dashboard\n2 Write prompt\n3 Image prompt\n4 My Portfolio\n5 Free chat with Centrix\n6 Built-in AI Checker\n7 Games & More\n8 Student profile\n\nReply number. #ID to login anytime.';
}

let UNI_CACHE = null;
async function allUnis() {
  if (UNI_CACHE) return UNI_CACHE;
  try {
    const r = await fetch('https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json');
    UNI_CACHE = await r.json(); return UNI_CACHE;
  } catch (e) { return []; }
}
async function schoolsFor(region) {
  const all = await allUnis();
  const key = String(region || '').toLowerCase();
  let country = key;
  if (['lagos', 'abuja', 'ibadan', 'kano', 'yaba', 'ikeja'].some(c => key.includes(c))) country = 'nigeria';
  if (['accra', 'kumasi', 'ghana'].some(c => key.includes(c))) country = 'ghana';
  const hit = all.filter(u => u.country.toLowerCase() === country);
  if (hit.length) return hit.map(u => u.name).slice(0, 50);
  const partial = all.filter(u => u.country.toLowerCase().includes(key) || u.name.toLowerCase().includes(key));
  return (partial.length ? partial : all).map(u => u.name).slice(0, 50);
}

function gamesMenu() {
  return 'GAMES & MORE\nA Lagos Life (built-in, free)\nB Campus Life (built-in, free)\nC TORN API Status\n\nReply A, B or C. Or type MINE to earn lifeline reward coins.';
}
function playBuiltIn(kind) {
  if (kind === 'A') return 'LAGOS LIFE: You wake in Yaba, 50 naira in pocket. Danfo or Keke? Reply DANFO or KEKE.';
  return 'CAMPUS LIFE: First lecture in 10 mins, portal shows unpaid fees. Go to CLASS or PORTAL? Reply to continue.';
}

async function tornStatus() {
  if (!process.env.TORN_API_KEY) return 'TORN: set free TORN_API_KEY from torn.com to enable.';
  try {
    const r = await fetch('https://api.torn.com/user/?selections=profile&key=' + process.env.TORN_API_KEY);
    const j = await r.json();
    if (j.error) return 'TORN error: ' + j.error.error;
    return 'TORN: ' + j.name + ' | Level ' + j.level + ' | Cash $' + (j.money_onhand || 0);
  } catch (e) { return 'TORN offline: ' + e.message; }
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
function lifelineMenu(u) {
  const left = Math.max(0, Math.round((u.trialEnds - Date.now()) / 3600000));
  let m = 'LIFELINE EXPIRED (trial ended).\nTrial left: ' + left + 'h\nCoins: ' + (u.coins || 0) + '\n\nPick plan:\n';
  Object.keys(PLANS).forEach(k => { m += k + ' - ' + PLANS[k].label + ' - N' + PLANS[k].priceNGN + '\n'; });
  m += '\nReply BUY <code> e.g. BUY 7D\nOr MINE to earn coins, CONVERT to swap coins->lifeline.';
  return m;
}

// --- SECURE LOGIN: block unauthorized numbers & alert owner ---
async function secureLogin(jid, idKey, send) {
  const key = findUid(idKey); const now = Date.now();
  if (!key) { await send('ID not found. Reply CREATE.'); return null; }
  const u = users[key]; const who = numOf(jid);
  u.audit = u.audit || []; u.blocked = u.blocked || []; u.mutuals = u.mutuals || [];
  
  if (u.blocked.includes(who)) { await send('Blocked on this ID. Contact owner.'); return null; }
  
  const isOwner = (u.ownerJid === jid) || (numOf(u.ownerJid) === who);
  const isMutual = u.mutuals.some(m => numOf(m.jid) === who);

  if (!u.ownerJid) {
    u.ownerJid = jid; u.ownerNumber = who; persist();
  } else if (!isOwner && !isMutual) {
    const alert = 'SECURITY ALERT ' + u.id + '\nWe noticed an attempted login from unknown number +' + who + '\nIf this was NOT permitted by you reply:\nBLOCK ' + u.id + ' ' + who + '\nIf it WAS permitted reply:\nTRUST ' + u.id + ' ' + who + '\nOnce trusted they can login as a mutual.';
    try { if (globalThis._sendTo) await globalThis._sendTo(u.ownerJid, alert); } catch (e) {}
    u.pendingIntruder = { jid, number: who, at: new Date().toISOString() };
    u.audit.push({ t: new Date().toISOString(), ev: 'blocked-login', from: who }); persist();
    await send('Blocked: this ID belongs to another number. Owner has been alerted.');
    return null;
  }

  const sess = sessOf(jid); sess.uid = key; sess.step = 'authed';
  sess.loginAt = now; sess.actions = [];
  u.audit.push({ t: new Date().toISOString(), ev: 'login', from: who, mutual: !isOwner });
  persist();

  if (!isOwner && u.ownerJid && u.ownerJid !== jid) {
    try { await globalThis._sendTo(u.ownerJid, 'MUTUAL LOGIN ' + u.id + '\nWho: +' + who + '\nTime: ' + new Date().toISOString()); } catch (e) {}
  }
  return u;
}

function logAction(jid, act) {
  const s = sessOf(jid); s.actions = s.actions || []; s.actions.push({ t: Date.now(), act: String(act).slice(0, 120) });
  const u = s.uid ? users[s.uid] : null;
  if (u) { u.audit = u.audit || []; u.audit.push({ t: new Date().toISOString(), ev: 'action', from: numOf(jid), act: String(act).slice(0, 120) }); persist(); }
}

async function ownerCmd(jid, text, send) {
  const m = text.match(/^(BLOCK|TRUST)\s+(#[A-Z0-9]{7})\s+(\d+)/i);
  if (!m) return false;
  const [, cmd, idKey, number] = m; const key = findUid(idKey);
  if (!key) { await send('ID not found.'); return true; }
  const u = users[key];
  if (numOf(u.ownerJid) !== numOf(jid)) { await send('Only the sole owner can do this.'); return true; }
  u.blocked = u.blocked || []; u.mutuals = u.mutuals || [];
  if (/BLOCK/i.test(cmd)) {
    if (!u.blocked.includes(number)) u.blocked.push(number);
    u.mutuals = u.mutuals.filter(x => numOf(x.jid) !== number);
    await send('Blocked +' + number + ' from ' + idKey);
  } else {
    u.blocked = u.blocked.filter(x => x !== number);
    u.mutuals.push({ jid: number + '@s.whatsapp.net', number, at: new Date().toISOString() });
    await send('Whitelisted +' + number + ' as mutual on ' + idKey + '.');
  }
  persist(); return true;
}

async function doMine(u) {
  const now = Date.now(); 
  if (u.lastMine && now - u.lastMine < 60000) return 'Mining cooldown: ' + (60 - Math.floor((now - u.lastMine) / 1000)) + 's. Balance: ' + (u.coins || 0);
  const earn = 5 + Math.floor(Math.random() * 16); u.coins = (u.coins || 0) + earn; u.lastMine = now; persist();
  return 'Mined +' + earn + ' coins. Balance: ' + u.coins + '. CONVERT <coins> to swap to lifeline.';
}
async function doMint(u) { u.coins = (u.coins || 0) + 25; persist(); return 'Minted NFT-badge +25 coins. Balance: ' + u.coins; }
async function doConvert(u, raw) {
  const n = parseInt((raw.match
