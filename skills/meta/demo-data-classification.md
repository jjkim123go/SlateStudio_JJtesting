# Demo-Data Classification

> **Tier:** Layer 2 (Slate-specific) · meta · governance
> **When to load:** any pipeline stage that touches an SCF whose `outputProfile.deliveryProfile` is `external`, `executive`, or `regulated`. The compose director MUST run the classifier before render. The publish director MUST refuse to publish if any high-severity finding has `waiverPresent: false`.

---

## Why this skill exists

Slate is an authoring tool — a video author can paste real customer names, real tenant ids, real email addresses into an SCF and the renderer will obediently bake them into a video. For internal-only audiences that's fine. For an external talk, an exec briefing, or a regulated-industry deliverable that frame is now a confidentiality incident.

The `demo_data_classifier` tool (`src/slate/tools/governance/demo_data_classifier.py`) is a **read-only static scanner** that walks an SCF JSON document, inspects every string field on every scene, and returns findings the author must fix or explicitly waive.

In **PR 5** the classifier is **warn-only**: it runs, it logs, it does not block. In **PR 9** it becomes a publish gate for the three "outside the building" delivery profiles.

---

## Detection classes (and why each one)

| Class | Severity | What it matches | Why |
|-------|----------|-----------------|-----|
| `email`        | high   | RFC-5322-lite local-part `@` domain | Real email addresses are personally identifiable. Skipped if domain is in the example/synthetic allowlist. |
| `phone`        | high   | E.164 (`+CC ...`) and common US/intl shapes ≥ 7 digits | Real phone numbers are PII. Authors should use the **+1-555-0100..0199** range — RFC 3550 / ITU-T E.164 reserves this range explicitly for fictional use, and US film/TV "555" prefixes have been industry standard for the same reason. |
| `guid`         | high   | RFC 4122 8-4-4-4-12 hex | Tenant ids, subscription ids, object ids in Microsoft Entra/Azure all share this shape; the classifier cannot tell which kind, so it warns on all of them. **Exception:** the all-zero `00000000-0000-0000-0000-000000000000` and all-ones GUIDs are explicitly safe placeholders, used throughout Microsoft Learn samples. |
| `tenant_url`   | high   | URLs whose host matches Microsoft customer-tenant patterns (`*.onmicrosoft.com`, `*.sharepoint.com`, `*.crm.dynamics.com`, `*.azurewebsites.net`, `*.vault.azure.net`, `*.servicebus.windows.net`, `*.{blob,table}.core.windows.net`, `*.database.windows.net`) | Tenant-named URLs uniquely identify a customer organisation. |
| `secret_like`  | high   | Mixed alphanumeric token ≥ 32 chars with at least one digit AND one letter | API keys, SAS tokens, connection-string secrets all share this shape. Heuristic; expect false positives on long random ids and accept them as the cost of catching real secrets. |
| `org_name`     | medium | Capitalised bigram NOT in the synthetic-org allowlist, when surrounded within ±24 chars by an org-signal noun (`inc`, `corp`, `llc`, `ltd`, `gmbh`, `company`, `tenant`, `customer`, `client`, `account`, `org`) | Catches "Acme Corporation" without flooding on every "United States". The org-signal window is what keeps recall manageable. |

**Out of scope (deliberate):**
- Person-name detection. Without an org-specific personnel directory, capitalised-bigram heuristics throw too many false positives ("Power BI", "Bing Maps", proper nouns in narration). A future PR can add an opt-in person-name pass driven by a customer-supplied allowlist.
- Address detection, IP-address detection, IBAN/credit-card detection — none have appeared as failure modes in Slate's authoring corpus to date. Add them when a real example demands it; the architecture is open-closed.

---

## Synthetic-content allowlist

The allowlist is a list of org names that are publicly documented as Microsoft's official sample content. They have appeared across documentation, sample databases (AdventureWorks, WideWorldImporters), and learn.microsoft.com tutorials for 15+ years. Authors can use them freely.

```
Contoso · Fabrikam · Northwind · Adventure Works · Tailspin Toys ·
Wide World Importers · Litware · Proseware · Wingtip Toys · Trey Research ·
Lucerne Publishing · Consolidated Messenger · Graphic Design Institute ·
School of Fine Art · VanArsdel
```

Email-domain allowlist (from RFC 2606 reserved + the synthetic orgs):

```
example.com · example.org · example.net · test.com ·
contoso.com · fabrikam.com · northwind.com · adventureworks.com ·
tailspintoys.com · wideworldimporters.com · litware.com · proseware.com
```

Authors can extend per scan via the `extra_org_allowlist` and `extra_domain_allowlist` execute() kwargs — useful when an org wants to whitelist a documented partner name.

---

## Output schema

