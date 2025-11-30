const OPENAI_RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses';

function getTimeoutMs() {
  const v = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS || process.env.OPENAI_TIMEOUT_MS || 30000);
  return Number.isFinite(v) && v > 0 ? v : 30000;
}

export async function ocrWithGptVision(fileBuffer: Buffer, mimeType: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini-vision';
  if (!key) throw new Error('Missing OPENAI_API_KEY for GPT Vision');

  const base64 = fileBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const body = {
    model,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: 'Describe the image and extract all readable text. Return both a caption and any extracted text.' },
          { type: 'input_image', image_url: dataUrl }
        ]
      }
    ]
  } as any;

  const timeoutMs = getTimeoutMs();
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const res = await fetch(OPENAI_RESPONSES_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: ac.signal as any
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`GPT Vision error: ${res.status} ${txt}`);
    }

    const json = await res.json();

    if (typeof json?.output_text === 'string') return json.output_text;
    if (Array.isArray(json?.output) && json.output[0]) {
      const out = json.output[0];
      if (typeof out?.content === 'string') return out.content;
      if (Array.isArray(out?.content)) {
        return out.content.map((c: any) => c?.text || '').join('\n').trim();
      }
    }

    return JSON.stringify(json);
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error(`GPT Vision request timed out after ${timeoutMs}ms`);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export default { ocrWithGptVision };
