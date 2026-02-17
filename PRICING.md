# 💰 LLM Pricing Comparison for Your Portfolio

## Quick Summary

| Provider | Free Tier | Cost (if paid) | Speed | Quality |
|----------|-----------|----------------|-------|---------|
| **Ollama** (local) | ✅ Unlimited | $0 (uses your hardware) | Medium-Fast | Very Good |
| **Groq** | ✅ 30 req/min, 14.4K/day | Same rate on paid | ⚡ Ultra Fast | Very Good |
| **OpenAI gpt-4o-mini** | ❌ No free tier | ~$0.15 per 1M tokens | Fast | Excellent |
| **OpenAI gpt-4o** | ❌ No free tier | ~$2.50 per 1M tokens | Fast | Best |

---

## 📊 Detailed Breakdown

### 1. Ollama (Local, Free)
**Cost:** $0 forever  
**Requirements:** Computer with 8GB+ RAM  
**Models:** llama3.2, mistral, gemma, etc.  
**Pros:**
- Completely free
- No rate limits
- Private (runs on your machine)
- No API keys needed

**Cons:**
- Requires Ollama installed locally
- Can't deploy easily to production (need VPS)
- Speed depends on your hardware

**Best for:** Local development, learning, complete privacy

---

### 2. Groq (Cloud, FREE tier)
**Cost:** FREE up to 30 requests/minute, 14,400/day  
**Beyond free:** Same rate (Groq doesn't charge for higher tiers currently)  
**Models:** llama-3.1-8b-instant, mixtral-8x7b  

**Pros:**
- **FREE and FAST** — seriously, it's absurdly fast
- No credit card required for free tier
- Easy to deploy (perfect for Vercel)
- 14.4K requests/day is plenty for a portfolio

**Cons:**
- Rate limits on free tier (but generous)
- Slightly less capable than GPT-4

**Best for:** Production deployment on a budget

**Realistic usage:** A portfolio chatbot gets maybe 50-200 requests/day max. You'll never hit the limit.

Get free key: [console.groq.com](https://console.groq.com)

---

### 3. OpenAI gpt-4o-mini (Cloud, PAID)
**Cost:** $0.15 per 1 million input tokens, $0.60 per 1M output  
**Realistic cost:** ~$0.001 per conversation (1-2 cents per 10 conversations)  

**Example calculation:**
- Average question: ~100 tokens input
- Average answer: ~300 tokens output
- Cost per chat: ~$0.0002 (basically free)
- 1000 chats = ~$0.20

**Pros:**
- More capable than Groq/llama
- Faster reasoning
- Better at complex questions
- No rate limits (with paid account)

**Cons:**
- Requires credit card
- Not free (but dirt cheap)

**Best for:** If you want the absolute best quality and $5/month is fine

Get API key: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

### 4. OpenAI gpt-4o (Cloud, PAID)
**Cost:** $2.50 per 1M input, $10 per 1M output  
**Realistic cost:** ~$0.003 per conversation  

**Only use this if:**
- You need maximum intelligence
- You're demoing to recruiters and want to show off
- Budget isn't a concern

**Reality:** gpt-4o-mini is more than enough for a portfolio chatbot.

---

## ✅ Recommended Setup

### For Development:
```bash
# Local: Use Ollama
ollama serve
npm run dev
```
**Cost:** $0

### For Production (recommended):
```bash
# Vercel + Groq free tier
GROQ_API_KEY=your_groq_key
```
**Cost:** $0  
**Why:** Groq is fast, free, and perfect for this use case.

### For Production (if you want OpenAI):
```bash
# Vercel + OpenAI gpt-4o-mini
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini
```
**Cost:** ~$2-5/month depending on traffic  
**Why:** Better responses, worth it if you expect high traffic or want max quality.

---

## 🎯 My Recommendation

**Start with Groq (free)**. Here's why:
- 14,400 requests/day is way more than you'll ever need for a portfolio
- It's FREE forever (currently)
- It's blazing fast
- Quality is excellent (llama 3.1 is very good)
- If you later want to upgrade, just switch to OpenAI in 30 seconds

**Switch to OpenAI gpt-4o-mini** only if:
- You're showing the site to recruiters and want premium responses
- You hit Groq's rate limits (unlikely)
- You want the absolute best quality

**Never use gpt-4o** for a portfolio chatbot — overkill and expensive.

---

## 🔄 How to Switch Between Them

The code I built supports all three. Just set the right env variable:

```bash
# Local dev (Ollama)
# No env vars needed, just run: ollama serve

# Production (Groq)
GROQ_API_KEY=gsk_...

# Production (OpenAI)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Priority: OpenAI > Groq > Ollama
# (Uses first one with API key set)
```

Change anytime, zero code changes required.

---

## 💡 Bottom Line

**For your portfolio site (samarthraj.com):**
- **FREE option:** Groq (my recommendation)
- **Best quality:** OpenAI gpt-4o-mini (~$2-5/month)
- **Local dev:** Ollama (free)

Start with Groq. Upgrade to OpenAI later if you want. Both take 30 seconds to set up.
