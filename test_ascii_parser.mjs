import fs from 'node:fs/promises';
import ParserPkg from './tree_parser.js';
const { parseTreeText } = ParserPkg;

async function main() {
  // Read first 512 KiB to avoid loading entire huge file
  const fh = await fs.open('18TB_1.txt', 'r');
  const { size } = await fh.stat();
  const toRead = Math.min(512 * 1024, size);
  const buf = Buffer.allocUnsafe(toRead);
  await fh.read({ buffer: buf, position: 0, length: toRead });
  await fh.close();

  // Decode with BOM + heuristic similar to viewer.js
  function decode(bytes) {
    if (bytes[0] === 0xFF && bytes[1] === 0xFE) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
    if (bytes[0] === 0xFE && bytes[1] === 0xFF) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
    if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return new TextDecoder('utf-8').decode(bytes.subarray(3));
    let nul = 0; for (let i = 0; i < Math.min(bytes.length, 4096); i++) if (bytes[i] === 0) nul++;
    if (nul > 100) return new TextDecoder('utf-16le').decode(bytes);
    return new TextDecoder('utf-8').decode(bytes);
  }
  const text = decode(buf);
  const root = parseTreeText(text);
  if (!root || !Array.isArray(root.children) || root.children.length === 0) throw new Error('Parser failed on ASCII/UTF-16 sample');
  console.log('OK (ASCII/UTF-16 sample)');
  console.log('Top names:', root.children.slice(0, 5).map(n => n.name));
}

main().catch(err => { console.error('FAIL:', err); process.exit(1); });

