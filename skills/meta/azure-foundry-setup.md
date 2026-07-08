# Azure AI Foundry Setup

> **Layer:** Meta — environment provisioning
> **When to load (JIT):** The availability scan reports a missing required
> Azure model deployment, no Foundry resource is reachable, OR the user
> explicitly asks to deploy / configure / inspect Azure AI Foundry resources.
> **When NOT to load:** Routine sessions where models are already healthy.
> Setup language must not appear in the opening turn unless a real gap was
> detected.

This skill covers detection, planning, approval, deployment, and verification
of the Azure AI Foundry models Slate uses (image generation, TTS, video,
transcription) plus the optional Video Indexer ARM resource.

---

## Operating contract

1. Never deploy or modify an Azure resource without an explicit user "yes".
2. Always present a short setup plan (models, costs, resource group) and
   wait for approval before any `az` / REST call that creates or modifies
   resources.
3. Detect first, plan second, deploy third, verify fourth. Skipping detection
   is the most common failure mode — it leads to "deploying" something that
   already exists, or deploying the wrong tier.
4. Map the user's stated video intent to the *minimum* set of models that
   unblocks them. Don't push "deploy everything" by default.
5. Report progress as each step completes. Never silently fail — explain
   what happened and offer the next reasonable option.

---

## Preferred path: Python helper

If `slate.tools.analysis.video_indexer` is available in this workspace, prefer
the Python helpers over raw CLI. They handle az-CLI presence checks,
subscription discovery, model gap detection, plan formatting, and the full
deployment flow.

```python
from slate.tools.analysis.video_indexer import (
    discover_azure_context,
    detect_all_capabilities,
    format_setup_plan,
    run_full_onboarding,
)

# 1. Auto-discover Azure context (subscription, resource group)
context = discover_azure_context()
if context["error"] == "not_logged_in":
    # Guide user: "Run 'az login' in your terminal — I'll wait."
elif context["error"] == "az_cli_not_installed":
    # Guide user: "Install Azure CLI first: https://aka.ms/installazurecli"

# 2. Detect what's deployed and what's missing
report = await detect_all_capabilities(context["subscription_id"])

# 3. Present human-readable plan for approval
plan_text = format_setup_plan(report)
# Show plan_text to user, WAIT for approval

# 4. After approval, run everything automatically
# IMPORTANT: pass ai_resource_name so config is persisted for next session
result = await run_full_onboarding(
    subscription_id=context["subscription_id"],
    resource_group=context["resource_group"],
    include_video_indexer=True,  # or False if user opts out
    ai_resource_name=report.get("ai_services_resource"),
)
# On success, config/azure.local.yaml is automatically populated.
# The next session will find all resources pre-configured.
```

If the helper module is missing or fails, fall back to the manual CLI path
below.

---

## Fallback: manual CLI flow

### Step 1 — Detect current capabilities

```bash
# Check AI Services model deployments (image, TTS, video, transcription)
# Use the resource_name and resource_group from config/azure.yaml
az cognitiveservices account deployment list \
  --name <resource-name> \
  --resource-group <resource-group> \
  -o table

# Check for Video Indexer account (separate ARM resource)
az resource list \
  --resource-group <resource-group> \
  --resource-type Microsoft.VideoIndexer/accounts \
  -o table
```

If no Azure AI resource exists at all, create one first:

```bash
az cognitiveservices account create \
  --name <resource-name> \
  --resource-group <rg> \
  --kind AIServices --sku S0 \
  --location eastus2
```

### Step 2 — Map video intent → required models

| Video Type | Required Models | What They Do |
|------------|----------------|--------------|
| **Basic slideshow** (text + images) | `gpt-image-2` + `gpt-4o-mini-tts` + `gpt-4o-transcribe` | Images + narration + subtitles |
| **Professional explainer** (with people) | `gpt-image-2` + `gpt-4o-mini-tts` + `gpt-4o-transcribe` | Photorealistic images + narration |
| **Product/environment demo** | `gpt-image-2` + `gpt-4o-mini-tts` + `gpt-4o-transcribe` | Images + narration + subtitles |
| **AI video clips** (motion) | `sora` + `gpt-4o-mini-tts` + `gpt-4o-transcribe` | AI-generated video + narration + subtitles |
| **Full capability** | All models + Video Indexer | Covers every scene type + deep review |

- **Narration defaults to Azure AI Speech** (neural HD, 700+ voices, real
  word-timings) — **no model deployment needed** (it's part of the AI Services
  resource; just verify reachability via a voices/list call). `gpt-4o-mini-tts`
  is an optional 6-voice fallback deployment.
