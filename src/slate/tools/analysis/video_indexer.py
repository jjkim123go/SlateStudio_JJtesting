"""VideoIndexer — Azure AI Video Indexer integration for deep video review.

Uploads rendered videos to Azure AI Video Indexer and retrieves structured
insights (OCR, transcript, scenes, audio effects, content moderation) that
feed into the P6 self-review rubric for real quality scoring.

This tool is opt-in ("deep review") and augments — never replaces — the
local FFmpeg-based inspection in video_inspect.py.

Architecture:
    - Provisioning (account creation) is handled ONLY during onboarding,
      not at review time.
    - Runtime analysis assumes a VI account already exists and is configured.
    - Access tokens are refreshed automatically (1-hour expiry).
    - Results are cached by video file hash to avoid re-indexing identical MP4s.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import subprocess
import time
from pathlib import Path
from typing import Any

import httpx

from slate.core.base_tool import (
    BaseTool,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolTier,
)

from slate.core.azure_config import azure_config as _az_cfg

logger = logging.getLogger(__name__)

# VI API base (ARM-based accounts use region-specific endpoints)
_VI_API_BASE = "https://api.videoindexer.ai"
_ARM_API_VERSION = "2025-04-01"
_ARM_BASE = "https://management.azure.com"

# Default polling config
_POLL_INTERVAL_SEC = 15
_POLL_MAX_WAIT_SEC = 600  # 10 minutes max for indexing
_TOKEN_LIFETIME_SEC = 3500  # Refresh before 1-hour expiry


class VideoIndexerConfig:
    """Configuration bundle for a Video Indexer account.

    Loaded from config/models.yaml under analysis_services.video-indexer,
    or constructed manually for tests.
    """

    def __init__(
        self,
        account_id: str = "",
        account_name: str = "",
        resource_group: str | None = None,
        subscription_id: str = "",
        location: str | None = None,
        cost_per_minute: float = 0.09,
    ):
        self.account_id = account_id
        self.account_name = account_name
        self.resource_group = resource_group or _az_cfg.resource_group
        self.subscription_id = subscription_id
        self.location = location or _az_cfg.location
        self.cost_per_minute = cost_per_minute

    @classmethod
    def from_yaml(cls, config_path: str | Path | None = None) -> VideoIndexerConfig | None:
        """Load VI config from models.yaml if present."""
        try:
            import yaml
        except ImportError:
            return None

        if config_path is None:
            # video_indexer.py → analysis → tools → slate → src → <repo root>
            config_path = (
                Path(__file__).resolve().parents[4] / "config" / "models.yaml"
            )
        config_path = Path(config_path)
        if not config_path.exists():
            return None

        with open(config_path, encoding="utf-8") as f:
            reg = yaml.safe_load(f) or {}

        vi = reg.get("analysis_services", {}).get("video-indexer")
        if not vi:
            return None

        return cls(
            account_id=vi.get("account_id", "") or _az_cfg.vi_account_id,
            account_name=vi.get("account_name", "") or _az_cfg.vi_account_name,
            resource_group=vi.get("resource_group", "") or _az_cfg.resource_group,
            subscription_id=vi.get("subscription_id", "") or _az_cfg.subscription_id,
            location=vi.get("location", "") or _az_cfg.location,
            cost_per_minute=vi.get("cost_per_minute", 0.09),
        )

    @property
    def is_configured(self) -> bool:
        return bool(
            self.account_id
            and self.account_name
            and self.location
            and self.resource_group
            and self.subscription_id
        )


def _file_hash(path: str, block_size: int = 65536) -> str:
    """SHA-256 hash of a file (for cache keying)."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(block_size), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def _get_arm_token() -> str | None:
    """Get ARM bearer token via Azure CLI."""
    try:
        result = subprocess.run(
            ["az", "account", "get-access-token", "--resource",
             "https://management.azure.com", "-o", "json"],
            capture_output=True, text=True, shell=True, timeout=30,
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return data.get("accessToken")
    except Exception as e:
        logger.warning("Failed to get ARM token: %s", e)
    return None


class _TokenCache:
    """Manages VI access token with auto-refresh."""

    def __init__(self):
        self._token: str | None = None
        self._expires_at: float = 0

    @property
    def is_valid(self) -> bool:
        return self._token is not None and time.time() < self._expires_at

    def set(self, token: str):
        self._token = token
        self._expires_at = time.time() + _TOKEN_LIFETIME_SEC

    def get(self) -> str | None:
        return self._token if self.is_valid else None

    def clear(self):
        self._token = None
        self._expires_at = 0


class VideoIndexer(BaseTool):
    """Azure AI Video Indexer — deep video analysis for the P6 reviewer.

    Uploads rendered MP4 to Video Indexer, polls for completion, returns
    structured insights including OCR, transcript, scenes, audio effects,
    and content moderation results.

    This tool is designed for final/deep review only — not every render pass.
    Results are cached by file hash to avoid re-indexing identical videos.
    """

    name = "video_indexer"
    agent_skills = ["core/video-indexer-review"]
    version = "0.1.0"
    tier = ToolTier.ANALYZE
    capability = (
        "Deep video analysis via Azure AI Video Indexer — OCR, transcript, "
        "scene detection, audio effects, content moderation"
    )
    provider = "azure-vi"
    runtime = ToolRuntime.API
    stability = ToolStability.BETA
    compliance_level = "general"
    data_residency = "in-tenant"

    input_schema = {
        "type": "object",
        "properties": {
            "video_path": {"type": "string", "description": "Path to rendered MP4 to analyze"},
            "video_name": {"type": "string", "description": "Friendly name for the indexed video"},
            "wait": {"type": "boolean", "description": "Wait for indexing to complete", "default": True},
        },
        "required": ["video_path"],
    }
    output_schema = {
        "type": "object",
        "properties": {
            "video_id": {"type": "string"},
            "state": {"type": "string"},
            "duration_seconds": {"type": "number"},
            "insights": {
                "type": "object",
                "description": "Structured insights: ocr, transcript, scenes, audio_effects, moderation",
            },
        },
    }
    fallback_tools = ["video_inspect"]
    resource_profile = {
        "requires": "Azure AI Video Indexer account",
        "cost_model": "per-minute-indexed",
    }

    def __init__(self, config: VideoIndexerConfig | None = None):
        self._config = config or VideoIndexerConfig.from_yaml()
        self._token_cache = _TokenCache()
        self._insights_cache: dict[str, dict] = {}  # file_hash -> insights

    @property
    def is_available(self) -> bool:
        """Check if Video Indexer is configured and usable."""
        return self._config is not None and self._config.is_configured

    async def _get_vi_access_token(self) -> str | None:
        """Get a Video Indexer account-level access token via ARM."""
        cached = self._token_cache.get()
        if cached:
            return cached

        if not self._config or not self._config.is_configured:
            return None

        arm_token = _get_arm_token()
        if not arm_token:
            return None

        url = (
            f"{_ARM_BASE}/subscriptions/{self._config.subscription_id}"
            f"/resourceGroups/{self._config.resource_group}"
            f"/providers/Microsoft.VideoIndexer/accounts/{self._config.account_name}"
            f"/generateAccessToken?api-version={_ARM_API_VERSION}"
        )

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                url,
                headers={"Authorization": f"Bearer {arm_token}"},
                json={"permissionType": "Contributor", "scope": "Account"},
            )

        if resp.status_code == 200:
            token = resp.json().get("accessToken")
            if token:
                self._token_cache.set(token)
                return token
            logger.error("VI token response missing accessToken field")
        else:
            logger.error("VI token request failed: %d %s", resp.status_code, resp.text[:200])

        return None

    async def _upload_and_index(
        self, video_path: str, video_name: str, token: str
    ) -> str | None:
        """Upload a video to VI and start indexing. Returns video ID."""
        if not self._config:
            return None

        url = (
            f"{_VI_API_BASE}/{self._config.location}"
            f"/Accounts/{self._config.account_id}"
            f"/Videos?name={video_name}"
            f"&privacy=Private&accessToken={token}"
        )

        file_size = os.path.getsize(video_path)
        logger.info("Uploading %s (%.1f MB) to Video Indexer...", video_name, file_size / 1e6)

        async with httpx.AsyncClient(timeout=600) as client:
            with open(video_path, "rb") as f:
                resp = await client.post(
                    url,
                    files={"file": (video_name, f, "video/mp4")},
                )

        if resp.status_code in (200, 201):
            data = resp.json()
            video_id = data.get("id")
            logger.info("Video uploaded, indexing started. video_id=%s", video_id)
            return video_id
        else:
            logger.error("VI upload failed: %d %s", resp.status_code, resp.text[:300])
            return None

    async def _poll_indexing(self, video_id: str, token: str) -> str:
        """Poll until indexing completes. Returns final state."""
        if not self._config:
            return "error"

        url = (
            f"{_VI_API_BASE}/{self._config.location}"
            f"/Accounts/{self._config.account_id}"
            f"/Videos/{video_id}/Index?accessToken={token}"
        )

        elapsed = 0
        while elapsed < _POLL_MAX_WAIT_SEC:
            await asyncio.sleep(_POLL_INTERVAL_SEC)
            elapsed += _POLL_INTERVAL_SEC

            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(url)

            if resp.status_code != 200:
                logger.warning("VI poll failed: %d", resp.status_code)
                continue

            data = resp.json()
            state = data.get("state", "unknown")
            progress = data.get("processingProgress", "?")
            logger.info("VI indexing: state=%s progress=%s (%.0fs elapsed)", state, progress, elapsed)

            if state == "Processed":
                return "Processed"
            elif state == "Failed":
                return "Failed"

        return "Timeout"

    async def _get_insights(self, video_id: str, token: str) -> dict | None:
        """Retrieve the full insights JSON for an indexed video."""
        if not self._config:
            return None

        url = (
            f"{_VI_API_BASE}/{self._config.location}"
            f"/Accounts/{self._config.account_id}"
            f"/Videos/{video_id}/Index?accessToken={token}"
        )

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url)

        if resp.status_code != 200:
            logger.error("VI get-insights failed: %d", resp.status_code)
            return None

        return resp.json()

    def extract_review_signals(self, raw_insights: dict) -> dict:
        """Extract the signals relevant to P6 self-review from raw VI insights.

        Returns a structured dict with:
            ocr_texts: list of {text, confidence, timestamp}
            transcript_lines: list of {text, start_sec, end_sec, confidence}
            scenes: list of {start_sec, end_sec, keyframe_count}
            audio_effects: list of {type, start_sec, end_sec}
            moderation: {is_adult, is_racy, adult_score, racy_score}
            topics: list of {name, confidence}
            duration_seconds: float
        """
        signals: dict[str, Any] = {
            "ocr_texts": [],
            "transcript_lines": [],
            "scenes": [],
            "audio_effects": [],
            "moderation": {"is_adult": False, "is_racy": False, "adult_score": 0.0, "racy_score": 0.0},
            "topics": [],
            "duration_seconds": 0.0,
        }

        videos = raw_insights.get("videos", [])
        if not videos:
            return signals

        video = videos[0]
        insights = video.get("insights", {})

        # Duration
        dur_str = raw_insights.get("durationInSeconds", 0)
        signals["duration_seconds"] = float(dur_str) if dur_str else 0.0

        # OCR
        for ocr in insights.get("ocr", []):
            text = ocr.get("text", "")
            confidence = ocr.get("confidence", 0.0)
            for instance in ocr.get("instances", []):
                signals["ocr_texts"].append({
                    "text": text,
                    "confidence": confidence,
                    "start_sec": _time_to_sec(instance.get("start", "0:00:00")),
                    "end_sec": _time_to_sec(instance.get("end", "0:00:00")),
                })

        # Transcript
        for block in insights.get("transcript", []):
            text = block.get("text", "")
            confidence = block.get("confidence", 0.0)
            for instance in block.get("instances", []):
                signals["transcript_lines"].append({
                    "text": text,
                    "confidence": confidence,
                    "start_sec": _time_to_sec(instance.get("start", "0:00:00")),
                    "end_sec": _time_to_sec(instance.get("end", "0:00:00")),
                })

        # Scenes
        for scene in insights.get("scenes", []):
            instances = scene.get("instances", [])
            if instances:
                inst = instances[0]
                signals["scenes"].append({
                    "start_sec": _time_to_sec(inst.get("start", "0:00:00")),
                    "end_sec": _time_to_sec(inst.get("end", "0:00:00")),
                    "keyframe_count": len(scene.get("shots", [])),
                })

        # Audio effects
        for effect in insights.get("audioEffects", []):
            etype = effect.get("audioEffectKey", "unknown")
            for instance in effect.get("instances", []):
                signals["audio_effects"].append({
                    "type": etype,
                    "start_sec": _time_to_sec(instance.get("start", "0:00:00")),
                    "end_sec": _time_to_sec(instance.get("end", "0:00:00")),
                })

        # Content moderation
        moderation = insights.get("visualContentModeration", [])
        if moderation:
            adult_scores = [m.get("adultScore", 0) for m in moderation]
            racy_scores = [m.get("racyScore", 0) for m in moderation]
            signals["moderation"] = {
                "is_adult": any(m.get("isAdultContent") for m in moderation),
                "is_racy": any(m.get("isRacyContent") for m in moderation),
                "adult_score": max(adult_scores) if adult_scores else 0.0,
                "racy_score": max(racy_scores) if racy_scores else 0.0,
            }

        # Topics
        for topic in insights.get("topics", []):
            signals["topics"].append({
                "name": topic.get("name", ""),
                "confidence": topic.get("confidence", 0.0),
            })

        return signals

    async def execute(self, **kwargs: Any) -> ToolResult:
        """Upload video to VI, wait for indexing, return structured insights."""
        video_path: str = kwargs["video_path"]
        video_name: str = kwargs.get("video_name", Path(video_path).stem)
        wait: bool = kwargs.get("wait", True)

        if not os.path.isfile(video_path):
            return ToolResult(success=False, error=f"Video not found: {video_path}")

        if not self.is_available:
            return ToolResult(
                success=False,
                error="Video Indexer not configured. Run onboarding to set up the VI account.",
            )

        # Check cache by file hash
        fhash = _file_hash(video_path)
        if fhash in self._insights_cache:
            logger.info("VI cache hit for %s (hash=%s)", video_name, fhash)
            cached = self._insights_cache[fhash]
            return ToolResult(
                success=True,
                output=cached,
                cost_usd=0.0,
                metadata={"video_path": video_path, "cache_hit": True, "file_hash": fhash},
            )

        # Get access token
        token = await self._get_vi_access_token()
        if not token:
            return ToolResult(
                success=False,
                error="Failed to obtain Video Indexer access token. Check Azure CLI auth.",
            )

        # Upload and start indexing
        video_id = await self._upload_and_index(video_path, video_name, token)
        if not video_id:
            return ToolResult(success=False, error="Failed to upload video to Video Indexer")

        if not wait:
            return ToolResult(
                success=True,
                output={"video_id": video_id, "state": "Processing"},
                cost_usd=0.0,
                metadata={"video_path": video_path, "async": True},
            )

        # Poll for completion
        state = await self._poll_indexing(video_id, token)
        if state != "Processed":
            return ToolResult(
                success=False,
                error=f"Video Indexer indexing {state.lower()}",
                metadata={"video_id": video_id, "state": state},
            )

        # Get insights
        raw = await self._get_insights(video_id, token)
        if not raw:
            return ToolResult(
                success=False,
                error="Failed to retrieve insights after indexing",
                metadata={"video_id": video_id},
            )

        # Extract review-relevant signals
        signals = self.extract_review_signals(raw)
        signals["video_id"] = video_id
        signals["state"] = "Processed"

        # Estimate cost (Standard Video: $0.09/min, billed per minute rounded up)
        duration_min = max(1.0, signals["duration_seconds"] / 60.0)
        cost = round(duration_min * (self._config.cost_per_minute if self._config else 0.09), 4)

        # Cache
        self._insights_cache[fhash] = signals

        return ToolResult(
            success=True,
            output=signals,
            cost_usd=cost,
            metadata={
                "video_path": video_path,
                "video_id": video_id,
                "file_hash": fhash,
                "cache_hit": False,
                "indexed_minutes": round(duration_min, 2),
            },
        )


