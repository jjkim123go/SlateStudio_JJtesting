# SectionDivider Component

> Layer 2 component skill. Load when an explainer needs a **chapter card**
> between major sections — a short (3–5s) breath that announces "Chapter 2:
> Encryption" before diving in. Three style variants cover most house
> aesthetics: minimal, cinematic, and brand-ribbon.

## When to use

**Trigger vocabulary:** `chapter, section, part, act, phase, stage, module,
intermission, transition, "next up", "moving on to", "in this section",
"now let's look at"`.

Pick `SectionDivider` (not `TitleCard`) when you are **inside** a video and
need to mark a structural boundary, not introduce the entire video. A
`TitleCard` is the front-door; a `SectionDivider` is a hallway between rooms.

If your explainer is one continuous topic (no chapters), skip this component
— inserting dividers where there is no real structural break adds drag.

## Props

```json
{
  "style": "cinematic",
  "chapterNumber": "02",
  "totalChapters": 5,
  "title": "How encryption flows through the platform",
  "subtitle": "Edge → ingest → lake → warehouse",
  "backgroundMode": "gradient",
  "gradientStopsJson": "[\"#0a0e27\",\"#312e81\",\"#0a0e27\"]",
  "backgroundColor": "#0a0e27",
  "backgroundImageSrc": "",
  "brandPrimary": "#7c3aed",
  "numeralScaleStartSec": 0.20,
  "numeralScaleDurationSec": 0.80,
  "titleWipeStartSec": 0.60,
  "titleWipeDurationSec": 0.70,
  "subtitleFadeStartSec": 1.40,
  "progressTickStartSec": 1.80
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `style` | enum | no | `minimal` (default) \| `cinematic` (centered, large numeral, vignette) \| `brand-ribbon` (left brand-color strip with numeral). |
| `chapterNumber` | string \| number | yes | Displayed as the giant numeral. Strings allowed (`"02"`, `"III"`). |
| `totalChapters` | number | no | If supplied, renders the `N / TOTAL` progress block + a brand-colored fill bar showing `chapterNumber / totalChapters`. Omit to hide progress. |
| `title` | string | yes | Chapter title. ≤ 80 chars. Wipes in via clip-path. |
| `subtitle` | string | no | Optional 1-line summary. Fades in. Empty string hides the row. |
| `backgroundMode` | enum | no | `gradient` (default) \| `solid` \| `image`. |
| `gradientStopsJson` | string | no | JSON-stringified array of 2–4 hex colors. Used only when `backgroundMode = "gradient"`. Defaults to `["#0a0e27","#1a1f3a"]`. |
| `backgroundColor` | hex | no | Used only when `backgroundMode = "solid"`. |
| `backgroundImageSrc` | path/URL | no | Used only when `backgroundMode = "image"`. Image is centered + cover-cropped. |
| `brandPrimary` | hex | no | Brand accent color. Drives the ribbon, the progress fill, and the giant numeral. Defaults to `#0078d4` if omitted. |
| `numeralScaleStartSec` | number | no | Default `0.20`. Anchor verb: **chapter / part / phase** (the spoken numeral). |
| `numeralScaleDurationSec` | number | no | Default `0.80`. |
| `titleWipeStartSec` | number | no | Default `0.60`. Anchor verb: the **first content word** of the title phrase. |
| `titleWipeDurationSec` | number | no | Default `0.70`. |
| `subtitleFadeStartSec` | number | no | Default `1.40`. Anchor verb: the **summary verb** (e.g. "covers", "explains", "shows"). |
| `progressTickStartSec` | number | no | Default `1.80`. Anchor verb: the **count phrase** ("two of five", "halfway through"). |

