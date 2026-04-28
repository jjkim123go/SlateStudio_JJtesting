# Octicons — Layer 3 Skill

> Layer 3: Vendor icon-set skill. Load when authoring a HyperFrames
> component that depicts GitHub UI, source-control concepts, or any
> developer-platform scene that needs the GitHub visual idiom — issues,
> pull requests, branches, commits, repos, code review, Actions.
> Sourced from the official repo at https://github.com/primer/octicons.
> Last researched: 2026-04-06.

## When to use

Triggers: GitHub UI mockup, GitHubScene, "show this as a PR view", PR /
issue / branch / commit / repo glyphs, Actions workflow, code review,
"add an issue-opened indicator", structured visuals (type `ui`) for
GitHub-style screens, anywhere the scene reads as Primer / GitHub
design language.

Don't load this skill for:
- Generic OS / Office UI (Windows, Teams, Word) — use Fluent.
- Azure cloud architecture diagrams — use Azure architecture icons.
- Generic web UI in a non-GitHub idiom — use Fluent or commission art.
- The GitHub *brand* logos (Mark, Mascot/Mona, GitHub wordmark, the
  Copilot/Octocat logos). Those are governed by GitHub's separate
  Logos & Usage Brand Toolkit and are NOT inside the MIT-licensed
  Octicons set.

## Official sources

- Docs: https://primer.style/foundations/icons
- Repository: https://github.com/primer/octicons
- npm package: `@primer/octicons` (current `19.24.0`; pin
  `@primer/octicons@19`)
- License: `MIT` (https://github.com/primer/octicons/blob/main/LICENSE)

## Slate integration

- **Bundle method**: vendor the specific SVGs the scene uses, or fetch
  from pinned unpkg paths:
  ```html
  <img src="https://unpkg.com/@primer/octicons@19.24.0/build/svg/<name>-<size>.svg"
       width="16" height="16" alt="">
  ```
  Filenames are kebab-case: e.g., `git-pull-request-16.svg`,
  `issue-opened-24.svg`, `check-circle-fill-12.svg`.
- **Allowlist entry**: `@primer/octicons@19` under `runtime_libraries` in
  `config/org/governance-policy.yaml`, with the exact set of icon files
  vendored.
- **Loading from inside a HyperFrames component**: prefer inline `<svg>`
  for path-level GSAP animation; `<img>` is fine for static placement.
  All Octicons set `fill="currentColor"` for monochrome icons — set
  parent CSS `color` to recolor.

## Sizes & sizing rules (memorize this)

Octicons ship in **3 base sizes**, each pixel-tuned:

- `12` — small (status badges, compact UI rows)
- `16` — default (buttons, list rows, inline-with-text)
- `24` — large (titles, hero sections, primary actions)

Some symbols also have `48` and `96` variants for marketing usage. Sizes
are **not interchangeable** — a 16px icon scaled to 24 reads as
visually broken next to a real 24px icon (different stroke widths,
different optical balance).

## Top API patterns (top 5)

### 1. Direct SVG include (simplest)
```html
<img src="icons/git-pull-request-16.svg" width="16" height="16" alt="Pull request">
```

### 2. Inline SVG for animation / theming
```html
<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
  <path d="…" fill="currentColor"/>
</svg>
```
Then `gsap.from('.octicon path', { ... })`.

### 3. JSON metadata via the npm package (Node tooling)
```js
import octicons from '@primer/octicons';
const { svg, heights, keywords, name } = octicons['git-pull-request'];
// svg[16].path -> raw <path …>; svg[16].width / .height -> base size
```
Useful in build tooling that pre-bakes the SVGs into the component
HTML at compose time.

### 4. Color via `currentColor`
All monochrome Octicons use `fill="currentColor"`. To recolor: set CSS
`color: #...` on the wrapper. Cannot recolor an `<img>` source — switch
to inline `<svg>` if recoloring is needed.

### 5. Semantic state pairings
Octicons documents canonical color usage for status icons. Honor these
defaults in Slate scenes:
- `issue-opened`, `git-pull-request` (open) → success green (`#1a7f37`-ish).
- `check-circle-fill` → success green.
- `x-circle-fill`, `stop` → danger red.
- `alert-fill` → attention yellow.
- `git-merge` → done purple.
- `git-pull-request-closed` → closed/danger red.
Follow Primer's color tokens when the brand allows.

## Theming hooks

- All standard Octicons paint with `fill="currentColor"` — recolor via
  CSS color on the wrapper element.
- Primer publishes accompanying color tokens (`@primer/primitives`) that
  pair with each semantic state. Pulling those into the Slate brand
  resolver gives you "GitHub-correct" status colors automatically.
- `aria-hidden="true"` is the recommended default if the icon is
  decorative (the surrounding text already conveys meaning); use
  `role="img"` + `<title>` if it's the sole conveyor.

## Gotchas

- **Sizes are non-interchangeable.** Each size has hand-tuned stroke
  widths. Mixing scaled icons with native-size icons is the most
  common visual bug.
- **GitHub brand logos are NOT in this set.** The Mark, Mascot (Mona /
  Octocat), GitHub wordmark, and the Copilot logo are governed by
  GitHub's brand toolkit. Do not approximate them with Octicons.
- **`<img>` cannot be recolored with CSS color.** Use inline SVG when
  brand recoloring is required.
- **Filename pattern is `<name>-<size>.svg`** (kebab-case, hyphen-size,
  not underscore-size like Fluent). Easy slip-up if you context-switch.
- **Use semantic state colors, not arbitrary palette colors.** A red
  `issue-opened` icon will read as "this issue is broken" even if you
  meant it as brand color. When the brand spec conflicts with Octicon
  semantics, prefer the icon's intended color or pick a less-loaded
  icon.
- **Mostly 16/24 viewBox**, but a few icons (e.g., `github-mark`-style
  legacy) used 32 or 48 in older versions. Always read the actual
  `viewBox` attribute when computing aspect ratios.

## Out of scope (don't do this)

- Don't use Octicons to imply GitHub authorship of third-party
  content — GitHub's brand guidelines forbid that.
- Don't approximate the Octocat / GitHub Mark / Copilot logos. They are
  brand assets, not in the MIT-licensed Octicons set.
- Don't scale Octicons across sizes (e.g., 16 → 24). Pick the right
  size variant.
- Don't pin to `@primer/octicons@latest` — pin to `@primer/octicons@19`.
- Don't use Octicons in a non-developer-tooling brand context — they
  read as GitHub. Off-brand for, e.g., a banking customer.
