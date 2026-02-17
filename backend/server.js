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
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Determine mode: OpenAI > Groq > Ollama
let MODE = 'ollama';
if (OPENAI_API_KEY) MODE = 'openai';
else if (GROQ_API_KEY || process.env.USE_GROQ === 'true') MODE = 'groq';

console.log(`🤖 Mode: ${MODE}`);
console.log(`📡 Model: ${MODE === 'openai' ? OPENAI_MODEL : MODE === 'groq' ? GROQ_MODEL : OLLAMA_MODEL}`);

// ── HEALTH CHECK ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mode: MODE, 
    model: MODE === 'openai' ? OPENAI_MODEL : MODE === 'groq' ? GROQ_MODEL : OLLAMA_MODEL 
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
        num_predict: 1024,
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

// ── GROQ STREAMING ────────────────────────────────────────────────────────
async function streamGroq({ messages, systemPrompt, sendToken, sendDone, sendError }) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not set. Add it to your .env file.');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
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
      max_tokens: 1024,
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
