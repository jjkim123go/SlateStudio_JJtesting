"""DemoDataClassifier — Heuristic scanner for non-synthetic identifiers in SCF.

Inspects an SCF JSON document (and any string-typed prop on any scene) for
patterns that look like real customer data and would be unsafe to publish in
a demo or external-audience video. Findings are returned with severity and
a JSON-Pointer-style scene path so authors can fix or waive each one.

Scope (PR 5):
    Detection classes returned:
      - email          (RFC 5322-lite local@domain pattern)
      - phone          (E.164 and common US/intl formats; min 7 digits)
      - guid           (8-4-4-4-12 hex; UUID v1-5)
      - tenant_url     (URLs with a tenant-looking subdomain or query param)
      - org_name       (organization names NOT in the synthetic allowlist)
      - secret_like    (long base64/hex tokens that smell like API keys)

    Person-name detection is INTENTIONALLY OUT OF SCOPE here. Detecting real
    names without a curated personnel directory generates too many false
    positives; a future PR can add an opt-in pass driven by the consuming org.

PR 5 treats every finding as a WARNING. PR 9 hard-blocks external,
executive, and regulated deliveryProfiles unless every high-severity finding
has an `_demoDataWaiver` on its scene. The gate runs on the RAW SCF before
compile; there is no post-compile masking pass.

Provenance / Why these patterns:
    - Synthetic-org allowlist is Microsoft's documented sample-content set
      (Contoso, Fabrikam, Northwind, Adventure Works, Tailspin Toys, Wide
      World Importers, Litware, Proseware). See `learn.microsoft.com` "sample
      data" guidance and the long-running "Northwind / Contoso" lineage in
      AdventureWorks / WWI sample databases.
    - Tenant-URL regex targets the `*.onmicrosoft.com`, `*.sharepoint.com`,
      `*.crm.dynamics.com` and Azure tenant-id (GUID in path) shapes that
      Microsoft Trust Center docs flag as "customer identifying".
    - Email / phone / GUID regexes are intentionally permissive to err on the
      side of warning rather than missing real PII; final disposition is the
      author's call (P12 — fail forward with transparency).
"""

from __future__ import annotations

import json
import re
from typing import Any

from slate.core.base_tool import (
    BaseTool,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolTier,
)


# --- Synthetic / fictional allowlists (Microsoft sample-content lineage) -----

DEFAULT_ORG_ALLOWLIST: set[str] = {
    "contoso",
    "fabrikam",
    "northwind",
    "adventure works",
    "adventureworks",
    "tailspin toys",
    "tailspin",
    "wide world importers",
    "wideworldimporters",
    "litware",
    "proseware",
    "wingtip toys",
    "wingtip",
    "trey research",
    "lucerne publishing",
    "consolidated messenger",
    "graphic design institute",
    "school of fine art",
    "vanarsdel",
}

# Domains that are unambiguously example/test domains (RFC 2606 + sample).
DEFAULT_DOMAIN_ALLOWLIST: set[str] = {
    "example.com",
    "example.org",
    "example.net",
    "test.com",
    "contoso.com",
    "fabrikam.com",
    "northwind.com",
    "adventureworks.com",
    "tailspintoys.com",
    "wideworldimporters.com",
    "litware.com",
    "proseware.com",
}


# Documented "safe" placeholder IDs — Microsoft examples use the all-zero GUID
# as the canonical "fill in your tenant id here" value, so the classifier
# should NOT flag it as a real id.
DEFAULT_SAFE_GUIDS: set[str] = {
    "00000000-0000-0000-0000-000000000000",
    "11111111-1111-1111-1111-111111111111",
}


# --- Pattern catalog ---------------------------------------------------------

# Email — local-part (allows dots, plus, hyphen, underscore) @ domain.tld
_EMAIL_RE = re.compile(
    r"\b[A-Za-z0-9._%+\-]+@([A-Za-z0-9.\-]+\.[A-Za-z]{2,})\b"
)

