import fs from 'node:fs/promises';

export type Detected = {
  kind: 'image' | 'gif' | 'video' | 'audio';
  mime: string;
  ext: string;
};

// Contenitori "ftyp" che non sono video MP4 riproducibili nel browser.
const NON_MP4_BRANDS = new Set(['heic', 'heix', 'hevc', 'mif1', 'msf1', 'avif', 'avis', 'M4A ', 'M4B ', 'qt  ']);

/** Riconosce il tipo reale del file dai primi byte, senza fidarsi di nome o MIME dichiarato. */
export async function sniffFile(filePath: string): Promise<Detected | null> {
  const handle = await fs.open(filePath, 'r');
  const head = Buffer.alloc(16);
  try {
    await handle.read(head, 0, 16, 0);
  } finally {
    await handle.close();
  }
  const ascii = (from: number, to: number) => head.toString('latin1', from, to);

  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return { kind: 'image', mime: 'image/jpeg', ext: 'jpg' };
  }
  if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { kind: 'image', mime: 'image/png', ext: 'png' };
  }
  if (ascii(0, 4) === 'GIF8') {
    return { kind: 'gif', mime: 'image/gif', ext: 'gif' };
  }
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    return { kind: 'image', mime: 'image/webp', ext: 'webp' };
  }
  if (ascii(4, 8) === 'ftyp' && !NON_MP4_BRANDS.has(ascii(8, 12))) {
    return { kind: 'video', mime: 'video/mp4', ext: 'mp4' };
  }
  const mp3Frame = head[0] === 0xff && ((head[1] ?? 0) & 0xe6) === 0xe2; // sync MPEG, Layer III
  if (ascii(0, 3) === 'ID3' || mp3Frame) {
    return { kind: 'audio', mime: 'audio/mpeg', ext: 'mp3' };
  }
  return null;
}
