# Slate Built-in Music Library

This directory is the **built-in Slate music library** — the lowest-priority
fallback in the music resolution chain:

1. `config/org/brand-packages/<brand>/music/` (brand-specific)
2. `config/org/music/` (org-wide approved)
3. **`assets/music/library/`** (this directory — Slate defaults)
4. User-provided files (per-project)

The MP3 files in this directory are intentionally committed even though the
repo ignores generated audio elsewhere. They are approved built-in assets, and
`MANIFEST.yaml` is the source of truth for track metadata and selection.

## What belongs here

Royalty-free background tracks suitable for video production. Core mood
categories are expected (see `MANIFEST.yaml` for the full track catalog):

| Slot | Mood | Use case |
|------|------|----------|
| `uplifting` | Uplifting, celebratory, positive energy | Recaps, win announcements, milestone videos |
| `neutral` | Neutral, professional, unobtrusive | Explainers, walkthroughs, training content |
| `ambient_low` | Low-energy ambient, no melody, texture only | Tutorials, calm narration, background filler |

## Suggested royalty-free sources

All tracks added here **must** be royalty-free with a license that permits
commercial use in internal and external video productions. Suggested sources:

### YouTube Audio Library (CC0 / royalty-free)
- Browse: https://studio.youtube.com/channel/UC/music
- Filter by: Mood, Genre, Duration
- Suggested tracks to look for:
  - **Uplifting:** "Sunny Side" (Dyalla), "Butterflies" (Telecasted), "Happy Day" (JGPXL)
  - **Neutral:** "Thinking Ahead" (Silent Partner), "Serenity" (Audionautix)
  - **Ambient:** "Ambient Piano" (Riot), "Floating" (Purrple Cat)

### Pixabay Music (Pixabay License — free for commercial use)
- Browse: https://pixabay.com/music/
- Filter by: Mood → Happy / Calm / Ambient
- All tracks on Pixabay Music are free for commercial use, no attribution required.

### Free Music Archive (check individual licenses)
- Browse: https://freemusicarchive.org/
- Filter by: License → CC0 or CC-BY
- **Important:** Check each track's license — FMA hosts mixed licenses.

## How to add tracks

1. Download the track in WAV or high-bitrate MP3 (≥192 kbps).
2. Give the track a descriptive lowercase filename, including the source id
  when available.
3. Place in this directory.
4. Update `MANIFEST.yaml` with the filename, duration, and confirm the mood tag.
5. Commit. The agent will discover tracks via the manifest on next session.

## ⚠️ Do NOT commit licensed or copyrighted audio

This directory is checked into source control. Only add tracks with
verifiable royalty-free or CC0 licenses. If in doubt, don't add it —
use the per-project `assets/` directory for tracks with limited licenses.
