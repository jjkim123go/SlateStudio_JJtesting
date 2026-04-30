"""Brand Package — Enterprise identity enforcement for video production.

A Brand Package defines an organization's visual identity: colors, fonts,
logos, locked elements, and compliance rules. The agent loads a brand package
at the start of production and uses it to enforce brand consistency across
all generated assets.

Brand packages are stored in config/org/brand-packages/ as YAML files.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

from slate.core.theme_intelligence import choose_theme

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ColorPalette:
    """Color palette definition."""
    primary: list[str] = field(default_factory=lambda: ["#8B5CF6"])
    accent: list[str] = field(default_factory=lambda: ["#E7D7A2"])
    background: str = "#120A1F"
    text: str = "#F8F4EC"


@dataclass(frozen=True)
class LogoSpec:
    """Logo placement specification."""
    file: str = ""
    position: str = "top-right"
    min_margin_px: int = 24
    required: bool = False


@dataclass(frozen=True)
class DisclaimerSpec:
    """Legal disclaimer specification."""
    text: str = ""
    position: str = "bottom-center"
    font_size: int = 12
    required_for: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class LockedElements:
    """Elements that cannot be overridden by individual users."""
    logo: LogoSpec = field(default_factory=LogoSpec)
    legal_disclaimer: DisclaimerSpec = field(default_factory=DisclaimerSpec)
    intro_template: str = ""
    outro_template: str = ""


@dataclass(frozen=True)
class Typography:
    """Typography configuration."""
    font: str = "Segoe UI"
    weight: int = 400


@dataclass(frozen=True)
class TypographySet:
    """Full typography configuration for headings and body."""
    headings: Typography = field(default_factory=lambda: Typography(weight=600))
    body: Typography = field(default_factory=Typography)


@dataclass(frozen=True)
class VoiceSpec:
    """Approved voice specification."""
    name: str = ""
    model: str = ""
    style: str = ""
    consent_id: str = ""


@dataclass(frozen=True)
class AudioConfig:
    """Audio configuration for brand compliance."""
    approved_voices: list[VoiceSpec] = field(default_factory=list)
    music_library_source: str = ""
    music_library_fallback: str = "royalty-free-ambient"


@dataclass(frozen=True)
class ComplianceConfig:
    """Compliance rules embedded in brand package."""
    content_classification: str = "Internal"
    rai_screening: bool = True
    pii_scan: bool = False
    export_watermark: bool = False
    approval_chain: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class BrandPackage:
    """Enterprise brand package loaded from YAML.

    Usage:
        brand = BrandPackage.load("config/org/brand-packages/contoso-corporate.yaml")
        brand.colors.primary  # ["#8B5CF6", "#E7D7A2"] for defaults, or brand-specified colors
        brand.is_locked       # True — cannot be overridden
        brand.logo.required   # True — must appear in every video
    """
    name: str = "default"
    org: str = ""
    version: str = "1.0"
    is_locked: bool = False
    colors: ColorPalette = field(default_factory=ColorPalette)
    locked_elements: LockedElements = field(default_factory=LockedElements)
    typography: TypographySet = field(default_factory=TypographySet)
    audio: AudioConfig = field(default_factory=AudioConfig)
    compliance: ComplianceConfig = field(default_factory=ComplianceConfig)

    @property
    def logo(self) -> LogoSpec:
        """Shortcut to locked_elements.logo."""
        return self.locked_elements.logo

    @property
    def primary_color(self) -> str:
        """First primary color (most common need)."""
        return self.colors.primary[0] if self.colors.primary else "#8B5CF6"

    @property
    def accent_color(self) -> str:
        """First accent color."""
        return self.colors.accent[0] if self.colors.accent else self.primary_color

    @property
    def heading_font(self) -> str:
        return self.typography.headings.font

    @property
    def body_font(self) -> str:
        return self.typography.body.font

    def validate_color(self, color: str) -> bool:
        """Check if a color is within the brand palette."""
        all_colors = (
            self.colors.primary +
            self.colors.accent +
            [self.colors.background, self.colors.text]
        )
        return color.upper() in [c.upper() for c in all_colors]

    def to_scf_props(self) -> dict[str, Any]:
        """Generate SCF-compatible props for BrandIntro/BrandOutro components."""
        props: dict[str, Any] = {
            "companyName": self.org or self.name,
            "primaryColor": self.primary_color,
            "accentColor": self.accent_color,
            "backgroundColor": self.colors.background,
            "textColor": self.colors.text,
            "headingFont": self.heading_font,
            "bodyFont": self.body_font,
        }
        if self.logo.file:
            props["logoSrc"] = self.logo.file
            props["logoPosition"] = self.logo.position
        if self.locked_elements.intro_template:
            props["introTemplate"] = self.locked_elements.intro_template
        if self.locked_elements.outro_template:
            props["outroTemplate"] = self.locked_elements.outro_template
        return props

    def to_style_vars(self) -> dict[str, str]:
        """Generate CSS-style variables for HyperFrames rendering."""
        theme = choose_theme(brand=self)
        return {
            **theme.to_style_vars(),
            "--font-heading": self.heading_font,
            "--font-body": self.body_font,
        }

    @classmethod
    def load(cls, path: str | Path) -> BrandPackage:
        """Load a brand package from a YAML file."""
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"Brand package not found: {path}")

        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        return cls._from_dict(data)

    @classmethod
    def _from_dict(cls, data: dict[str, Any]) -> BrandPackage:
        """Build a BrandPackage from a parsed YAML dictionary."""
        identity = data.get("identity", {})
        visual = data.get("visual_language", {})
        typo_data = data.get("typography", {})
        audio_data = data.get("audio", {})
        comp_data = data.get("compliance", {})

        # Color palette
        palette_data = visual.get("color_palette", {})
        colors = ColorPalette(
            primary=palette_data.get("primary", ["#8B5CF6"]),
            accent=palette_data.get("accent", []),
            background=palette_data.get("background", "#FFFFFF"),
            text=palette_data.get("text", "#323130"),
        )

        # Locked elements
        locked_data = visual.get("locked_elements", {})
        logo_data = locked_data.get("logo", {})
        logo = LogoSpec(
            file=logo_data.get("file", ""),
            position=logo_data.get("position", "top-right"),
            min_margin_px=logo_data.get("min_margin_px", 24),
            required=logo_data.get("required", False),
        )
        disc_data = locked_data.get("legal_disclaimer", {})
        disclaimer = DisclaimerSpec(
            text=disc_data.get("text", ""),
            position=disc_data.get("position", "bottom-center"),
            font_size=disc_data.get("font_size", 12),
            required_for=disc_data.get("required_for", []),
        )
        locked = LockedElements(
            logo=logo,
            legal_disclaimer=disclaimer,
            intro_template=locked_data.get("intro_template", ""),
            outro_template=locked_data.get("outro_template", ""),
        )

        # Typography
        h_data = typo_data.get("headings", {})
        b_data = typo_data.get("body", {})
        typo = TypographySet(
            headings=Typography(font=h_data.get("font", "Segoe UI"), weight=h_data.get("weight", 600)),
            body=Typography(font=b_data.get("font", "Segoe UI"), weight=b_data.get("weight", 400)),
        )

        # Audio
        voices = []
        for v in audio_data.get("approved_voices", []):
            voices.append(VoiceSpec(
                name=v.get("name", ""),
                model=v.get("model", ""),
                style=v.get("style", ""),
                consent_id=v.get("consent_id", ""),
            ))
        music_lib = audio_data.get("music_library", {})
        audio = AudioConfig(
            approved_voices=voices,
            music_library_source=music_lib.get("source", "") if isinstance(music_lib, dict) else "",
            music_library_fallback=music_lib.get("fallback", "royalty-free-ambient") if isinstance(music_lib, dict) else "royalty-free-ambient",
        )

        # Compliance
        compliance = ComplianceConfig(
            content_classification=comp_data.get("content_classification", "Internal"),
            rai_screening=comp_data.get("rai_screening", True),
            pii_scan=comp_data.get("pii_scan", False),
            export_watermark=comp_data.get("export_watermark", False),
            approval_chain=comp_data.get("approval_chain", []),
        )

        return cls(
            name=identity.get("name", "default"),
            org=identity.get("org", ""),
            version=identity.get("version", "1.0"),
            is_locked=identity.get("locked", False),
            colors=colors,
            locked_elements=locked,
            typography=typo,
            audio=audio,
            compliance=compliance,
        )

    @classmethod
    def discover(cls, brand_dir: str | Path = "config/org/brand-packages") -> dict[str, Path]:
        """Discover all brand packages in a directory.

        Returns a dict of package_name → file_path.
        """
        brand_dir = Path(brand_dir)
        packages: dict[str, Path] = {}
        if not brand_dir.exists():
            return packages
        for f in sorted(brand_dir.glob("*.yaml")):
            packages[f.stem] = f
        for f in sorted(brand_dir.glob("*.yml")):
            if f.stem not in packages:
                packages[f.stem] = f
        return packages

    @classmethod
    def default(cls) -> BrandPackage:
        """Return Slate's premium default brand package."""
        theme = choose_theme({"theme": "premium-velvet"})
        return cls(
            name="default",
            org="",
            colors=ColorPalette(
                primary=[theme.primary],
                accent=[theme.accent],
                background=theme.background,
                text=theme.text,
            ),
        )
