# TerminalScene Component

> Layer 2 component skill. Load for any synthetic CLI/terminal scene.
> See also: [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
> for the umbrella step-kind contract and v1 scope decisions.

## When to use

Triggers: terminal, CLI, command line, "run this command", install flow,
deploy walkthrough, npm/yarn/pip/cargo install, kubectl, az, git, docker,
"watch as I run", build output demo.

**Override:** This beats `foundry_video_gen` (Sora-2) for command-line content
because the typed text is pixel-perfect deterministic — Sora-2 will
hallucinate command syntax.

## Props

The component accepts `linesHtml` as raw HTML (triple-mustache injection).
Build it from your steps array — see
[`synthetic-screen-recording.md`](../synthetic-screen-recording.md) for
the line skeletons per kind.

```json
{
  "titlebar": "user@workstation: ~/projects/slate",
  "linesHtml": "<div class=\"ts-line\" data-kind=\"cmd\" data-duration=\"0.6\" style=\"opacity:0;display:flex;gap:12px;margin-bottom:8px\"><span style=\"color:#22c55e;font-weight:600\">$</span><span class=\"ts-cmd-text\" data-text=\"slate render demo.scf.json\">slate render demo.scf.json</span></div><div class=\"ts-line\" data-kind=\"out\" data-duration=\"0.4\" style=\"opacity:0;color:rgba(255,255,255,0.7);margin-bottom:4px;white-space:pre\">→ Compiling SCF…\n→ 8 scenes validated\n→ Rendering at 1920×1080@30fps…</div><div class=\"ts-line\" data-kind=\"pause\" data-duration=\"0.6\" style=\"display:none\"></div><div class=\"ts-line\" data-kind=\"pill\" data-duration=\"0.4\" style=\"opacity:0;display:inline-flex;align-items:center;gap:6px;margin:8px 0;padding:4px 12px;background:rgba(34,197,94,0.2);border:1px solid #22c55e;border-radius:999px;color:#22c55e;font-size:18px\"><span>✓</span><span>render complete</span></div>"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `titlebar` | string | yes | Centered text in the macOS-style title bar. |
| `linesHtml` | string (raw HTML) | yes | Sequence of `<div class="ts-line" data-kind="…" data-duration="…">…</div>` rows. Animation reads `data-kind` and `data-duration` and renders accordingly. |

## Step kinds (recap)

See [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
for the full contract.

| Kind   | Visual                                          |
|--------|-------------------------------------------------|
| `cmd`  | Typed character-by-character with `$` prompt.   |
| `out`  | Block reveal of stdout/log/file content.        |
| `pause`| Held beat (no visible change).                  |
| `pill` | Status badge (✓ done, ⚠ warning, ✗ error).     |

## Scene timing

Recommended duration: **8–20 seconds.** The animation timeline accumulates
each step's `data-duration` plus small inter-step gaps. Sum your steps
and add 1.5s of headroom for the window reveal and exit fade.

## Out of scope (v1)

❌ Mouse cursor / clicks · ❌ Text selection · ❌ Split panes · ❌ Tabs ·
❌ Interactive prompts. See the umbrella skill for the rationale.
