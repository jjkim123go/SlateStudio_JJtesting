# AuditTrail

> Vertical timeline showing "who did what when" for enterprise governance and compliance videos.

## When to use

- You need to show a **chronological log** of user or system actions.
- The narrative calls for **accountability** — showing actors, timestamps, outcomes.
- Pair with **PolicyEnforcement** to cross-reference a specific audit event via `auditRef`.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | string | No | Heading above the timeline (e.g., "Q3 Audit Trail"). Hidden if empty. |
| `eventsHtml` | raw HTML | **Yes** | Pre-built HTML for each event row. See markup below. |
| `retentionNote` | string | No | Italic footer text (e.g., "Retained for 7 years per SOX §302"). |
| `exportRef` | string | No | Monospace footer reference ID (e.g., "AUD-2024Q3-0819"). |

### eventsHtml markup

Each event is one `.at-event` div. Wrap them all into a single string and pass
as the `eventsHtml` prop. The component renders them inside `.at-events`.

```html
<div class="at-event" id="evt-0" data-highlighted="false">
  <div class="at-dot-wrap"><div class="at-dot"></div></div>
  <div class="at-card">
    <div class="at-card-head">
      <span class="at-ts">2024-08-15 09:14 UTC</span>
      <span class="at-icon">📝</span>
    </div>
    <div class="at-card-body">
      <span class="at-actor">Alice Yamada</span> approved
      <span class="at-target">Invoice #4491</span>
    </div>
    <div class="at-card-meta">
      <span class="at-result" data-result="success">✓ Success</span>
      <span class="at-corr">corr-7a3f</span>
    </div>
  </div>
</div>
```

#### Event fields

| Element | Required | Notes |
|---------|----------|-------|
| `id` attr on `.at-event` | Recommended | Used by PolicyEnforcement's `auditRef`. Synthesise as `evt-{index}` if missing. |
| `data-highlighted` | No | `"true"` adds amber dot + border + box-shadow pulse animation. Default `"false"`. |
| `.at-ts` | Yes | Timestamp string. |
| `.at-icon` | No | Emoji or empty. Hidden via `:empty`. |
| `.at-actor` | Yes | Person or system who performed the action. |
| `.at-target` | No | Entity acted upon. |
| `.at-result` | No | Badge. `data-result="success"` or `"failure"`. Hidden via `:empty`. |
| `.at-corr` | No | Correlation ID. Monospace. Hidden via `:empty`. |

## Scene timing

| Events | Minimum duration |
|--------|-----------------|
| 1–3    | 6 s |
| 4–6    | 8 s |
| 7–10   | 10 s |

## Animation sequence

1. Title fades in (0.2 s)
2. Vertical timeline line draws downward (0.4 s offset, 1.5 s stroke reveal)
3. Event cards stagger in from left
4. Highlighted events receive amber box-shadow pulse
5. Footer fades in
6. Exit fade ≥ 0.3 s before scene end

## Composition tip

For cross-component tracing, set an `id` on each event (e.g., `evt-3`) and give
the AuditTrail scene an `id` in the SCF (e.g., `audit-q3`). Then in a later
PolicyEnforcement scene, set `auditRef` to `"audit-q3#evt-3"` to display a
visual back-link chip.
