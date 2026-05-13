from __future__ import annotations

from slate.core.theme_intelligence import choose_theme


def test_training_routes_to_light_enterprise_theme():
    theme = choose_theme({"title": "Incident response onboarding lesson"})

    assert theme.name == "light-enterprise"
    assert theme.visual_family == "light-neutral"


def test_developer_routes_to_technical_paper_not_dark_blue():
    theme = choose_theme({"title": "API architecture walkthrough for developers"})

    assert theme.name == "technical-paper"
    assert theme.visual_family != "dark-blue"


def test_social_routes_to_bold_social_theme():
    theme = choose_theme({"title": "A short social teaser for a product launch"})

    assert theme.name == "bold-social"
    assert theme.visual_family == "bright-warm"


def test_ai_content_uses_non_blue_premium_default():
    theme = choose_theme({"title": "AI agent product explainer"})

    assert theme.name == "premium-velvet"
    assert theme.visual_family != "dark-blue"


def test_unspecified_content_uses_non_dark_blue_default():
    theme = choose_theme({"title": "Quarterly planning overview"})

    assert theme.visual_family != "dark-blue"