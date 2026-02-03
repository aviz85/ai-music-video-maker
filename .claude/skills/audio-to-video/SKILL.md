---
name: audio-to-video
description: "Generate video from audio + image using fal.ai LTX-2. Use for: talking head, lip sync, audio-driven video."
allowed-tools: Bash, Read, Write
---

# Audio to Video

Generate video from audio + optional image using fal.ai LTX-2 19B.

## Usage

```bash
cd .claude/skills/audio-to-video/scripts
npx ts-node generate.ts \
  --audio "/path/to/speech.mp3" \
  --image "/path/to/face.png" \
  -d /tmp/output.mp4 \
  "A woman speaks to camera, natural lighting"
```

## Required Flags

| Flag | Description |
|------|-------------|
| `--audio`, `-a` | Audio file (mp3, wav, ogg, m4a, aac) |
| `-d`, `--destination` | Output video path |

## Optional Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--image`, `-i` | - | Starting frame image |
| `--end-image` | - | Ending frame image |
| `--size`, `-s` | `landscape_16_9` | Video size |
| `--fps` | 25 | Frames per second |
| `--quality` | high | low, medium, high, maximum |
| `--camera` | none | dolly_in, dolly_out, jib_up, jib_down, static |
| `--no-match-length` | - | Don't auto-match video to audio duration |

## Video Sizes

`landscape_16_9`, `landscape_4_3`, `portrait_16_9`, `portrait_4_3`, `square_hd`, `square`, `auto`

## Limits

- **Max frames:** 481 frames
- **Max duration at 25fps:** ~19 seconds
- **Max duration at 24fps:** ~20 seconds

For longer videos, generate multiple clips and concatenate with ffmpeg.

## Pricing

~$0.001/megapixel. Example: 1280x720x121 frames = ~$0.11

## API Key

Uses `FAL_KEY` from `~/.claude/skills/image-generation/scripts/.env`
