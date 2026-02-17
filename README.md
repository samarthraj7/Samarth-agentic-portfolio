# Samarth Rajendra — AI Portfolio Chatbot

> An interactive portfolio powered by a local LLM (Ollama) or Groq API — ask anything about my experience, research, and projects.

![Portfolio Preview](https://img.shields.io/badge/Built%20with-React%20%2B%20Vite-61dafb?style=flat-square) 
![LLM](https://img.shields.io/badge/LLM-Ollama%20%7C%20Groq-6366f1?style=flat-square)
![Deployed on](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square)

## ✨ Features

- 🤖 **AI-powered chatbot** — answers any question about my experience, research, and projects
- ⚡ **Streaming responses** — real-time token streaming for a natural feel
- 🎨 **Dark luxury UI** — custom-designed aesthetic with ambient animations
- 📚 **Deep knowledge** — trained on my full resume + 2 Springer publications
- 🔌 **Dual LLM support** — Ollama locally, Groq API in production
- 📱 **Responsive** — works on all devices

## 🚀 Quick Start

```bash
# 1. Install Ollama + pull model
ollama pull llama3.2

# 2. Install dependencies
npm run install:all

# 3. Start dev servers (in two terminals)
ollama serve
npm run dev
```

Visit `http://localhost:5173`

## 📖 Full Deployment Guide

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Local development setup
- Vercel production deployment
- Custom domain (samarthraj.com) setup
- Self-hosted VPS option

## 🛠️ Tech Stack

React · Vite · Express · Ollama · Groq · Vercel Edge Functions

---

*Built with ❤️ by Samarth Rajendra — AI/ML Engineer @ USC*