# E.164 (+1-555-...) and common US/intl phone shapes; min 7 digits to cut noise.
# Avoids matching ISO timestamps (which have colons) by anchoring on a + or
# parenthesis or word boundary digits-with-separators run.
_PHONE_RE = re.compile(
    r"(?:(?<![\w-])\+\d{1,3}[\s\-.]?)?"        # optional +CC
    r"(?:\(\d{2,4}\)[\s\-.]?|\d{2,4}[\s\-.])"   # area code with separator
    r"\d{2,4}[\s\-.]?\d{2,4}"                    # body
    r"(?!\d)"                                     # not followed by another digit
)

# RFC 4122 GUID/UUID 8-4-4-4-12.
_GUID_RE = re.compile(
    r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"
)

# Tenant-looking URLs:
#   *.onmicrosoft.com, *.sharepoint.com, *.crm.dynamics.com,
#   tenant id GUID embedded in path or query (already covered by GUID rule too).
_TENANT_URL_RE = re.compile(
    r"https?://[A-Za-z0-9\-]+\.(?:onmicrosoft\.com|sharepoint\.com|crm\.dynamics\.com|"
    r"servicebus\.windows\.net|table\.core\.windows\.net|blob\.core\.windows\.net|"
    r"vault\.azure\.net|azurewebsites\.net|database\.windows\.net)\S*"
)

# Long opaque tokens (base64-ish, hex-ish, 32+ chars). Heuristic; warns only.
_SECRET_LIKE_RE = re.compile(
    r"(?<![A-Za-z0-9])(?=[A-Za-z]*\d)(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9_\-+/=]{32,}"
)

# Capitalised "Word Word" pairs — used only for org-name lookup, not as a
# standalone person-name detector.
_BIGRAM_RE = re.compile(r"\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)*)\b")


SEVERITY = {
    "email": "high",
    "phone": "high",
    "guid": "high",
    "tenant_url": "high",
    "secret_like": "high",
    "org_name": "medium",
}


def _is_allowlisted_email(email: str, domain_allow: set[str], org_allow: set[str]) -> bool:
    domain = email.rsplit("@", 1)[-1].lower()
    if domain in domain_allow:
        return True
    # contoso.com, fabrikam.io, etc — match the bare org token at start of domain.
    head = domain.split(".", 1)[0]
    return head in org_allow