```json
{
  "summary": {
    "totalFindings": 8,
    "byClass":    { "email": 1, "guid": 2, "phone": 2, "tenant_url": 1, "org_name": 1, "secret_like": 1 },
    "bySeverity": { "high": 7, "medium": 1 },
    "waiveredFindings": 3,
    "highSeverityUnwaivered": 5
  },
  "findings": [
    {
      "class": "email",
      "severity": "high",
      "match": "alice.smith@acme-corporation.com",
      "scenePath": "/scenes/0/props/events/0/actor",
      "suggestion": "Replace with an allowlisted synthetic domain ...",
      "waiverPresent": false
    }
  ],
  "scanned": {
    "scfPath": "tests/qa-scenarios/...",
    "sceneCount": 3,
    "stringFieldsScanned": 17,
    "deliveryProfile": "external"
  }
}
```

`scenePath` is a **JSON-Pointer-style path** rooted at the SCF document. The path `/scenes/2/props/note` points at `scf.scenes[2].props.note`. Use it to drive the fixer / preview UI.

---

## How to waive a finding

If the SCF deliberately includes an identifier that the classifier flagged but the author has authority to publish anyway (e.g. an illustrative real customer logo with permission), add an `_demoDataWaiver` block to the scene:

```json
{
  "id": "scene-3",
  "duration": 6,
  "_demoDataWaiver": {
    "reason": "Approved customer reference — see contract #1234 in vault://approvals",
    "approvedBy": "ajohnson",
    "timestamp": "2026-04-18T10:14:00Z"
  },
  "component": "CustomerStory",
  "props": { ... }
}
```

The classifier marks every finding inside that scene as `"waiverPresent": true`. PR 9's publish gate accepts waivered findings; PR 5 logs them either way.

---

## Calling the tool

```python
from slate.tools.governance.demo_data_classifier import DemoDataClassifier

result = await DemoDataClassifier().execute(scf_path="renders/q3-launch.scf.json")
if result.success and result.output["summary"]["highSeverityUnwaivered"] > 0:
    print("Cannot publish to external audience — fix or waive the findings above.")
```

Or pass an in-memory SCF doc:

```python
result = await DemoDataClassifier().execute(scf_doc=scf_dict)
```

---

## Pipeline integration

| Stage         | Behaviour                                                          |
|---------------|---------------------------------------------------------------------|
| `script`      | Skip — narration text alone is hard to attribute to scenes.          |
| `scene_plan`  | Run as soon as scenes have ids and props; surface findings to author.|
| `compose`     | Re-run after asset generation (which can introduce caption text).    |
| `review`      | MUST run; block on `highSeverityUnwaivered > 0` for `external`/`executive`/`regulated` profiles in PR 9. |
| `publish`     | MUST re-run on the final SCF; log the full report alongside the render audit-trail JSON. |

---

## Provenance

This skill draws conventions from established sources. Specific rules and what they came from:

- **Synthetic-org allowlist**: Microsoft's own documentation ecosystem. Contoso, Fabrikam, Northwind have appeared on Microsoft Learn, in AdventureWorks / WideWorldImporters sample databases, and across MSDN tutorials since the 2000s. Curated from `learn.microsoft.com`'s "sample data" guidance and the long-standing AdventureWorks / WWI lineage.
- **Email-domain allowlist**: RFC 2606 (1999) reserves `example.com`, `example.org`, `example.net`, and `test.com` for documentation use. We add the synthetic-org ".com" forms because Microsoft samples consistently use them.
- **Reserved fictional phone range**: ITU-T E.164 administration permits country authorities to reserve numbering ranges for fictional use; US Telecom uses `555-0100` through `555-0199` (NPA Code 999 / Bellcore guidance). North American film/TV has used "555" since the 1960s for the same reason.
- **Tenant-URL host list**: Drawn from public Microsoft architectural diagrams and the Microsoft Trust Center's documentation of which hosts uniquely identify a tenant. Specific hosts (`*.onmicrosoft.com`, `*.sharepoint.com`) are documented at `learn.microsoft.com/microsoftteams/manage-your-domain` and the Azure Storage / Key Vault DNS reference.
- **Detection-class taxonomy and confidence model**: The "regex + context window + confidence + allowlist" pattern is the canonical structure used by **Microsoft Presidio** (open-source PII detector, MIT, github.com/microsoft/presidio) and **Azure AI Language PII detection** (`learn.microsoft.com/azure/ai-services/language-service/personally-identifiable-information/overview`). Slate's classifier is a much smaller, SCF-aware subset — it does not replace Presidio for general PII work, but it understands SCF structure (JSON-Pointer paths, scene-level waivers, deliveryProfile gating) which Presidio does not.
- **All-zero / all-ones GUID safe placeholders**: Convention used throughout Microsoft Learn samples and Azure CLI documentation; treating them as identifying values would defeat their documented purpose.
- **Warn-only-then-block rollout**: Standard pattern from compliance tooling (e.g. ESLint's `warn → error` migration path, GitHub Advanced Security's audit-mode-then-blocking rollout). PR 5 ships warn-only; PR 9 promotes to blocking after the corpus has been observed in the wild.

What this skill is NOT based on: regex libraries copy-pasted from Stack Overflow, fictional org names ("Acme", "Globex") which are common-enough in the wild that they are NOT safe assumptions of "this is a placeholder".
