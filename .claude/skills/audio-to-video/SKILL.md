---
name: audio-to-video
description: "Generate video from audio + image using fal.ai LTX-2.3. Use for: talking head, lip sync, audio-driven video."
allowed-tools: Bash, Read, Write
---

# Audio to Video — LTX 2.3

Generate video from audio using fal.ai LTX-2.3.

## Usage

```bash
cd /Users/aviz/.claude/skills/audio-to-video/scripts
npx ts-node generate.ts \
  --audio "/path/to/audio.mp3" \
  --image "/path/to/frame.jpg" \
  -d /tmp/output.mp4 \
  "Cinematic description of motion and action"
```

## Flags

| Flag | Description |
|------|-------------|
| `--audio`, `-a` | Audio file (mp3/wav/ogg/m4a/aac) — **max 20 seconds** |
| `-d`, `--destination` | Output video path (required) |
| `--image`, `-i` | Starting frame image (highly recommended) |
| `--end-image` | Ending frame image |
| `--size`, `-s` | Video size (see below) |
| `--fps` | Frames per second (24/25) |
| `--quality` | low/medium/high/maximum |
| `--guidance-scale` | Default: 9 with image, 5 without |

## Endpoints (LTX 2.3)

| Mode | Endpoint |
|------|----------|
| Audio + (optional image) | `fal-ai/ltx-2.3/audio-to-video` |
| Image only (no audio) | `fal-ai/ltx-2.3/image-to-video` |

Script auto-selects based on whether `--audio` is provided.

## Video Sizes

`landscape_16_9` (default), `portrait_16_9`, `landscape_4_3`, `square_hd`, `auto`

## Audio Limit

**Max 20 seconds per clip.** For longer content, split into chunks and merge with ffmpeg.

## API Key

Uses `FAL_KEY` from `~/.claude/skills/image-generation/scripts/.env`

## Writing Strong Prompts

The prompt drives video motion. Include:
1. **Subject action** — what is moving and how ("singer throwing head back mid-note")
2. **Camera movement** — "slow dolly in", "whip pan", "handheld shake"
3. **Lighting event** — "strobe burst", "spotlight sweep", "laser beams"
4. **Emotion/energy** — "euphoric", "intense", "raw power"
5. **Environment** — "fog rolling across stage", "confetti mid-air"

Example:
```
"LIVE ARENA CONCERT: Female singer throwing head back mid-high-note, hair arcing in slow motion.
Camera: slow push in. Lighting: single white spotlight with rim halo.
Fog at feet, pure emotional catharsis. Hyper-real 4K cinema"
```
