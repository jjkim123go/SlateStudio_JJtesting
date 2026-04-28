# PowerPointScene Component

> Layer 2 component skill. Load for any synthetic PowerPoint web scene.
> See also: [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
> for the umbrella step-kind contract and v1 scope decisions.

## When to use

Triggers: PowerPoint, deck **editing**, slideshow being **built**, "build
this slide", Designer, Copilot for PowerPoint, presentation walkthrough,
slide design, "add a slide", "type on the slide", "drop an image", design
ideas, slide thumbnail, "presentation demo", "show me PowerPoint".

**Pick PowerPointScene only when the demo is *about* PowerPoint itself**
(the chrome — ribbon, slide rail, status bar — must be visible). For a
plain branded "agenda slide", "title slide", or "summary slide" that
should fill the frame without app chrome, use **`SlideRenderer`** instead.

**Override:** This beats `foundry_video_gen` (Sora-2) for slide editing UI because
the ribbon, thumbnail rail, and canvas text must be pixel-perfect — Sora-2
will hallucinate tab labels and misrender the slide aspect ratio. Also beats
`visual_prompt` when demonstrating the editing experience rather than just
showing a static slide.

## Props

The component accepts `stepsHtml` as raw HTML (triple-mustache injection).
Build it from your steps array — see
[`synthetic-screen-recording.md`](../synthetic-screen-recording.md) for
the step skeletons per kind.

```json
{
  "deckName": "Q3 Strategy",
  "slideTitle": "AI-Powered Growth",
  "slideNumber": "1",
  "stepsHtml": "<div class=\"tm-step\" data-kind=\"text_type\" data-text=\"Our AI platform processes 2M requests per day\" data-duration=\"1.5\" style=\"opacity:0;font-size:16px;color:#605e5c;margin-top:12px\">Our AI platform processes 2M requests per day</div><div class=\"tm-step\" data-kind=\"image_drop\" data-duration=\"1.0\" style=\"opacity:0;width:200px;height:140px;margin:16px auto;border-radius:6px;background:#e8e6e3;display:flex;align-items:center;justify-content:center\"><svg width=\"48\" height=\"48\" viewBox=\"0 0 48 48\"><rect x=\"4\" y=\"8\" width=\"40\" height=\"32\" rx=\"4\" fill=\"#d2d0ce\"/><circle cx=\"16\" cy=\"20\" r=\"5\" fill=\"#a19f9d\"/><path d=\"M4 32 L18 22 L28 30 L36 24 L44 32 L44 40 L4 40 Z\" fill=\"#b7472a\" opacity=\"0.5\"/></svg></div>"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `deckName` | string | no | Presentation name (not rendered in chrome v1, used for context). |
| `slideTitle` | string | yes | Title text shown on the main slide canvas and first thumbnail. |
| `slideNumber` | string | yes | Current slide number. Shown in status bar "Slide N of 4". |
| `stepsHtml` | string (raw HTML) | yes | Sequence of `<div class="tm-step" data-kind="…" data-duration="…">…</div>` elements placed inside the slide canvas. |

## Step kinds

| Kind | Attrs | Visual |
|------|-------|--------|
| `slide_change` | `data-slide="2"`, `data-title="New Title"` | Thumbnail rail highlight moves to target slide; canvas cross-fades; slide title and status bar update. |
| `text_type` | `data-text="Content to type"` | Typewriter text onto the slide canvas at the step's DOM position. |
| `image_drop` | — | Image placeholder (SVG silhouette) fades in then snaps to size with subtle scale animation. |
| `designer_suggestion` | — | Design Ideas panel slides in from right with 3 variant thumbnails; after a beat, first option is "selected" (orange border highlight). |
| `pause` | — | Held beat (no visible change). |
| `pill` | — | Status badge pops in with `back.out` ease. |

### Step HTML skeletons

**slide_change:**
```html
<div class="tm-step" data-kind="slide_change" data-slide="2" data-title="Market Analysis" data-duration="0.8" style="opacity:0"></div>
```

**text_type:**
```html
<div class="tm-step" data-kind="text_type" data-text="Our AI platform processes 2M requests per day" data-duration="1.5" style="opacity:0;font-size:16px;color:#605e5c;margin-top:12px">Our AI platform processes 2M requests per day</div>
```

**image_drop:**
```html
<div class="tm-step" data-kind="image_drop" data-duration="1.0" style="opacity:0;width:200px;height:140px;margin:16px auto;border-radius:6px;background:#e8e6e3;display:flex;align-items:center;justify-content:center">
  <svg width="48" height="48" viewBox="0 0 48 48">
    <rect x="4" y="8" width="40" height="32" rx="4" fill="#d2d0ce"/>
    <circle cx="16" cy="20" r="5" fill="#a19f9d"/>
    <path d="M4 32 L18 22 L28 30 L36 24 L44 32 L44 40 L4 40 Z" fill="#b7472a" opacity="0.5"/>
  </svg>
</div>
```

**designer_suggestion:**
```html
<div class="tm-step" data-kind="designer_suggestion" data-duration="1.5" style="opacity:0"></div>
```

## Scene timing

Recommended duration: **8–18 seconds.** Sum step durations plus 1.2s headroom
for chrome reveal (0.7s) and exit fade (0.5s). A typical "build a slide" flow
(text_type + image_drop + designer_suggestion) fits in 6–8s. Slide navigation
demos (3-4 slide_change steps) need 8–12s.

## Thumbnail rail

The component renders 4 static thumbnails. `slide_change` steps move the
orange highlight border between them. Thumbnails 2-4 show generic "Slide N"
labels. Thumbnail 1 reflects `slideTitle`.

## Out of scope (v1)

❌ Slide transition previews · ❌ Animation timeline panel · ❌ Co-authoring
cursors · ❌ Morph transition · ❌ Copilot panel · ❌ Presenter view ·
❌ Speaker notes. See the umbrella skill for the rationale.
