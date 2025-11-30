const OPENAI_EMBEDDING_ENDPOINT = 'https://api.openai.com/v1/embeddings';
const OPENAI_EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

type OpenAIEmbeddingResponse = {
  data: { embedding: number[] }[];
};

export async function embedText(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Missing OPENAI_API_KEY');
  // Retry once for transient network errors (undici / fetch)
  let lastErr: any = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const timeoutMs = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS || process.env.OPENAI_TIMEOUT_MS || 30000);
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), timeoutMs);

      const res = await fetch(OPENAI_EMBEDDING_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: OPENAI_EMBEDDING_MODEL, input: text }),
        signal: ac.signal as any
      });
      clearTimeout(to);

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`OpenAI embedding error: ${res.status} ${txt}`);
      }

      const data = (await res.json()) as OpenAIEmbeddingResponse;
      if (!data || !Array.isArray(data.data) || !data.data[0] || !Array.isArray(data.data[0].embedding)) {
        throw new Error('Unexpected OpenAI embedding response');
      }
      return data.data[0].embedding;
    } catch (e: any) {
      lastErr = e;
      console.warn(`embedText attempt ${attempt} failed:`, String(e?.message ?? e));
      if (attempt < 2) {
        // small backoff
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      if (e?.name === 'AbortError') throw new Error(`OpenAI embedding request timed out after ${process.env.OPENAI_REQUEST_TIMEOUT_MS || 30000}ms`);
      throw lastErr;
    }
  }

  // unreachable, but satisfy TS
  throw new Error('Failed to embed text');
}