# ── Provisioning helpers (onboarding only — NOT called at review time) ───────

async def check_vi_account(
    subscription_id: str,
    resource_group: str | None = None,
    account_name: str | None = None,
) -> dict | None:
    """Check if a Video Indexer account exists in the resource group.

    Returns account info dict if found, None otherwise.
    Used by the onboarding flow to detect existing VI accounts.
    """
    resource_group = resource_group or _az_cfg.resource_group
    account_name = account_name or _az_cfg.vi_account_name or "slate-video-indexer"
    arm_token = _get_arm_token()
    if not arm_token:
        return None

    url = (
        f"{_ARM_BASE}/subscriptions/{subscription_id}"
        f"/resourceGroups/{resource_group}"
        f"/providers/Microsoft.VideoIndexer/accounts/{account_name}"
        f"?api-version={_ARM_API_VERSION}"
    )

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers={"Authorization": f"Bearer {arm_token}"})

    if resp.status_code == 200:
        data = resp.json()
        return {
            "account_id": data.get("properties", {}).get("accountId", ""),
            "account_name": data.get("name", ""),
            "location": data.get("location", ""),
            "state": data.get("properties", {}).get("provisioningState", ""),
            "resource_id": data.get("id", ""),
        }
    return None


async def provision_vi_account(
    subscription_id: str,
    resource_group: str | None = None,
    account_name: str | None = None,
    location: str | None = None,
    storage_account_name: str = "slatevideostorage",
) -> dict:
    """Create a new Video Indexer account via ARM.

    This is called ONLY during onboarding, after explicit user approval.
    VI requires a linked storage account (Standard StorageV2).
    Returns {success, account_id, error}.
    """
    resource_group = resource_group or _az_cfg.resource_group
    account_name = account_name or _az_cfg.vi_account_name or "slate-video-indexer"
    location = location or _az_cfg.location
    arm_token = _get_arm_token()
    if not arm_token:
        return {"success": False, "error": "No ARM token — run 'az login' first"}

    # Ensure the storage account exists (create if missing)
    storage_resource_id = (
        f"/subscriptions/{subscription_id}"
        f"/resourceGroups/{resource_group}"
        f"/providers/Microsoft.Storage/storageAccounts/{storage_account_name}"
    )
    storage_check_url = f"{_ARM_BASE}{storage_resource_id}?api-version=2023-05-01"
    async with httpx.AsyncClient(timeout=30) as client:
        sr = await client.get(
            storage_check_url,
            headers={"Authorization": f"Bearer {arm_token}"},
        )
    if sr.status_code == 404:
        # Create the storage account
        import subprocess
        proc = subprocess.run(
            ["az", "storage", "account", "create",
             "--name", storage_account_name,
             "--resource-group", resource_group,
             "--location", location,
             "--sku", "Standard_LRS",
             "--kind", "StorageV2",
             "-o", "json"],
            capture_output=True, text=True, shell=True, timeout=120,
        )
        if proc.returncode != 0:
            return {"success": False, "error": f"Storage creation failed: {proc.stderr[:300]}"}

    url = (
        f"{_ARM_BASE}/subscriptions/{subscription_id}"
        f"/resourceGroups/{resource_group}"
        f"/providers/Microsoft.VideoIndexer/accounts/{account_name}"
        f"?api-version={_ARM_API_VERSION}"
    )

    body = {
        "location": location,
        "properties": {
            "accountId": None,  # Let ARM generate
            "storageServices": {
                "resourceId": storage_resource_id,
            },
        },
        "identity": {
            "type": "SystemAssigned",
        },
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.put(
            url,
            headers={
                "Authorization": f"Bearer {arm_token}",
                "Content-Type": "application/json",
            },
            json=body,
        )

    if resp.status_code in (200, 201):
        data = resp.json()
        account_id = data.get("properties", {}).get("accountId", "")
        return {
            "success": True,
            "account_id": account_id,
            "account_name": account_name,
            "location": location,
            "resource_id": data.get("id", ""),
        }
    else:
        return {
            "success": False,
            "error": f"ARM PUT failed: {resp.status_code} — {resp.text[:300]}",
        }


def _assign_vi_storage_role(
    subscription_id: str,
    resource_group: str | None = None,
    account_name: str | None = None,
    storage_account_name: str = "slatevideostorage",
) -> None:
    """Assign Storage Blob Data Contributor to VI's managed identity."""
    import subprocess
    resource_group = resource_group or _az_cfg.resource_group
    account_name = account_name or _az_cfg.vi_account_name or "slate-video-indexer"
    # Get the principal ID from the VI resource
    token = _get_arm_token()
    if not token:
        return
    url = (
        f"{_ARM_BASE}/subscriptions/{subscription_id}"
        f"/resourceGroups/{resource_group}"
        f"/providers/Microsoft.VideoIndexer/accounts/{account_name}"
        f"?api-version={_ARM_API_VERSION}"
    )
    import httpx as _httpx
    resp = _httpx.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    if resp.status_code != 200:
        return
    principal_id = resp.json().get("identity", {}).get("principalId", "")
    if not principal_id:
        return
    storage_scope = (
        f"/subscriptions/{subscription_id}"
        f"/resourceGroups/{resource_group}"
        f"/providers/Microsoft.Storage/storageAccounts/{storage_account_name}"
    )
    subprocess.run(
        ["az", "role", "assignment", "create",
         "--assignee-object-id", principal_id,
         "--assignee-principal-type", "ServicePrincipal",
         "--role", "Storage Blob Data Contributor",
         "--scope", storage_scope],
        capture_output=True, text=True, shell=True, timeout=60,
    )


# ── Utility ──────────────────────────────────────────────────────────────────

def _time_to_sec(time_str: str) -> float:
    """Convert VI time format (H:MM:SS.fff or HH:MM:SS.fff) to seconds."""
    try:
        parts = time_str.split(":")
        if len(parts) == 3:
            h, m, s = parts
            return int(h) * 3600 + int(m) * 60 + float(s)
        elif len(parts) == 2:
            m, s = parts
            return int(m) * 60 + float(s)
        return float(time_str)
    except (ValueError, IndexError):
        return 0.0


# ── Auto-discovery & unified onboarding ──────────────────────────────────────

def discover_azure_context() -> dict:
    """Auto-discover subscription ID and resource group from Azure CLI.

    Returns {subscription_id, subscription_name, resource_group, logged_in, error}.
    This removes the need for non-technical users to know Azure internals.
    """
    result = {
        "subscription_id": "",
        "subscription_name": "",
        "resource_group": _az_cfg.resource_group,
        "logged_in": False,
        "error": None,
    }

    # Check if az CLI is available and user is logged in
    try:
        proc = subprocess.run(
            ["az", "account", "show", "-o", "json"],
            capture_output=True, text=True, shell=True, timeout=15,
        )
        if proc.returncode != 0:
            stderr = proc.stderr.strip()
            if "az login" in stderr or "Please run" in stderr:
                result["error"] = "not_logged_in"
            else:
                result["error"] = f"az_cli_error: {stderr[:200]}"
            return result
    except FileNotFoundError:
        result["error"] = "az_cli_not_installed"
        return result
    except subprocess.TimeoutExpired:
        result["error"] = "az_cli_timeout"
        return result

    try:
        account = json.loads(proc.stdout)
        result["subscription_id"] = account.get("id", "")
        result["subscription_name"] = account.get("name", "")
        result["logged_in"] = True
    except json.JSONDecodeError:
        result["error"] = "az_cli_invalid_json"
        return result

    # Check if our resource group exists
    _rg = result["resource_group"]
    if _rg:
        try:
            rg_proc = subprocess.run(
                ["az", "group", "show", "--name", _rg, "-o", "json"],
                capture_output=True, text=True, shell=True, timeout=15,
            )
            if rg_proc.returncode != 0:
                # Resource group doesn't exist — we'll need to create it
                result["resource_group"] = ""
        except Exception:
            pass

    return result


async def detect_all_capabilities(subscription_id: str, resource_group: str | None = None) -> dict:
    """Detect ALL Slate capabilities in one call — models AND Video Indexer.

    Returns a structured report of what's deployed, what's missing, and
    what the agent should present to the user for approval.

    This is the single entry point for the onboarding flow.
    """
    resource_group = resource_group or _az_cfg.resource_group
    _ai_resource = _az_cfg.resource_name
    _vi_name = _az_cfg.vi_account_name or "slate-video-indexer"

    report = {
        "ai_services_resource": None,
        "deployed_models": [],
        "missing_models": [],
        "video_indexer": None,
        "needs_setup": [],
    }

    # 1. Check AIServices resource and its model deployments
    if _ai_resource:
        try:
            proc = subprocess.run(
                ["az", "cognitiveservices", "account", "deployment", "list",
                 "--name", _ai_resource,
                 "--resource-group", resource_group, "-o", "json"],
                capture_output=True, text=True, shell=True, timeout=30,
            )
            if proc.returncode == 0:
                deployments = json.loads(proc.stdout)
                deployed_names = {d.get("name", "") for d in deployments}
                report["ai_services_resource"] = _ai_resource
                report["deployed_models"] = sorted(deployed_names)

                # Check for expected models
                expected = {"gpt-image-2", "gpt-4o-mini-tts", "gpt-4o-transcribe", "sora"}
                missing = expected - deployed_names
                report["missing_models"] = sorted(missing)
                if missing:
                    report["needs_setup"].append({
                        "type": "model_deployments",
                        "items": sorted(missing),
                        "description": f"{len(missing)} model(s) not yet deployed",
                    })
            else:
                report["ai_services_resource"] = None
                report["needs_setup"].append({
                    "type": "ai_services_resource",
                    "items": [_ai_resource],
                    "description": "Azure AI Services resource not found — needs creation",
                })
        except Exception as e:
            logger.warning("Failed to list model deployments: %s", e)
    else:
        report["needs_setup"].append({
            "type": "ai_services_resource",
            "items": [],
            "description": "No Azure AI Services resource configured — set resource_name in config/azure.yaml",
        })

    # 2. Check Video Indexer account
    vi_info = await check_vi_account(
        subscription_id=subscription_id,
        resource_group=resource_group,
    )
    if vi_info:
        report["video_indexer"] = vi_info
    else:
        report["needs_setup"].append({
            "type": "video_indexer",
            "items": [_vi_name],
            "description": "Video analysis service not set up — needed for deep review (caption accuracy, content moderation)",
            "cost_info": "$0.09/min indexed | 2,400 free trial minutes available",
            "optional": True,
        })

    return report


def format_setup_plan(report: dict) -> str:
    """Format the capability detection report as a human-readable setup plan.

    This is what the agent presents to the user for approval.
    Non-technical language, clear costs, numbered action items.
    """
    lines = ["📋 **Slate Setup Plan**\n"]

    if not report["needs_setup"]:
        lines.append("✅ Everything is already set up! All models deployed and Video Indexer configured.\n")
        return "\n".join(lines)

    lines.append("I need to set up the following to get Slate running:\n")

    item_num = 0
    for setup in report["needs_setup"]:
        stype = setup["type"]
        optional = setup.get("optional", False)

        if stype == "ai_services_resource":
            item_num += 1
            lines.append(f"{item_num}. **Create AI Services resource**")
            lines.append("   Azure AI Services (for image generation, voice narration, video clips)")
            lines.append("   Cost: $0 (pay only when generating content)\n")

        elif stype == "model_deployments":
            for model in setup["items"]:
                item_num += 1
                desc = _MODEL_DESCRIPTIONS.get(model, model)
                cost = _MODEL_COSTS.get(model, "pay-per-use")
                lines.append(f"{item_num}. **{model}** → {desc}")
                lines.append(f"   Cost: {cost} | Deployment: Free\n")

        elif stype == "video_indexer":
            item_num += 1
            tag = " *(optional)*" if optional else ""
            lines.append(f"{item_num}. **Video Analysis Service**{tag}")
            lines.append("   Deep review: checks caption accuracy, content safety, audio quality")
            lines.append(f"   {setup.get('cost_info', '$0.09/min')}\n")

    lines.append("---")
    lines.append(f"**Total items**: {item_num}")
    lines.append("**Deployment cost**: $0 (all pay-per-use)")
    lines.append("")
    lines.append("**Shall I proceed?** (I'll show progress for each step)")

    return "\n".join(lines)


async def run_full_onboarding(
    subscription_id: str,
    resource_group: str | None = None,
    include_video_indexer: bool = True,
    progress_callback: Any = None,
    ai_resource_name: str | None = None,
) -> dict:
    """Execute the full onboarding after user approval.

    Creates missing resources, deploys missing models, provisions VI,
    and writes all discovered Azure identity to config/azure.local.yaml
    so the next session starts fully configured.

    Args:
        subscription_id: Azure subscription ID (auto-discovered)
        resource_group: Target resource group
        include_video_indexer: Whether to set up VI (user can opt out)
        progress_callback: Optional callable(step, status, detail) for live updates
        ai_resource_name: AI Services resource name (from detect_all_capabilities)

    Returns:
        {success, steps_completed, steps_failed, errors, config_updates}
    """
    resource_group = resource_group or _az_cfg.resource_group
    _location = _az_cfg.location or "eastus2"

    result = {
        "success": True,
        "steps_completed": [],
        "steps_failed": [],
        "errors": [],
        "config_updates": {},
    }

    # Stash the AI resource name for config persistence at the end
    if ai_resource_name:
        result["config_updates"]["ai_services_resource"] = ai_resource_name

    def _progress(step: str, status: str, detail: str = ""):
        if progress_callback:
            try:
                progress_callback(step, status, detail)
            except Exception:
                pass
        logger.info("Onboarding [%s] %s: %s", step, status, detail)

    # 1. Ensure resource group exists
    _progress("resource_group", "checking", resource_group)
    try:
        proc = subprocess.run(
            ["az", "group", "show", "--name", resource_group, "-o", "json"],
            capture_output=True, text=True, shell=True, timeout=15,
        )
        if proc.returncode != 0:
            _progress("resource_group", "creating", resource_group)
            proc = subprocess.run(
                ["az", "group", "create", "--name", resource_group,
                 "--location", _location, "-o", "json"],
                capture_output=True, text=True, shell=True, timeout=30,
            )
            if proc.returncode == 0:
                result["steps_completed"].append("resource_group_created")
                _progress("resource_group", "done", f"Created in {_location}")
            else:
                result["steps_failed"].append("resource_group")
                result["errors"].append(f"Failed to create resource group: {proc.stderr[:200]}")
                result["success"] = False
                return result
        else:
            _progress("resource_group", "exists", "Already present")
    except Exception as e:
        result["errors"].append(f"Resource group check failed: {e}")

    # 2. Provision Video Indexer if requested
    if include_video_indexer:
        _progress("video_indexer", "checking", "Looking for existing account...")
        vi_info = await check_vi_account(subscription_id, resource_group)

        if vi_info:
            _progress("video_indexer", "exists", f"account_id={vi_info['account_id']}")
            result["config_updates"]["video_indexer_account_id"] = vi_info["account_id"]
            result["steps_completed"].append("video_indexer_detected")
        else:
            _progress("video_indexer", "creating", "Provisioning Video Indexer account...")
            vi_result = await provision_vi_account(
                subscription_id=subscription_id,
                resource_group=resource_group,
            )
            if vi_result["success"]:
                result["config_updates"]["video_indexer_account_id"] = vi_result["account_id"]
                result["steps_completed"].append("video_indexer_created")
                _progress("video_indexer", "done", f"account_id={vi_result['account_id']}")

                # Assign Storage Blob Data Contributor to VI's managed identity
                _progress("role_assignment", "assigning", "Granting VI storage access...")
                try:
                    _assign_vi_storage_role(
                        subscription_id=subscription_id,
                        resource_group=resource_group,
                    )
                    result["steps_completed"].append("role_assigned")
                    _progress("role_assignment", "done", "Storage Blob Data Contributor assigned")
                except Exception as e:
                    _progress("role_assignment", "warning", f"Non-critical: {e}")

                # Auto-update config/models.yaml
                _update_vi_config(
                    account_id=vi_result["account_id"],
                    subscription_id=subscription_id,
                    resource_group=resource_group,
                )
                result["steps_completed"].append("config_updated")
                _progress("config", "done", "Updated config/azure.local.yaml with VI account details")
            else:
                result["steps_failed"].append("video_indexer")
                result["errors"].append(vi_result.get("error", "Unknown VI provisioning error"))
                _progress("video_indexer", "failed", vi_result.get("error", ""))

    # Mark overall success only if no critical failures
    result["success"] = len(result["steps_failed"]) == 0

    # ── Auto-persist discovered config to azure.local.yaml ──────────────
    # After successful onboarding, write ALL discovered Azure identity
    # back to config so the next session starts fully configured.
    if result["success"]:
        try:
            import yaml
            from slate.core.azure_config import _CONFIG_DIR, _AZURE_LOCAL_YAML, azure_config, _load_yaml, _deep_merge

            existing = _load_yaml(_AZURE_LOCAL_YAML)
            ai_update = {
                "resource_group": resource_group,
                "subscription_id": subscription_id,
                "location": _location,
            }
            # If we detected an AI Services resource, persist its name
            ai_resource = result.get("config_updates", {}).get("ai_services_resource")
            if ai_resource:
                ai_update["resource_name"] = ai_resource
                ai_update["endpoint"] = f"https://{ai_resource}.cognitiveservices.azure.com"

            vi_update = {}
            vi_account_id = result.get("config_updates", {}).get("video_indexer_account_id")
            if vi_account_id:
                vi_update["account_id"] = vi_account_id

            config_overlay = {}
            if ai_update:
                config_overlay["ai_services"] = ai_update
            if vi_update:
                config_overlay["video_indexer"] = vi_update

            merged = _deep_merge(existing, config_overlay)
            _CONFIG_DIR.mkdir(parents=True, exist_ok=True)
            with open(_AZURE_LOCAL_YAML, "w", encoding="utf-8") as f:
                yaml.dump(merged, f, default_flow_style=False, sort_keys=False)

            azure_config.reload()
            result["steps_completed"].append("config_persisted")
            _progress("config", "done",
                      f"Saved all Azure details to {_AZURE_LOCAL_YAML.name} — "
                      f"next session will auto-discover these resources")
        except Exception as e:
            _progress("config", "warning", f"Config persist failed (non-critical): {e}")
    return result


def _update_vi_config(
    account_id: str,
    subscription_id: str,
    resource_group: str | None = None,
    config_path: str | Path | None = None,
):
    """Write VI account details into config/azure.local.yaml."""
    try:
        import yaml
    except ImportError:
        logger.warning("PyYAML not available — cannot update azure config")
        return

    resource_group = resource_group or _az_cfg.resource_group

    if config_path is None:
        from slate.core.azure_config import _CONFIG_DIR
        config_path = _CONFIG_DIR / "azure.local.yaml"
    config_path = Path(config_path)

    # Load existing local config or start fresh
    existing = {}
    if config_path.exists():
        try:
            with open(config_path, encoding="utf-8") as f:
                existing = yaml.safe_load(f) or {}
        except Exception:
            pass

    # Merge VI fields
    vi = existing.setdefault("video_indexer", {})
    vi["account_id"] = account_id

    ai = existing.setdefault("ai_services", {})
    if not ai.get("subscription_id"):
        ai["subscription_id"] = subscription_id
    if not ai.get("resource_group") and resource_group:
        ai["resource_group"] = resource_group

    config_path.parent.mkdir(parents=True, exist_ok=True)
    with open(config_path, "w", encoding="utf-8") as f:
        yaml.dump(existing, f, default_flow_style=False, sort_keys=False)

    logger.info("Updated %s with VI account_id=%s", config_path, account_id)


# ── Model metadata for human-readable setup plans ───────────────────────────

_MODEL_DESCRIPTIONS = {
    "gpt-image-2": "All image generation — 4K, faces, scenes, creative, text-in-image",
    "gpt-4o-mini-tts": "Voice narration (6 voice options: coral, echo, shimmer...)",
    "gpt-4o-transcribe": "Speech-to-text with word-level timestamps (subtitles)",
    "sora": "AI-generated video clips (4-12 second motion scenes)",
}

_MODEL_COSTS = {
    "gpt-image-2": "~$0.04/image",
    "gpt-4o-mini-tts": "~$0.001/second",
    "gpt-4o-transcribe": "~$0.006/minute",
    "sora": "~$0.20/second",
}

