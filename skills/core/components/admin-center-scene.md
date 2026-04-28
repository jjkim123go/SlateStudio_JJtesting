# AdminCenterScene Component

> Layer 2 component skill. Load for any synthetic Microsoft 365 admin-center scene.
> See also: [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
> for the umbrella step-kind contract and v1 scope decisions.

## When to use

Triggers: M365 admin, admin center, tenant admin, add user, license
assignment, Intune policy, Entra admin, compliance dashboard, active users,
policy assign, tenant switcher.

**Override:** This beats `visual_prompt` and `foundry_video_gen` (Sora-2) for admin-center
walkthroughs because tenant chrome, user tables, wizard blades, and compliance
cards need deterministic structure and readable text.

## Props

The component accepts `stepsHtml` as raw HTML (triple-mustache injection).
Build it from your logical steps array as a sequence of
`<div class="ac-step" data-kind="…" data-duration="…">…</div>` fragments.

```json
{
  "theme": "light",
  "tenantName": "Contoso",
  "currentSection": "Active users",
  "stepsHtml": "<div class=\"ac-step\" data-kind=\"tenant_select\" data-tenant=\"Northwind\" data-duration=\"1.0\" style=\"opacity:0\"></div><div class=\"ac-step\" data-kind=\"user_create\" data-display-name=\"Jordan Lee\" data-user-name=\"jordan.lee@northwind.com\" data-license=\"Microsoft 365 E5\" data-duration=\"1.8\" style=\"opacity:0\"></div><div class=\"ac-step\" data-kind=\"policy_assign\" data-policy=\"Conditional Access\" data-duration=\"1.0\" style=\"opacity:0\"></div><div class=\"ac-step\" data-kind=\"compliance_check\" data-score=\"92\" data-duration=\"1.2\" style=\"opacity:0\"></div><div class=\"ac-step\" data-kind=\"pill\" data-duration=\"0.5\" style=\"opacity:0;display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(16,124,16,.12);border:1px solid rgba(16,124,16,.2);color:#107c10;font-weight:700\"><span>✓</span><span>Admin task completed</span></div>"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `theme` | string | no | `"light"` or `"dark"`. Light best matches the current admin-center UI. |
| `tenantName` | string | yes | Initial tenant label in the header switcher. |
| `currentSection` | string | yes | Page title / breadcrumb target, e.g. `Active users`. |
| `stepsHtml` | string (raw HTML) | yes | Sequence of `.ac-step` fragments. Animation reads `data-kind`, `data-duration`, and per-step data attributes. |

### Step fragment skeletons

```html
<div class="ac-step" data-kind="tenant_select" data-tenant="Northwind"
  data-duration="1.0" style="opacity:0"></div>

<div class="ac-step" data-kind="user_create" data-display-name="Jordan Lee"
  data-user-name="jordan.lee@northwind.com" data-license="Microsoft 365 E5"
  data-duration="1.8" style="opacity:0"></div>

<div class="ac-step" data-kind="policy_assign" data-policy="Conditional Access"
  data-duration="1.0" style="opacity:0"></div>

<div class="ac-step" data-kind="compliance_check" data-score="92"
  data-duration="1.2" style="opacity:0"></div>

<div class="ac-step" data-kind="pause" data-duration="0.7" style="display:none"></div>

<div class="ac-step" data-kind="pill" data-duration="0.5"
  style="opacity:0;display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(16,124,16,.12);border:1px solid rgba(16,124,16,.2);color:#107c10;font-weight:700">
  <span>✓</span><span>Admin task completed</span>
</div>
```

## Step kinds (recap)

See [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
for the shared v1 contract.

| Kind | Visual |
|------|--------|
| `tenant_select` | Opens the tenant menu, highlights a new tenant, and updates the header label. |
| `user_create` | Flashes the Add user button, slides in the wizard blade, and types values into the basics form. |
| `policy_assign` | Highlights a policy row, pulses the Assign button, and shows a confirmation pill. |
| `compliance_check` | Counts the compliance score upward and reveals checkmarks beside requirement rows. |
| `pause` | Held beat with no visible change. |
| `pill` | Status badge reveal for a completion or governance outcome. |

## Scene timing

Recommended duration: **9–15 seconds.** Sum the step `data-duration` values
and add **~1.4 seconds** for shell reveal, blade motion, and exit fade. Keep
`user_create` steps at 1.6s or longer so the type-in sequence remains legible.

## Out of scope (v1)

❌ Multi-page wizard navigation · ❌ Deep settings trees · ❌ Real search
results · ❌ Tenant-wide page reloads · ❌ Mouse cursor.
