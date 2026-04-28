# FFmpeg Audio Tools

> Core skill — reference this when probing, mixing, transcoding, or generating subtitles.

## Tools Overview

| Tool              | Purpose                                    |
|-------------------|--------------------------------------------|
| `audio_probe`     | Inspect audio/video file metadata          |
| `audio_mixer`     | Mix narration + music with volume ducking  |
| `media_transcode` | Convert formats and apply quality presets  |
| `subtitle_gen`    | Generate SRT/VTT from word-level transcripts|

---

## audio_probe

Inspects an audio or video file and returns technical metadata. **Always probe before mixing** to verify format compatibility and duration.

### Parameters

| Parameter  | Type   | Required | Description          |
|------------|--------|----------|----------------------|
| `path`     | string | yes      | Path to media file   |

### Output Fields

| Field         | Example         | Description                       |
|---------------|-----------------|-----------------------------------|
| `duration`    | 62.4            | Duration in seconds               |
| `sample_rate` | 44100           | Samples per second                |
| `channels`    | 2               | Number of audio channels          |
| `codec`       | aac             | Audio codec name                  |
| `bitrate`     | 128000          | Bitrate in bits per second        |
| `format`      | mp3             | Container format                  |

### When to Use

- Before mixing: confirm narration and music are valid audio files
- After generation: verify TTS output duration matches expectations
- Before transcoding: check source format to choose appropriate settings
- Debugging: "why does the audio sound wrong?" — check sample rate, channels, codec

---

## audio_mixer

Mixes narration audio with background music, applying volume ducking so narration is always clearly audible. Outputs a broadcast-safe mixed audio file.

### Parameters

| Parameter        | Type   | Required | Default | Description                                 |
|------------------|--------|----------|---------|---------------------------------------------|
| `narration_path` | string | yes      | —       | Path to narration audio file                |
| `music_path`     | string | yes      | —       | Path to background music file               |
| `output_path`    | string | yes      | —       | Path for mixed output                       |
| `music_volume`   | float  | no       | 0.15    | Music volume (0.0–1.0) during narration     |
| `music_duck_to`  | float  | no       | 0.08    | Music volume when ducking under narration   |
| `normalize`      | bool   | no       | true    | Apply loudness normalization (-14 LUFS streaming target) |
| `fade_in`        | float  | no       | 1.0     | Music fade-in duration (seconds)            |
| `fade_out`       | float  | no       | 2.0     | Music fade-out duration (seconds)           |

### Volume Ducking

Ducking automatically lowers the music volume whenever narration is playing, then raises it back during pauses. This ensures the voice is always clear.

**How it works:**
1. The mixer detects silence/speech segments in the narration track
2. During speech: music volume drops to `music_duck_to` (default 0.08)
3. During silence: music volume rises to `music_volume` (default 0.15)
4. Transitions between levels are smoothed to avoid abrupt volume jumps

**Recommended volume levels by tone:**

| Tone          | music_volume | music_duck_to | Notes                           |
|---------------|-------------|---------------|---------------------------------|
| Professional  | 0.12        | 0.06          | Music barely noticeable          |
| Conversational| 0.15        | 0.08          | Default — balanced               |
| Energetic     | 0.20        | 0.10          | Music more present               |
| Cinematic     | 0.25        | 0.08          | Music swells in pauses           |

### Loudness Normalization

When `normalize` is `true` (default), the output is normalized to **-14 LUFS** with a **-1 dBTP** true peak limit. This is the **streaming/podcast convention** used by Spotify, YouTube, and Apple Podcasts — it ensures consistent playback across phones, laptops, and conference rooms.

> **Note:** -14 LUFS is *not* the EBU R128 broadcast standard. EBU R128 specifies **-23 LUFS** for traditional broadcast delivery. Slate targets -14 LUFS because the primary delivery surface is on-demand streaming (Stream, Teams, SharePoint, YouTube), not linear broadcast. If a video must meet broadcast EBU R128 compliance, override the target via the `audio_mixer` tool's loudness parameters.
>
> References:
> - EBU R128 (broadcast): -23 LUFS — https://tech.ebu.ch/publications/r128/
> - Streaming convention (-14 LUFS): Spotify, Apple Podcasts loudness specs

