// Viewer logic for Tree.txt Explorer
(function () {
  const { parseTreeText } = (typeof TreeTxtParser !== 'undefined' ? TreeTxtParser : require('./tree_parser.js'));

  const el = sel => document.querySelector(sel);
  const treeEl = el('#tree');
  const statusEl = el('#status');
  const fileInput = el('#fileInput');
  const filterInput = el('#filter');
  const fuzzinessInput = el('#fuzziness');
  const fuzzinessValue = el('#fuzzinessValue');
  const expandAllBtn = el('#expandAll');
  const collapseAllBtn = el('#collapseAll');
  const clearFilterBtn = el('#clearFilter');
  const clearAllBtn = el('#clearAll');
  const hero = document.querySelector('.hero');
  const forest = [];
  let filterTimer = null;
  let fuzziness = fuzzinessInput ? Number(fuzzinessInput.value) || 0 : 0;

  function setStatus(msg) { statusEl.textContent = msg; }

  function countNodes(node) {
    if (!node.children || !node.children.length) return 1;
    let total = 1;
    for (const child of node.children) total += countNodes(child);
    return total;
  }

  function renderNode(node) {
    if (!node.children || node.children.length === 0) {
      const div = document.createElement('div');
      div.className = 'node-file';
      div.textContent = node.name;
      return div;
    }
    const details = document.createElement('details');
    details.open = false;
    const summary = document.createElement('summary');
    const twisty = document.createElement('span');
    twisty.className = 'twisty';
    twisty.textContent = '▸';
    details.addEventListener('toggle', () => {
      twisty.textContent = details.open ? '▾' : '▸';
    });
    const label = document.createElement('span');
    label.className = 'node-dir';
    label.textContent = node.name;
    summary.appendChild(twisty);
    summary.appendChild(label);
    details.appendChild(summary);
    const container = document.createElement('div');
    for (const child of node.children) container.appendChild(renderNode(child));
    details.appendChild(container);
    return details;
  }

  function renderForest() {
    const frag = document.createDocumentFragment();
    treeEl.innerHTML = '';
    if (!forest.length) {
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = 'Noch keine Bäume geladen.';
      frag.appendChild(empty);
      if (hero) hero.classList.remove('hidden');
      treeEl.appendChild(frag);
      return;
    }
    if (hero) hero.classList.add('hidden');
    for (const entry of forest) {
      const block = document.createElement('div');
      block.className = 'tree-block';
      const title = document.createElement('div');
      title.className = 'tree-title';
      title.textContent = entry.label;
      if (entry.info) {
        const small = document.createElement('small');
        small.textContent = entry.info;
        title.appendChild(small);
      }
      block.appendChild(title);
      const rootWrap = document.createElement('div');
      rootWrap.className = 'node-dir';
      rootWrap.textContent = entry.root.name;
      block.appendChild(rootWrap);
      const nodesFrag = document.createDocumentFragment();
      for (const child of entry.root.children) nodesFrag.appendChild(renderNode(child));
      block.appendChild(nodesFrag);
      frag.appendChild(block);
    }
    treeEl.appendChild(frag);
  }

  function expandAll() {
    treeEl.querySelectorAll('details').forEach(d => { d.open = true; });
  }
  function collapseAll() {
    treeEl.querySelectorAll('details').forEach(d => { d.open = false; });
  }

  function applyFilter(query) {
    if (!forest.length) return;
    const q = query.trim().toLowerCase();
    const nodes = treeEl.querySelectorAll('.node-dir, .node-file');
    nodes.forEach(n => n.classList.remove('match'));
    if (!q) {
      // Reset: show all
      treeEl.querySelectorAll('.hidden').forEach(el => el.classList.remove('hidden'));
      return;
    }
    // Hide all leaves initially
    nodes.forEach(n => { if (n.parentElement && n.parentElement.classList) n.parentElement.classList.remove('hidden'); });
    // Show only matches and their ancestors
    nodes.forEach(n => {
      const name = n.textContent.toLowerCase();
      const isMatch = fuzzyMatch(name, q, fuzziness);
      if (isMatch) {
        n.classList.add('match');
        let p = n.parentElement;
        while (p && p !== treeEl) {
          if (p.tagName === 'DETAILS') p.open = true;
          if (p.classList) p.classList.remove('hidden');
          p = p.parentElement;
        }
      }
    });
    // Hide non-matching branches (simple pass)
    treeEl.querySelectorAll('details').forEach(d => {
      // If this branch contains a match, keep visible
      if (d.querySelector('.match')) return;
      // Otherwise hide its container
      d.classList.add('hidden');
    });
  }
  function levenshtein(a, b, maxDistance) {
    const lenA = a.length, lenB = b.length;
    if (Math.abs(lenA - lenB) > maxDistance) return maxDistance + 1;
    const prev = new Array(lenB + 1);
    for (let j = 0; j <= lenB; j++) prev[j] = j;
    for (let i = 1; i <= lenA; i++) {
      let curr = [i];
      let rowMin = curr[0];
      for (let j = 1; j <= lenB; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        const val = Math.min(
          prev[j] + 1,       // deletion
          curr[j - 1] + 1,   // insertion
          prev[j - 1] + cost // substitution
        );
        curr[j] = val;
        if (val < rowMin) rowMin = val;
      }
      if (rowMin > maxDistance) return maxDistance + 1;
      for (let k = 0; k < curr.length; k++) prev[k] = curr[k];
    }
    return prev[lenB];
  }

  function fuzzyMatch(text, query, maxDistance) {
    if (!query) return true;
    const hay = text.toLowerCase();
    const needle = query.toLowerCase();
    if (hay.includes(needle)) return true;
    if (maxDistance <= 0) return false;
    const tokens = hay.split(/[\s._-]+/);
    for (const token of tokens) {
      if (levenshtein(token, needle, maxDistance) <= maxDistance) return true;
    }
    return levenshtein(hay, needle, maxDistance) <= maxDistance;
  }

  async function decodeFileToText(file) {
    // Read as ArrayBuffer and sniff BOM/encoding
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    // UTF-16 LE BOM: FF FE, UTF-16 BE BOM: FE FF, UTF-8 BOM: EF BB BF
    let dec;
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
      dec = new TextDecoder('utf-16le');
      return dec.decode(bytes.subarray(2));
    }
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      dec = new TextDecoder('utf-16be');
      return dec.decode(bytes.subarray(2));
    }
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      dec = new TextDecoder('utf-8');
      return dec.decode(bytes.subarray(3));
    }
    // Heuristic: many NULs -> UTF-16LE
    let nulCount = 0; for (let i = 0; i < Math.min(bytes.length, 4096); i++) if (bytes[i] === 0) nulCount++;
    if (nulCount > 100) {
      dec = new TextDecoder('utf-16le');
      return dec.decode(bytes);
    }
    dec = new TextDecoder('utf-8');
    return dec.decode(bytes);
  }

  async function loadFromFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    for (const file of files) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setStatus(`Lade: ${file.name} (${sizeMB} MB) …`);
      if (file.size > 50 * 1024 * 1024) {
        console.warn('Große Datei – Verarbeitung kann dauern.');
      }
      const text = await decodeFileToText(file);
      const t0 = performance.now();
      const root = parseTreeText(text);
      const nodeCount = countNodes(root);
      const parseMs = performance.now() - t0;
      forest.push({ label: file.name, root, info: `${sizeMB} MB · ${nodeCount} Einträge · Parse ${parseMs.toFixed(1)}ms` });
      setStatus(`Fertig: ${file.name} · Parse ${parseMs.toFixed(1)}ms`);
    }
    renderForest();
    applyFilter(filterInput.value);
    setStatus(`Bereit · ${forest.length} Baum/Bäume geladen`);
  }

  // Wire up controls
  fileInput.addEventListener('change', (e) => loadFromFiles(e.target.files));
  expandAllBtn.addEventListener('click', expandAll);
  collapseAllBtn.addEventListener('click', collapseAll);
  filterInput.addEventListener('input', (e) => {
    const val = e.target.value;
    if (filterTimer) clearTimeout(filterTimer);
    filterTimer = setTimeout(() => applyFilter(val), 120);
  });
  if (fuzzinessInput && fuzzinessValue) {
    fuzzinessValue.textContent = String(fuzziness);
    fuzzinessInput.addEventListener('input', (e) => {
      fuzziness = Number(e.target.value) || 0;
      fuzzinessValue.textContent = String(fuzziness);
      applyFilter(filterInput.value);
    });
  }
  clearFilterBtn.addEventListener('click', () => { filterInput.value = ''; applyFilter(''); });
  clearAllBtn.addEventListener('click', () => {
    forest.length = 0;
    renderForest();
    if (hero) hero.classList.remove('hidden');
    setStatus('Bereit · keine Bäume');
  });

  // Drag & drop support
  document.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      loadFromFiles(e.dataTransfer.files);
    }
  });

  // Try to auto-load drive.txt if opened from same folder and fetch is allowed
  (async function tryAutoLoad() {
    try {
      const res = await fetch('drive.txt', { cache: 'no-store' });
      if (!res.ok) return;
      const text = await res.text();
      const t0 = performance.now();
      const root = parseTreeText(text);
      const nodeCount = countNodes(root);
      const parseMs = performance.now() - t0;
      forest.push({ label: 'drive.txt', root, info: `Auto · ${nodeCount} Einträge · Parse ${parseMs.toFixed(1)}ms` });
      renderForest();
      applyFilter(filterInput.value);
      setStatus('Automatisch geladen: drive.txt');
    } catch (_) {
      // ignore (likely file URL restrictions)
    }
  })();
})();
