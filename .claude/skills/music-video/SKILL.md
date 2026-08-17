---
name: music-video
description: "Create multi-camera AI music videos from audio. Use for: music video, concert video, multi-angle video, AI video clip."
allowed-tools: Bash, Read, Write, Task
---

# Multi-Camera Music Video Generator

Generate professional AI music videos from a YouTube URL or audio file. The pipeline finds the most powerful moment, cuts it precisely, generates unique cinematic visuals, and adds animated lyrics.

## Pipeline Overview

```
YouTube URL → MP3 → ElevenLabs (word-level timing) → Gemini (listen + build visual plan)
→ Aligned Chorus Cut (20-30s) → 4K Collage → Split 9 Angles → LTX 2.5 Pro Clips → Merge → Remotion Lyrics → Final MP4
```

## Quick Start

Provide: song name + artist (or YouTube URL). Claude runs everything.

Target: **20-30 seconds** of the strongest moment (chorus/peak). Default 16:9.

---

## Step 0: Download from YouTube

```bash
mkdir -p projects/<slug>/audio
yt-dlp -x --audio-format mp3 --audio-quality 0 \
  -o "projects/<slug>/audio/original.%(ext)s" \
  "ytsearch1:<Artist> <Song> official audio"
```

---

## Step 1a: Transcribe (Word-Level Timing — GROUND TRUTH)

```bash
mkdir -p projects/<slug>/subtitles
cd /Users/aviz/.claude/skills/transcribe/scripts
npx tsx transcribe.ts \
  -i projects/<slug>/audio/original.mp3 \
  -o projects/<slug>/subtitles/words \
  --json
```

Outputs: `subtitles/words` (JSON with word timestamps) + `subtitles/words.srt`

---

## Step 1b: Gemini Audio Analysis (FULL CREATIVE BRIEF)

```bash
cd /Users/aviz/ai-music-video-maker/.claude/skills/audio-to-video/scripts
npx ts-node analyze_audio.ts \
  projects/<slug>/audio/original.mp3 \
  30 \
  projects/<slug>/storyboard.md \
  --request "Listen deeply. Find the most powerful, energetic chorus (20-30 seconds). Describe the song's UNIQUE visual identity: color palette, lighting mood, specific aesthetic details. SINGER-FIRST RULE: 60-70% of shots MUST be the singer (ANGLE_2 or ANGLE_8). Only cut to other instruments/crowd during clear instrumental breaks with no vocals. For ALL singer shots, the prompt MUST include 'mouth open singing, lip sync, close-up face' so LTX 2.5 generates synchronized mouth movement. For each shot: write a vivid cinematic PROMPT. Pattern: singer (4s) → brief cutaway (2s) → singer (4s) → brief cutaway (2s). NEVER generic — be hyper-specific to THIS song's vibe."
```

**Gemini's job:** Listen to the music, understand the song's unique identity, build shot-specific prompts that bring THAT song to life. It outputs a storyboard with timing + custom prompts per shot.

---

## Step 1c: Align Timing (ElevenLabs → Ground Truth)

Gemini gives approximate timing. Refine using word-level JSON:

```python
python3 << 'EOF'
import json
with open('projects/<slug>/subtitles/words', 'r') as f:
    data = json.load(f)

# Explore structure first
print("Keys:", list(data.keys()))

# Find words near Gemini's suggested chorus start
target = <GEMINI_START_SECONDS>
words = data.get('words', data.get('alignment', {}).get('words', []))
for w in words:
    t = w.get('start', w.get('startTime', 0))
    if abs(t - target) < 8:
        print(f"{t:.3f}s  {w.get('word','')}")
EOF
```

Use the exact word timestamp as the real cut point.

---

## Step 2: Create Audio Chunks

Split the chorus into clips of **3-5 seconds each** (LTX 2.5 Pro limit: max 10s per clip):

```bash
mkdir -p projects/<slug>/audio/chunks
# For a 25-second chorus starting at 42.3s, create 6 chunks of ~4s:
ffmpeg -i projects/<slug>/audio/original.mp3 -ss 42.300 -t 4.0 -y projects/<slug>/audio/chunks/chunk_01.mp3
ffmpeg -i projects/<slug>/audio/original.mp3 -ss 46.300 -t 4.0 -y projects/<slug>/audio/chunks/chunk_02.mp3
# etc.
```

---

## Step 3: Generate 4K Collage

**Gemini builds this prompt based on the song.** Include the Gemini-generated visual identity in the prompt.

