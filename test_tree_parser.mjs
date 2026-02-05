import fs from 'node:fs/promises';
import ParserPkg from './tree_parser.js';
const { parseTreeText } = ParserPkg;

async function main() {
  const file = 'drive.txt';
  const text = await fs.readFile(file, 'utf8');
  const t0 = performance.now();
  const root = parseTreeText(text);
  const t1 = performance.now();
  const top = root.children.map(ch => ch.name);

  // Basic assertions
  if (!root || !Array.isArray(root.children)) throw new Error('Parser returned invalid root');
  if (root.children.length === 0) throw new Error('No top-level entries parsed');

  // Expect a known entry to be present (based on sample in drive.txt)
  const expected = 'Agisoft Viewer';
  if (!top.includes(expected)) throw new Error(`Expected top-level entry not found: ${expected}`);

  console.log('OK');
  console.log(`Parsed ${root.children.length} top-level entries in ${(t1 - t0).toFixed(1)}ms`);
  console.log('Sample:', top.slice(0, 10).join(', '));
}

main().catch(err => { console.error('FAIL:', err.message); process.exit(1); });
