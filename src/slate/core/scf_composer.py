"""SCF Composer — Generates Slate Composition Format JSON from scenario data.

This module bridges the gap between the agent's creative decisions (scenario JSON)
and the HyperFrames renderer (SCF JSON). It applies brand packages, validates
against the SCF schema, and generates complete composition documents.

Usage:
    from slate.core.scf_composer import SCFComposer

    composer = SCFComposer(brand=brand_package)
    scf = composer.from_scenario(scenario_data, asset_manifest)
    composer.validate(scf)
    composer.write(scf, "output/composition.json")
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from slate.core.theme_intelligence import ThemeTokens, choose_theme, component_theme_notes

logger = logging.getLogger(__name__)

# Default output profile
DEFAULT_PROFILE = {"width": 1920, "height": 1080, "fps": 30, "codec": "h264", "quality": "high"}


def _is_dark_hex(value: str) -> bool:
    color = str(value or "").lstrip("#")
    if len(color) != 6:
        return True
    try:
        red = int(color[0:2], 16) / 255
        green = int(color[2:4], 16) / 255
        blue = int(color[4:6], 16) / 255
    except ValueError:
        return True
    return (0.2126 * red + 0.7152 * green + 0.0722 * blue) < 0.45


@dataclass
class AssetManifest:
    """Mapping of scene IDs to generated asset file paths.

    Populated during the asset generation stage, then fed to SCFComposer.
    """
    scene_images: dict[str, str] = field(default_factory=dict)   # scene_id → image path
    scene_narrations: dict[str, str] = field(default_factory=dict)  # scene_id → audio path
    scene_videos: dict[str, str] = field(default_factory=dict)   # scene_id → video clip path
    brand_intro_image: str = ""
    brand_outro_image: str = ""
    music_track: str = ""


class SCFComposer:
    """Generates SCF JSON documents from scenario data + assets.

    SCF is the contract between the agent and the renderer. This composer:
    - Maps scenario scenes to SCF scene objects
    - Applies brand package styling (colors, fonts, logos)
    - Assigns pre-built components (BrandIntro, BrandOutro, TitleCard)
    - Embeds asset paths from the AssetManifest
    - Validates the result against the SCF schema

    Args:
        brand: BrandPackage to apply (None for defaults)
        pipeline: Pipeline type name (e.g., "animated-explainer")
        output_profile: Override output profile (width/height/fps)
    """

    def __init__(
        self,
        brand: Any = None,
        pipeline: str = "animated-explainer",
        output_profile: dict[str, Any] | None = None,
    ):
        self.brand = brand
        self.pipeline = pipeline
        self.output_profile = output_profile or dict(DEFAULT_PROFILE)

    def from_scenario(
        self,
        scenario: dict[str, Any],
        assets: AssetManifest | None = None,
    ) -> dict[str, Any]:
        """Generate an SCF document from a scenario + asset manifest.

        Args:
            scenario: Scenario JSON with title, company, scenes, etc.
            assets: Generated asset file paths (images, narrations, clips)

        Returns:
            Complete SCF JSON document (dict)
        """
        assets = assets or AssetManifest()
        scenes: list[dict[str, Any]] = []

        # Brand intro scene
        theme = choose_theme(scenario, self.brand)
        brand_props = self._brand_props(scenario, theme)
        scenes.append({
            "id": "brand-intro",
            "duration": scenario.get("intro_duration", 4),
            "component": "BrandIntro",
            "props": {
                **brand_props,
                "logoSrc": assets.brand_intro_image or brand_props.get("logoSrc", ""),
                "companyName": scenario.get("company", brand_props.get("companyName", "Slate")),
                "tagline": scenario.get("tagline", ""),
            },
            "transition": "crossfade",
        })

        # Content scenes
        for scene_data in scenario.get("scenes", []):
            scene_id = scene_data["id"]
            scene = self._build_scene(scene_data, assets, brand_props, theme)
            scenes.append(scene)

        # Brand outro scene
        scenes.append({
            "id": "brand-outro",
            "duration": scenario.get("outro_duration", 4),
            "component": "BrandOutro",
            "props": {
                **brand_props,
                "logoSrc": assets.brand_outro_image or brand_props.get("logoSrc", ""),
                "companyName": scenario.get("company", brand_props.get("companyName", "Slate")),
            },
            "transition": "fadeOut",
        })

        # Assemble SCF
        scf: dict[str, Any] = {
            "version": "1.0",
            "pipeline": self.pipeline,
            "outputProfile": self.output_profile,
            "scenes": scenes,
        }

        if self.brand and self.brand.name != "default":
            scf["brandPackage"] = self.brand.name

        # Music track
        if assets.music_track:
            scf["music"] = {
                "src": assets.music_track,
                "volume": 0.15,
                "duck_on_narration": True,
                "duck_level": 0.05,
                "fade_in": 1,
                "fade_out": 2,
                "loop": True,
            }

        # Captions config from brand
        scf["captions"] = self._caption_config(theme)

        # Metadata
        source_components = {
            scene.get("id"): scene.get("component")
            for scene in scenario.get("scenes", [])
            if scene.get("id") and scene.get("component")
        }
        for scene in scenes:
            if scene.get("id") and scene.get("component"):
                source_components.setdefault(scene["id"], scene["component"])
        scf["metadata"] = {
            "title": scenario.get("title", "Untitled"),
            "generated_by": "slate-scf-composer",
            "scene_count": len(scenes),
            "theme": theme.to_scf_metadata(),
            "visual_direction": {
                "theme": theme.name,
                "rationale": theme.rationale,
                "safety": "Semantic tokens are contrast-validated; product/demo components preserve internal UI colors and use themed surrounding surfaces.",
            },
        }
        if source_components:
            scf["metadata"]["source_components"] = source_components
        if scenario.get("quality_first") or scenario.get("qualityFirst"):
            scf["metadata"]["qualityFirst"] = True
        scene_contracts = scenario.get("sceneContracts") or scenario.get("scene_contracts")
        if scene_contracts:
            scf["metadata"]["sceneContracts"] = scene_contracts

        return scf

    def _build_scene(
        self,
        scene_data: dict[str, Any],
        assets: AssetManifest,
        brand_props: dict[str, Any],
        theme: ThemeTokens,
    ) -> dict[str, Any]:
        """Build a single SCF scene from scenario scene data."""
        scene_id = scene_data["id"]
        duration = scene_data.get("duration", 8)

        component = scene_data.get("component")
        if component:
            props = dict(scene_data.get("props", {}))
            scene: dict[str, Any] = {
                "id": scene_id,
                "duration": duration,
                "component": component,
                "props": props,
                "notes": scene_data.get("notes", component_theme_notes(component)["rationale"]),
                "transition": scene_data.get("transition", "crossfade"),
            }
            narration_path = assets.scene_narrations.get(scene_id, "")
            if narration_path:
                scene["narration"] = narration_path
            if scene_data.get("narration"):
                scene["narrationText"] = scene_data["narration"]
            return scene

        # Check if this is a video clip scene
        video_path = assets.scene_videos.get(scene_id)
        if video_path:
            return self._build_video_scene(scene_id, scene_data, video_path, assets, duration)

        # Designed narration scene (default). Older Slate builds used raw image
        # plus text layers here, which made novice prompts drift into slideshow
        # output. Route through SlideRenderer so typography, spacing, and reveal
        # timing remain component-owned even when the agent did not explicitly
        # choose a richer domain component.
        image_path = assets.scene_images.get(scene_id, "")
        narration_path = assets.scene_narrations.get(scene_id, "")
        title = scene_data.get("title", "")
        bullets = scene_data.get("bullet_points", [])

        if image_path and bullets:
            layout = "title-bullets-image"
        elif image_path:
            layout = "title-image"
        elif bullets:
            layout = "title-bullets"
        else:
            layout = "title-only"

        props: dict[str, Any] = {
            "layout": layout,
            "eyebrow": scene_data.get("eyebrow", ""),
            "title": title or scene_id.replace("-", " ").title(),
            "subtitle": scene_data.get("subtitle", ""),
            "bullets": json.dumps(bullets),
            "image": image_path,
            "imagePosition": scene_data.get("image_position", "right"),
            "accent": theme.primary,
            "theme": "dark" if _is_dark_hex(theme.background) else "light",
        }

        scene: dict[str, Any] = {
            "id": scene_id,
            "duration": duration,
            "component": "SlideRenderer",
            "props": props,
            "notes": scene_data.get("notes", f"Defaulted to SlideRenderer instead of raw text/image layers. Theme {theme.name}: {theme.rationale}"),
            "transition": scene_data.get("transition", "crossfade"),
        }

        if narration_path:
            scene["narration"] = narration_path
        if scene_data.get("narration"):
            scene["narrationText"] = scene_data["narration"]

        return scene

    def _build_video_scene(
        self,
        scene_id: str,
        scene_data: dict[str, Any],
        video_path: str,
        assets: AssetManifest,
        duration: float,
    ) -> dict[str, Any]:
        """Build a scene from a video clip."""
        layers: list[dict[str, Any]] = [
            {"type": "video", "src": video_path},
        ]
        scene: dict[str, Any] = {
            "id": scene_id,
            "duration": duration,
            "layers": layers,
            "transition": scene_data.get("transition", "crossfade"),
        }
        narration = assets.scene_narrations.get(scene_id)
        if narration:
            scene["narration"] = narration
        if scene_data.get("narration"):
            scene["narrationText"] = scene_data["narration"]
        return scene

    def _brand_props(self, scenario: dict[str, Any], theme: ThemeTokens) -> dict[str, Any]:
        """Extract brand-related props for component scenes."""
        if self.brand:
            props = self.brand.to_scf_props()
            props.setdefault("surfaceColor", theme.surface)
            props.setdefault("elevatedSurfaceColor", theme.elevated_surface)
            props.setdefault("mutedTextColor", theme.muted_text)
            props.setdefault("borderColor", theme.border)
            return props
        return {
            "companyName": scenario.get("company", "Slate"),
            **theme.to_brand_props(scenario.get("company", "Slate")),
            "headingFont": "Inter",
            "bodyFont": "Inter",
        }

    def _caption_config(self, theme: ThemeTokens) -> dict[str, Any]:
        """Generate caption config from brand package."""
        config: dict[str, Any] = {
            "style": "word-highlight",
            "position": "bottom",
            "fontSize": 24,
            "maxWordsPerLine": 8,
            "color": theme.text,
            "highlightColor": theme.caption_highlight,
            "highlightBackgroundColor": theme.caption_highlight_background,
            "lineBackgroundColor": "rgba(18, 10, 31, 0.80)",
        }
        if self.brand:
            config["font"] = self.brand.body_font
        return config

    def validate(self, scf: dict[str, Any]) -> list[str]:
        """Validate an SCF document. Returns list of error messages (empty = valid).

        Performs structural validation without requiring jsonschema library.
        """
        errors: list[str] = []

        if scf.get("version") != "1.0":
            errors.append(f"Invalid version: {scf.get('version')} (expected '1.0')")

        if "pipeline" not in scf:
            errors.append("Missing required field: pipeline")

        profile = scf.get("outputProfile", {})
        for field_name in ("width", "height", "fps"):
            if field_name not in profile:
                errors.append(f"Missing outputProfile.{field_name}")

        scenes = scf.get("scenes", [])
        if not scenes:
            errors.append("scenes array is empty")

        seen_ids: set[str] = set()
        for i, scene in enumerate(scenes):
            sid = scene.get("id")
            if not sid:
                errors.append(f"Scene {i}: missing id")
            elif sid in seen_ids:
                errors.append(f"Scene {i}: duplicate id '{sid}'")
            else:
                seen_ids.add(sid)

            if "duration" not in scene:
                errors.append(f"Scene '{sid}': missing duration")
            elif not (0.5 <= scene["duration"] <= 300):
                errors.append(f"Scene '{sid}': duration {scene['duration']} out of range [0.5, 300]")

            if not scene.get("component") and not scene.get("layers"):
                errors.append(f"Scene '{sid}': must have either 'component' or 'layers'")

        return errors

    def write(self, scf: dict[str, Any], path: str | Path) -> Path:
        """Write SCF JSON to file. Returns the written path."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(scf, f, indent=2)
        logger.info("SCF written to %s (%d scenes)", path, len(scf.get("scenes", [])))
        return path

    def total_duration(self, scf: dict[str, Any]) -> float:
        """Calculate total video duration from SCF."""
        return sum(s.get("duration", 0) for s in scf.get("scenes", []))