> **Compiler / SCF authoring (read this once).** `gradientStopsJson` must be
> pre-stringified JSON until the Lane C prop-builder shim lands (mirrors the
> DataFlow / DataChart precedent — see `data-flow.md` § "Compiler / SCF
> authoring"). Brand color is passed as the flat scalar `brandPrimary`, not
> `brand.primary`, because the compiler today does not flatten dotted paths.

## Visual recipe

| Step | Time (relative to `SCENE_START`) | Effect |
|------|----------------------------------|--------|
| Background apply | `+0.00s` | Solid / gradient / image painted per `backgroundMode`. Begins a slow rotation+scale drift over the whole scene (ambient cinematic feel). |
| Numeral scale-in | `+numeralScaleStartSec` (default `+0.20`) | Numeral scales `0.30 → 1.00` with overshoot (`back.out(1.7)`) over `numeralScaleDurationSec`. |
| Title wipe | `+titleWipeStartSec` (default `+0.60`) | Title revealed left→right via `clip-path: inset(0 100% 0 0)` → `inset(0 0% 0 0)` over `titleWipeDurationSec`. |
| Subtitle fade | `+subtitleFadeStartSec` (default `+1.40`) | Subtitle fades + lifts 14px → 0 over `0.55s`. Skipped if `subtitle` is empty. |
| Progress reveal | `+progressTickStartSec` (default `+1.80`) | Progress text + track fade in (`0.45s`); fill bar tweens `0 → chapter/total` width over `0.85s`, starting at `+0.20s` after the text appears. Skipped if `totalChapters` is absent. |
| Exit fade | `SCENE_START + SCENE_DURATION − 0.4s` | Whole component fades to opacity 0 over `0.4s` (CONTRACT §7 margin requirement). |

**Recommended scene duration:** **3–5 seconds**. Long enough for the numeral
to land, the title to read, and the subtitle to register. Anything past 6s
starts to feel like dead air — promote to a `TitleCard` if you need more
weight.

## Composition tips

- **Pair with the section payload.** A SectionDivider is a setup; the next
  scene should deliver. Don't follow a divider with another divider.
- **Keep numerals short.** `"01"` reads better than `"Chapter One"`. The
  spoken narration carries the long form.
- **Use `cinematic` sparingly.** It's the most dramatic style — perfect for
  one or two pivot points in a long video; tedious if used for every
  chapter.
- **`brand-ribbon` for branded explainers.** When the brand color is strong
  and you want institutional feel, the ribbon variant ties the chapter card
  visually to the brand package.
- **Image backgrounds need a darken layer baked in.** This component does
  not auto-darken `image` backgrounds; ensure the supplied image has enough
  contrast for white text, or use `style: cinematic` (which adds a
  vignette).

## Provenance

| Design choice | Source |
|---------------|--------|
| Component name `SectionDivider` | Slate Phase II PR 5 task spec, Lane A. |
| Three style variants (`minimal`, `cinematic`, `brand-ribbon`) | PR 5 task spec. |
| Three background modes (`solid`, `gradient`, `image`) | PR 5 task spec. |
| Animation order: numeral scale → title wipe → subtitle fade → progress tick | Animated explainer chapter-card convention (broadcast TV documentary chapter cards establish numeral first, then title, then context — viewers parse hierarchical importance from animation order). |
| Numeral overshoot via `back.out(1.7)` | Standard motion-design convention for a "stamping" arrival; matches the `BrandIntro` reveal feel for visual continuity within a video. |
| Title clip-path wipe (left → right) | Mirrors `render/components/SplitScreen/animation.js` clip-path pattern. |
| Ambient background drift (slow rotate+scale) | Cinematic title-card convention — static backgrounds during a 3–5s pause read as "frozen" and break flow; ≤ 1° rotation + ≤ 6% scale is below the conscious-perception threshold but keeps the frame alive. |
| Progress bar `chapter / total` ratio | Course / module-card convention (e.g. Coursera lesson markers); gives the audience a "where am I" anchor without verbalizing it. |
| Class prefix `sd-` | **Invented** for this PR. The orchestrator must add it to CONTRACT §5 prefix registry. |
| JSON data-island pattern (`data-gradient-stops` carries pre-stringified JSON) | Mirrors `DataFlow` / `DataChart` precedent. The compiler has no per-component prop builder today (`render/lib/scf-to-html.mjs`). |
| Flat `brandPrimary` scalar (not `brand.primary` dotted path) | Compiler does not currently flatten dotted-path props in any shipped component template (verified across all `render/components/*/index.html`). Promotion to a shared brand-resolver atom is recommended (see Deferred dependencies). |
| Selector hygiene (`'.scene-' + SCENE_ID + ' .sd-...'`) | CONTRACT.md §4.3 lines 116–118. |
| Exit fade landing 0.4s before scene end | CONTRACT.md §7 lines 165–174. |

## Deferred dependencies

SectionDivider is **fully self-contained at runtime**. The following are
related but not blocking:

- **Brand-color resolver atom** — multiple components (this one, ScrollingBackground,
  future `BrandLogoMark`) duplicate the "read `brandPrimary`, set CSS custom property"
  block. A shared resolver helper in a future utilities atom would deduplicate this.
  Not required for ship.
- **Lane C prop-builder shim** — when it lands, callers can switch from
  `gradientStopsJson` (pre-stringified) to `gradientStops` (natural array). The
  component already reads from a `data-gradient-stops` attribute, so only the
  template binding needs to change at that point.
- **`narration-component-sync` skill** — the timing props above (`numeralScaleStartSec`,
  `titleWipeStartSec`, `subtitleFadeStartSec`, `progressTickStartSec`) should be
  registered as anchor points so the alignment skill can sync them to spoken
  narration verbs.
