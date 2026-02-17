// Vercel Serverless Function: /api/chat
// Uses Groq API (free) or OpenAI API (paid) for production

export const config = { runtime: 'edge' };

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// Priority: OpenAI > Groq
const USE_OPENAI = !!OPENAI_API_KEY;
const API_KEY = USE_OPENAI ? OPENAI_API_KEY : GROQ_API_KEY;
const MODEL = USE_OPENAI ? OPENAI_MODEL : GROQ_MODEL;
const API_URL = USE_OPENAI 
  ? 'https://api.openai.com/v1/chat/completions'
  : 'https://api.groq.com/openai/v1/chat/completions';

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

  if (!API_KEY) {
    return new Response(
      JSON.stringify({ error: `${USE_OPENAI ? 'OPENAI' : 'GROQ'}_API_KEY environment variable not set` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { messages, systemPrompt } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: 'messages array required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Call LLM API with streaming
  const llmResponse = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!llmResponse.ok) {
    const err = await llmResponse.text();
    return new Response(
      JSON.stringify({ error: `${USE_OPENAI ? 'OpenAI' : 'Groq'} API error: ${err}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
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