def _scan_string(text: str, pointer: str, *, org_allow: set[str], domain_allow: set[str]) -> list[dict[str, Any]]:
    """Return findings for a single string field."""
    if not text or not isinstance(text, str):
        return []

    findings: list[dict[str, Any]] = []

    # Email
    for m in _EMAIL_RE.finditer(text):
        match = m.group(0)
        if _is_allowlisted_email(match, domain_allow, org_allow):
            continue
        findings.append({
            "class": "email",
            "severity": SEVERITY["email"],
            "match": match,
            "scenePath": pointer,
            "suggestion": "Replace with an allowlisted synthetic domain "
                          "(e.g. user@contoso.com, user@example.com).",
        })

    # Tenant URL — check before generic phone/secret to claim the substring.
    claimed_spans: list[tuple[int, int]] = []
    for m in _TENANT_URL_RE.finditer(text):
        claimed_spans.append(m.span())
        findings.append({
            "class": "tenant_url",
            "severity": SEVERITY["tenant_url"],
            "match": m.group(0),
            "scenePath": pointer,
            "suggestion": "Use a generic illustrative URL (e.g. "
                          "https://contoso.sharepoint.com/...) or remove the host.",
        })

    # GUID — claim the span so phone/secret_like don't double-flag the digits.
    for m in _GUID_RE.finditer(text):
        if any(s <= m.start() < e for s, e in claimed_spans):
            continue
        match = m.group(0)
        claimed_spans.append(m.span())
        if match.lower() in DEFAULT_SAFE_GUIDS:
            continue
        findings.append({
            "class": "guid",
            "severity": SEVERITY["guid"],
            "match": match,
            "scenePath": pointer,
            "suggestion": "Replace tenant/subscription/object GUIDs with the "
                          "documented sample id `00000000-0000-0000-0000-000000000000` "
                          "or a fictional placeholder.",
        })

    # Phone
    for m in _PHONE_RE.finditer(text):
        if any(s <= m.start() < e for s, e in claimed_spans):
            continue
        digits = re.sub(r"\D", "", m.group(0))
        if len(digits) < 7:
            continue
        # Skip pure year/timestamp shapes embedded in the catch-all phone regex.
        if 1900 <= int(digits[:4]) <= 2100 and len(digits) <= 8:
            continue
        findings.append({
            "class": "phone",
            "severity": SEVERITY["phone"],
            "match": m.group(0).strip(),
            "scenePath": pointer,
            "suggestion": "Use the documented +1-555 reserved range "
                          "(e.g. +1-555-0100 to +1-555-0199) for fictional numbers.",
        })

    # Secret-like token — only flag if it's not adjacent to a known prefix
    # like 'corr-' or 'evt-' which are short anyway and won't trip 32+.
    for m in _SECRET_LIKE_RE.finditer(text):
        if any(s <= m.start() < e for s, e in claimed_spans):
            continue
        findings.append({
            "class": "secret_like",
            "severity": SEVERITY["secret_like"],
            "match": m.group(0)[:8] + "…(redacted)",
            "scenePath": pointer,
            "suggestion": "Long opaque tokens read as production credentials. "
                          "Replace with `<API_KEY>` placeholder text.",
        })

    # Organisation name — capitalised bigrams not in the allowlist.
    seen_orgs: set[str] = set()
    for m in _BIGRAM_RE.finditer(text):
        phrase = m.group(0)
        lowered = phrase.lower()
        if lowered in seen_orgs:
            continue
        # Allow if the lowercased phrase or its leading token is allowlisted.
        head_token = lowered.split(" ", 1)[0]
        if lowered in org_allow or head_token in org_allow:
            continue
        # Heuristic gate: must look like an org reference (preceded/followed
        # by a corporate noun).
        window_start = max(0, m.start() - 24)
        window_end = min(len(text), m.end() + 24)
        window = text[window_start:window_end].lower()
        org_signals = (
            "inc", "corp", "llc", "ltd", "gmbh", "company",
            "tenant", "customer", "client", "account", "org",
        )
        if not any(sig in window for sig in org_signals):
            continue
        seen_orgs.add(lowered)
        findings.append({
            "class": "org_name",
            "severity": SEVERITY["org_name"],
            "match": phrase,
            "scenePath": pointer,
            "suggestion": "Use a Microsoft synthetic org name "
                          "(Contoso, Fabrikam, Northwind, Adventure Works, "
                          "Tailspin Toys, Wide World Importers, Litware, Proseware).",
        })

    return findings


def _walk(node: Any, pointer: str, *, fields_seen: list[int],
          org_allow: set[str], domain_allow: set[str]) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    if isinstance(node, str):
        fields_seen[0] += 1
        findings.extend(_scan_string(node, pointer, org_allow=org_allow, domain_allow=domain_allow))
    elif isinstance(node, list):
        for i, item in enumerate(node):
            findings.extend(_walk(item, f"{pointer}/{i}", fields_seen=fields_seen,
                                  org_allow=org_allow, domain_allow=domain_allow))
    elif isinstance(node, dict):
        for k, v in node.items():
            findings.extend(_walk(v, f"{pointer}/{k}", fields_seen=fields_seen,
                                  org_allow=org_allow, domain_allow=domain_allow))
    return findings


