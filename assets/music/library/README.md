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

Royalty-free background tracks suitable for video production. `MANIFEST.yaml`
remains the source of truth; the full slot catalog is:

| Slot | Mood | Use case |
|------|------|----------|
| `ambient_low` | Low-energy ambient, no melody, texture only | Cold opens, narration beds, background filler |
| `neutral` | Documentary cinematic, restrained | Explainers, walkthroughs, under-narration |
| `uplifting` | Uplifting, celebratory, positive energy | Recaps, win announcements, milestone resolves |
| `corporate_technology` | Corporate, technology, clean, confident | Enterprise demos, capability overviews |
| `synthwave_chill` | Synthwave, chill, technology | AI/product demos, theme showcases |
| `electronic_future_beats` | Electronic, future beats, upbeat | Innovation stories, premium showcases |
| `cinematic_build` | Cinematic, inspiring, building energy | Brand reveals, feature highlights |
| `upbeat_corporate` | Upbeat, motivational, energetic | Launch hype, feature reveals, social teasers |
| `suspense_tension` | Suspense, tension, dramatic build | Problem framing, incident response, risk beats |
| `epic_trailer` | Epic, orchestral, cinematic trailer | Major launches, hero reveals, exec announcements |
| `lofi_focus` | Lo-fi, chill hop, calm focus | Dev walkthroughs, tutorials, follow-along training |
| `acoustic_warm` | Warm acoustic, inspiring, human | Customer stories, culture, mission moments |
| `cinematic_soft` | Soft cinematic, restrained, emotional | Emotional resolves, reflective moments, closers |

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