### Example

```json
{
  "narration_path": "output/assets/narration/full_narration.wav",
  "music_path": "output/assets/music/upbeat-corporate.mp3",
  "output_path": "output/assets/mixed_audio.wav",
  "music_volume": 0.15,
  "music_duck_to": 0.08,
  "normalize": true,
  "fade_in": 1.0,
  "fade_out": 2.0
}
```

---

## media_transcode

Converts media files between formats and applies quality presets.

### Parameters

| Parameter     | Type   | Required | Default    | Description                        |
|---------------|--------|----------|------------|------------------------------------|
| `input_path`  | string | yes      | —          | Source file path                   |
| `output_path` | string | yes      | —          | Destination file path              |
| `preset`      | string | no       | standard   | Quality preset                     |
| `format`      | string | no       | from ext   | Output format (mp4, webm, mp3, wav)|

### Quality Presets

| Preset     | Video Bitrate | Audio Bitrate | Use Case               |
|------------|---------------|---------------|------------------------|
| `draft`    | 2 Mbps        | 128 kbps      | Quick previews         |
| `standard` | 5 Mbps        | 192 kbps      | Internal sharing       |
| `high`     | 10 Mbps       | 256 kbps      | Production delivery    |
| `ultra`    | 20 Mbps       | 320 kbps      | Broadcast / archival   |

### Common Conversions

```
# MP3 narration → WAV for mixing (lossless intermediate)
media_transcode(input_path="narration.mp3", output_path="narration.wav")

# Final video → compressed MP4 for sharing
media_transcode(input_path="render.mp4", output_path="final.mp4", preset="high")

# Extract audio from video
media_transcode(input_path="video.mp4", output_path="audio.wav")
```

---

## subtitle_gen

Generates subtitle files (SRT or VTT) from word-level transcription data.

### Parameters

| Parameter        | Type   | Required | Default | Description                              |
|------------------|--------|----------|---------|------------------------------------------|
| `transcript_path`| string | yes      | —       | Path to verbose transcription JSON       |
| `output_path`    | string | yes      | —       | Output subtitle file path                |
| `format`         | string | no       | srt     | `srt` or `vtt`                           |
| `max_chars`      | int    | no       | 42      | Maximum characters per subtitle line     |
| `max_lines`      | int    | no       | 2       | Maximum lines per subtitle block         |

### Workflow

1. Generate narration with `foundry_tts`
2. Transcribe the narration with `gpt-4o-transcribe` (via `scripts/lib/live_subtitles.py`, format: `verbose_json`) to get word-level timestamps
3. Pass the transcription to `subtitle_gen` to produce an SRT or VTT file
4. Reference the subtitle file in the SCF `captions` section

### SRT Output Example

```srt
1
00:00:01,000 --> 00:00:04,200
Welcome to this overview of
our cloud platform.

2
00:00:04,500 --> 00:00:08,100
Today we'll explore how our
services can transform your workflow.
```

### Subtitle Best Practices

- **42 characters per line** is the industry standard for readability
- **2 lines maximum** per subtitle block — more is hard to read
- Subtitles should appear **slightly before** the spoken word (~200ms early)
- Avoid splitting a subtitle in the middle of a phrase or clause
- Each subtitle block should be on screen for at least **1 second** and no more than **7 seconds**

---

## General Best Practices

1. **Always probe first** — run `audio_probe` on every audio file before processing. Catches format mismatches, corrupt files, and unexpected durations early.
2. **Use WAV for intermediates** — WAV is lossless. Convert to compressed formats (MP3, AAC) only for final delivery.
3. **Normalize final output** — always apply loudness normalization (-14 LUFS streaming target) on the mixed audio. Viewers experience the video across phones, laptops, and conference rooms — consistent loudness matters. Note: this is the streaming convention, not EBU R128 broadcast (-23 LUFS).
4. **Verify durations match** — after mixing, probe the output and confirm its duration matches the expected video length. A mismatch means something went wrong.
5. **Clean up intermediates** — once the final render is complete, WAV intermediates can be large. Note them for cleanup but don't delete until the user approves the final output.
