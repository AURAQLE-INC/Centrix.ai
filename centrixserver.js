/**
 * CENTRIX.AI - by AURACLE_INC | Private-host WhatsApp AI starter (Node 18+)
function vaultDec(b){const k=crypto.createHash('sha256').update(VAULT_SECRET).digest();const parts=String(b).split(':');const x=crypto.createDecipheriv('aes-256-gcm',k,Buffer.from(parts[0],'hex'));x.setAuthTag(Buffer.from(parts[1],'hex'));return Buffer.concat([x.update(Buffer.from(parts[2],'hex')),x.final()]).toString('utf8');}
// ----- FREE OPEN-SOURCE AI (Ollama local default, Groq free fallback) -----
async function llmChat(msgs, max){ max=max||600;
  try{ const r=await fetch(OLLAMA_HOST+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:OLLAMA_MODEL,messages:msgs,stream:false})});
    if(r.ok){ const j=await r.json(); const t=((j.message&&j.message.content)||'').trim(); if(t) return t.slice(0,max*4); } }catch(e){}
  try{ if(process.env.GROQ_API_KEY){ const r2=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+process.env.GROQ_API_KEY},body:JSON.stringify({model:process.env.GROQ_MODEL||'llama-3.1-8b-instant',messages:msgs,max_tokens:max})});
    if(r2.ok){ const j2=await r2.json(); const t2=((j2.choices&&j2.choices[0]&&j2.choices[0].message.content)||'').trim(); if(t2) return t2; } } }catch(e){}
  return 'Centrix core offline. Start Ollama (ollama serve + ollama pull '+OLLAMA_MODEL+') or set GROQ_API_KEY (free at console.groq.com).'; }
const imgUrl=p=>'https://image.pollinations.ai/prompt/'+encodeURIComponent(p);
const aiWrite=t=>llmChat([{role:'system',content:'You are Centrix writing assistant.'},{role:'user',content:'Write on: '+t}]);
const aiChat=(u,t)=>llmChat([{role:'system',content:'You are Centrix private WhatsApp AI for '+u+'. Be concise.'},{role:'user',content:t}],500);
const aiCheck=t=>llmChat([{role:'system',content:'Check grammar, facts, tone briefly.'},{role:'user',content:t}]);
const menu=()=>'CENTRIX MENU\n1 Dashboard\n2 Write\n3 Image\n4 Portfolio\n5 Free chat\n6 AI Checker\n7 Games & More\n8 Student profile\n\nReply number/name. #ID to login. MENU anytime.';
const gamesMenu=()=>'GAMES & MORE\nA Lagos Life (built-in free)\nB Campus Life (built-in free)\nC TORN (needs free TORN_API_KEY)\nReply A, B or C.';
const playA=()=>'LAGOS LIFE: You wake in Yaba, 50 naira in pocket. Danfo or Keke? Reply DANFO or KEKE.';
const playB=()=>'CAMPUS LIFE: Lecture in 10 mins, portal shows unpaid fees. Go to CLASS or PORTAL? Reply to continue.';
async function tornStatus(){ if(!process.env.TORN_API_KEY) return 'TORN: set free TORN_API_KEY from torn.com/preferences.php#tab=api to enable.';
  try{ const r=await fetch('https://api.torn.com/user/?selections=profile&key='+process.env.TORN_API_KEY); const j=await r.json(); if(j.error) return 'TORN error: '+j.error.error; return 'TORN: '+j.name+' | Level '+j.level+' | Money $'+(j.money_onhand||0); }catch(e){ return 'TORN offline: '+e.message; } }
// ----- ROUTER -----
function sessOf(j){ if(!sessions[j]) sessions[j]={step:'new'}; return sessions[j]; }
function findUid(id){ id=normId(id); return Object.keys(users).find(k=>normId(k)===id)||null; }
async function handleText(jid, raw, send){
  const text=String(raw||'').trim(); const s=sessOf(jid); const low=text.toLowerCase();
  if(/^\/centrix/i.test(text)){ await send('CENTRIX LOCAL PORTAL: '+BASE+'/centrix | Guide: '+BASE+'/guide | WhatsApp: '+WA_LINK+' | Reply CREATE for new ID.'); return; }
  if(/^(hi|hello|hey)( centrix)?$/.test(low)){ await send('Hi, I am Centrix (private host). Reply CREATE for new ID, or send your #ID to login. Reply MENU after login.'); return; }
  if(/^create$/.test(low)){ const id=genId(); users[id]={id,jid,created:new Date().toISOString(),student:null,portfolio:[]}; s.uid=id; s.step='new'; persist(); await send('Your Centrix ID: '+id+' | COPY it, save safe, memorise if you can. Now send '+id+' to login.'); return; }
  if(validId(text)){ const key=findUid(text); if(!key){ await send('ID not found. Reply CREATE for a new one.'); return; } const u=users[key]; u.jid=jid; s.uid=key; s.step='in'; s.pending=null; persist(); await send('Welcome '+key+'. '+mainMenu()); if(!u.student) await send('Student? Reply 8 to create student profile (school + matric + portal).'); return; }
  const uid=s.uid?findUid(s.uid):null; if(!uid){ await send('Send your #ID to login, or reply CREATE.'); return; }
  const u=users[uid];
  if(s.pending==='write'){ s.pending=null; persist(); await

send(await aiWrite(text)); return; }
  if(s.pending==='image'){ s.pending=null; persist(); await send('Image: '+imgUrl(text)+' | Open the link to view/download.'); return; }
  if(s.pending==='check'){ s.pending=null; persist(); await send(await aiCheck(text)); return; }
  if(s.pending==='bind'){ const m=text.split(/\s+/); if(m.length<2){ await send('Usage: BIND <username> <password>'); return; } u.portal={user:m[0],pass:vaultEnc(m.slice(1).join(' '))}; u.student=u.student||{}; u.student.portalBound=true; s.pending=null; persist(); await send('Portal linked (encrypted, read-first). Try: Check my portal and print my course form.'); return; }
  if(s.pending==='region'){ const list=schoolsFor(text); s.pending='school'; s.region=text; persist(); let m='Region: '+text+' | Pick school number:'; list.forEach((x,i)=>{ m+='\n'+(i+1)+'. '+x; }); await send(m); return; }
  if(s.pending==='school'){ const list=schoolsFor(s.region||''); const n=parseInt(text,10); const school=list[n-1]||text; s.school=school; s.pending='matric'; persist(); await send('School: '+school+' | Now reply your MATRIC number (e.g. U2023/12345).'); return; }
  if(s.pending==='matric'){ u.student=u.student||{}; u.student.school=s.school||'Custom'; u.student.matric=text; u.student.portalBound=false; s.pending=null; persist(); await send('Saved: '+u.student.school+' / '+text+' | Reply BIND <username> <password> to link portal.'); return; }
  if(/^bind\s+/i.test(text)){ const parts=text.split(/\s+/); if(parts.length<3){ await send('Use: BIND <username> <password>'); return; } u.student=u.student||{}; u.student.portalUser=parts[1]; u.student.portalPass=vaultEnc(parts.slice(2).join(' ')); u.student.portalBound=true; persist(); await send('Portal linked for '+(u.student.school||'school')+' (encrypted). Try: Check my portal / print my course form.'); return; }
  if(low==='menu'){ await send(mainMenu()); return; }
  if(low==='1'||low.includes('dashboard')){ await send('DASHBOARD '+u.id+' | School: '+(u.student?u.student.school+' / '+u.student.matric:'not set (reply 8)')+' | Portfolio: '+((u.portfolio||[]).length)+' items | Free chat: reply 5 <msg> | Checker: reply 6 <text>'); return; }
  if(low==='2'||low.startsWith('write ')){ const q=text.replace(/^2\s*|^write\s*/i,'').trim(); if(!q){ s.pending='write'; persist(); await send('WRITE: what should I write?'); } else await send(await aiWrite(q)); return; }
  if(low==='3'||low.startsWith('image ')

[... 8283 characters omitted ...]

rtsA Baileys socket:
 *   const {default:makeWASocket,useMultiFileAuthState}=require('@whiskeysockets/baileys');
 *   const {state,saveCreds}=await useMultiFileAuthState('./auth');
 *   const sock=makeWASocket({auth:state,printQRInTerminal:true});
 *   sock.ev.on('creds.update',saveCreds);
 *   sock.ev.on('messages.upsert',async m=>{ const msg=m.messages[0]; if(!msg.message||msg.key.fromMe) return;
 *     const jid=msg.key.remoteJid; const body=msg.message.conversation||msg.message.extendedTextMessage?.text||'';
 *     await handleText(jid,body,t=>sock.sendMessage(jid,{text:t})); });
 */

// ----- EXPRESS LOCAL SITE (/centrix + /guide + MCP stub) -----
const app = express();
app.use(express.json());
app.get('/', (req,res)=>res.send('<h1>Centrix.ai</h1><p>Private-host WhatsApp AI.</p><p><a href="/guide">Guide</a> | <a href="/centrix">Launch</a></p>'));
app.get('/guide', (req,res)=>res.send('<h1>Centrix Guide</h1><p>1. Save the host number. 2. Send Hi Centrix. 3. Reply CREATE for ID. 4. Send #ID to login.</p><p>WhatsApp: '+WA_LINK+'</p>'));
app.get('/centrix', (req,res)=>res.send('<h1>Centrix Launch</h1><p>Open WhatsApp direct chat:</p><p><a href="'+WA_LINK+'">'+WA_LINK+'</a></p>'));
app.get('/mcp/tools', (req,res)=>res.json({tools:['chat','write','image','check','dashboard','portfolio','games','student','portal.read']}));
app.listen(PORT, ()=>console.log('Centrix on '+BASE+' | WA: '+WA_LINK));
WHATSAPP_NUMBER=2349162976894
WA_QR_LINK=https://wa.me/qr/4EUNOUKJAL7AK1
TRIAL_DAYS=30
PAYSTACK_PUBLIC_KEY=pk_test_PASTE_YOURS
PAYSTACK_SECRET_KEY=sk_test_PASTE_YOURS
PAYSTACK_RECEIVER_EMAIL=you@example.com
MONARD_API_KEY=PASTE_MONARD_KEY
MONARD_WALLET_ID=PASTE_MONARD_WALLET_ID
OWNER_WALLET_BTC=PASTE_YOURS
OWNER_WALLET_USDT=PASTE_YOURS
ADMIN_USER=auracle_admin
ADMIN_PASS=change-this-strong-pass
ADMIN_PORT=4001
WALLET_PORT=4002
VAULT_SECRET=32-random-chars-min
