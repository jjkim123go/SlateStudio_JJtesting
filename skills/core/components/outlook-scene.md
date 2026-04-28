# OutlookScene Component

> Layer 2 component skill. Load for any synthetic Outlook web scene.
> See also: [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
> for the umbrella step-kind contract and v1 scope decisions.

## When to use

Triggers: Outlook, email demo, "send this email", compose email, inbox,
reading pane, Copilot for Outlook, calendar invite, meeting request,
"open that email", attach file, reply email, forward email.

**Override:** This beats `foundry_video_gen` (Sora-2) for email UI because
sender names, subject lines, and compose fields need to be pixel-perfect
readable text — Sora-2 will hallucinate message content and misspell names.

## Props

Canonical contract: slot-based Outlook chrome.

Primary authoring props:

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `theme` | string | no | `light` or `dark`. Default: `light`. |
| `activeRail` | string | no | `mail`, `calendar`, `people`, `tasks`, `groups`, or `apps`. |
| `ribbonVariant` | string | no | `mail-home`, `mail-view`, `compose-message`, `compose-format`, `compose-insert`, `search`, `calendar-home`, or `none`. |
| `viewBodyHtml` | string (raw HTML) | yes | Main body content for the current Outlook view. This is the canonical content slot. |
| `contextualTabs` | string (raw HTML) | no | Optional extra tabs appended to the tab strip. |
| `rightHeaderSlot` | string (raw HTML) | no | Optional controls on the right side of the tab strip. |
| `floatingTabsHtml` | string (raw HTML) | no | Optional floating tabs / minimized compose strip. |
| `eventCardHtml` | string (raw HTML) | no | Optional app-bar event card. |
| `toastTitle` | string | no | Title for the built-in toast. |
| `toastBody` | string | no | Body for the built-in toast. |

Legacy compatibility: `stepsHtml` is still accepted, but only as a fallback path.
The transformer wraps it into a synthetic mail layout so older scenes do not
render blank. Prefer `viewBodyHtml` for all new work.

```json
{
  "accountName": "alex@contoso.com",
  "accountInitial": "I",
  "currentFolder": "Inbox",
  "stepsHtml": "<div class=\"tm-step\" data-kind=\"inbox_arrival\" data-duration=\"1.0\" style=\"opacity:0;padding:10px 16px;border-bottom:1px solid #f3f2f1;overflow:hidden\"><div style=\"display:flex;justify-content:space-between;align-items:baseline\"><span style=\"font-weight:700;font-size:13px;color:#323130\">Tim Wong</span><span style=\"font-size:11px;color:#a19f9d\">10:45 AM</span></div><div style=\"font-size:13px;font-weight:600;color:#323130;margin-top:2px;display:flex;align-items:center;gap:6px\"><span class=\"ol-new-badge\" style=\"background:#0078d4;color:#fff;border-radius:3px;padding:1px 6px;font-size:10px;font-weight:700\">New</span> Q3 Budget Review</div><div style=\"font-size:12px;color:#605e5c;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">Please review the attached spreadsheet before...</div></div>"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `accountName` | string | yes | User name / email shown in the app bar. |
| `accountInitial` | string | no | Single letter avatar. Default: first char of `accountName`. |
| `currentFolder` | string | no | Legacy fallback hint used only when `stepsHtml` drives the scene body. |
| `stepsHtml` | string (raw HTML) | no | Legacy compatibility path only. Prefer `viewBodyHtml`. |

## Step kinds

| Kind | Attrs | Visual |
|------|-------|--------|
| `inbox_arrival` | — | New message row slides into top of message list with "New" badge that fades after 1s. |
| `email_open` | — | Message row highlights (gray bg); reading pane content cross-fades to email body. Include `.ol-reading-body` div inside the step for reading pane content. |
| `compose` | — | Compose overlay card slides up from bottom-right (To/Cc, Subject, Body, Send button). |
| `attach` | — | Attachment chip (📎 icon + filename + size) slides into compose card's attachment area. |
| `send` | — | Compose card slides down; "✓ Message sent" toast appears top-right and fades. |
| `calendar_invite` | — | Calendar invite card fades in (date/time/location + Accept/Tentative/Decline buttons). |
| `pause` | — | Held beat (no visible change). |
| `pill` | — | Status badge pops in with `back.out` ease. |

### Step HTML skeletons

**inbox_arrival:**
```html
<div class="tm-step" data-kind="inbox_arrival" data-duration="1.0" style="opacity:0;padding:10px 16px;border-bottom:1px solid #f3f2f1;overflow:hidden">
  <div style="display:flex;justify-content:space-between;align-items:baseline">
    <span style="font-weight:700;font-size:13px;color:#323130">Sender Name</span>
    <span style="font-size:11px;color:#a19f9d">10:45 AM</span>
  </div>
  <div style="font-size:13px;font-weight:600;color:#323130;margin-top:2px;display:flex;align-items:center;gap:6px">
    <span class="ol-new-badge" style="background:#0078d4;color:#fff;border-radius:3px;padding:1px 6px;font-size:10px;font-weight:700">New</span>
    Subject line here
  </div>
  <div style="font-size:12px;color:#605e5c;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Preview text...</div>
</div>
```

**email_open:** (include `.ol-reading-body` for reading pane swap)
```html
<div class="tm-step" data-kind="email_open" data-duration="1.2" style="opacity:0;padding:10px 16px;border-bottom:1px solid #f3f2f1">
  <div style="display:flex;justify-content:space-between;align-items:baseline">
    <span style="font-weight:600;font-size:13px;color:#323130">Sender Name</span>
    <span style="font-size:11px;color:#a19f9d">Yesterday</span>
  </div>
  <div style="font-size:13px;color:#323130;margin-top:2px">Subject line</div>
  <div class="ol-reading-body" style="display:none;position:absolute;inset:0;padding:24px 32px;background:#fff;z-index:5">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div style="width:40px;height:40px;border-radius:50%;background:#0078d4;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600">TW</div>
      <div><div style="font-weight:600;font-size:14px;color:#323130">Tim Wong</div><div style="font-size:12px;color:#605e5c">tim@contoso.com</div></div>
    </div>
    <div style="font-size:20px;font-weight:700;color:#323130;margin-bottom:12px">Subject line</div>
    <div style="font-size:14px;color:#323130;line-height:1.6">Email body content here...</div>
  </div>
</div>
```

**attach:**
```html
<div class="tm-step" data-kind="attach" data-duration="0.6" style="opacity:0;display:inline-flex;align-items:center;gap:6px;padding:6px 10px;background:#f3f2f1;border-radius:4px;border:1px solid #e1dfdd;font-size:12px;color:#323130;margin:4px 0">
  <span>📎</span><span style="font-weight:600">Report.xlsx</span><span style="color:#a19f9d">2.4 MB</span>
</div>
```

**calendar_invite:**
```html
<div class="tm-step" data-kind="calendar_invite" data-duration="1.2" style="opacity:0;margin:12px 0;padding:16px;background:#f3f2f1;border-radius:8px;border-left:4px solid #0078d4">
  <div style="font-size:15px;font-weight:700;color:#323130;margin-bottom:8px">📅 Q3 Planning Meeting</div>
  <div style="font-size:13px;color:#605e5c;margin-bottom:4px">Tuesday, Jul 15 · 2:00 PM – 3:00 PM</div>
  <div style="font-size:13px;color:#605e5c;margin-bottom:12px">📍 Conference Room B / Teams</div>
  <div style="display:flex;gap:8px">
    <div style="padding:4px 16px;background:#0078d4;color:#fff;border-radius:4px;font-size:12px;font-weight:600">Accept</div>
    <div style="padding:4px 16px;background:#fff;color:#323130;border:1px solid #d2d0ce;border-radius:4px;font-size:12px">Tentative</div>
    <div style="padding:4px 16px;background:#fff;color:#323130;border:1px solid #d2d0ce;border-radius:4px;font-size:12px">Decline</div>
  </div>
</div>
```

## Scene timing

Recommended duration: **8–18 seconds.** Sum step durations plus 1.2s headroom
for chrome reveal (0.7s) and exit fade (0.5s). A compose-and-send flow
(compose + attach + send) typically needs 4–5s. Reading flow
(inbox_arrival + email_open) needs 3–4s.

## Out of scope (v1)

❌ Drag-and-drop · ❌ Multi-select messages · ❌ Conversation threading ·
❌ Search bar interaction · ❌ Copilot panel · ❌ Rules/filters UI.
See the umbrella skill for the rationale.
