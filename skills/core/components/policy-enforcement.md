# PolicyEnforcement

> Visualise a request → check pipeline → decision gate with outcome badge for compliance and security narratives.

## When to use

- You need to show **how a request is evaluated** against policy rules.
- The narrative requires a clear **allow / deny / challenge / redact** outcome.
- Pair with **AuditTrail** using `auditRef` to show provenance.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | string | No | Heading (e.g., "Budget Approval Policy"). Hidden if empty. |
| `requestHtml` | raw HTML | **Yes** | Pre-built HTML for the incoming request card. |
| `checksHtml` | raw HTML | **Yes** | Pre-built HTML for check items (pass/fail/warn/skip). |
| `decisionHtml` | raw HTML | **Yes** | Pre-built HTML for the final decision badge. |
| `ruleCitationHtml` | raw HTML | No | Upper-right chip (e.g., `SOX §302 · CTRL-1042 v3`). Hidden if empty. |
| `auditRefHtml` | raw HTML | No | Footer chip referencing an AuditTrail event. Hidden if empty. |
| `layout` | string | No | `"funnel"` (default, vertical stack) or `"decision-tree"` (checks fan horizontally). |

### requestHtml markup

```html
<div class="pe-request-label">Incoming Request</div>
<div class="pe-request-body">
  <span class="pe-actor">Carol Reyes</span> requests access to
  <span class="pe-resource">Prod-DB-West</span>
</div>
```

### checksHtml markup

Each check is one `.pe-check` div. Outcomes: `pass`, `fail`, `warn`, `skip`.

```html
<div class="pe-check">
  <div class="pe-stamp" data-outcome="pass">✓</div>
  <div>
    <div class="pe-check-name">MFA Verified</div>
    <div class="pe-check-detail">TOTP code matched</div>
  </div>
</div>
<div class="pe-check">
  <div class="pe-stamp" data-outcome="fail">✗</div>
  <div>
    <div class="pe-check-name">Geo-fence</div>
    <div class="pe-check-detail">IP 203.0.113.42 outside allowed range</div>
  </div>
</div>
```

### decisionHtml markup

Decisions: `allow`, `deny`, `challenge`, `redact`.

```html
<div class="pe-decision-icon">🚫</div>
<div>
  <div class="pe-decision-text">Deny</div>
  <div class="pe-decision-reason">Geo-fence check failed — requires VPN</div>
</div>
```

Note: The parent `<div class="pe-decision">` already exists in the template.
Set `data-decision` on it via the SCF prop attribute or include it in the
`decisionHtml` wrapper.

### ruleCitationHtml markup

```html
SOX §302 · CTRL-1042 v3
```

### auditRefHtml markup

Format: `<audit-scene-id>#<event-id>` → rendered as footer chip.

```html
<span class="pe-chip">Logged in audit · evt-3</span>
```

If the auditRef string has no `#`, render the whole string as-is.
The chip is **purely visual** — no runtime cross-scene linking.

## Scene timing

| Checks | Minimum duration |
|--------|-----------------|
| 1–2    | 6 s |
| 3–4    | 8 s |
| 5–6    | 10 s |

## Layout modes

- **funnel** (default): Checks stack vertically in a pipeline flow.
- **decision-tree**: Checks fan out horizontally (use when checks are independent).

## Animation sequence

1. Title fades in (0.2 s)
2. Rule citation slides in from right (0.3 s)
3. Request card slides in from left (0.3 s)
4. Connector line scales down (0.6 s)
5. Check items stamp in with stagger (back ease, 0.7 s start)
6. Failed checks receive red border emphasis
7. Second connector scales
8. Decision gate expands with scale (0.5 s)
9. Footer chips stagger in
10. Exit fade ≥ 0.3 s before scene end

## Composition tip

For audit traceability, add `auditRefHtml` with a chip like
`"Logged in audit · evt-3"` and ensure the referenced AuditTrail scene
has a matching event `id="evt-3"` and scene `id="audit-q3"`. This creates
a visual narrative thread across scenes.
