/*
  Simple parser for `tree`-style ASCII listings (UTF-8 box drawing).
  Exports: parseTreeText(text) -> { name, children }
  Works in browser and Node (UMD-style export at bottom).
*/

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TreeTxtParser = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function isRootLine(line) {
    return line.trim() === '.';
  }

  function branchIndex(line) {
    // Support Unicode (├──, └──) and ASCII ( +--- , \--- ) tree markers
    const candidates = [];
    const pushIdx = (tok) => { const i = line.indexOf(tok); if (i !== -1) candidates.push(i); };
    pushIdx('├──'); pushIdx('└──');
    pushIdx('+---'); pushIdx('\\---');
    if (!candidates.length) return -1;
    return Math.min.apply(null, candidates);
  }

  function getDepth(line) {
    if (isRootLine(line)) return 0;
    const b = branchIndex(line);
    if (b === -1) {
      // No branch character found; treat as top-level name
      return 0;
    }
    // Each indent level contributes 4 characters ("│   " or "    ")
    // Use round to be resilient to stray spacing.
    return Math.max(0, Math.round(b / 4));
  }

  function getName(line) {
    if (isRootLine(line)) return '.';
    const b = branchIndex(line);
    if (b === -1) return line.trim();
    const after = line.slice(b);
    // Strip leading branch token for both styles
    const name = after
      .replace(/^([├└]──\s)/u, '')
      .replace(/^(?:\+---|\\---)\s?/, '')
      .trim();
    return name;
  }

  function parseTreeText(text) {
    if (typeof text !== 'string') throw new TypeError('text must be a string');
    const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return { name: 'root', children: [] };

    const driveRootRe = /^[A-Za-z]:\.$/; // e.g., "D:."
    const preItems = lines.map((line, idx) => ({ idx, raw: line }));
    // Keep only meaningful tree lines: actual branches or explicit root markers
    const items = preItems
      .filter(it => isRootLine(it.raw) || branchIndex(it.raw) !== -1 || driveRootRe.test(it.raw.trim()))
      .map(it => ({
        idx: it.idx,
        raw: it.raw,
        depth: getDepth(it.raw),
        name: getName(it.raw)
      }));

    // Find or create root
    let rootItem = items.find(it => isRootLine(it.raw));
    const root = { name: rootItem ? '.' : 'root', children: [] };

    const stack = [{ depth: -1, node: root }];
    const nodes = [];

    // Build hierarchical nodes by depth using a stack
    for (const it of items) {
      // Skip duplicate root line becoming a child
      if (isRootLine(it.raw)) continue;
      const node = { name: it.name, children: [] };

      // Find parent with depth exactly one less
      while (stack.length && stack[stack.length - 1].depth >= it.depth) stack.pop();
      const parent = stack[stack.length - 1].node;
      parent.children.push(node);
      stack.push({ depth: it.depth, node });
      nodes.push(node);
    }

    return root;
  }

  return { parseTreeText };
});
