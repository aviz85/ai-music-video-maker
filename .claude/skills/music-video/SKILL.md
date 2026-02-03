---
name: music-video
description: "Create multi-camera AI music videos from audio. Use for: music video, concert video, multi-angle video, AI video clip."
allowed-tools: Bash, Read, Write, Task
---

# Multi-Camera Music Video Generator

Generate professional multi-camera music videos from audio input using AI.

## Pipeline Overview

```
Audio Input → Gemini Deep Analysis → Storyboard (markdown) → 4K Collage (16:9) →
Split 9 Frames (16:9 each) → Audio Chunks → LTX Video Generation → Merge → Final Video (16:9)
```

## Default Format: 16:9

**CRITICAL:** All assets use 16:9 aspect ratio by default:
- Collage: 16:9 (e.g., 3840x2160 for 4K)
- Each frame: 16:9 (3x3 grid, no borders!)
- Final video: 16:9

When generating the collage, ALWAYS use `-a 16:9` flag with image-generation skill.

The 3x3 grid of 16:9 frames naturally creates a 16:9 overall collage:
- 3 columns × 16 = 48
- 3 rows × 9 = 27
- 48:27 = 16:9 ✓

## Quick Start

Claude orchestrates the entire pipeline. Provide:
- Audio file (MP3, WAV) OR prompt to generate music
- Optional: Duration limit (default: finds best vocal section)
- Optional: "cheap mode" for faster/cheaper generation

## Modes

| Mode | Description |
|------|-------------|
| **Default** | Best quality - Gemini for images, full LTX quality |
| **Cheap** | Budget mode - uses `--cheap` flag in image-generation (fal.ai FLUX klein), lower video quality |

When user asks for "cheap mode" or budget/quick generation:
- Use `--cheap` flag with image-generation skill
- Use `--quality low` with audio-to-video
- Shorter video segments (max 10 sec per clip)

## Project Structure

**IMPORTANT:** Each project creates a subfolder in the LOCAL project root `./projects/` (NOT inside the skill folder). This keeps all assets easily accessible for review.

```
projects/
└── rock-video-20260203/
    ├── audio/
    │   ├── original.mp3
    │   └── chunks/
    │       ├── shot_01.mp3
    │       └── ...
    ├── images/
    │   ├── collage.jpg (4K 3x3)
    │   └── angles/
    │       ├── angle_1.jpg (wide stage)
    │       ├── angle_2.jpg (singer closeup)
    │       ├── angle_3.jpg (guitar)
    │       ├── angle_4.jpg (drums)
    │       ├── angle_5.jpg (bass)
    │       ├── angle_6.jpg (crowd)
    │       ├── angle_7.jpg (silhouette)
    │       ├── angle_8.jpg (low angle)
    │       └── angle_9.jpg (behind band)
    ├── videos/
    │   ├── clips/
    │   │   └── shot_XX.mp4
    │   └── final.mp4
    └── storyboard.md
```

## Pipeline Steps

### 1. Audio Analysis (Gemini)

```bash
cd .claude/skills/audio-to-video/scripts
npx ts-node analyze_audio.ts <audio.mp3> <duration_seconds> <output.md>
```

Gemini **listens deeply** and outputs readable markdown:
- Finds sections with **clear vocals/lyrics**
- Identifies **instrument highlights** (guitar solos, drum fills)
- Maps **what we HEAR to what we SHOW**
- Recommends **best segment** for partial videos
- Creates shot list with **AUDIO REASON** for each cut

**Key rule:** Show what we hear. Vocals = singer. Guitar solo = guitarist. Drums = drummer.

### 2. Generate 4K Collage (16:9)

Use image-generation skill with `-a 16:9` and detailed 3x3 grid prompt:

```bash
# ALWAYS use 16:9 aspect ratio!
npx ts-node generate_poster.ts -d collage.jpg -a 16:9 -q 2K \
  "A 3x3 grid of 9 camera angles, SEAMLESS with ZERO borders between frames..."
```

**CRITICAL prompt rules:**
- Include "SEAMLESS with ZERO borders between frames"
- Each frame must show MID-ACTION movement (not static poses)
- Emphasize "LIVE PERFORMANCE" feel

### 3. Split Collage

```bash
bash scripts/split_collage.sh <collage.jpg> <output_dir>
```

### 4. Trim Audio Chunks

```bash
ffmpeg -i audio.mp3 -ss <start> -t <duration> -y chunk_N.mp3
```

### 5. Generate Video Clips

For each shot, use audio-to-video:
```bash
npx ts-node generate.ts --audio chunk.mp3 --image angle_X.jpg -d clip.mp4 "Description"
```

**Limit:** LTX max 481 frames (~19 sec at 25fps).

### 6. Merge Clips

```bash
cat > concat.txt << EOF
file 'clips/shot_01.mp4'
file 'clips/shot_02.mp4'
...
EOF
ffmpeg -f concat -safe 0 -i concat.txt -c copy final.mp4
```

## Storyboard Output Format

Gemini outputs readable markdown (not JSON):

```markdown
# MUSIC VIDEO STORYBOARD

## Audio Events Timeline
**Vocals:**
- 0:32-0:48 - Chorus vocals, strong declaration of freedom

**Guitar highlights:**
- 1:07-1:24 - Guitar solo

## RECOMMENDED SEGMENT (for partial video)
- **Start at:** 0:32 (chorus begins)
- **Why:** Clear vocals, high energy

## Shot List
[0:00-0:04] ANGLE_2 - Singer close-up | Vocals start strongly
[0:04-0:06] ANGLE_6 - Crowd shot | Energy peak
...
```

## Limits

- **LTX max frames:** 481 (~19 sec at 25fps)
- **9 camera angles** from single collage
- **Recommended shot length:** 2-5 seconds

## Dependencies

- `@google/genai` - Gemini audio analysis
- `fal-ai` - LTX video generation
- `ffmpeg` - Audio/video processing
- `imagemagick` - Image splitting
- Global `image-generation` skill
- Project-scoped `audio-to-video` skill
