const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '1mb' }));

// ── CONFIG ────────────────────────────────────────────────────────────────
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// ── API KEY ROTATION ──────────────────────────────────────────────────────
// Support up to 10 Groq keys for maximum capacity
const GROQ_KEYS = [];
for (let i = 1; i <= 10; i++) {
  const key = process.env[`GROQ_API_KEY_${i}`];
  if (key) GROQ_KEYS.push(key);
}
// Fallback to old single key format
if (process.env.GROQ_API_KEY && !GROQ_KEYS.includes(process.env.GROQ_API_KEY)) {
  GROQ_KEYS.push(process.env.GROQ_API_KEY);
}

console.log(`🔑 Loaded ${GROQ_KEYS.length} Groq API keys`);

// Track which key to use next (round-robin)
let currentKeyIndex = 0;
const rateLimitedKeys = new Map(); // key -> expiryTimestamp

function getNextGroqKey() {
  if (GROQ_KEYS.length === 0) return null;
  
  const now = Date.now();
  
  // Try to find a non-rate-limited key
  for (let i = 0; i < GROQ_KEYS.length; i++) {
    const keyIndex = (currentKeyIndex + i) % GROQ_KEYS.length;
    const key = GROQ_KEYS[keyIndex];
    
    // Check if this key is rate limited
    const rateLimitExpiry = rateLimitedKeys.get(key);
    if (!rateLimitExpiry || now > rateLimitExpiry) {
      // Key is available!
      currentKeyIndex = (keyIndex + 1) % GROQ_KEYS.length;
      return { key, index: keyIndex };
    }
  }
  
  // All keys are rate limited
  return null;
}

function markKeyRateLimited(key, waitSeconds) {
  const expiryTime = Date.now() + (waitSeconds * 1000);
  rateLimitedKeys.set(key, expiryTime);
  console.log(`⏱️  [Rate Limit] Key marked as limited for ${waitSeconds}s (expires at ${new Date(expiryTime).toLocaleTimeString()})`);
  
  // Auto-clear after expiry
  setTimeout(() => {
    rateLimitedKeys.delete(key);
    console.log(`✅ [Rate Limit] Key is now available again`);
  }, waitSeconds * 1000);
}

// Determine mode: OpenAI > Groq > Ollama
let MODE = 'ollama';
if (OPENAI_API_KEY) MODE = 'openai';
else if (GROQ_KEYS.length > 0) MODE = 'groq';

console.log(`\n🤖 Mode: ${MODE}`);
if (MODE === 'groq') {
  console.log(`📡 Groq Keys: ${GROQ_KEYS.length} available (${GROQ_KEYS.length * 30} req/min total)`);
  console.log(`📡 Model: ${GROQ_MODEL}`);
} else {
  console.log(`📡 Model: ${MODE === 'openai' ? OPENAI_MODEL : OLLAMA_MODEL}`);
}

// ── HEALTH CHECK ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mode: MODE, 
    model: MODE === 'openai' ? OPENAI_MODEL : MODE === 'groq' ? GROQ_MODEL : OLLAMA_MODEL,
    groqKeys: MODE === 'groq' ? GROQ_KEYS.length : 0,
    capacity: MODE === 'groq' ? `${GROQ_KEYS.length * 30} req/min` : 'unlimited'
  });
});

// ── CHAT ENDPOINT ─────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages, systemPrompt } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Set SSE headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendToken = (token) => {
    res.write(`data: ${JSON.stringify({ token })}\n\n`);
  };

  const sendDone = () => {
    res.write('data: [DONE]\n\n');
    res.end();
  };

  const sendError = (msg) => {
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  };

  try {
    if (MODE === 'openai') {
      await streamOpenAI({ messages, systemPrompt, sendToken, sendDone, sendError });
    } else if (MODE === 'groq') {
      await streamGroq({ messages, systemPrompt, sendToken, sendDone, sendError });
    } else {
      await streamOllama({ messages, systemPrompt, sendToken, sendDone, sendError });
    }
  } catch (err) {
    console.error('Chat error:', err.message);
    sendError(err.message);
  }
});

