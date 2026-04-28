# CTABlock Component

> Layer 2 component skill. Load for a closing call-to-action card.

## When to use

Triggers: closing scene, call to action, "get started", "learn more",
"sign up", "contact us", final ask, conclusion. Pairs naturally with
`BrandOutro` (use both: CTABlock for the message, BrandOutro for the
brand wrap).

## Props

```json
{
  "eyebrow": "Ready to ship?",
  "title": "Try Slate today",
  "body": "Generate your first explainer video in under 5 minutes. No credit card required.",
  "ctaText": "Start free trial",
  "contact": "slate@contoso.com  •  aka.ms/slate",
  "accentColor": "#7c3aed"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `eyebrow` | string | yes | Caps-styled tagline above the title. ≤ 40 chars. |
| `title` | string | yes | Huge headline. ≤ 28 chars (so it fits one line). |
| `body` | string | yes | One-sentence value prop. ≤ 140 chars. |
| `ctaText` | string | yes | Button label. ≤ 24 chars. |
| `contact` | string | yes | Footer text — email, URL, social handle. |
| `accentColor` | string | yes | Background gradient seed (hex). Use brand primary. |

## Scene timing

Recommended duration: **6–8 seconds.** Eyebrow at +0.2s, title at +0.5s
(0.7s reveal), body at +1.1s, button at +1.6s with breathing animation
starting at +2.4s, contact at +2.2s. Then 2–3s for the audience to absorb.
