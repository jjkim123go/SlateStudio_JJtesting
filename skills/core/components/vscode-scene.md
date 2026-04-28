# VSCodeScene Component

> Layer 2 component skill. Load for any synthetic VS Code editor scene.
> See also: [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
> for the umbrella step-kind contract and v1 scope decisions.

## When to use

Triggers: VS Code, vscode, code editor, IDE demo, "show me code being typed",
typing into editor, IntelliSense, autocomplete, breakpoint, debug demo,
GitHub Copilot in editor, integrated terminal, gutter marker, source-control
gutter, "open file X", live coding clip.

**Override:** This beats `foundry_video_gen` (Sora-2) for editor content because
typed code is pixel-perfect deterministic and Sora-2 hallucinates syntax.
It beats `visual_prompt` (image gen) because still images can't show
character-by-character typing or IntelliSense reveals.

## Props

Canonical contract: slot-based VS Code chrome.

Primary authoring props:

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `titlebarText` | string | no | Window title text. |
| `primarySidebarTitle` | string | no | Explorer / Search / SCM header label. |
| `primarySidebarBodyHtml` | string (raw HTML) | yes | Main sidebar body. File tree, search results, extension list, chat list, etc. |
| `tabListHtml` | string (raw HTML) | yes | Active editor tabs. |
| `breadcrumbHtml` | string (raw HTML) | no | Breadcrumb row above the editor. |
| `gutterHtml` | string (raw HTML) | yes | Line numbers / gutter decorations. |
| `codeContentHtml` | string (raw HTML) | yes | Main editor body. This is the canonical content slot. |
| `panelTabsHtml` | string (raw HTML) | no | Bottom panel tabs. |
| `panelBodyHtml` | string (raw HTML) | no | Bottom panel content. |
| `statusbarLeftHtml` | string (raw HTML) | no | Left status bar segments. |
| `statusbarRightHtml` | string (raw HTML) | no | Right status bar segments. |

Legacy compatibility: `filename`, `language`, `statusbarText`, and `stepsHtml`
are still accepted and transformed into the slot contract. That path exists to
keep older scenes rendering, but new authoring should target the slot props
above.

```json
{
  "filename": "app.ts",
  "language": "TypeScript",
  "statusbarText": "Ln 4, Col 12   UTF-8   LF   Spaces: 2",
  "stepsHtml": "<div class=\"vs-step\" data-kind=\"open_file\" data-duration=\"0.4\" style=\"opacity:0;color:#9cdcfe;margin-bottom:6px\">// app.ts opened</div><div class=\"vs-step\" data-kind=\"type\" data-duration=\"1.4\" style=\"opacity:0;margin-bottom:4px\"><pre class=\"vs-type-text\" data-text=\"const greet = (name: string) =&gt; `Hello, ${name}!`;\" style=\"margin:0;font:inherit;color:#d4d4d4;white-space:pre-wrap\"></pre></div><div class=\"vs-step\" data-kind=\"intellisense\" data-duration=\"0.6\" style=\"opacity:0;position:absolute;top:80px;left:240px;background:#252526;border:1px solid #454545;border-radius:4px;padding:6px 0;width:220px;font-family:-apple-system,sans-serif;font-size:13px;color:#cccccc;box-shadow:0 6px 20px rgba(0,0,0,0.5)\"><div style=\"padding:4px 12px;background:#094771;color:#ffffff\">📦 greet</div><div style=\"padding:4px 12px\">📦 greeting</div><div style=\"padding:4px 12px\">⚡ greetUser</div></div><div class=\"vs-step\" data-kind=\"pause\" data-duration=\"0.6\" style=\"display:none\"></div><div class=\"vs-step\" data-kind=\"pill\" data-duration=\"0.4\" style=\"opacity:0;display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:4px 12px;background:rgba(34,197,94,0.18);border:1px solid #22c55e;border-radius:999px;color:#22c55e;font-size:14px;font-family:-apple-system,sans-serif\"><span>✓</span><span>0 problems</span></div>"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `filename` | string | no | Legacy compatibility hint used to seed title/tab defaults. |
| `language` | string | no | Legacy compatibility hint for status bar text. |
| `statusbarText` | string | no | Legacy compatibility hint for `statusbarRightHtml`. |
| `stepsHtml` | string (raw HTML) | no | Legacy compatibility path only. Prefer `codeContentHtml` and companion slot props. |

## Step kinds

| Kind             | Visual                                                                |
|------------------|-----------------------------------------------------------------------|
| `open_file`      | Tab/header element fades in from the left.                            |
| `type`           | `<pre class="vs-type-text" data-text="…">` typewrites char-by-char.   |
| `select`         | Highlight rectangle scales out from left edge over text.              |
| `gutter_marker`  | Icon (breakpoint dot, modified marker) pops in with back-out ease.    |
| `intellisense`   | Suggestion dropdown fades in below the caret position (author-placed).|
| `terminal_panel` | Bottom panel slides up 40px into the editor.                          |
| `pause`          | Held beat (no visible change).                                        |
| `pill`           | Status badge (✓ no problems, ⚠ warnings, etc.).                       |

For `intellisense` and `terminal_panel`, position the step `<div>` with inline
`position:absolute; top:…; left:…` so it lands where the visual logic expects it.

## Scene timing

Recommended duration: **8–18 seconds.** Sum each step's `data-duration`,
add ~0.2s gap per `type` step, and reserve **1.5s headroom** for the window
reveal (~0.8s) and exit fade (~0.5s).

## Out of scope (v1)

❌ Real syntax highlighting (use static color spans inside `data-text` if needed) ·
❌ Multi-cursor · ❌ Minimap · ❌ Hover tooltips · ❌ Real diagnostics squiggles ·
❌ Debugger pause/step UI · ❌ Source-control gutter diffs · ❌ Side-by-side diff view.
See the umbrella skill for rationale.
