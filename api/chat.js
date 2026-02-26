// Vercel Serverless Function: /api/chat
// Uses Groq API (free) with key rotation or OpenAI API (paid) for production

export const config = { runtime: 'edge' };

// ── API KEY ROTATION (Edge Functions are stateless, so we use random) ────
const GROQ_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
  process.env.GROQ_API_KEY_4,
  process.env.GROQ_API_KEY_5,
  process.env.GROQ_API_KEY, // Fallback to single key
].filter(Boolean);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// Random selection for Edge Functions (stateless)
function getRandomGroqKey() {
  if (GROQ_KEYS.length === 0) return null;
  return GROQ_KEYS[Math.floor(Math.random() * GROQ_KEYS.length)];
}

// Shuffle array to try keys in random order
function shuffleKeys() {
  const shuffled = [...GROQ_KEYS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Determine mode
const USE_OPENAI = !!OPENAI_API_KEY;
const USE_GROQ = GROQ_KEYS.length > 0;

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { messages, systemPrompt } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: 'messages array required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // If using OpenAI, use it directly (no rotation needed)
  if (USE_OPENAI) {
    return await callLLM({
      apiKey: OPENAI_API_KEY,
      model: OPENAI_MODEL,
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      messages,
      systemPrompt,
      isOpenAI: true,
    });
  }

  // If using Groq, try keys with retry logic
  if (USE_GROQ) {
    const keysToTry = shuffleKeys(); // Random order
    let lastError = null;
    let lastWaitTime = 30;

    // Try each key once
    for (let i = 0; i < keysToTry.length; i++) {
      const apiKey = keysToTry[i];
      console.log(`[Groq] Attempt ${i + 1}/${keysToTry.length}`);

      try {
        const result = await callLLM({
          apiKey: apiKey,
          model: GROQ_MODEL,
          apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
          messages,
          systemPrompt,
          isOpenAI: false,
        });

        // If we get here, the call succeeded
        return result;

      } catch (error) {
        // Check if it's a rate limit error
        if (error.isRateLimit) {
          console.log(`[Groq] Key ${i + 1} rate limited, trying next...`);
          lastError = error;
          lastWaitTime = error.waitTime || 30;
          continue; // Try next key
        } else {
          // Other error, don't retry
          throw error;
        }
      }
    }

    // All keys failed with rate limit
    console.log('[Groq] All keys rate limited');
    return createRateLimitResponse(lastWaitTime);
  }

  // No API keys configured
  return new Response(
    JSON.stringify({ error: 'No API keys configured' }),
    { 
      status: 500, 
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      } 
    }
  );
}

// ── CALL LLM API ──────────────────────────────────────────────────────────
async function callLLM({ apiKey, model, apiUrl, messages, systemPrompt, isOpenAI }) {
  const llmResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 512,
      temperature: 0.7,
    }),
  });

  if (!llmResponse.ok) {
    const err = await llmResponse.text();
    
    // Parse rate limit error
    try {
      const errorData = JSON.parse(err);
      const errorMsg = errorData.error?.message || '';
      
      // Check for rate limit
      if (errorMsg.includes('Rate limit') || errorMsg.includes('rate_limit')) {
        // Extract wait time
        let waitTime = 10;
        const match = errorMsg.match(/([\d.]+)s/);
        if (match) {
          waitTime = Math.ceil(parseFloat(match[1]));
        }
        
        // Throw special error so we can retry
        const rateLimitError = new Error('Rate limit');
        rateLimitError.isRateLimit = true;
        rateLimitError.waitTime = waitTime;
        throw rateLimitError;
      }
    } catch (e) {
      if (e.isRateLimit) throw e; // Re-throw rate limit errors
      // Otherwise fall through to general error
    }
    
    // General API error
    throw new Error(`${isOpenAI ? 'OpenAI' : 'Groq'} API error: ${err}`);
  }

  // Transform LLM SSE stream → our SSE format
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    const reader = llmResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();

          if (data === '[DONE]') {
            await writer.write(encoder.encode('data: [DONE]\n\n'));
            break;
          }

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) {
              await writer.write(
                encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
              );
            }
          } catch {}
        }
      }
    } finally {
      await writer.write(encoder.encode('data: [DONE]\n\n'));
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    },
  });
}

// ── CREATE RATE LIMIT RESPONSE ────────────────────────────────────────────
function createRateLimitResponse(waitTime) {
  const encoder = new TextEncoder();
  const errorMessage = JSON.stringify({
    type: 'rate_limit',
    waitTime: waitTime,
    message: `Rate limit reached. Please wait ${waitTime} seconds before asking another question.`
  });
  
  const stream = new ReadableStream({
    start(controller) {
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    }
  });
  
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    },
  });
}