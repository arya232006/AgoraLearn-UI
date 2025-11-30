export function chunkText(text: string, chunkSize = 800, overlap = 300) {
  // Split text into paragraphs first
  const paragraphs = text.split(/\n\n+/);
  const sentences: string[] = [];
  paragraphs.forEach(p => {
    // Further split paragraphs into sentences
    sentences.push(...p.split(/(?<=[.!?])\s+/));
  });
  // Recombine sentences into chunks
  const chunks: string[] = [];
  let current = '';
  for (let i = 0; i < sentences.length; i++) {
    if ((current + sentences[i]).length > chunkSize) {
      if (current.length) chunks.push(current.trim());
      // Overlap: add last N chars of previous chunk to next
      current = current.slice(-overlap) + sentences[i];
    } else {
      current += (current ? ' ' : '') + sentences[i];
    }
  }
  if (current.length) chunks.push(current.trim());
  return chunks;
}
