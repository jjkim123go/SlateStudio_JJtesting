# TeamsScene Component

> Layer 2 component skill. Load for any synthetic Microsoft Teams scene.
> See also: [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
> for the umbrella step-kind contract and v1 scope decisions.

## When to use

Triggers: Microsoft Teams, Teams chat, Teams meeting, "in a Teams call",
channel post, channel message, Loop component, Copilot for Teams, group chat,
"join a meeting", "share screen in Teams", reaction demo, @mention.

**Override:** This beats `foundry_video_gen` (Sora-2) for chat/meeting UI because
the message bubbles, channel chrome, and meeting overlays are
pixel-perfect — Sora-2 will hallucinate Teams UI and misspell usernames.

## Props

Canonical contract: structured Teams props plus `steps` arrays.

Primary authoring props:

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `view` | string | no | `chat`, `channel_post`, `activity`, `calendar`, or `shared`. |
| `topBar` / `rail` / `navigator` | object | no | Structured chrome inputs used by the transformer to render Teams shell regions. |
| `steps` | array | no | Canonical sequenced content contract. The transformer converts these into Teams message/activity HTML. |
| `contentHtml` | string (raw HTML) | no | Explicit body override when you need full manual control. |

Legacy compatibility: raw `stepsHtml` is still accepted and wrapped into the
chat body. The old `chat_message` step kind is treated as a legacy alias for
`message`, but new work should use `message`.

```json
{
  "team": "Product Team",
  "channel": "General",
  "presenterName": "Alex",
  "stepsHtml": "<div class=\"tm-step\" data-kind=\"chat_message\" data-duration=\"1.0\" data-author=\"other\" style=\"opacity:0;display:flex;gap:10px;margin-bottom:8px\"><div style=\"width:32px;height:32px;border-radius:50%;background:#0078d4;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:600;flex-shrink:0\">JL</div><div><div style=\"font-size:13px\"><span style=\"font-weight:600;color:#242424\">Jordan Lee</span> <span style=\"color:#999;font-size:11px\">10:32 AM</span></div><div style=\"font-size:14px;color:#242424;margin-top:2px\">PR looks good — ship it!</div></div></div>"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `team` | string | no | Legacy convenience field for chat/channel chrome. |
| `channel` | string | no | Legacy convenience field for chat/channel chrome. |
| `presenterName` | string | no | Name shown on screen-share overlay. Defaults to empty. |
| `stepsHtml` | string (raw HTML) | no | Legacy compatibility path only. Prefer structured `steps`. |

## Step kinds

| Kind | Attrs | Visual |
|------|-------|--------|
| `message` | `data-author="self"\|"other"` | Message bubble slides up. `self` = right-aligned purple bg; `other` = left-aligned with avatar circle + name + gray bg. |
| `chat_message` | `data-author="self"\|"other"` | Legacy alias for `message`. Supported for back-compat only. |
| `reaction` | — | Emoji pill (👍 ❤️ 🎉) pops in below the most recent message with bounce ease. |
| `mention` | — | An @-mention highlight (`tm-mention-hl` span) fades in with purple tint. |
| `meeting_join` | — | Full-screen meeting overlay slides in over conversation: participant tiles (initials in colored circles), meeting controls bar bottom. |
| `share_screen` | — | Meeting overlay swaps to screen-share layout: shared screen area center with "sharing screen" label, filmstrip of participants on right. |
| `pause` | — | Held beat (no visible change). |
| `pill` | — | Status badge pops in with `back.out` ease (✓ done, ⚠ warning). |

### Step HTML skeletons

**chat_message (other):**
```html
<div class="tm-step" data-kind="chat_message" data-duration="1.0" data-author="other" style="opacity:0;display:flex;gap:10px;margin-bottom:8px">
  <div style="width:32px;height:32px;border-radius:50%;background:#0078d4;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:600;flex-shrink:0">JL</div>
  <div>
    <div style="font-size:13px"><span style="font-weight:600;color:#242424">Jordan Lee</span><span style="color:#999;font-size:11px">10:32 AM</span></div>
    <div style="font-size:14px;color:#242424;margin-top:2px">Your message text here</div>
  </div>
</div>
```

**chat_message (self):**
```html
<div class="tm-step" data-kind="chat_message" data-duration="1.0" data-author="self" style="opacity:0;display:flex;justify-content:flex-end;margin-bottom:8px">
  <div style="background:#e8e8fc;border-radius:8px;padding:8px 12px;max-width:70%">
    <div style="font-size:14px;color:#242424">My reply here</div>
  </div>
</div>
```

**reaction:**
```html
<div class="tm-step" data-kind="reaction" data-duration="0.5" style="opacity:0;display:inline-flex;margin-left:42px;margin-bottom:8px;padding:2px 8px;background:#f0f0f0;border-radius:12px;font-size:14px;gap:4px">
  <span>👍</span><span style="font-size:12px;color:#616161">1</span>
</div>
```

**meeting_join / share_screen / pause / pill:** same skeleton as TerminalScene (kind + duration only, no inner content needed for overlays).

## Scene timing

Recommended duration: **8–20 seconds.** Sum step durations plus 1.2s headroom
for chrome reveal (0.7s) and exit fade (0.5s). A typical 6-message chat
conversation fits in 10–12s. Meeting scenes need 12–16s minimum to allow the
overlay transitions.

## Out of scope (v1)

❌ Typing indicators · ❌ Read receipts · ❌ File previews in chat ·
❌ Threaded replies · ❌ Loop components · ❌ Real video feeds in meeting tiles.
See the umbrella skill for the rationale.