```bash
mkdir -p projects/<slug>/images/angles
cd /Users/aviz/.claude/skills/image-generation/scripts
npx ts-node generate_poster.ts \
  -d projects/<slug>/images/collage.jpg \
  -a 16:9 -q 2K \
  "<GEMINI_GENERATED_COLLAGE_PROMPT>"
```

**Collage prompt MUST include:**
- Artist's specific look (hair, outfit, stage presence)
- Song's unique color palette
- Specific lighting design (not generic "concert lights")
- 9 distinct action frames — each mid-motion, NO static poses
- "SEAMLESS ZERO borders between frames"
- Varied subjects: singer, guitarist, drummer, bassist, crowd, silhouette, wide, low-angle, behind-band

---

## Step 4: Split Collage → 9 Angles

```bash
bash /Users/aviz/ai-music-video-maker/.claude/skills/music-video/scripts/split_collage.sh \
  projects/<slug>/images/collage.jpg \
  projects/<slug>/images/angles/
```

Creates `angle_1.jpg` through `angle_9.jpg`

---

## Step 5: Generate Video Clips (LTX 2.5 Pro)

```bash
mkdir -p projects/<slug>/videos/clips
cd /Users/aviz/ai-music-video-maker/.claude/skills/audio-to-video/scripts

npx ts-node generate.ts \
  --audio projects/<slug>/audio/chunks/chunk_01.mp3 \
  --image projects/<slug>/images/angles/angle_2.jpg \
  -d projects/<slug>/videos/clips/shot_01.mp4 \
  "<GEMINI_GENERATED_SHOT_PROMPT_FOR_CHUNK_01>"
```

**Rules:**
- **SINGER-FIRST: 60-70% of shots must be singer (ANGLE_2 or ANGLE_8)** — when vocals are heard, always use singer angle
- Only cut away to instruments/crowd during clear instrumental breaks (no vocals)
- NEVER repeat same angle in consecutive shots
- Each prompt must describe: **subject action + camera movement + lighting event + emotion**
- Singer shot prompts MUST include: **"mouth open singing, lip sync, close-up face"** — this drives LTX audio sync
- Non-singer shots are brief (2-3s) transitions between singer shots, not main content
- Pattern: singer (4s) → wide/instrument (2s) → singer (4s) → crowd (2s) → singer (4s)

---

## Step 6: Merge with Continuous Audio

```bash
# Concat list — use original clips/ (fps handled by Remotion at Step 7)
ls projects/<slug>/videos/clips/shot_*.mp4 | sort | \
  awk '{print "file \047"$0"\047"}' > /tmp/concat_<slug>.txt

# Join videos (no audio)
ffmpeg -f concat -safe 0 -i /tmp/concat_<slug>.txt -an -c:v copy \
  projects/<slug>/videos/video_only.mp4

# Extract original continuous audio for the segment
CHORUS_START=<aligned_start>
TOTAL_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 \
  projects/<slug>/videos/video_only.mp4)
ffmpeg -i projects/<slug>/audio/original.mp3 \
  -ss $CHORUS_START -t $TOTAL_DUR \
  -y projects/<slug>/audio/chorus_audio.mp3

# Mux + fade out
FADE_START=$(echo "$TOTAL_DUR - 2" | bc)
ffmpeg -i projects/<slug>/videos/video_only.mp4 \
  -i projects/<slug>/audio/chorus_audio.mp3 \
  -vf "fade=t=out:st=${FADE_START}:d=2" \
  -af "afade=t=out:st=${FADE_START}:d=2" \
  -c:v libx264 -c:a aac -shortest \
  projects/<slug>/videos/merged.mp4

# CRITICAL for Remotion: re-encode with all keyframes (g=1) for frame-accurate seeking
# Without this, Remotion will produce choppy output
ffmpeg -i projects/<slug>/videos/merged.mp4 \
  -c:v libx264 -g 1 -keyint_min 1 -sc_threshold 0 \
  -c:a copy \
  -y projects/<slug>/videos/merged_remotion.mp4
```

---

## Step 7: Remotion Lyrics Overlay (MANDATORY)

### Setup
```bash
REMOTION=/Users/aviz/remotion-assistant
SLUG=<slug>

# Copy assets — use merged_remotion.mp4 (all-keyframe version for Remotion seeking)
cp projects/$SLUG/videos/merged_remotion.mp4 $REMOTION/public/videos/${SLUG}.mp4
cp projects/$SLUG/subtitles/words $REMOTION/public/lyrics/${SLUG}.json
```

