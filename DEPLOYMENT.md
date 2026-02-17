# 🚀 Samarth Portfolio — Deployment Guide

## Overview

```
samarth-portfolio/
├── frontend/          # React + Vite (the UI)
├── backend/           # Express server (for local dev with Ollama)
├── api/               # Vercel serverless functions (for production)
├── vercel.json        # Vercel deployment config
└── package.json
```

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- [Ollama](https://ollama.com) installed

### Step 1 — Install Ollama & pull a model
```bash
# Install from https://ollama.com
# Then pull the model:
ollama pull llama3.2
```

### Step 2 — Clone & install dependencies
```bash
git clone https://github.com/YOUR_USERNAME/samarth-portfolio.git
cd samarth-portfolio

# Install all dependencies
npm run install:all
```

### Step 3 — Set up backend environment
```bash
cp backend/.env.example backend/.env
# Default settings work for Ollama locally — no changes needed
```

### Step 4 — Start everything
```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start backend + frontend together
npm run dev
```

Visit: **http://localhost:5173**

---

## 🌐 Production Deployment on Vercel (FREE)

This gives you a public URL and custom domain support.

### Step 1 — Choose your LLM provider

**Option A: Groq (FREE, recommended)**
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free, no credit card)
3. Create API key → Copy it
4. **Free tier:** 30 requests/minute, 14,400/day (more than enough for a portfolio)

**Option B: OpenAI (PAID, ~$2-5/month)**
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign up → Add payment method
3. Create API key → Copy it
4. **Cost:** ~$0.001 per conversation with gpt-4o-mini (cheapest model)

See [PRICING.md](./PRICING.md) for full comparison.

### Step 2 — Push to GitHub
```bash
cd samarth-portfolio
git init
git add .
git commit -m "Initial commit — Samarth Portfolio"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/samarth-portfolio.git
git push -u origin main
```

### Step 3 — Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy (from project root)
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name: samarth-portfolio
# - In which directory is your code? ./
```

Or deploy via **vercel.com**:
1. Go to [vercel.com](https://vercel.com) → Sign in with GitHub
2. New Project → Import `samarth-portfolio`
3. Vercel auto-detects settings from `vercel.json`

### Step 4 — Add environment variables in Vercel
In Vercel dashboard → Your Project → Settings → Environment Variables:

**If using Groq (free):**
```
GROQ_API_KEY        = gsk_your_groq_key_here
GROQ_MODEL          = llama-3.1-8b-instant
ALLOWED_ORIGIN      = https://samarthraj.com
```

**If using OpenAI (paid):**
```
OPENAI_API_KEY      = sk_your_openai_key_here
OPENAI_MODEL        = gpt-4o-mini
ALLOWED_ORIGIN      = https://samarthraj.com
```

**Priority:** If you set both keys, OpenAI takes priority. For most users, Groq is perfect.

### Step 5 — Redeploy
```bash
vercel --prod
```

Your site is now live at `https://samarth-portfolio.vercel.app`

---

## 🌍 Custom Domain: samarthraj.com

### Option A — Buy samarthraj.com via Vercel (easiest)
1. Vercel Dashboard → Project → Settings → Domains
2. Type `samarthraj.com` → Add
3. Click "Buy domain" if available (~$10-15/year through Vercel)
4. Auto-configured! Done.

### Option B — Buy elsewhere, point to Vercel
Buy from Namecheap / GoDaddy / Google Domains, then:

**In Vercel Dashboard → Project → Settings → Domains:**
Add both:
- `samarthraj.com`
- `www.samarthraj.com`

**In your domain registrar's DNS settings, add:**
```
Type    Name     Value
A       @        76.76.21.21
CNAME   www      cname.vercel-dns.com
```

Wait 5-30 minutes for DNS to propagate. Vercel auto-provisions SSL.

---

## 🔄 Frontend API URL (Production)

In production, the frontend calls `/api/chat` (relative URL) → goes to Vercel Edge Function.
For local dev, Vite proxies `/api/*` → `localhost:3001` (your Express backend).

**No code changes needed between dev and prod!**

If you want to override, set in `frontend/.env`:
```
VITE_API_URL=https://your-backend.com
```

---

## 🐳 Alternative: Self-Hosted VPS (DigitalOcean / Hetzner)

If you want Ollama in production (instead of Groq):

```bash
# On your VPS (Ubuntu)
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
ollama serve &

# Clone and run
git clone https://github.com/YOUR_USERNAME/samarth-portfolio.git
cd samarth-portfolio
npm run install:all

# Build frontend
cd frontend && npm run build && cd ..

# Copy built files to serve statically
cp -r frontend/dist/* /var/www/html/

# Start backend
cd backend
cp .env.example .env
# Edit .env: ALLOWED_ORIGIN=https://samarthraj.com
npm start
```

Use Nginx as reverse proxy + Certbot for SSL.

---

## 📝 Updating Your Profile Data

All chatbot knowledge lives in:
```
frontend/src/data/profileData.js
```

Edit the `SYSTEM_PROMPT` to add new projects, experiences, etc.
Then redeploy: `vercel --prod`

---

## 🛠️ Troubleshooting

| Issue | Fix |
|-------|-----|
| "Connection failed" locally | Make sure `ollama serve` is running |
| "GROQ_API_KEY not set" in production | Add env var in Vercel dashboard |
| Slow responses | Groq is free and fast. Ollama speed depends on your hardware |
| Chat not loading | Check browser console for network errors |
| Domain not working | DNS can take up to 24h, usually 5-30 min |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Pure CSS (custom design) |
| LLM (local) | Ollama + llama3.2 |
| LLM (prod) | Groq API (free) |
| Backend (local) | Express.js + SSE streaming |
| Backend (prod) | Vercel Edge Functions |
| Deployment | Vercel (free tier) |
| Domain | samarthraj.com (any registrar) |

---

## 📦 Repository Structure for GitHub

```
samarth-portfolio/          ← Root (push this to GitHub)
├── .gitignore
├── package.json             ← Root scripts (npm run dev)
├── vercel.json              ← Vercel config
├── DEPLOYMENT.md            ← This file
│
├── api/                     ← Vercel Edge Functions (production)
│   ├── chat.js              ← /api/chat endpoint
│   └── health.js            ← /api/health endpoint
│
├── frontend/                ← React app
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   └── Message.jsx
│       ├── data/
│       │   └── profileData.js    ← ✏️ Edit this to update your info
│       └── styles/
│           └── index.css
│
└── backend/                 ← Local Express server (dev only)
    ├── server.js
    ├── package.json
    └── .env.example
```
