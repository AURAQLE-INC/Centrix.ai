/**
 * CENTRIX ADMIN CMS — Localhost only. Run: node centrix.admin.cms.js
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs'), path = require('path');

const app = express(); 
app.use(express.json());
const PORT = process.env.ADMIN_PORT || 4001;
const UFILE = path.join(__dirname, 'data', 'centrix.users.json');

const load = () => { try { return JSON.parse(fs.readFileSync(UFILE, 'utf8')); } catch (e) { return {}; } };
const save = o => fs.writeFileSync(UFILE, JSON.stringify(o, null, 2));

const auth = (req, res, next) => {
  const t = req.headers['x-admin-token'];
  if (t === process.env.ADMIN_PASS) return next();
  if (req.path === '/login') return next();
  return res.status(401).json({ err: 'login first: POST /login {user, pass}' });
};

app.post('/login', (req, res) => {
  if (req.body.user === process.env.ADMIN_USER && req.body.pass === process.env.ADMIN_PASS)
    return res.json({ token: process.env.ADMIN_PASS });
  res.status(403).json({ err: 'bad credentials' });
});

app.use(auth);

app.get('/users', (req, res) => res.json(load()));

app.post('/grant', (req, res) => { // {id, planHours}
  const db = load(); const u = db[req.body.id]; if (!u) return res.status(404).json({ err: 'user not found' });
  const base = Math.max(Date.now(), (u.lifeline && u.lifeline.expiresAt) || 0);
  u.lifeline = { plan: 'ADMIN', expiresAt: base + (req.body.planHours || 24) * 3600 * 1000 };
  save(db); 
  res.json({ success: true, user: u });
});

app.post('/trust', (req, res) => { // {id, number}
  const db = load(); const u = db[req.body.id]; if (!u) return res.status(404).json({ err: 'user not found' });
  u.mutuals = u.mutuals || [];
  u.mutuals.push({ jid: req.body.number + '@s.whatsapp.net', number: req.body.number, at: new Date().toISOString() });
  save(db); 
  res.json({ success: true, user: u });
});

app.post('/block', (req, res) => { // {id, number}
  const db = load(); const u = db[req.body.id]; if (!u) return res.status(404).json({ err: 'user not found' });
  u.blocked = u.blocked || [];
  u.blocked.push(req.body.number);
  save(db); 
  res.json({ success: true, user: u });
});

app.get('/', (req, res) => res.send('<h1>Centrix CMS Active</h1><p>POST /login then GET /users using header x-admin-token.</p>'));

app.listen(PORT, () => console.log('CMS running on http://127.0.0.1:' + PORT));