// ── OLLAMA STREAMING ──────────────────────────────────────────────────────
async function streamOllama({ messages, systemPrompt, sendToken, sendDone, sendError }) {
  const allMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: allMessages,
      stream: true,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 512,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.statusText}. Is Ollama running? Run: ollama serve`);
  }

  const reader = response.body;
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of reader) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.message?.content) {
          sendToken(parsed.message.content);
        }
        if (parsed.done) {
          sendDone();
          return;
        }
      } catch {}
    }
  }
  sendDone();
}

// ── GROQ STREAMING WITH KEY ROTATION ──────────────────────────────────────
async function streamGroq({ messages, systemPrompt, sendToken, sendDone, sendError, retryCount = 0 }) {
  const keyData = getNextGroqKey();
  
  if (!keyData) {
    // All keys are rate limited
    console.log('⚠️  [Groq] All keys are rate limited');
    
    if (OPENAI_API_KEY) {
      console.log('🔄 [Fallback] Switching to OpenAI');
      return streamOpenAI({ messages, systemPrompt, sendToken, sendDone, sendError });
    }
    
    // Find the minimum wait time from all rate-limited keys
    const now = Date.now();
    let minWaitTime = 60; // Fallback only if we can't determine
    
    for (const [key, expiryTime] of rateLimitedKeys.entries()) {
      const remainingMs = expiryTime - now;
      const remainingSec = Math.ceil(remainingMs / 1000);
      if (remainingSec > 0 && remainingSec < minWaitTime) {
        minWaitTime = remainingSec;
      }
    }
    
    console.log(`⏱️  [All Limited] Shortest wait time: ${minWaitTime}s`);
    
    // No fallback available - show rate limit message
    sendError(JSON.stringify({
      type: 'rate_limit',
      waitTime: minWaitTime,
      message: `All API keys are currently rate limited. Please wait ${minWaitTime} seconds before asking another question.`
    }));
    return;
  }
  
  const { key: apiKey, index: keyIndex } = keyData;
  console.log(`🔑 [Groq] Using key ${keyIndex + 1}/${GROQ_KEYS.length}`);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 512,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    
    // Parse rate limit error
    try {
      const errorData = JSON.parse(err);
      const errorMsg = errorData.error?.message || '';
      
      // Check for rate limit
      if (errorMsg.includes('Rate limit') || errorMsg.includes('rate_limit')) {
        console.log('📋 [Full Error]:', errorMsg);
        
        // Extract wait time: "Please try again in 54.17s"
        const match = errorMsg.match(/try again in ([\d.]+)s/i);
        
        if (!match) {
          console.error('❌ [Parse Error] Could not extract wait time from:', errorMsg);
          throw new Error(`Groq rate limit with unparseable wait time: ${errorMsg}`);
        }
        
        const waitTime = Math.ceil(parseFloat(match[1]));
        console.log(`⏱️  [Rate Limit] Key ${keyIndex + 1} hit limit`);
        console.log(`   Parsed wait time: ${match[1]}s → rounded to ${waitTime}s`);
        
        // Mark this key as rate limited
        markKeyRateLimited(apiKey, waitTime);
        
        // Try next key immediately
        console.log(`🔄 [Retry] Trying next key (attempt ${retryCount + 1})...`);
        return streamGroq({ messages, systemPrompt, sendToken, sendDone, sendError, retryCount: retryCount + 1 });
      }
    } catch (parseErr) {
      console.error('❌ [Groq] Error parsing response:', parseErr);
    }
    
    throw new Error(`Groq API error: ${err}`);
  }

  const reader = response.body;
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of reader) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') {
        sendDone();
        return;
      }
      try {
        const parsed = JSON.parse(data);
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) sendToken(token);
      } catch {}
    }
  }
  sendDone();
}

// ── OPENAI STREAMING ──────────────────────────────────────────────────────
async function streamOpenAI({ messages, systemPrompt, sendToken, sendDone, sendError }) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set. Add it to your .env file.');
  }

  console.log('[OpenAI] Using OpenAI API');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 512,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${err}`);
  }

  const reader = response.body;
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of reader) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') {
        sendDone();
        return;
      }
      try {
        const parsed = JSON.parse(data);
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) sendToken(token);
      } catch {}
    }
  }
  sendDone();
}

// ── START ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ Server running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});