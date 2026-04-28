# Fluent UI System Icons — Layer 3 Skill

> Layer 3: Vendor icon-set skill. Load when authoring a HyperFrames
> component that places UI/product/affordance icons consistent with
> the Microsoft Fluent design language — toolbar glyphs, action
> buttons, file/folder/document indicators, status pills, OS-style UI
> mockups (think Windows / Office / Teams visual idiom).
> Sourced from the official repo at
> https://github.com/microsoft/fluentui-system-icons. Last researched: 2026-04-06.

## When to use

Triggers: UI mockup, "show this as a Windows/Teams-style screen",
"place a settings gear", "use Fluent icons", structured visuals (type `ui`)
where icon glyphs are needed, action buttons (save / share / send /
copy), file/folder/document representations, status indicators, any
scene that needs Microsoft-visual-language affordances.

Don't load this skill for:
- GitHub-flavored UI (PR, branch, repo, commit) — use Octicons.
- Cloud architecture diagrams (Azure services) — use Azure architecture
  icons.
- Brand logos for third parties — those are restricted by their own
  brand guidelines; don't substitute Fluent shapes for them.
- Decorative photo-style imagery — use AI image generation.

## Official sources

- Repository: https://github.com/microsoft/fluentui-system-icons
- npm packages: `@fluentui/svg-icons` (raw SVG files),
  `@fluentui/react-icons` (React components),
  `@fluentui/react-icons-font-subsetting` (font subsetting tooling).
  For Slate, we want the SVGs only.
- Catalog / preview: https://react.fluentui.dev/?path=/docs/icons-catalog--docs
- License: `MIT` (Copyright © Microsoft Corporation, verified at
  https://raw.githubusercontent.com/microsoft/fluentui-system-icons/main/LICENSE).
  The MIT license covers the icon assets themselves; the *Microsoft
  trademark* (the word "Microsoft" and the four-square logo) is **not**
  in this set and is governed by separate brand guidelines.

## Slate integration

- **Bundle method**: vendor the specific SVGs the scene uses into the
  component's asset folder, or fetch them from a pinned unpkg path:
  ```html
  <img src="https://unpkg.com/@fluentui/svg-icons@<version>/icons/<name>_<size>_<style>.svg"
       width="24" height="24" alt="">
  ```
  For Slate's offline determinism, **prefer vendoring**: copy the SVGs
  the SCF references into the project (e.g.,
  `render/components/<Name>/icons/`) so renders don't depend on a CDN
  fetch at capture time.
- **Allowlist entry**: `@fluentui/svg-icons` (pinned version) under
  `runtime_libraries` in `config/org/governance-policy.yaml`. List the
  exact icon files the build needs — the package is large (thousands of
  SVGs); shipping all of them is wasteful.
- **Loading from inside a HyperFrames component**: use `<img src="...">`,
  `<object data="...">`, or inline `<svg>…</svg>`. Inline is required
  if you want to animate individual paths via GSAP — `<img>` is opaque
  to JS and only the whole element can be tweened.

## Naming convention (memorize this)

Filenames in `@fluentui/svg-icons/icons/` follow:

```
<name>_<size>_<style>.svg
```

- `<name>`: snake_case (e.g., `arrow_right`, `chevron_down`,
  `cloud_arrow_up`, `document_pdf`, `settings`, `chat_bubbles`).
- `<size>`: one of `16`, `20`, `24`, `28`, `32`, `48` — the icon was
  hand-tuned for that pixel size. Do **not** scale across sizes; pick
  the size closest to the rendered dimensions.
- `<style>`: `regular` (outline) or `filled` (solid). A few icons also
  ship `light` and `color` variants, but coverage is incomplete; check
  the catalog before assuming a variant exists.

The original Android source assets use the `ic_fluent_<name>_<size>_<style>.svg`
prefix; the npm package strips the `ic_fluent_` prefix.

## Top API patterns (top 5)

### 1. Direct SVG include (simplest, default)
```html
<img src="icons/settings_24_regular.svg" width="24" height="24" alt="Settings">
```

### 2. Inline SVG for path-level animation
Drop the file's `<svg>…</svg>` directly into the component HTML and
target child paths with GSAP:
```js
gsap.from('.settings-icon path', { drawSVG: 0, stagger: 0.05 });
// (DrawSVG is a GSAP plugin — only use if approved by governance.)
```

### 3. Color override via CSS `currentColor`
Fluent SVGs use `fill="currentColor"` for monochrome glyphs. Set the
parent CSS `color: #...` to recolor the icon. This works for both
`<img>` (when the icon is inlined as background-image with `mask`) and
inline `<svg>`. For `<img src=…>` you cannot recolor — switch to inline.

### 4. Pair regular + filled for state
The intended pattern: `regular` for inactive / default, `filled` for
active / pressed / selected. Don't mix metaphors (e.g., a filled
delete + outline cancel in the same toolbar reads as inconsistent).

### 5. React API (if/when Slate components migrate to React)
```jsx
import { Settings24Regular } from '@fluentui/react-icons';
<Settings24Regular />
```
Today Slate components are vanilla — stick to the SVG package.

## Theming hooks

- All monochrome Fluent SVGs use `fill="currentColor"`. Set CSS color on
  the wrapper to recolor.
- Multi-color icons (`color` style, where it exists) have hardcoded
  fills — recoloring them requires editing the SVG paths or choosing
  a different style.
- Fluent system icons are designed for **24-pixel base** with hand-tuned
  16/20/24/28/32/48 variants. Picking the right size > scaling up.

## Gotchas

- **Sizes are non-interchangeable.** A 16-px icon scaled to 48 px is
  blurry and visually inconsistent with the rest of the Fluent set.
  Use the size variant matching the render size.
- **The `Microsoft` wordmark and the four-square logo are NOT in this
  set.** They are governed by Microsoft's separate trademark
  guidelines. Don't synthesize a Microsoft logo from Fluent shapes.
- **Filled vs regular metaphor.** The Fluent design system uses
  `regular` for unselected/default and `filled` for active/selected.
  Mixing these inconsistently breaks the visual grammar.
- **`color` and `light` variants don't exist for every icon.** Check
  the catalog before designing a scene around them.
- **Icons are MIT, but Slate's brand context isn't.** When using these
  in a customer-facing brand package, confirm with the brand owner that
  Fluent visual language is on-brand — Fluent reads as "Microsoft" and
  may be off-brand for third parties.
- **`<img>` cannot be recolored with CSS color.** Use inline SVG when
  you need brand color overlays.

## Out of scope (don't do this)

- Don't use Fluent icons to fake a Microsoft endorsement of third-party
  content.
- Don't ship the entire `@fluentui/svg-icons` package — it's thousands of
  files. Vendor only what the scene uses.
- Don't recolor multi-color (`color` style) icons by overriding CSS;
  edit the SVG or pick the regular variant.
- Don't substitute Fluent icons where the brand spec calls for a
  different icon set (e.g., a customer's own design system).
