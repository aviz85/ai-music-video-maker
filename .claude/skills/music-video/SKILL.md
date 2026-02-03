---
name: music-video
description: "Create multi-camera AI music videos from audio. Use for: music video, concert video, multi-angle video, AI video clip."
allowed-tools: Bash, Read, Write, Task
---

# Multi-Camera Music Video Generator

Generate professional multi-camera music videos from audio input using AI.

## Pipeline Overview

```
Audio Input → [ElevenLabs Transcribe + Gemini Analysis] → Aligned Storyboard →
4K Collage (16:9) → Split 9 Frames → Accurate Audio Chunks → LTX Video → Merge → Final (16:9)
```

## CRITICAL: Timing Alignment

**Problem:** Gemini's audio timing is often inaccurate.
**Solution:** Use ElevenLabs transcription (word-level timing) as ground truth.

### Pipeline:
1. **ElevenLabs Transcribe** → Get word-level timing (ground truth)
2. **Gemini Analysis** → Get musical structure, shot suggestions, LYRICS per shot
3. **Claude Aligns** → Match Gemini's lyrics to ElevenLabs timing
4. **Create Accurate Chunks** → Based on aligned timing

### Alignment Process:
```
Gemini says: [1:30-1:33] ANGLE_2 - Singer | LYRICS: "וגם אני חולם"
ElevenLabs says: "וגם" at 92.5s, "אני" at 93.1s, "חולם" at 93.8s
Aligned timing: [1:32.5-1:34.5] (based on actual word positions)
```

**Trust order:** ElevenLabs timing > Gemini timing

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

### 1a. Transcribe Audio (ElevenLabs) - GROUND TRUTH TIMING

Use the global `transcribe` skill to get word-level timing:

```bash
cd ~/.claude/skills/transcribe/scripts
npx ts-node transcribe.ts <audio.mp3> --json > transcription.json
```

Output includes word-level timestamps - these are **accurate** and should be trusted over Gemini.

### 1b. Audio Analysis (Gemini)

```bash
cd .claude/skills/audio-to-video/scripts
npx ts-node analyze_audio.ts <audio.mp3> <duration_seconds> <output.md>
```

Gemini **listens deeply** and outputs readable markdown:
- Finds sections with **clear vocals/lyrics**
- Identifies **instrument highlights** (guitar solos, drum fills)
- Maps **what we HEAR to what we SHOW**
- Recommends **best segment** for partial videos
- Creates shot list with **AUDIO REASON** and **LYRICS** for each cut

**IMPORTANT:** Gemini must output LYRICS for each shot so Claude can align with ElevenLabs.

### 1c. Claude Aligns Timing (Efficient Search)

**OPTIMIZATION:** Don't read the full JSON (too long). Use two-step search:

#### Step 1: Quick scan with SRT (shorter)
```bash
# SRT is smaller - use for initial word location
grep -n "target_word" transcription.srt
```

#### Step 2: Precise timing from JSON (targeted)
```python
# Only when you know the approximate position
# Search for specific words near that timestamp
python3 << 'EOF'
import json
with open('transcription_transcript.json', 'r') as f:
    data = json.load(f)
keywords = ['וגם', 'אני', 'חולם']  # Target words
for w in data['words']:
    word = w['word'].strip().replace('.', '').replace(',', '')
    if word in keywords:
        print(f"{w['start']:.2f}-{w['end']:.2f}: {w['word']}")
EOF
```

#### Handling Repeated Words (Songs)
Songs repeat lyrics. Find the **closest occurrence** to Gemini's suggested timestamp:
- If Gemini says chorus at 0:51, search for first occurrence near that time
- If same lyrics appear at 1:30 (2nd chorus), pick the one closest to target

Claude reads both outputs and:
1. Takes Gemini's shot suggestions (angles, descriptions, lyrics)
2. Quick-scans SRT to find approximate word location
3. Uses targeted JSON search for exact timing
4. Picks closest occurrence for repeated words
5. Creates aligned shot list with accurate timestamps

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

### 6. Merge Clips (Smooth Audio)

**CRITICAL:** Don't concatenate audio chunks - use continuous original audio to avoid choppy sound.

```bash
# Step 1: Extract continuous audio segment from original
ffmpeg -i original.mp3 -ss 72.5 -t 29.5 -y segment_audio.mp3

# Step 2: Create concat list for videos
cat > concat.txt << EOF
file 'clips/shot_01.mp4'
file 'clips/shot_02.mp4'
...
EOF

# Step 3: Concatenate videos WITHOUT audio
ffmpeg -f concat -safe 0 -i concat.txt -an -c:v copy video_only.mp4

# Step 4: Mux video with continuous audio (smooth, no choppiness)
ffmpeg -i video_only.mp4 -i segment_audio.mp3 -c:v copy -c:a aac -shortest final.mp4
```

This approach ensures:
- Video clips sync to their individual audio during generation
- Final merge uses ONE continuous audio track (no seams)
- No choppy sound from audio chunk boundaries

### 7. Lyrics Overlay (Optional)

Add animated lyrics using Remotion. Uses LyricsOverlay composition from remotion-assistant.

**CRITICAL: Offset Timestamps for Video Segments**

When working with a video segment (not full song), all lyrics timestamps must be offset:

```
Original song timing:     72.5s - 102.0s (chorus section)
Video clip timing:         0.0s -  29.5s (starts at 0)
OFFSET = 72.5 seconds (subtract from all timestamps)
```

**Example:**
```typescript
// ElevenLabs says word "חולם" appears at 75.52s in full song
// Video starts at 72.5s
// Offset: 75.52 - 72.5 = 3.02s
{ word: 'חולם', start: 3.02, end: 3.5 }  // relative to video start
```

**Workflow:**
1. Get word-level timing from ElevenLabs JSON
2. Calculate VIDEO_OFFSET = video segment start time
3. Subtract offset from ALL word timestamps
4. Create LyricsData with adjusted timing
5. Render with Remotion

```bash
# Render lyrics overlay
cd ~/remotion-assistant
npx remotion render CholemYosefLyrics /tmp/output.mp4 --props='{"style":"karaoke"}'
```

**Styles:** `karaoke` (words highlight), `fade` (words fade in), `minimal` (line shows, current word highlights)

## Storyboard Output Format

Gemini outputs readable markdown (not JSON) with **VIDEO PROMPT** for each shot:

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
Format: [START-END] ANGLE_X - Description | AUDIO REASON | LYRICS: "lyrics" | PROMPT: "video prompt"

[0:00-0:04] ANGLE_2 - Singer close-up | Vocals start | LYRICS: "וגם אני" | PROMPT: "LIVE CONCERT: Singer closeup, SINGING with mouth moving, veins in neck, intense emotion"
[0:04-0:06] ANGLE_6 - Crowd shot | Energy peak | PROMPT: "LIVE CONCERT: Crowd jumping, hands in air, stage lights pulsing"
...
```

**PROMPT field is CRITICAL** - Used directly by audio-to-video for each clip generation.

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
