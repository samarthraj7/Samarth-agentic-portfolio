export const config = { runtime: 'edge' };

export default async function handler(req) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const mode = openaiKey ? 'openai' : groqKey ? 'groq' : 'none';
  const model = openaiKey 
    ? (process.env.OPENAI_MODEL || 'gpt-4o-mini')
    : (process.env.GROQ_MODEL || 'llama-3.1-8b-instant');

  return new Response(
    JSON.stringify({
      status: 'ok',
      mode,
      model,
      timestamp: new Date().toISOString(),
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
