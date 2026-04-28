# Azure Architecture Icons — Layer 3 Skill

> Layer 3: Vendor icon-set skill. Load when authoring a HyperFrames
> component that depicts an Azure cloud architecture — service icons
> for App Service, AKS, Storage, Cosmos DB, Key Vault, Front Door, etc.
> Typically used inside `ArchitectureDiagram` or a `structured_image` diagram
> scene that calls out specific Azure resources.
> Sourced from the official Microsoft Learn icon page at
> https://learn.microsoft.com/azure/architecture/icons/. Last researched: 2026-04-06.

## When to use

Triggers: Azure architecture diagram, "draw the cloud topology",
"show the resource graph", `ArchitectureDiagram` component,
`structured_image` diagram whose box labels match Azure
service names, "include the App Service icon", "use the AKS hex",
solution architecture, reference architecture, deployment topology,
Azure Well-Architected illustrations.

Don't load this skill for:
- Generic UI glyphs (settings, save, share) — use Fluent.
- GitHub UI — use Octicons.
- Non-Azure cloud architectures (AWS, GCP, OCI). Use the respective
  vendor's official icon set; do not repaint Azure icons in different
  colors and pretend.
- Logos meant to identify *Microsoft as a company* in marketing — those
  are corporate brand assets governed by separate guidelines.

## Official sources

- Icons & terms page: https://learn.microsoft.com/azure/architecture/icons/
- License (the page itself is the license): same URL — the page reads,
  in part, "Microsoft permits the use of these icons in architectural
  diagrams, training materials, or documentation."
- Updated: November 2025 (per the page header at time of research).
- Format: SVG bundle, downloadable from the Learn page (no npm package,
  no public CDN).
- License: **Microsoft trademark / permitted-use license**. Specifically
  *not* MIT or any open-source license. Permission is granted, with
  conditions; see "Rules and restrictions" below.

## Slate integration

- **Bundle method**: download the SVG bundle from the Learn page and
  vendor the specific service icons the scene needs into the
  component's asset folder (e.g., `render/components/ArchitectureDiagram/icons/azure/`).
  There is **no official CDN**, so vendoring is mandatory.
- **Allowlist entry**: there is no npm package to pin. Track in
  `config/org/governance-policy.yaml` under a separate
  `vendored_assets:` block, with the bundle download date and a hash
  of the vendored SVG set so audits can verify the assets weren't
  modified after vendoring.
- **Loading from inside a HyperFrames component**: use `<img src=…>` for
  static placement. The official assets are already styled (they are
  the brand colors) and are **not** to be recolored. Inline SVG is
  acceptable for animation (fade in, scale, draw connecting lines), as
  long as the icon's own paths and colors are not modified.

## Rules and restrictions (from the Learn page — non-negotiable)

You **may**:
- Use the icons in architecture diagrams, training materials, and
  documentation that describe Azure-based solutions.
- Embed them in slides, videos, web pages, and printed materials in
  that context.
- Resize proportionally.

You **must NOT**:
- **Crop, flip, rotate, or distort** the icons. They are precise brand
  marks.
- **Recolor** the icons. The colors are part of each service's brand.
- **Animate the icon's internal paths** (drawing in path-by-path is
  considered modification). Animating the icon as a whole — fade in,
  scale up, slide into position — is fine.
- **Use Microsoft icons to represent your own product or service.** A
  customer's app is not "the App Service icon."
- **Include the icons in templates customers can resell.** They cannot
  be redistributed as a standalone asset library.
- **Use Microsoft logos (corporate, product, Azure word-and-cloud) to
  imply Microsoft endorsement** of non-Microsoft content.

The product name **must appear near the icon** (caption, label, legend).
A row of unlabeled hexes is not a permitted use.

## Top patterns (top 5)

### 1. Service icon next to a label
```html
<div class="azure-node">
  <img src="icons/azure/10035-icon-service-App-Services.svg" width="48" height="48" alt="">
  <span class="label">Azure App Service</span>
</div>
```
The product name is mandatory near the icon.

### 2. Use in `ArchitectureDiagram` boxes
The Slate `ArchitectureDiagram` component already supports a per-box
`icon: 'azure/<name>.svg'` field — drop the vendored SVG into the
component's `icons/azure/` folder and reference it.

### 3. Connecting arrows between services
The icons themselves are the only branded part. Connecting arrows /
edges / labels between services are *not* part of the brand and can be
animated freely with GSAP (`gsap.from('.connector', { drawSVG: 0 })` if
the (allowlisted) plugin is available, or `stroke-dashoffset` keyframes).

### 4. Cloud / region grouping containers
Azure architecture conventions group services inside subscription /
resource group / region rectangles. Those rectangles are layout
chrome, not brand assets — you can style them as the brand requires.
The service icons inside must remain unaltered.

### 5. Animated reveal (whole icon, not paths)
```js
gsap.from('.azure-node', { opacity: 0, scale: 0.6, stagger: 0.1, duration: 0.5 });
```
Animating opacity/scale of the wrapper is fine. Animating the SVG's
*internal* `<path>` elements is treated as modification and is
prohibited.

## Theming hooks

- **None.** Azure icons must remain in their official colors. The
  surrounding container (background, border, label color) can match the
  brand package, but the icons themselves do not theme.
- The icons sit comfortably on dark or light backgrounds — Microsoft
  ships them with their own contrast-tuned palettes. If a brand has a
  saturated background that destroys legibility, place the icon on a
  neutral chip (white or near-white card) instead of recoloring.

## Gotchas

- **Not MIT, not open source.** This is the most important point. Do
  not list Azure icons in the same governance bucket as Fluent or
  Octicons. Use a separate `vendored_assets` track with the
  permitted-use rules attached.
- **No CDN.** Don't try to fetch the icons from `learn.microsoft.com`
  at render time — there is no stable, public, content-addressed URL.
  Always vendor the bundle.
- **Keep them unmodified.** No recolor, no crop, no flip, no rotate,
  no path-level animation. Wrapper-level animation is fine.
- **Always label.** Microsoft's permission requires the product name
  near the icon. A diagram of unlabeled hexes is non-compliant.
- **No SVGs for retired services.** Microsoft removes icons when
  services are deprecated. Re-download the bundle periodically; do
  not keep an icon in the vendored set for a service that no longer
  exists.
- **Visio stencils do not exist anymore.** The page used to ship a
  `.vsdx` set; current versions are SVG-only. Don't promise users a
  Visio bundle.
- **No mixing with non-Microsoft cloud icons.** A diagram that shows
  Azure + AWS side by side is allowed, but each vendor's icons must
  stay in their own visual style — don't normalize them to a single
  flat aesthetic.

## Out of scope (don't do this)

- Don't recolor Azure icons to match a brand palette. Re-do the chip
  background instead.
- Don't repackage the icon bundle into a third-party asset library.
- Don't omit product labels from a diagram of icons.
- Don't use Azure icons to identify a non-Azure service (e.g., labeling
  AWS Lambda with the Azure Functions hex is misleading and
  non-compliant).
- Don't animate the internal paths of an Azure icon — that counts as
  modification under Microsoft's rules.
