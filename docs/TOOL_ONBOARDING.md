# Tool Onboarding

> Audience: contributors adding a new tool to Slate.
> Read time: ~5 minutes. Skeleton + verification at the bottom.

---

## 1. Where tools live

```
src/slate/tools/
├── analysis/      ← review / inspection tools
├── audio/         ← TTS, mixing, transcription, probing
├── governance/    ← policy / safety / classification
├── graphics/      ← image generation, structured visuals
├── ingest/        ← document / image / video / web parsing
├── subtitle/      ← caption file generation
└── video/         ← rendering, transcoding, AI video gen
```

**Rules:**
- One tool per file. File name = snake_case of the tool concept.
- Class inherits from `slate.core.base_tool.BaseTool`.
- The class is auto-discovered by `ToolRegistry.discover()` — **no registration call required**, no edit to `__init__.py` needed.
- Pick the directory by capability, not by implementation. (A new "image super-resolve" tool goes in `enhancement/`, not in `graphics/` just because it touches PNGs.)

---

## 2. The minimum viable tool

Copy this and rename:

```python
# src/slate/tools/<category>/my_new_tool.py
from __future__ import annotations
from typing import Any
from slate.core.base_tool import (
    BaseTool, ToolResult, ToolTier, ToolRuntime, ToolStability,
)


class MyNewTool(BaseTool):
    # --- Required contract fields ---
    name = "my_new_tool"           # snake_case; THIS is the registry key
    version = "0.1.0"
    tier = ToolTier.ANALYZE        # see §3 for values
    capability = "One sentence the agent will read when planning."
    provider = "local"             # local / foundry / ffmpeg / hyperframes / epidemic / ...
    runtime = ToolRuntime.LOCAL    # LOCAL / LOCAL_GPU / API / HYBRID
    stability = ToolStability.BETA

    # --- Optional but recommended ---
    fallback_tools: list[str] = []     # names of tools to try if this one fails
    agent_skills: list[str] = []       # skill files agent should read before calling
    compliance_level = "general"       # general / confidential / highly-confidential

    async def execute(self, **kwargs: Any) -> ToolResult:
        # Do the work. Return ToolResult(success=..., output=..., cost_usd=...).
        return ToolResult(success=True, output={"hello": "world"})
```

That's it. The next time the agent runs `python -m slate.preflight`, your tool appears in the menu.

---

## 3. Field guide — what each field means to the agent

| Field | Why the agent cares |
|-------|---------------------|
| `name` | The registry key. **Class name and `name` can differ** (e.g. `IngestArtifacts` → `"ingest_artifacts"`). The agent calls tools by `name`, never by class. |
| `tier` | Coarse routing. Used to group tools in the preflight summary and to pick candidates by intent ("I need an `ANALYZE` tool"). |
| `capability` | The one-line pitch shown to the agent. Write it in plain English, focused on outcomes ("Extract audio metadata"), not on implementation ("Wraps ffprobe"). |
| `provider` | Who runs this. `local` = no external dependency. `foundry` / `ffmpeg` / etc. signals what must be installed/authenticated. |
| `runtime` | `LOCAL` is free. `API` costs money and may fail offline. The agent uses this to estimate cost and offer fallbacks. |
| `stability` | `STABLE` tools win ties. `EXPERIMENTAL` warns the user before use. |
| `fallback_tools` | Ordered list of tool names to try if this one fails. The agent reads these for graceful degradation (e.g. `foundry_video_gen → structured_image`). |
| `agent_skills` | Names of skill files (under `skills/`) the agent must read before calling the tool. Keep focused — only skills that change correctness or prompt quality. |
| `compliance_level` | Governs whether the tool may touch confidential inputs. The agent will skip incompatible tools. |
| `is_available` *(optional)* | A property/attr/method returning `bool`. If you depend on a config file, env var, or external account, expose this so preflight can mark you `unavailable` cleanly instead of crashing at call time. See `tools/analysis/video_indexer.py` for the canonical example. |

---

## 4. Verify with preflight

Before opening a PR, run:

```powershell
python -m slate.preflight --summary
```

**Pass criteria:**
1. Your tool appears under the right tier.
2. The `OK` marker is shown (or `??` if `is_available` returns false in your environment — that's also fine).
3. Tool count went up by exactly 1.
4. The `Warnings:` section does **not** mention your file.

If you want the full structured payload (e.g. to diff against a snapshot in CI):

```powershell
python -m slate.preflight --json-only
```

If preflight reports `Failed to import slate.tools.<category>.<your_tool>: ...`,
fix the import error before anything else — your tool isn't registered yet.

Existing tests must still pass:

```powershell
pytest tests/test_core.py tests/test_governance.py -q
```

---

## 5. Common pitfalls

- **Class name vs `name` attribute.** The registry keys on `name`, not the class. `IngestArtifacts(name="ingest_artifacts")` is valid and intentional. Pick whichever class name reads best in code; pick whichever `name` reads best in agent traces.
- **Never do network or auth in `__init__`.** The registry instantiates every tool at discovery time. If `__init__` calls Azure / hits a file that may not exist / loads heavy ML weights, preflight will be slow or crash. Defer all of that to `execute()`. If you need config, read it inside `__init__` with `try/except` and store the result; report missing config via `is_available`, not by raising.
- **Abstract subclasses are auto-skipped.** If you build a shared base class (e.g. `_FoundryToolBase`), mark it `ABC` or leave one method abstract — the registry won't try to register it.
- **Don't edit `__init__.py` to "expose" your tool.** Re-exports are filtered out (`__module__` check) so you won't double-register, but it adds noise. The registry walks files directly.
- **One tool per file.** Mixing tools in one file works but defeats discovery hygiene and makes per-module error isolation less precise.
- **`name` collisions silently overwrite.** If two classes use `name = "foo"`, the second one wins. Check preflight output for missing tools after adding a new one.

---

## 6. When you also need a skill

A tool is **how**. A skill is **how to use it well**.

If your tool needs the agent to follow a specific prompting pattern, sequencing, or domain-specific routing rule, add a skill file under `skills/` and reference it in `agent_skills = [...]`. The agent will JIT-load that skill the first time it considers your tool.

Don't dump prompting instructions into `capability` — keep that to one sentence.

---

*Last updated alongside the tool registry refactor (Apr 2026). If anything here drifts from `src/slate/core/base_tool.py` or `src/slate/core/tool_registry.py`, the code wins.*
