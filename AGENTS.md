# Repository Guidelines

## Project Structure & Module Organization

- `index.html`: main UI entry (loads everything via `<script>` tags; no bundler/modules).
- `css/style.css`: global styling for the app shell and generated previews.
- `js/`: browser-side logic:
  - `app.js` (UI/state + event wiring), `parser.js` (DOCX/XLSX parsing), `generator.js` (HTML generation),
  - `ai.js` (LLM providers + requests), `utils.js` (helpers/storage/downloads).
- `libs/`: vendored third-party libraries (e.g., `mammoth.min.js`, `xlsx.full.min.js`). Avoid editing unless upgrading.
- `config/activation-codes.json`: activation code registry (source of truth).
- `scripts/`: maintenance scripts (PowerShell).
- `templates/`: reserved for HTML templates (may be empty during early development).

## Build, Test, and Development Commands

This repo is a static web app (no `package.json`/build step required).

- Run a local server (recommended): `python -m http.server 8000` then open `http://localhost:8000/`.
- Quick open: open `index.html` directly (some browsers restrict `fetch`/file APIs on `file://`).
- Activation code sync (PowerShell): `powershell -File scripts/sync-activation-codes.ps1` (exports the markdown list; use `-UpdateHtml` when applicable).

## Coding Style & Naming Conventions

- Indentation: 4 spaces in `js/` and `css/` (match existing files).
- Prefer `const`/`let`, keep functions small, and keep code browser-compatible (no Node-only APIs).
- Naming: `camelCase` for JS variables/functions, `PascalCase` for top-level objects (e.g., `App`, `AI`).

## Testing Guidelines

- No automated test suite yet. Before opening a PR, manually verify:
  - upload/parse for `.docx` and `.xlsx`,
  - AI parsing flow (with a non-committed API key),
  - HTML generation + download, and activation-code gating.

## Commit & Pull Request Guidelines

- Current history contains only `Initial commit` (no established convention yet).
- Use clear, scoped commits; recommended format: `feat: ...`, `fix: ...`, `chore: ...`.
- PRs should include: what changed, how to test (exact steps), and screenshots/GIFs for UI changes.

## Security & Configuration Tips

- Never commit API keys or tokens. The UI stores provider API keys and optional Vercel tokens in browser storage; keep secrets out of source files and PR descriptions.
