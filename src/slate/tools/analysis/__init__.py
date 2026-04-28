"""Analysis tools — Scene detection, quality checks, video analysis."""

from slate.tools.analysis.video_indexer import (  # noqa: F401
    VideoIndexer,
    VideoIndexerConfig,
    check_vi_account,
    provision_vi_account,
    discover_azure_context,
    detect_all_capabilities,
    format_setup_plan,
    run_full_onboarding,
)
