# GitHubScene Component

> Layer 2 component skill. Load for any synthetic GitHub repo/PR scene.
> See also: [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
> for the umbrella step-kind contract and v1 scope decisions.

## When to use

Triggers: GitHub, github.com, PR, pull request, "PR review", "code review demo",
GitHub Actions, repository tour, octicon, "merge a PR", "approve and merge",
status checks, CI on PR, comment thread, review thread, commit history,
"watch the merge".

**Override:** This beats `foundry_video_gen` (Sora-2) for GitHub content because
PR titles, branch names, comment bodies, and check names are pixel-perfect
deterministic — Sora-2 will hallucinate user names and PR numbers. It beats
`visual_prompt` (image gen) because still images can't sequence comments,
reviews, and merge state transitions.

## Props

Canonical contract: slot-based GitHub chrome.

Primary authoring props:

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `variant` | string | yes | `repo-home` or `pr-diff`. |
| `theme` | string | no | `light` in current scope. |
| `repoOwner` | string | yes | Repository owner shown in the header. |
| `repoName` | string | yes | Repository name shown in the header. |
| `repoBranchHtml` | string (raw HTML/string) | no | Branch chip content. |
| `repoTabsHtml` | string (raw HTML) | yes | Top repo navigation tabs. |
| `bodyHtml` | string (raw HTML) | yes | Variant body. This is the canonical content slot. |
| `footerStatusHtml` | string (raw HTML) | no | Optional footer / status row. |

Legacy compatibility: PR-oriented props like `prNumber`, `prTitle`, `branch`,
and `stepsHtml` are still accepted and wrapped into a fallback `pr-diff` body so
older scenes do not render empty. Prefer `bodyHtml` plus explicit repo chrome
slots for new work.

```json
{
  "repoOwner": "microsoft",
  "repoName": "slate",
  "prNumber": 42,
  "prTitle": "Add VSCodeScene synthetic surface",
  "branch": "feat/vscode-scene",
  "stepsHtml": "<div class=\"gh-step\" data-kind=\"comment\" data-duration=\"0.5\" style=\"opacity:0;border:1px solid #d0d7de;border-radius:6px;padding:14px;margin-bottom:12px;background:#ffffff\"><div style=\"display:flex;align-items:center;gap:8px;margin-bottom:8px\"><div style=\"width:24px;height:24px;border-radius:50%;background:#ddd\"></div><strong>slate-bot</strong><span style=\"color:#656d76;font-size:12px\">commented just now</span></div><div style=\"font-size:14px\">Adds the VSCodeScene component with 8 step kinds, matching the TerminalScene template contract.</div></div><div class=\"gh-step\" data-kind=\"actions_run\" data-duration=\"1.6\" style=\"opacity:0;border:1px solid #d0d7de;border-radius:6px;padding:12px 14px;margin-bottom:12px;background:#ffffff\"><div style=\"font-weight:600;margin-bottom:8px;font-size:13px\">All checks have passed</div><div class=\"gh-check-row\" style=\"opacity:0;display:flex;align-items:center;gap:10px;padding:6px 0;border-top:1px solid #d0d7de;font-size:13px\"><span style=\"color:#1a7f37\">✓</span><span style=\"flex:1\">build / lint</span><span style=\"color:#656d76\">Successful in 38s</span></div><div class=\"gh-check-row\" style=\"opacity:0;display:flex;align-items:center;gap:10px;padding:6px 0;border-top:1px solid #d0d7de;font-size:13px\"><span style=\"color:#1a7f37\">✓</span><span style=\"flex:1\">test / unit</span><span style=\"color:#656d76\">Successful in 1m 12s</span></div><div class=\"gh-check-row\" style=\"opacity:0;display:flex;align-items:center;gap:10px;padding:6px 0;border-top:1px solid #d0d7de;font-size:13px\"><span style=\"color:#1a7f37\">✓</span><span style=\"flex:1\">render / smoke</span><span style=\"color:#656d76\">Successful in 24s</span></div></div><div class=\"gh-step\" data-kind=\"review\" data-duration=\"0.5\" style=\"opacity:0;display:flex;align-items:center;gap:10px;border:1px solid #d0d7de;border-radius:6px;padding:12px 14px;margin-bottom:12px;background:#ffffff\"><span style=\"color:#1a7f37;font-size:18px\">✓</span><strong>director-agent</strong><span>approved these changes</span></div><div class=\"gh-step\" data-kind=\"merge\" data-duration=\"0.6\" style=\"opacity:0;display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:#8250df;color:#ffffff;border-radius:6px;font-weight:600;font-size:14px\">⇄ Merged</div><div class=\"gh-step\" data-kind=\"pause\" data-duration=\"0.6\" style=\"display:none\"></div><div class=\"gh-step\" data-kind=\"pill\" data-duration=\"0.4\" style=\"opacity:0;display:inline-flex;align-items:center;gap:6px;padding:3px 10px;margin-left:10px;background:#8250df;color:#ffffff;border-radius:999px;font-size:12px;font-weight:500\"><span>⇄</span><span>Merged</span></div>"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `repoOwner` | string | yes | Owner segment in the repo header. |
| `repoName` | string | yes | Repo segment in the repo header. |
| `prNumber` | number\|string | no | Legacy compatibility hint for fallback PR bodies. |
| `prTitle` | string | no | Legacy compatibility hint for fallback PR bodies. |
| `branch` | string | no | Legacy compatibility hint for fallback PR bodies. |
| `stepsHtml` | string (raw HTML) | no | Legacy compatibility path only. Prefer `bodyHtml`. |

## Step kinds

| Kind             | Visual                                                                |
|------------------|-----------------------------------------------------------------------|
| `pr_open`        | Element fades in from above (PR header / first card).                 |
| `comment`        | Comment card slides in from below.                                    |
| `review`         | Review-thread card slides in from below.                              |
| `merge`          | Merge button scales in with back-out ease.                            |
| `actions_run`    | Container fades in; child `.gh-check-row` rows stagger in (~180ms).   |
| `commit_history` | Container fades in; child `.gh-commit-row` rows stagger in (~140ms).  |
| `pause`          | Held beat (no visible change).                                        |
| `pill`           | Status badge (e.g. ⇄ Merged, ⊙ Open, ✗ Closed).                       |

## Scene timing

Recommended duration: **9–20 seconds.** Sum each step's `data-duration`.
For `actions_run`/`commit_history`, ensure `data-duration` ≥ `(rowCount × stagger) + 0.3`
so all rows finish revealing before the cursor advances.
Reserve **1.5s headroom** for the window reveal (~0.8s) and exit fade (~0.5s).

## Out of scope (v1)

❌ Real diff syntax highlighting · ❌ Threaded reply UI · ❌ Reaction emoji picker ·
❌ File tree navigation · ❌ Branch protection rules UI · ❌ Issues/Projects boards ·
❌ Notifications inbox · ❌ Dark theme · ❌ Mobile layout. See the umbrella skill for rationale.
