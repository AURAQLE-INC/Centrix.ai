# Centrix.ai — Private-Host WhatsApp In-App AI

> Your private, self-hosted Meta-AI-style assistant for WhatsApp. Activated like Leo (UBA) — just say Hi. Powered by a private MCP live server.

[![Private Host](https://img.shields.io/badge/host-private_server-blue)]()
[![WhatsApp](https://img.shields.io/badge/WhatsApp-in__app-25D366)]()
[![MCP Live Server](https://img.shields.io/badge/MCP-live_server-orange)]()
[![License](https://img.shields.io/badge/license-private-lightgrey)]()

---

## What is Centrix?

**Centrix.ai** is a private-host, private-server multifunction in-app AI that lives inside your WhatsApp — just like Meta AI — but activates the way **Leo (UBA AI assistant)** works:

1. Save Centrix as a contact / open the chat
2. Send `Hi`, `Hello Centrix` or `Hey Centrix`
3. Opt-in once → Centrix is awake for you in that chat

No public bot store. No shared data pool. Your own model + your own server + your own WhatsApp entry point.

Think: **Meta AI experience + Leo activation flow + private MCP backend you control.**

### What it can do

- 💬 In-chat Q&A, chat summarization, translation, tone rewrite
- 📝 Reminders, todos, notes, voice-note transcription
- 🖼️ Image understanding / generation, document Q&A (PDF, docx, csv)
- 💸 Leo-style flows: balance-like queries, transfers-assist, bill/airtime flows, FAQ + human handoff
- 🛠️ Multifunction skills via MCP tools: web search, calendar, sheets, GitHub, payments (all behind your private tools server)
- 👥 Group mode: mention or reply to wake, silent otherwise

## How it works

```
WhatsApp User
   │  Hi Centrix / @centrix / reply
   ▼
WhatsApp Entry (Baileys OR Cloud API)
   │  webhook / socket
   ▼
Centrix Core (Node.js)
   ├── Session + Opt-in Store
   ├── Leo-style Activator (greeting / consent / menu)
   ├── Router (chat / tools / media)
   ▼
Private MCP Live Server  <-- you host this
   ├── tools: search, docs, calendar, sheets, pay, crm
   └── model: your private LLM endpoint
```

**Private by design:**
- MCP server binds to `127.0.0.1` / Tailscale / VPC only — never public
- WhatsApp bridge is the only public edge (via webhook)
- Per-user sessions, opt-in required, `/stop` wipes

## Quick Start

### 1. Requirements

- Node.js 20+, Git, a WhatsApp number for the bot
- One of:
  - Option A (simplest, Leo-like): WhatsApp Business Cloud API — App + phone number + permanent token
  - Option B (personal number): Baileys / whatsapp-web.js session (QR scan)
- Your LLM endpoint (Ollama, vLLM, OpenAI-compatible, etc.)

### 2. Clone + install

```bash
git clone https://github.com/Auracle-Inc/Centrix.ai.git
cd Centrix.ai
npm install
cp .env.example .env
```

### 3. Configure `.env`

```env
# --- Core ---
PORT=3000
PRIVATE_MODE=true
MODEL_BASE_URL=http://127.0.0.1:11434/v1
MODEL_NAME=centrix-1
MODEL_API_KEY=local-only-not-shared

# --- MCP Live Server (private) ---
MCP_HOST=127.0.0.1
MCP_PORT=7331
MCP_AUTH_TOKEN=change-me-long-random-string

# --- WhatsApp Cloud API (Option A) ---
WABA_VERIFY_TOKEN=centrix-verify-123
WABA_ACCESS_TOKEN=EAAG...
WABA_PHONE_NUMBER_ID=1234567890

# --- Baileys (Option B) ---
USE_BAILEYS=false
SESSION_DIR=.sessions/bot

# --- Activation (Leo-style) ---
WAKE_WORDS=hi centrix,hello centrix,hey centrix,hi,hello
CONSENT_TEXT=Reply YES to let Centrix assist you. Reply STOP to opt out anytime.
```

### 4. Run the private MCP live server

```bash
# dev
npm run mcp:dev
# prod
npm run mcp:start
# health
curl http://127.0.0.1:7331/health -H "Authorization: Bearer $MCP_AUTH_TOKEN"
```

Keep this process on your private host (VPS, home server, Codespace with port visibility = private). Do NOT expose 7331 publicly.

### 5. Run the WhatsApp bridge

```bash
npm run dev      # webhook on :3000/whatsapp/webhook
# Baileys mode:
# USE_BAILEYS=true npm run dev  # scan QR in terminal
```

For Cloud API, set webhook in Meta dashboard to:

```
https://<your-private-tunnel-or-server>/whatsapp/webhook
Verify token: <WABA_VERIFY_TOKEN>
Fields: messages
```

### 6. Activate like Leo

1. Chat the bot number from your personal WhatsApp
2. Send `Hi`
3. Centrix replies:
> 👋 Hi, I'm *Centrix* — your private AI here in WhatsApp. Reply *YES* to continue.
4. Reply `YES` → menu opens:
> 1️⃣ Ask anything  2️⃣ Summarize chat  3️⃣ Remind me  4️⃣ Image / Doc  5️⃣ Help
5. Just type naturally after that. In groups, use `@Centrix` or reply to it.

To sleep: send `STOP` / `/stop`. To wipe: `/forget`.

## Usage examples

```
Hi Centrix
> menu opens

Summarize my last 50 unread messages
Remind me to call Tunde at 5pm
Translate this voice note to English
What does this PDF say in 5 bullets?
Make this sound professional before I send it
```

Group:
```
@Centrix summarize this argument above 👆
```

## Project structure

```
Centrix.ai/
├── src/
│   ├── core/        # router, session, opt-in
│   ├── activator/   # leo-style wake, consent, menu
│   ├── whatsapp/    # cloud-api + baileys adapters
│   ├── mcp/         # private MCP live server + tools
│   └── tools/       # search, calendar, docs, pay stubs
├── .env.example
└── README.md
```

> This repo is a starter scaffold — adapt file names to your Codespace. The flow above stays the same.

## MCP tools (private)

Add tools in `src/mcp/tools/`. Each tool is only callable by your server:

- `search.web` — private web search
- `notes.remind` — reminders / todos
- `docs.summarize` — pdf/docx/csv/voice
- `pay.assist` — Leo-style guided payment / bill flow (confirm + OTP, never auto-debit)
- `human.handoff` — escalate to you

Example add:

```ts
server.tool("notes.remind", {
  text: z.string(),
  at: z.string()
}, async ({text, at}) => scheduleReminder(text, at))
```

## Privacy + security

- Self-hosted: model, MCP, sessions stay on your box
- No training on your chats. No third-party bot analytics
- Opt-in + `STOP` + `/forget` enforced
- MCP port private-only, bearer token, rate-limit + per-user quota
- Never commit `.env`, `.sessions/`, real tokens — use GitHub Secrets for deploys

## Deploy notes (private)

- Host MCP on: VPS / Raspberry Pi / home lab / GitHub Codespace (private port) + Tailscale
- Keep WhatsApp webhook as the only inbound route
- Suggested: `pm2 start npm --name centrix -- run start` + `pm2 start npm --name mcp -- run mcp:start`

## Roadmap

- [ ] Voice replies (TTS) + voice-note-first mode
- [ ] Yoruba / Pidgin / Hausa / Igbo auto-detect
- [ ] Leo-style quick replies + persistent menu
- [ ] Image generation in-chat
- [ ] Multi-number / business + personal routing

## Commands

| Command | Action |
|---------|--------|
| `Hi / Hello Centrix` | Wake + consent (Leo-style) |
| `YES / STOP` | Opt in / out |
| `menu` | Show skill menu |
| `/forget` | Delete my session data |
| `@Centrix` (group) | Wake in group |

---

Built private by **Auracle-Inc**. Questions? Open an issue — do not post tokens or phone numbers.
