import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
// import * as pdfParse from 'pdf-parse';
import { randomUUID } from 'crypto';
import { chunkText } from '@lib/chunk';
import { embedText } from '@lib/embeddings';
import { supabase } from '@lib/supabase';
import { safeParseJson } from '@lib/utils';

// --- Utility functions (copied from api/upload.ts) ---
const MAX_TEXT_LENGTH = 500_000;
const MIN_CHUNK_LENGTH = 100;
function normalizeEmbedding(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    if (raw.length === 0) return [];
    if (Array.isArray(raw[0])) {
      const first = raw[0] as unknown;
      if (Array.isArray(first)) return (first as unknown[]).map(Number);
    }
    if (typeof raw[0] === 'number') return (raw as unknown[]).map(Number);
  }
  if (raw && typeof raw === 'object' && 'embedding' in (raw as any)) {
    const emb = (raw as any).embedding;
    if (Array.isArray(emb)) return emb.map(Number);
  }
  throw new Error('Unexpected embedding format');
}
function isNoisyChunk(text: string): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (trimmed.length < MIN_CHUNK_LENGTH) return true;
  const letters = (trimmed.match(/[A-Za-z]/g) ?? []).length;
  if (letters === 0) return true;
  const letterRatio = letters / trimmed.length;
  if (letterRatio < 0.6) return true;
  return false;
}
function guessMimeFromFilename(filename: string) {
  const lower = (filename || '').toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  if (lower.endsWith('.tif') || lower.endsWith('.tiff')) return 'image/tiff';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}
function stripHtml(html: string): string {
  const withoutScripts = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
                             .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, ' ');
  return withoutTags.replace(/\s+/g, ' ').trim();
}
async function extractTextFromBuffer(fileBuffer: Buffer, filename: string | undefined, mimeType: string | undefined): Promise<string> {
  const lower = (filename || '').toLowerCase();
  const mt = (mimeType || '').toLowerCase();
  console.log('[UPLOAD] File info:', { filename, mimeType, bufferSize: fileBuffer.length });
  // DOCX
  if (lower.endsWith('.docx') || mt === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return (result.value || '').replace(/\s+/g, ' ').trim();
  }
  // PDF
  if (mt === 'application/pdf' || lower.endsWith('.pdf')) {
    try {
      // @ts-ignore
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(fileBuffer);
      return (data?.text || '').replace(/\s+/g, ' ').trim();
    } catch (err: any) {
      throw new Error('Failed to extract text from PDF: ' + String(err?.message ?? err ?? ''));
    }
  }
  // Images (support more types)
  const imageExtPattern = /\.(png|jpe?g|gif|bmp|tiff?|webp)$/;
  if (mt.startsWith('image/') || imageExtPattern.test(lower)) {
    const { ocrWithGptVision } = await import('@lib/vision');
    return await ocrWithGptVision(fileBuffer, mimeType || 'image/*');
  }
  // Fallback: log and throw error
  console.error('[UPLOAD] Unsupported file type:', { filename, mimeType });
  throw new Error('Unsupported file type. Please upload a DOCX, PDF, or image file.');
}
async function ingestTextAndStore(text: string, providedDocId?: string) {
  if (!text || !text.trim()) throw new Error('No text to ingest');
  if (text.length > MAX_TEXT_LENGTH) throw new Error(`Text too large. Max ${MAX_TEXT_LENGTH} characters allowed.`);
  const docId = providedDocId || randomUUID();
  const chunks = chunkText(text).filter((c) => c && c.trim().length > 0);
  let filtered = chunks.filter((c) => !isNoisyChunk(c));
  if (!filtered.length) filtered = [text.trim()];
  const rows = await Promise.all(filtered.map(async (chunk) => {
    const raw = await embedText(chunk);
    const embedding = normalizeEmbedding(raw);
    return { doc_id: docId, text: chunk, embedding };
  }));
  const { error } = await supabase.from('chunks').insert(rows as any);
  if (error) throw error;
  return { docId, chunksInserted: rows.length };
}

// --- Multipart parser for Next.js ---

export async function POST(request: NextRequest) {
  try {
    const contentType = String(request.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (file && typeof file === 'object' && 'arrayBuffer' in file) {
        const filename = file.name || 'upload.bin';
        const mimeType = file.type || guessMimeFromFilename(filename);
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileSize = buffer.length;
        let text = '';
        try {
          text = await extractTextFromBuffer(buffer, filename, mimeType);
        } catch (err) {
          console.error('[UPLOAD] Error extracting text:', err);
          throw err;
        }
        const docId = randomUUID();
        let fileError: any = null;
        const insertResult = await supabase.from('files').insert({
          id: docId,
          name: filename,
          size: fileSize,
          uploaded_at: new Date().toISOString(),
          doc_id: docId,
        });
        fileError = insertResult.error;
        if (fileError) {
          console.error('[UPLOAD] Error inserting file metadata:', fileError);
          throw new Error('Error inserting file metadata: ' + fileError);
        }
        const result = await ingestTextAndStore(text, docId);
        const respObj = { ok: true, file: { id: docId, name: filename }, ...result };
        return NextResponse.json(respObj, { status: 200 });
      }
      console.error('[UPLOAD] No file found in form data');
      return NextResponse.json({ error: 'No file found in form data' }, { status: 400 });
    }
    console.error('[UPLOAD] Unsupported Content-Type:', contentType);
    return NextResponse.json({ error: 'Unsupported Content-Type. Send multipart/form-data' }, { status: 400 });
  } catch (err: any) {
    console.error('[UPLOAD] Unexpected error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to process upload', stack: err?.stack }, { status: 400 });
  }
}
