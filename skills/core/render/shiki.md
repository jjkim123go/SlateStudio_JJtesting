# Shiki — Layer 3 Skill

> Layer 3: Vendor library skill. Load when authoring HTML/JS that uses Shiki
> for syntax highlighting (VSCodeScene, GitHubScene, CodeWalkthrough,
> any structured `code` visual).
> Sourced from the official docs at https://shiki.style. Last researched: 2026-04-06.

## When to use

Triggers: syntax highlighting, code block, code scene, VSCodeScene,
GitHubScene, CodeWalkthrough, "highlight this JSON", "show this snippet
with VS Code colors", `<pre><code>`, `.hljs-` or `.shiki` class names,
a `structured_image` code scene when a *true* token-level paint is
wanted instead of the deterministic Pillow renderer.

Don't load this skill for:
- Plain monospace text in the terminal (use `TerminalScene` — text is just
  a green prompt + monospace, no token coloring).
- Static structured `code` visuals where Pillow's deterministic line
  rendering is good enough — Shiki is only worth the bundle when the
  scene shows real, varied syntax across multiple languages.
- Markdown rendering — Shiki is a code highlighter, not a Markdown engine.

## Official sources

- Docs: https://shiki.style
- Install guide: https://shiki.style/guide/install
- Repository: https://github.com/shikijs/shiki
- npm package: `shiki` (current stable 3.x; v4 also published)
- License: `MIT` (Copyright © 2021 Pine Wu, © 2023 Anthony Fu — verified
  at https://raw.githubusercontent.com/shikijs/shiki/main/LICENSE)

## Slate integration

- **Bundle method**: pin a major version via the official ESM CDN.
  Shiki is **ESM-only since v1.0** — there is no UMD/IIFE build. Use
  esm.sh or jsdelivr's `/+esm` endpoint inside an `<script type="module">`:
  ```html
  <script type="module">
    import { codeToHtml } from 'https://esm.sh/shiki@3';
    const html = await codeToHtml('const a = 1;', {
      lang: 'javascript',
      theme: 'github-dark',
    });
    document.getElementById('code-host').innerHTML = html;
  </script>
  ```
- **Allowlist entry**: must be added to `config/org/governance-policy.yaml`
  under `runtime_libraries`. Pin to `shiki@3.x` (or `@4.x` once we
  validate ESM compatibility with HyperFrames' headless Chrome).
- **Loading from inside a HyperFrames component**: Shiki must run
  *before* the GSAP master timeline is built, because it rewrites the
  innerHTML of the code host. Pattern: do the `await codeToHtml(...)`
  inside an `async` IIFE in the component's `animation.js`, then
  resolve a promise the master timeline awaits via
  `window.hf.ready(promise)` or the equivalent HyperFrames hook. If
  highlighting must be sync, use `createHighlighter({ themes, langs })`
  and cache the singleton on `window.__shikiHighlighter`.

## Core API (top 5)

### 1. `codeToHtml(code, options)` — async one-shot
The simplest path. Returns a complete `<pre class="shiki">…</pre>` string
with inline styles (no extra CSS file required).
```js
import { codeToHtml } from 'shiki';
const html = await codeToHtml('const a = 1', {
  lang: 'javascript',
  theme: 'vitesse-dark',
});
```

### 2. `createHighlighter({ themes, langs })` — long-lived singleton
Use when the component highlights many snippets, or needs synchronous
calls inside the timeline. **Always cache as a singleton** — the docs
explicitly warn against calling this in hot loops.
```js
import { createHighlighter } from 'shiki';
const hl = window.__shikiHighlighter ||= await createHighlighter({
  themes: ['github-dark', 'github-light'],
  langs: ['javascript', 'typescript', 'json', 'bash'],
});
const html = hl.codeToHtml('const a = 1', { lang: 'javascript', theme: 'github-dark' });
```

### 3. `codeToTokens(code, options)` / `codeToHast(code, options)`
Returns the intermediate token array or HAST tree instead of HTML. Use
when the component wants to animate token-by-token (e.g., reveal each
token with GSAP stagger).
```js
import { codeToTokens } from 'shiki';
const { tokens } = await codeToTokens(src, { lang: 'ts', theme: 'nord' });
// tokens: TokenLine[] -> tokens[i] is an array of { content, color, fontStyle }
```

### 4. `highlighter.loadLanguage(lang)` / `loadTheme(theme)`
Required when the singleton was created without a language/theme that a
later snippet needs. Since v1.0 Shiki **does not auto-load** — it throws
if you ask for an unloaded lang/theme.
```js
await hl.loadLanguage('rust');
await hl.loadTheme('one-dark-pro');
```

### 5. Bundled themes / languages enumeration
For dynamic scenes, iterate the bundled sets. Don't ship them all
unless absolutely needed — every `bundledLanguages` entry is its own
async chunk.
```js
import { bundledLanguages, bundledThemes } from 'shiki';
// Object.keys(bundledLanguages), Object.keys(bundledThemes)
```

## Theming hooks

- Built-in themes are TextMate themes — pick a deck (`github-dark`,
  `github-light`, `vitesse-dark`, `nord`, `min-dark`, `slack-dark`,
  `one-dark-pro`, `catppuccin-mocha`, `poimandres`, etc.). The full
  list is enumerable via `bundledThemes`.
- For brand-aligned colors, pass a custom theme JSON (TextMate format)
  to `theme:` instead of a name. Shiki then emits inline `style="color:…"`
  per token using the theme's token-color map.
- Output uses **inline styles**, not CSS classes by default — there is
  nothing to override with a stylesheet unless you use the
  `transformers` API or wrap with the `Transformers` package.

## Gotchas

- **ESM-only since v1.0.** No CommonJS build, no UMD, no `window.shiki`
  global. You must load it via `<script type="module">` or a bundler.
- **Singleton or pay the cost.** `createHighlighter` is expensive — it
  loads WASM (oniguruma) and grammar JSON. Cache on `window.__shikiHighlighter`.
- **Lazy lang/theme loading.** A highlighter created with `themes: ['nord']`
  will throw if you call `codeToHtml(..., { theme: 'github-dark' })`.
  Either pre-list every theme/lang you'll use, or `await loadTheme(...)`
  before the call.
- **Async by default.** All `codeToX` shorthands are async because they
  dynamically import the grammar/theme. Inside HyperFrames you must
  await before the timeline starts; do not put `await codeToHtml(...)`
  inside a `gsap.to(..., { onStart: async () => {...} })`.
- **Inline styles defeat CSS overrides.** If you want to recolor tokens
  for brand reasons, write a custom TextMate theme JSON; don't try to
  paint over Shiki's output with `!important` selectors.
- **Bundle size.** The `shiki` package with all bundled langs/themes is
  several MB. For Slate, list explicit `themes`/`langs` to keep the
  CDN-fetched chunks small.

## Out of scope (don't do this)

- Don't use Shiki for typed-letter terminal output — that's `TerminalScene`'s
  job. Shiki is a static highlighter; it does not animate.
- Don't call `createHighlighter` per scene. One singleton, reused.
- Don't try to mix Shiki output with a separate code-styling CSS file —
  Shiki paints inline. You'll fight specificity battles.
- Don't pin to `shiki@latest` — pin a major (`shiki@3`) so the
  governance allowlist can audit the version.
