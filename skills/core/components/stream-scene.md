# StreamScene Component

> Layer 2 component skill. Load when a scene should look like Microsoft Stream
> with chapters, transcript, search, or embedded clip playback.

## When to use

**Trigger vocabulary:** `Stream, transcript player, chapter navigation, video
search, enterprise video portal, clip playback, internal video library`.

Choose `StreamScene` when the story is about discovering or watching video.
Prefer `ScreenDemoFrame` for generic video framing and `foundry_video_gen` for the
video content itself.

## Variants

- `playerWithTranscript`
- `chaptersNavigation`
- `searchResults`
- `videoClipMode`

## Working examples

- `tests/qa-scenarios/pr8a-stream-player.scf.json`
- `tests/qa-scenarios/pr8a-stream-videoclip.scf.json`