- **Minimum viable:** `gpt-image-2` + Azure AI Speech (built-in) + `gpt-4o-transcribe`
- **Recommended:** `gpt-image-2` + Azure AI Speech (built-in) + `gpt-4o-transcribe` (+ optional `gpt-4o-mini-tts` fallback)
- **Full setup:** All models + Video Indexer

> **Video Indexer** is a separate ARM resource (`Microsoft.VideoIndexer/accounts`),
> NOT a model deployment on the AIServices resource. It provides deep video
> analysis (OCR, transcript, scene detection, content moderation) for the P6
> self-review rubric. Optional — videos can be produced without it; caption
> accuracy and content safety scoring fall back to heuristics.

### Step 3 — Present the deployment plan

Show a short, numbered plan with cost estimates. Example:

```
📋 Slate Setup Plan

To create professional explainer videos, I need to deploy:

1. gpt-image-2    → Image generation (all content types)
   Cost: ~$0.04/image | Deployment: Free (pay-per-use)

2. Azure AI Speech → Voice narration (DEFAULT — 700+ neural HD voices,
   real word-level timings). No deployment needed (built into the AI Services
   resource). gpt-4o-mini-tts is an optional 6-voice fallback.
   Cost: ~$16/1M chars | Deployment: none (pay-per-use)

3. gpt-4o-transcribe → Speech-to-text with word-level timestamps (subtitles)
   Cost: ~$0.006/minute | Deployment: Free (pay-per-use)

Resource: <resource-name> (<location>)
Total deployment cost: $0 (pay only for usage)
Estimated cost per 60s video: ~$0.25-0.50

Shall I proceed with these deployments?
```

### Step 4 — Wait for explicit approval

**MANDATORY**: Do NOT deploy until the user says "yes", "go ahead",
"proceed", or similar. If the user says "no" or asks questions, answer
them and re-present if needed.

### Step 5 — Deploy models

**OpenAI models** (gpt-image-2, gpt-4o-mini-tts, gpt-4o-transcribe, sora):

> The Azure CLI `az cognitiveservices account deployment create` does NOT
> support `GlobalStandard` as a `--scale-type` value. Use the REST API for
> GlobalStandard deployments:

```bash
TOKEN=$(az account get-access-token --resource https://management.azure.com --query accessToken -o tsv)
SUB_ID="<subscription-id>"

curl -X PUT \
  "https://management.azure.com/subscriptions/$SUB_ID/resourceGroups/<resource-group>/providers/Microsoft.CognitiveServices/accounts/<resource-name>/deployments/<deployment-name>?api-version=2024-10-01" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sku":{"name":"GlobalStandard","capacity":1},"properties":{"model":{"format":"OpenAI","name":"<model-name>","version":"<version>"}}}'
```

| Deployment Name | Model Name | Model Version | SKU |
|----------------|------------|---------------|-----|
| `gpt-image-2` | gpt-image-2 | (latest) | GlobalStandard |
| `gpt-4o-mini-tts` *(optional fallback)* | gpt-4o-mini-tts | (latest) | GlobalStandard |
| `gpt-4o-transcribe` | gpt-4o-transcribe | 2025-03-20 | GlobalStandard |
| `sora` | sora | (latest) | GlobalStandard |

**Video Indexer** (only if user wants deep review):

```bash
az resource create \
  --resource-group <resource-group> \
  --name slate-video-indexer \
  --resource-type Microsoft.VideoIndexer/accounts \
  --location <location> \
  --properties '{"accountId": null}' \
  --is-full-object false

# Get the account ID and update config/azure.local.yaml:
az resource show \
  --resource-group <resource-group> \
  --name slate-video-indexer \
  --resource-type Microsoft.VideoIndexer/accounts \
  --query "properties.accountId" -o tsv
```

Update `config/azure.local.yaml` under `video_indexer` with the `account_id`.
Cost: $0.09/min (Standard Video) or $0.15/min (Advanced Video). 2,400
free trial minutes available.

### Step 6 — Verify each deployment

```bash
# Check model deployment exists
az cognitiveservices account deployment show \
  --name <resource-name> \
  --resource-group <resource-group> \
  --deployment-name <name> \
  -o table

# Check Video Indexer account (if deployed)
az resource show \
  --resource-group <resource-group> \
  --name slate-video-indexer \
  --resource-type Microsoft.VideoIndexer/accounts \
  --query "{name:name, state:properties.provisioningState, accountId:properties.accountId}" \
  -o table
```

Only proceed to video production after ALL required models are confirmed
working. Then return control to whichever production loop / director was
active when this skill was loaded.
