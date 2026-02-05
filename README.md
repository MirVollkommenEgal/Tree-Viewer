# Tree.txt Explorer

A lightweight HTML viewer for `tree`-style directory listings. Load one or more `tree.txt` (or similar) files and compare them side by side, with live filtering and optional fuzzy matching.

## Features
- Multi-file load and side-by-side views
- Drag & drop or file picker
- Expand/collapse all
- Live filter with optional fuzzy matching
- Handles UTF-8 and UTF-16 tree outputs

## Quick start
1. Open `viewer.html` in a browser.
2. Use **Dateien auswählen** or drag files into the page.
3. Filter with the search box. Adjust **Fuzziness** for approximate matches.

Notes:
- If you serve the folder over HTTP (for example `python -m http.server`), the app will try to auto-load `drive.txt` from the same folder.
- Opening `viewer.html` directly from disk still works for manual file uploads.

## Input format
The parser accepts typical `tree` outputs, including:
- Unicode box drawing (`├──`, `└──`)
- ASCII variants (`+---`, `\---`)

## Tests
These are simple Node-based sanity checks for the parser:

```bash
node test_tree_parser.mjs
node test_ascii_parser.mjs
```

## Files
- `viewer.html`: UI shell
- `viewer.js`: Viewer logic (filtering, rendering, drag & drop)
- `tree_parser.js`: Parser for `tree`-style text
- `drive.txt`, `18TB_1.txt`: Sample inputs