class DemoDataClassifier(BaseTool):
    """Scan an SCF JSON for strings that look like real customer/PII data."""

    name = "demo_data_classifier"
    agent_skills = ["meta/brand-package-linting"]
    version = "0.1.0"
    tier = ToolTier.ANALYZE
    capability = (
        "Heuristically classify strings inside an SCF as synthetic-safe vs "
        "real-customer-looking, returning JSON-Pointer findings with severity."
    )
    provider = "local"
    runtime = ToolRuntime.LOCAL
    stability = ToolStability.BETA

    input_schema = {
        "type": "object",
        "properties": {
            "scf_path": {"type": "string", "description": "Path to .scf.json file"},
            "scf_doc": {"type": "object", "description": "Already-parsed SCF document (overrides scf_path)"},
            "extra_org_allowlist": {
                "type": "array", "items": {"type": "string"},
                "description": "Additional fictional org names to treat as safe."
            },
            "extra_domain_allowlist": {
                "type": "array", "items": {"type": "string"},
                "description": "Additional email domains to treat as safe."
            },
        },
    }
    output_schema = {
        "type": "object",
        "properties": {
            "summary": {"type": "object"},
            "findings": {"type": "array"},
            "scanned": {"type": "object"},
        },
    }
    compliance_level = "general"
    data_residency = "in-tenant"

    async def execute(self, **kwargs: Any) -> ToolResult:
        scf_doc = kwargs.get("scf_doc")
        scf_path = kwargs.get("scf_path")

        if scf_doc is None:
            if not scf_path:
                return ToolResult(success=False, error="Provide scf_doc or scf_path")
            try:
                with open(scf_path, encoding="utf-8") as f:
                    scf_doc = json.load(f)
            except (OSError, json.JSONDecodeError) as exc:
                return ToolResult(success=False, error=f"Failed to load SCF: {exc}")

        result = scan_scf(
            scf_doc,
            extra_org_allowlist=kwargs.get("extra_org_allowlist"),
            extra_domain_allowlist=kwargs.get("extra_domain_allowlist"),
        )
        result["scanned"]["scfPath"] = scf_path

        return ToolResult(
            success=True,
            output=result,
            cost_usd=0.0,
            metadata={"tool": "demo_data_classifier", "version": self.version},
        )


def _scene_index_from_pointer(pointer: str) -> int | None:
    # "/scenes/3/props/..." -> 3
    if not pointer.startswith("/scenes/"):
        return None
    parts = pointer.split("/", 3)
    if len(parts) < 3:
        return None
    try:
        return int(parts[2])
    except ValueError:
        return None


def scan_scf(scf_doc: dict, *, extra_org_allowlist: list[str] | None = None,
             extra_domain_allowlist: list[str] | None = None) -> dict:
    """Synchronous scan entry-point for CLI and subprocess callers.

    Returns the same ``{summary, findings, scanned}`` dict that the async
    ``execute()`` method places inside ``ToolResult.output``.
    """
    org_allow = set(DEFAULT_ORG_ALLOWLIST)
    org_allow.update(s.lower() for s in (extra_org_allowlist or []))
    domain_allow = set(DEFAULT_DOMAIN_ALLOWLIST)
    domain_allow.update(s.lower() for s in (extra_domain_allowlist or []))

    fields_seen = [0]
    findings = _walk(scf_doc, "", fields_seen=fields_seen,
                     org_allow=org_allow, domain_allow=domain_allow)

    waivered_scenes: set[int] = set()
    scenes = scf_doc.get("scenes") or []
    for i, scene in enumerate(scenes):
        if isinstance(scene, dict) and scene.get("_demoDataWaiver"):
            waivered_scenes.add(i)

    for f in findings:
        scene_idx = _scene_index_from_pointer(f["scenePath"])
        f["waiverPresent"] = scene_idx in waivered_scenes

    by_class: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    waivered = 0
    for f in findings:
        by_class[f["class"]] = by_class.get(f["class"], 0) + 1
        by_severity[f["severity"]] = by_severity.get(f["severity"], 0) + 1
        if f["waiverPresent"]:
            waivered += 1

    summary = {
        "totalFindings": len(findings),
        "byClass": by_class,
        "bySeverity": by_severity,
        "waiveredFindings": waivered,
        "highSeverityUnwaivered": sum(
            1 for f in findings if f["severity"] == "high" and not f["waiverPresent"]
        ),
    }

    scanned = {
        "scfPath": None,
        "sceneCount": len(scenes),
        "stringFieldsScanned": fields_seen[0],
        "deliveryProfile": (scf_doc.get("outputProfile") or {}).get("deliveryProfile", "internal"),
    }

    return {"summary": summary, "findings": findings, "scanned": scanned}


if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Slate demo-data classifier")
    parser.add_argument("scf_path", help="Path to SCF JSON file to scan")
    args = parser.parse_args()

    with open(args.scf_path, "r", encoding="utf-8") as f:
        scf = json.load(f)

    result = scan_scf(scf)
    result["scanned"]["scfPath"] = args.scf_path
    json.dump(result, sys.stdout, indent=2)
    sys.exit(0)
