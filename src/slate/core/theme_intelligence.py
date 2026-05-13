"""Runtime theme intelligence for Slate compositions.

The theme layer keeps Slate's visual decisions semantic and contrast-safe.
It does not blindly repaint product UI components; it provides scene and
renderer tokens that components can opt into while preserving fidelity where
needed.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
import re
from typing import Any


HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


@dataclass(frozen=True)
class ThemeTokens:
    """Semantic theme tokens used by SCF, captions, and renderer CSS vars."""

    name: str
    background: str
    surface: str
    elevated_surface: str
    text: str
    muted_text: str
    primary: str
    accent: str
    border: str
    success: str = "#3DDC97"
    warning: str = "#F7C948"
    danger: str = "#FF6B6B"
    caption_highlight: str = "#E7D7A2"
    caption_highlight_background: str = "rgba(231,215,162,0.24)"
    visual_family: str = "warm-dark"
    rationale: str = "Premium default chosen for cinematic contrast and component-safe surfaces."

    def to_scf_metadata(self) -> dict[str, str]:
        return {
            "name": self.name,
            "background": self.background,
            "surface": self.surface,
            "elevatedSurface": self.elevated_surface,
            "text": self.text,
            "mutedText": self.muted_text,
            "primary": self.primary,
            "accent": self.accent,
            "border": self.border,
            "success": self.success,
            "warning": self.warning,
            "danger": self.danger,
            "captionHighlight": self.caption_highlight,
            "captionHighlightBackground": self.caption_highlight_background,
            "visualFamily": self.visual_family,
            "rationale": self.rationale,
        }

    def to_style_vars(self) -> dict[str, str]:
        return {
            "--brand-primary": self.primary,
            "--brand-accent": self.accent,
            "--brand-bg": self.background,
            "--brand-text": self.text,
            "--slate-bg": self.background,
            "--slate-surface": self.surface,
            "--slate-elevated-surface": self.elevated_surface,
            "--slate-text": self.text,
            "--slate-muted-text": self.muted_text,
            "--slate-border": self.border,
            "--slate-success": self.success,
            "--slate-warning": self.warning,
            "--slate-danger": self.danger,
            "--slate-caption-highlight": self.caption_highlight,
        }

    def to_brand_props(self, company_name: str = "Slate") -> dict[str, Any]:
        return {
            "companyName": company_name,
            "primaryColor": self.primary,
            "accentColor": self.accent,
            "backgroundColor": self.background,
            "textColor": self.text,
            "surfaceColor": self.surface,
            "elevatedSurfaceColor": self.elevated_surface,
            "mutedTextColor": self.muted_text,
            "borderColor": self.border,
        }


THEME_PRESETS: dict[str, ThemeTokens] = {
    "premium-velvet": ThemeTokens(
        name="premium-velvet",
        background="#120A1F",
        surface="#1D142C",
        elevated_surface="#2A1B3D",
        text="#F8F4EC",
        muted_text="#C9BFD7",
        primary="#8B5CF6",
        accent="#E7D7A2",
        border="#4B3A63",
        caption_highlight="#F3DFA2",
        caption_highlight_background="rgba(243,223,162,0.24)",
        visual_family="warm-dark",
        rationale="Velvet aubergine, warm text, and champagne/cyan accents create a premium default without relying on blue.",
    ),
    "ai-native": ThemeTokens(
        name="ai-native",
        background="#0D1020",
        surface="#161A2E",
        elevated_surface="#202643",
        text="#F6F7FB",
        muted_text="#B8C0D9",
        primary="#7C5CFF",
        accent="#28D7E5",
        border="#353B62",
        caption_highlight="#28D7E5",
        caption_highlight_background="rgba(40,215,229,0.22)",
        visual_family="dark-blue",
        rationale="AI/product content benefits from a deep neutral base with violet intelligence cues and cyan signal accents.",
    ),
    "modern-dark-cinema": ThemeTokens(
        name="modern-dark-cinema",
        background="#08090D",
        surface="#15171E",
        elevated_surface="#20242D",
        text="#F7F8FA",
        muted_text="#B8BCC7",
        primary="#D8DEE9",
        accent="#D4AF37",
        border="#343946",
        caption_highlight="#D4AF37",
        caption_highlight_background="rgba(212,175,55,0.24)",
        visual_family="charcoal-gold",
        rationale="Cinematic charcoal with restrained spotlight accents works well for executive and launch narratives.",
    ),
    "enterprise-clear": ThemeTokens(
        name="enterprise-clear",
        background="#0F172A",
        surface="#172033",
        elevated_surface="#22304A",
        text="#F8FAFC",
        muted_text="#CBD5E1",
        primary="#6C8CFF",
        accent="#3DDC97",
        border="#334155",
        caption_highlight="#9BB2FF",
        caption_highlight_background="rgba(155,178,255,0.22)",
        visual_family="dark-blue",
        rationale="Enterprise-friendly contrast with less default-blue dominance and safer green signal accents.",
    ),
    "warm-editorial": ThemeTokens(
        name="warm-editorial",
        background="#17120F",
        surface="#251C17",
        elevated_surface="#33251E",
        text="#FFF7ED",
        muted_text="#D7C4B7",
        primary="#C08457",
        accent="#F2C879",
        border="#553C2E",
        caption_highlight="#F2C879",
        caption_highlight_background="rgba(242,200,121,0.24)",
        visual_family="warm-dark",
        rationale="Warm editorial tones suit storytelling, hospitality, and human-centered content.",
    ),
    "light-enterprise": ThemeTokens(
        name="light-enterprise",
        background="#F7F8FB",
        surface="#FFFFFF",
        elevated_surface="#EEF2F7",
        text="#172033",
        muted_text="#526071",
        primary="#3157C9",
        accent="#0E8F6D",
        border="#D7DEE9",
        caption_highlight="#3157C9",
        caption_highlight_background="rgba(49,87,201,0.14)",
        visual_family="light-neutral",
        rationale="Bright enterprise surfaces make product and training videos feel practical, readable, and less samey than navy decks.",
    ),
    "technical-paper": ThemeTokens(
        name="technical-paper",
        background="#F3F0E8",
        surface="#FFFCF4",
        elevated_surface="#E7E1D3",
        text="#1F2933",
        muted_text="#59636E",
        primary="#275C5F",
        accent="#B45309",
        border="#D2C8B8",
        caption_highlight="#275C5F",
        caption_highlight_background="rgba(39,92,95,0.16)",
        visual_family="light-warm",
        rationale="Paper, ink, teal, and amber suit technical explainers without falling back to dark-blue dashboards.",
    ),
    "bold-social": ThemeTokens(
        name="bold-social",
        background="#FFF1F2",
        surface="#FFFFFF",
        elevated_surface="#FFE4E6",
        text="#24111A",
        muted_text="#6F4A58",
        primary="#E11D48",
        accent="#F59E0B",
        border="#F3BBC5",
        caption_highlight="#E11D48",
        caption_highlight_background="rgba(225,29,72,0.16)",
        visual_family="bright-warm",
        rationale="High-energy rose, white, and amber give social teasers a distinct editorial identity instead of another navy technology frame.",
    ),
}

PRODUCT_UI_COMPONENTS = {
    "VSCodeScene",
    "AzurePortalScene",
    "GitHubScene",
    "EdgeBrowserScene",
    "TeamsScene",
    "OutlookScene",
    "ExcelScene",
    "PowerPointScene",
    "PowerBIScene",
    "FabricScene",
    "WindowsScene",
    "AdminCenterScene",
    "LoopScene",
    "WhiteboardScene",
    "StreamScene",
    "ListsScene",
    "PlannerScene",
    "OneDriveScene",
    "FormsScene",
    "BookingsScene",
    "TerminalScene",
    "TerminalCast",
}


def normalize_hex(color: str | None, fallback: str) -> str:
    if isinstance(color, str) and HEX_RE.match(color.strip()):
        return color.strip().upper()
    return fallback.upper()


def hex_to_rgb(color: str) -> tuple[int, int, int]:
    normalized = normalize_hex(color, "#000000").lstrip("#")
    return tuple(int(normalized[i : i + 2], 16) for i in (0, 2, 4))


def _channel_luminance(channel: int) -> float:
    value = channel / 255
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def relative_luminance(color: str) -> float:
    red, green, blue = hex_to_rgb(color)
    return 0.2126 * _channel_luminance(red) + 0.7152 * _channel_luminance(green) + 0.0722 * _channel_luminance(blue)


def contrast_ratio(foreground: str, background: str) -> float:
    first = relative_luminance(foreground)
    second = relative_luminance(background)
    lighter = max(first, second)
    darker = min(first, second)
    return (lighter + 0.05) / (darker + 0.05)


def _mix(color: str, target: str, amount: float) -> str:
    source_rgb = hex_to_rgb(color)
    target_rgb = hex_to_rgb(target)
    ratio = max(0.0, min(1.0, amount))
    mixed = tuple(round(source_rgb[i] + (target_rgb[i] - source_rgb[i]) * ratio) for i in range(3))
    return "#" + "".join(f"{channel:02X}" for channel in mixed)


def ensure_contrast(foreground: str, background: str, minimum: float = 4.5) -> str:
    """Return a foreground color adjusted toward black/white until readable."""
    foreground = normalize_hex(foreground, "#FFFFFF")
    background = normalize_hex(background, "#000000")
    if contrast_ratio(foreground, background) >= minimum:
        return foreground

    white_ratio = contrast_ratio("#FFFFFF", background)
    black_ratio = contrast_ratio("#0B0B0F", background)
    target = "#FFFFFF" if white_ratio >= black_ratio else "#0B0B0F"
    for step in range(1, 11):
        candidate = _mix(foreground, target, step / 10)
        if contrast_ratio(candidate, background) >= minimum:
            return candidate
    return target


def ensure_surface_separation(surface: str, background: str, minimum: float = 1.18) -> str:
    """Keep dark component surfaces visible on dark scene backgrounds."""
    surface = normalize_hex(surface, "#1D142C")
    background = normalize_hex(background, "#120A1F")
    if contrast_ratio(surface, background) >= minimum:
        return surface
    bg_luminance = relative_luminance(background)
    target = "#FFFFFF" if bg_luminance < 0.35 else "#000000"
    for step in range(1, 9):
        candidate = _mix(surface, target, step * 0.08)
        if contrast_ratio(candidate, background) >= minimum:
            return candidate
    return _mix(surface, target, 0.48)


def validate_theme(theme: ThemeTokens) -> ThemeTokens:
    """Return a theme with corrected text/surface/caption visibility."""
    surface = ensure_surface_separation(theme.surface, theme.background)
    elevated_surface = ensure_surface_separation(theme.elevated_surface, theme.background, minimum=1.28)
    text = ensure_contrast(theme.text, theme.background, 7.0)
    muted_text = ensure_contrast(theme.muted_text, surface, 4.5)
    primary = ensure_contrast(theme.primary, theme.background, 3.0)
    accent = ensure_contrast(theme.accent, theme.background, 3.0)
    caption_highlight = ensure_contrast(theme.caption_highlight, theme.background, 3.0)
    return replace(
        theme,
        surface=surface,
        elevated_surface=elevated_surface,
        text=text,
        muted_text=muted_text,
        primary=primary,
        accent=accent,
        caption_highlight=caption_highlight,
    )


def theme_from_brand(brand: Any) -> ThemeTokens:
    primary = normalize_hex(getattr(brand, "primary_color", None), THEME_PRESETS["premium-velvet"].primary)
    accent = normalize_hex(getattr(brand, "accent_color", None), primary)
    colors = getattr(brand, "colors", None)
    background = normalize_hex(getattr(colors, "background", None), "#0F1117")
    text = normalize_hex(getattr(colors, "text", None), "#F8FAFC")
    if relative_luminance(background) > 0.75:
        surface = "#F6F7FB"
        elevated = "#FFFFFF"
        border = "#D9DEE8"
        muted = "#4B5563"
    else:
        surface = ensure_surface_separation(_mix(background, "#FFFFFF", 0.08), background)
        elevated = ensure_surface_separation(_mix(background, "#FFFFFF", 0.14), background, 1.28)
        border = _mix(background, "#FFFFFF", 0.24)
        muted = _mix(text, background, 0.28)

    return validate_theme(ThemeTokens(
        name=f"brand-{getattr(brand, 'name', 'custom')}",
        background=background,
        surface=surface,
        elevated_surface=elevated,
        text=text,
        muted_text=muted,
        primary=primary,
        accent=accent,
        border=border,
        caption_highlight=primary,
        caption_highlight_background=f"rgba({hex_to_rgb(primary)[0]},{hex_to_rgb(primary)[1]},{hex_to_rgb(primary)[2]},0.24)",
        rationale="Brand package colors are authoritative; Slate derived safe surfaces, text, and caption tokens from them.",
    ))


def _scenario_text(scenario: dict[str, Any]) -> str:
    parts: list[str] = []
    for key in ("title", "company", "tagline", "style", "tone", "audience", "video_type", "motion_style"):
        value = scenario.get(key)
        if value:
            parts.append(str(value))
    for scene in scenario.get("scenes", []) or []:
        for key in ("title", "narration", "visual_prompt", "component"):
            value = scene.get(key)
            if value:
                parts.append(str(value))
    return " ".join(parts).lower()


def choose_theme(scenario: dict[str, Any] | None = None, brand: Any = None) -> ThemeTokens:
    """Choose a premium, scene-planning-friendly theme from project intent."""
    if brand is not None:
        return theme_from_brand(brand)

    scenario = scenario or {}
    explicit = str(
        scenario.get("theme")
        or scenario.get("visualTheme")
        or scenario.get("visual_theme")
        or scenario.get("style")
        or ""
    ).lower().strip()
    if explicit in THEME_PRESETS:
        return validate_theme(THEME_PRESETS[explicit])

    visual_direction = str(
        scenario.get("visualDirection")
        or scenario.get("visual_direction")
        or scenario.get("creativeDirection")
        or scenario.get("creative_direction")
        or ""
    ).lower()
    if any(term in visual_direction for term in ("light", "clean", "bright", "product demo", "training")):
        return validate_theme(THEME_PRESETS["light-enterprise"])
    if any(term in visual_direction for term in ("paper", "blueprint", "technical", "diagram", "docs")):
        return validate_theme(THEME_PRESETS["technical-paper"])
    if any(term in visual_direction for term in ("social", "teaser", "vibrant", "bold", "campaign")):
        return validate_theme(THEME_PRESETS["bold-social"])

    text = _scenario_text(scenario)
    tokens = set(re.findall(r"[a-z0-9]+", text))
    def has_any(words: tuple[str, ...]) -> bool:
        return any(word in tokens for word in words)

    if has_any(("training", "onboarding", "workflow", "lesson", "policy")):
        return validate_theme(THEME_PRESETS["light-enterprise"])
    if has_any(("social", "teaser", "short", "campaign", "viral")):
        return validate_theme(THEME_PRESETS["bold-social"])
    if has_any(("developer", "api", "architecture", "code", "terminal", "github", "vscode")):
        return validate_theme(THEME_PRESETS["technical-paper"])
    if has_any(("executive", "launch", "cinematic", "premium", "luxury", "keynote")):
        return validate_theme(THEME_PRESETS["modern-dark-cinema"])
    if has_any(("ai", "copilot", "agent", "llm", "model", "automation")):
        return validate_theme(THEME_PRESETS["premium-velvet"])
    if has_any(("story", "customer", "hospitality", "wellness", "human", "editorial")):
        return validate_theme(THEME_PRESETS["warm-editorial"])
    return validate_theme(THEME_PRESETS["premium-velvet"])


def component_theme_notes(component: str | None) -> dict[str, Any]:
    """Describe how the theme should treat a component family."""
    if component in PRODUCT_UI_COMPONENTS:
        return {
            "preserveInternalTheme": True,
            "requiresFrameContrast": True,
            "rationale": "Product/demo components keep their internal UI colors; Slate themes the surrounding scene and frame only.",
        }
    return {
        "preserveInternalTheme": False,
        "requiresFrameContrast": True,
        "rationale": "Component can use Slate semantic tokens when available.",
    }