### Choose style based on song genre:
| Genre | Style | Component |
|-------|-------|-----------|
| Pop, dance | `karaoke` | `LyricsOverlay` |
| Synthwave, EDM | `neon` | `LyricsOverlayNeon` |
| Dark, dramatic | `cinematic` | `LyricsOverlayCinematic` |
| Fun, upbeat | `bounce` | `LyricsOverlayBounce` |
| Indie, retro | `typewriter` | `LyricsOverlayTypewriter` |

### Create composition
```typescript
// $REMOTION/src/compositions/Temp_<Slug>.tsx
import { LyricsOverlay, parseElevenLabsTranscript } from './LyricsOverlay';
import { shiftLyricsTiming } from '../utils/lyricsParser';
import { staticFile } from 'remotion';

const transcript = require('../../public/lyrics/<slug>.json');

const CHORUS_START = <CHORUS_START_SECONDS>;

export const Temp_<Slug>: React.FC = () => {
  // CRITICAL: filter to only words at/after chorus start BEFORE parsing
  // Without this, pre-chorus words get clamped to t=0 and all appear at frame 0
  const filteredTranscript = {
    ...transcript,
    words: (transcript.words || []).filter((w: any) => {
      const t = w.start ?? w.startTime ?? 0;
      return t >= CHORUS_START;
    }),
  };

  const raw = parseElevenLabsTranscript(filteredTranscript, {
    maxWordsPerLine: 6,
    lineGapThreshold: 0.8,
  });
  const lyrics = shiftLyricsTiming(raw, -CHORUS_START);

  return (
    <LyricsOverlay
      videoSrc={staticFile('videos/<slug>.mp4')}
      lyrics={lyrics}
      style="karaoke"
      fontSize={72}
    />
  );
};
```

### Register in Root.tsx — CRITICAL: use fps={24} to match LTX 2.5 output
```typescript
// LTX 2.5 Pro generates 24fps. Set fps={24} so Remotion matches natively — no re-encoding needed.
<Composition
  id="Temp_<Slug>"
  component={Temp_<Slug>}
  fps={24}
  durationInFrames={Math.round(<DURATION_SECONDS> * 24)}
  width={1920}
  height={1080}
/>
```

### Register in Root.tsx, render, then cleanup
```bash
# Add to Root.tsx (under existing compositions)
cd $REMOTION
npx remotion render Temp_<Slug> out/${SLUG}_lyrics.mp4

# Copy result
cp out/${SLUG}_lyrics.mp4 /Users/aviz/ai-music-video-maker/projects/$SLUG/videos/final.mp4

# Cleanup: remove temp composition + public assets
rm src/compositions/Temp_<Slug>.tsx
rm public/videos/${SLUG}.mp4
rm public/lyrics/${SLUG}.json
# Remove the Composition entry from Root.tsx
```

---

## Project Structure

```
projects/<slug>/
├── audio/
│   ├── original.mp3
│   ├── chorus_audio.mp3
│   └── chunks/chunk_01.mp3 ... chunk_N.mp3
├── subtitles/
│   ├── words          (word-level JSON)
│   └── words.srt
├── images/
│   ├── collage.jpg    (4K 3x3)
│   └── angles/
│       ├── angle_1.jpg ... angle_9.jpg
├── videos/
│   ├── clips/shot_01.mp4 ... shot_N.mp4
│   ├── video_only.mp4
│   ├── merged.mp4
│   └── final.mp4      ← FINAL OUTPUT
└── storyboard.md      (Gemini's full analysis + prompts)
```

---

## Key Principles

**Timing:** ElevenLabs word timestamps > Gemini timing. Always verify with JSON.

**Visuals:** Gemini hears the song → Gemini designs the visual identity. Don't use generic prompts.

**Variety:** Never same angle twice in a row. Rotate: closeup → wide → instrument → crowd → silhouette.

**Motion:** Every video prompt must include: what moves + how camera moves + lighting event.

**Audio:** Always mux from original continuous audio (no chunk seams). Fade out 2s.

---

## Dependencies

- `yt-dlp` — YouTube download
- `ffmpeg` — audio/video processing
- `imagemagick` — collage splitting
- `ElevenLabs` — word-level transcription (`transcribe` skill)
- `Gemini` — audio analysis + prompt generation (`audio-to-video/scripts/analyze_audio.ts`)
- `fal.ai LTX 2.5 Pro` — video generation (`lightricks/ltx-2.5/audio-to-video/pro`)
- `Remotion` — lyrics overlay (`~/remotion-assistant`)
