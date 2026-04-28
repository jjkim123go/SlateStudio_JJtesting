"""Retry helpers for Azure Foundry API calls."""

from __future__ import annotations

from dataclasses import dataclass
from email.utils import parsedate_to_datetime
from time import time
from urllib.error import HTTPError


@dataclass(frozen=True)
class RetryConfig:
    """Retry policy for Foundry calls."""

    max_retries: int = 2
    rate_limit_base_sec: float = 15.0
    transient_base_sec: float = 1.0
    max_wait_sec: float = 90.0
    jitter: bool = False
    timeout_sec: float = 90.0


def parse_retry_after(error: BaseException) -> float | None:
    """Return Retry-After seconds from an HTTPError, if present and usable."""

    headers = getattr(error, "headers", None)
    if not headers:
        return None
    value = headers.get("Retry-After") if hasattr(headers, "get") else None
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    try:
        return max(0.0, float(raw))
    except ValueError:
        pass
    try:
        retry_at = parsedate_to_datetime(raw)
        return max(0.0, retry_at.timestamp() - time())
    except (TypeError, ValueError, OverflowError):
        return None


def classify_http_error(error: BaseException) -> str:
    """Classify an exception as rate_limit, transient, or permanent."""

    status = getattr(error, "code", None) or getattr(error, "status_code", None) or getattr(error, "status", None)
    if status is None:
        text = str(error).lower()
        if "429" in text or "rate limit" in text or "too many requests" in text:
            return "rate_limit"
        if "timeout" in text or "temporar" in text or "service unavailable" in text:
            return "transient"
        return "transient"
    try:
        status_int = int(status)
    except (TypeError, ValueError):
        return "transient"
    if status_int == 429:
        return "rate_limit"
    if status_int in {408, 500, 502, 503, 504} or status_int >= 500:
        return "transient"
    return "permanent"


def calculate_wait(
    attempt: int,
    error_class: str,
    config: RetryConfig,
    retry_after: float | None = None,
) -> float:
    """Calculate wait seconds before the next retry."""

    if error_class == "permanent":
        return 0.0
    if error_class == "rate_limit" and retry_after is not None:
        wait = retry_after
    elif error_class == "rate_limit":
        wait = config.rate_limit_base_sec * (2 ** attempt)
    else:
        wait = config.transient_base_sec * (2 ** attempt)
    wait = min(float(wait), config.max_wait_sec)
    if config.jitter and wait > 0:
        import random

        wait *= 0.9 + random.random() * 0.2
    return round(wait, 3)


def should_retry(error: BaseException, attempt: int, config: RetryConfig) -> tuple[bool, str, float]:
    """Return (retry, class, wait_seconds) for an exception and attempt."""

    error_class = classify_http_error(error)
    if error_class == "permanent" or attempt >= config.max_retries:
        return False, error_class, 0.0
    retry_after = parse_retry_after(error) if isinstance(error, HTTPError) else parse_retry_after(error)
    return True, error_class, calculate_wait(attempt, error_class, config, retry_after)
