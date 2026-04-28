"""ArtifactStore — File-based stage artifact persistence with versioning.

Each pipeline stage produces artifacts (creative brief, script, scene plan, etc.).
ArtifactStore manages these with version tracking, status fields, and manifest
generation for the audit trail.

Artifacts are written to output/stage_artifacts/{stage}.json and
reviews to output/reviews/{review_type}_review.json.
"""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class ArtifactStatus(str):
    """Status of an artifact version."""
    DRAFT = "draft"
    FINAL = "final"
    SUPERSEDED = "superseded"


@dataclass
class ArtifactVersion:
    """A single version of a stage artifact."""
    version: int
    status: str  # draft | final | superseded
    phase: str
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    data: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ArtifactRecord:
    """Full artifact record with version history."""
    name: str
    phase: str
    current_version: int = 0
    versions: list[ArtifactVersion] = field(default_factory=list)

    @property
    def latest(self) -> ArtifactVersion | None:
        return self.versions[-1] if self.versions else None

    def add_version(
        self,
        data: dict[str, Any],
        status: str = ArtifactStatus.DRAFT,
        metadata: dict[str, Any] | None = None,
    ) -> ArtifactVersion:
        """Add a new version, superseding the previous one."""
        # Mark previous version as superseded
        if self.versions and self.versions[-1].status != ArtifactStatus.SUPERSEDED:
            self.versions[-1].status = ArtifactStatus.SUPERSEDED

        self.current_version += 1
        version = ArtifactVersion(
            version=self.current_version,
            status=status,
            phase=self.phase,
            data=data,
            metadata=metadata or {},
        )
        self.versions.append(version)
        return version

    def finalize(self) -> None:
        """Mark the latest version as final."""
        if self.versions:
            self.versions[-1].status = ArtifactStatus.FINAL

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "phase": self.phase,
            "current_version": self.current_version,
            "versions": [asdict(v) for v in self.versions],
        }


class ArtifactStore:
    """Manages file-based stage artifacts with versioning.

    Usage:
        store = ArtifactStore(output_dir="projects/<slug>/")
        store.save_stage_artifact("ingest", {"creative_brief": "..."})
        store.save_stage_artifact("script", {"narration": "..."}, status="final")
        store.save_review("script", {"scores": {...}, "findings": [...]})
        brief = store.load_stage_artifact("ingest")
        manifest = store.manifest()
    """

    def __init__(self, output_dir: str | Path):
        self.output_dir = Path(output_dir)
        self.stage_dir = self.output_dir / "stage_artifacts"
        self.review_dir = self.output_dir / "reviews"
        self._artifacts: dict[str, ArtifactRecord] = {}

        # Create directories
        self.stage_dir.mkdir(parents=True, exist_ok=True)
        self.review_dir.mkdir(parents=True, exist_ok=True)

        logger.info("ArtifactStore initialized at %s", self.output_dir)

    def save_stage_artifact(
        self,
        phase: str,
        data: dict[str, Any],
        status: str = ArtifactStatus.DRAFT,
        metadata: dict[str, Any] | None = None,
    ) -> Path:
        """Save a stage artifact. Creates a new version if the artifact already exists."""
        if phase not in self._artifacts:
            self._artifacts[phase] = ArtifactRecord(name=phase, phase=phase)

        record = self._artifacts[phase]
        record.add_version(data, status=status, metadata=metadata)

        path = self.stage_dir / f"{phase}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(record.to_dict(), f, indent=2)

        logger.info(
            "Stage artifact saved: %s v%d (%s)",
            phase, record.current_version, status,
        )
        return path

    def finalize_stage_artifact(self, phase: str) -> None:
        """Mark the latest version of a stage artifact as final."""
        if phase in self._artifacts:
            self._artifacts[phase].finalize()
            # Re-write
            path = self.stage_dir / f"{phase}.json"
            with open(path, "w", encoding="utf-8") as f:
                json.dump(self._artifacts[phase].to_dict(), f, indent=2)
            logger.info("Stage artifact finalized: %s", phase)

    def load_stage_artifact(self, phase: str) -> dict[str, Any] | None:
        """Load the latest version of a stage artifact."""
        # Check in-memory first
        if phase in self._artifacts:
            record = self._artifacts[phase]
            if record.latest:
                return record.latest.data

        # Fall back to disk
        path = self.stage_dir / f"{phase}.json"
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                record_data = json.load(f)
            versions = record_data.get("versions", [])
            if versions:
                return versions[-1].get("data", {})
        return None

    def save_review(
        self,
        review_type: str,
        data: dict[str, Any],
        metadata: dict[str, Any] | None = None,
    ) -> Path:
        """Save a review report."""
        review_name = f"{review_type}_review"
        if review_name not in self._artifacts:
            self._artifacts[review_name] = ArtifactRecord(
                name=review_name, phase="review"
            )

        record = self._artifacts[review_name]
        record.add_version(data, status=ArtifactStatus.FINAL, metadata=metadata)

        path = self.review_dir / f"{review_name}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(record.to_dict(), f, indent=2)

        logger.info("Review saved: %s", review_name)
        return path

    def load_review(self, review_type: str) -> dict[str, Any] | None:
        """Load the latest review of a given type."""
        review_name = f"{review_type}_review"
        if review_name in self._artifacts:
            record = self._artifacts[review_name]
            if record.latest:
                return record.latest.data

        path = self.review_dir / f"{review_name}.json"
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                record_data = json.load(f)
            versions = record_data.get("versions", [])
            if versions:
                return versions[-1].get("data", {})
        return None

    def manifest(self) -> dict[str, Any]:
        """Generate a manifest of all artifacts for audit trail."""
        artifacts = {}
        for name, record in self._artifacts.items():
            latest = record.latest
            artifacts[name] = {
                "phase": record.phase,
                "current_version": record.current_version,
                "status": latest.status if latest else "none",
                "created_at": latest.created_at if latest else None,
                "total_versions": len(record.versions),
            }
        return {
            "output_dir": str(self.output_dir),
            "artifact_count": len(self._artifacts),
            "artifacts": artifacts,
        }

    def list_artifacts(self) -> list[str]:
        """List all artifact names."""
        return sorted(self._artifacts.keys())
