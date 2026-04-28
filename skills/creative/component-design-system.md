# Component Design System — Video-Optimized Visual Intelligence

> **Layer:** Creative — design knowledge for component authoring
> **Trigger:** Load when authoring a new HyperFrames component, choosing visual
> style for a scene, or selecting colors/typography without a brand package.
> **Data source:** `skills/creative/design-data/*.csv` (from UI UX Pro Max, MIT)

This skill provides design intelligence for creating beautiful, professional
HyperFrames+GSAP components. It replaces "guess and hope" with data-driven
style, color, and typography decisions.

---

## When to use

- **Creating a new component** — query the design system to pick style, colors,
  palette, and animation timing BEFORE writing any HTML/CSS/JS.
- **No brand package** — the design data provides professional defaults based on
  video type and audience.
- **Choosing chart type** — the charts data knows which visualization fits which
  data shape.
- **Quality gate** — the UX guidelines provide hard rules (animation 150–300ms,
  contrast 4.5:1, no decorative-only motion).

---

## How to query the design data

### Option 1: Search script (recommended for full design system)

```bash
python skills/creative/design-search/search.py "<keywords>" --design-system
```

Keywords should describe the video's audience and tone. Examples:
- `"tech explainer dark mode professional"` → Minimalism + Trust blue
- `"executive quarterly recap corporate"` → Glassmorphism + Premium dark
- `"onboarding training friendly"` → Soft UI + Warm pastels
- `"product launch energetic bold"` → Motion-Driven + Vibrant & Block

The script returns: recommended style, color palette (with CSS variables),
typography pairing, key effects, and anti-patterns to avoid.

### Option 2: Direct CSV lookup (for specific decisions)

| Decision | Query | File |
|----------|-------|------|
| Which chart type? | Match data shape to chart type | `design-data/charts.csv` |
| Color palette? | Match product/audience type | `design-data/colors.csv` |
| Font pairing? | Match mood/tone | `design-data/typography.csv` |
| Visual style? | Match industry/audience | `design-data/styles.csv` |
| UX quality check | Check animation timing, contrast, spacing | `design-data/ux-guidelines.csv` |

---

## Video-specific adaptations

The UI UX Pro Max data is designed for web apps. For video components, apply
these adaptations:

### Colors
- **Prefer dark backgrounds** — video is consumed on screens, often in dim
  environments. Dark BG with light text has better perceived quality.
- **Higher contrast** — video is viewed at various sizes and compression levels.
  Use WCAG AAA (7:1) for body text, not just AA (4.5:1).
- **Accent color for emphasis only** — one accent per component. Don't use the
  accent for background fills.

### Typography
- **Minimum 24px for body** in video (viewer is 3–10ft from screen, not 2ft).
- **Minimum 48px for headings** — smaller text becomes unreadable after
  compression.
- **Sans-serif only** for video — serifs lose detail at video resolution.
- **Font loading** — use Google Fonts CDN or system fonts. Custom font files
  must be loaded synchronously before render (no FOUT in video).

### Animation timing (GSAP)
- **Duration 300–800ms** for video components (faster than web's 150–300ms
  recommendations — video viewers can't hover/pause, so animations must
  complete within a scene beat).
- **Stagger 100–200ms** between elements (faster than web's 200–400ms).
- **Easing: power2.out** as default for entries, **power2.inOut** for
  transitions.
- **No infinite loops** — every animation must complete. Video is linear.

### Layout
- **1920×1080 canvas** — all components render at this size.
- **Safe zone: 80px margin** on all sides (content may be cropped on some
  displays).
- **No scrolling, no interaction** — everything must be visible and animated
  within SCENE_DURATION.

---

## Component authoring workflow with design data

When creating a new component, follow this order:

1. **Query design system** — run the search script with video brief keywords
2. **Extract CSS variables** — the design system returns `--color-primary`,
   `--color-secondary`, etc. Use these in your component's HTML/CSS.
3. **Pick animation pattern** — see `skills/creative/gsap-recipes.md` for
   proven GSAP patterns by component type.
4. **Apply quality gates** — check against UX guidelines (timing, contrast,
   spacing).
5. **Narration sync** — see `skills/meta/narration-component-sync.md` for
   how to align animation beats with narration cues.

---

## Chart type selection (from charts.csv)

When a scene needs data visualization, pick the right component:

| Data Shape | Component | Chart Type | When NOT to use |
|-----------|-----------|-----------|----------------|
| Trend over time | DataChart (line) | Line Chart | < 4 data points |
| Compare categories | DataChart (bar) | Bar Chart | > 15 categories |
| Part-to-whole | DataChart (donut) | Donut Chart | > 5 categories |
| Correlation | DataChart (scatter) | Scatter Plot | < 20 points |
| Single KPI | MetricsCard | Counter tween | Multiple unrelated metrics |
| Multiple KPIs | MetricStack | Stacked counters | > 6 metrics |
| Progress / target | BurnDown, OKRStatus | Progress chart | No target value |
| Comparison matrix | CompareSlider | Side-by-side | > 3 items |

---

## Anti-patterns (from ux-guidelines.csv, adapted for video)

| Rule | Severity | What to avoid |
|------|----------|---------------|
| No decorative-only animation | HIGH | Every motion must convey meaning (reveal, transition, emphasis) |
| Animation 300–800ms | HIGH | Shorter = jarring; longer = sluggish in video context |
| No text below 24px | HIGH | Unreadable after video compression |
| Contrast 7:1 for text | HIGH | Video compression degrades contrast further |
| No color-alone meaning | MEDIUM | Don't rely on color to distinguish chart segments — use labels |
| Consistent easing | MEDIUM | Same ease function throughout a component |
| Max 3 font weights | LOW | Body (400), emphasis (600), heading (700) — no more |
