# The Workflow Pipeline

## Overview Architecture

```
                                      GROUND TRUTH
                                          |
                                          v
[Audio File] -----> [ElevenLabs Transcribe] ----> Word-Level Timing
      |                                               |
      |                                               |
      +-----------> [Gemini Audio Analysis] ----> Shot Suggestions + Lyrics
                           |                          |
                           v                          v
                    [Claude Aligns] <-----------------+
                           |
                           v
                   [Aligned Storyboard]
                           |
                           v
        [image-generation skill] --> 4K Collage (3x3 Grid, 16:9)
                           |
                           v
                  [ImageMagick Split] --> 9 Camera Angle Images
                           |
                           v
                  [FFmpeg Audio Chunks] --> Individual Shot Audio
                           |
                           v
             [fal.ai LTX-2 19B] --> 9 Video Clips (audio-driven)
                           |
                           v
              [FFmpeg Merge] --> Video Only + Continuous Audio
                           |
                           v
                     [Final 16:9 Video]
                           |
                           v (optional)
              [Remotion Lyrics Overlay]
```

## Step 1: Transcribe Audio (ElevenLabs) - Ground Truth Timing

### What We Did
ElevenLabs Scribe provides word-level timing that is significantly more accurate than AI audio analysis. This becomes our "source of truth" for when things actually happen in the song.

### Technical Details
```bash
cd ~/.claude/skills/transcribe/scripts
npx ts-node transcribe.ts /path/to/song.mp3 --json > transcription.json
```

### Why This Step
Gemini's audio analysis is creative and musically intelligent, but its timestamps can be off by 10-20+ seconds. ElevenLabs gives us precise word positions to anchor our cuts.

### Output
- `transcription.json` - Word-level timing with start/end for each word
- `transcription.srt` - Human-readable subtitle format

**Example output:**
```json
{
  "words": [
    { "word": "also", "start": 72.5, "end": 72.8 },
    { "word": "me", "start": 72.9, "end": 73.2 },
    { "word": "dreaming", "start": 73.3, "end": 73.9 }
  ]
}
```

## Step 2: Audio Analysis (Gemini) - Creative Direction

### What We Did
Gemini listens to the entire audio track and creates a music video storyboard, acting as a professional director who understands musical structure.

### Technical Details
```bash
cd .claude/skills/audio-to-video/scripts
npx ts-node analyze_audio.ts /path/to/song.mp3 30 storyboard.md
```

### Why This Step
Gemini provides:
- Musical structure analysis (verses, choruses, bridges)
- Energy arc understanding
- Shot suggestions matched to audio events
- Camera angle recommendations based on what's audible

### Output
Readable markdown storyboard:
```markdown
## Shot List
[0:00-0:03] ANGLE_2 - Singer closeup | Vocals begin | LYRICS: "also me dreaming"
[0:03-0:05] ANGLE_4 - Drummer | Drum fill here | LYRICS: (instrumental)
```

**Key insight:** Gemini must output LYRICS for each shot so Claude can align them.

## Step 3: Claude Aligns Timing

### What We Did
Claude reads both outputs and creates the final shot list by matching Gemini's lyrics to ElevenLabs timing.

### Technical Details
Two-step search for efficiency:
```bash
# Step 1: Quick scan with SRT (smaller file)
grep -n "target_word" transcription.srt

# Step 2: Precise timing from JSON
python3 << 'EOF'
import json
with open('transcription_transcript.json', 'r') as f:
    data = json.load(f)
for w in data['words']:
    if 'target' in w['word'].lower():
        print(f"{w['start']:.2f}-{w['end']:.2f}: {w['word']}")
EOF
```

### Why This Step
Songs repeat lyrics. Claude finds the closest word occurrence to Gemini's suggested timestamp:
- Gemini says chorus at 0:51
- ElevenLabs shows "dreaming" at 32.5s, 72.5s, and 112.5s
- Claude picks 72.5s as closest to Gemini's estimate

### Output
Aligned shot list with accurate timestamps:
```markdown
| Shot | Time | Angle | Lyrics |
|------|------|-------|--------|
| 01 | 72.5-76.3 | ANGLE_2 | also me dreaming like |
| 02 | 76.3-78.2 | ANGLE_8 | Joseph |
```

## Step 4: Generate 4K Collage (16:9)

### What We Did
Generate a single 4K image containing all 9 camera angles in a 3x3 grid. This ensures visual consistency - same lighting, same performers, same concert.

### Technical Details
```bash
npx ts-node generate_poster.ts -d collage.jpg -a 16:9 -q 2K \
  "A 3x3 grid of 9 camera angles of a rock concert, SEAMLESS with ZERO borders between frames.
   Row 1: Wide stage shot | Singer closeup SINGING | Guitarist playing
   Row 2: Drummer action | Bassist grooving | Crowd with raised hands
   Row 3: Side silhouette | Low angle singer | Behind band POV
   Each frame 16:9 aspect ratio, stadium lighting, professional concert photography"
```

**CRITICAL rules:**
- Always use `-a 16:9` for proper aspect ratio
- Include "SEAMLESS with ZERO borders" in prompt
- Describe each of the 9 frames
- Emphasize "MID-ACTION" and "LIVE PERFORMANCE"

### Why This Step
Generating 9 separate images = 9 different-looking concerts. One collage = one consistent "vision" from the AI.

### Output
4K collage image (e.g., 3840x2160) with 9 frames

## Step 5: Split Collage into 9 Angles

### What We Did
Use ImageMagick to split the collage into 9 individual frame images.

### Technical Details
```bash
bash scripts/split_collage.sh collage.jpg angles/

# Script calculates cell dimensions:
# WIDTH = 3840, HEIGHT = 2160
# CELL_W = 1280, CELL_H = 720 (HD per angle)

# Extracts each cell:
magick collage.jpg -crop 1280x720+0+0 +repage angle_1.jpg
magick collage.jpg -crop 1280x720+1280+0 +repage angle_2.jpg
# ... etc for all 9
```

### Why This Step
LTX video generation needs individual starting frames. Each angle becomes a separate video clip.

### Output
```
angles/
  angle_1.jpg  (wide stage)
  angle_2.jpg  (singer closeup)
  angle_3.jpg  (guitarist)
  angle_4.jpg  (drummer)
  angle_5.jpg  (bassist)
  angle_6.jpg  (crowd)
  angle_7.jpg  (silhouette)
  angle_8.jpg  (low angle singer)
  angle_9.jpg  (behind band)
```

## Step 6: Create Audio Chunks

### What We Did
Extract individual audio segments for each shot using the aligned timestamps.

### Technical Details
```bash
# For shot 01 (72.5s to 76.3s):
ffmpeg -i original.mp3 -ss 72.5 -t 3.8 -y chunks/shot_01.mp3

# For shot 02 (76.3s to 78.2s):
ffmpeg -i original.mp3 -ss 76.3 -t 1.9 -y chunks/shot_02.mp3
```

### Why This Step
LTX-2 generates audio-driven video - the AI watches the audio waveform to animate motion. Each clip needs its specific audio segment.

### Output
Individual MP3 files for each shot

## Step 7: Generate Video Clips (LTX-2)

### What We Did
Use fal.ai LTX-2 19B model to generate video clips from audio + starting image.

### Technical Details
```bash
cd .claude/skills/audio-to-video/scripts
npx ts-node generate.ts \
  --audio chunks/shot_01.mp3 \
  --image angles/angle_2.jpg \
  -d clips/shot_01.mp4 \
  "LIVE CONCERT: Singer closeup, SINGING with mouth moving, intense emotion, stage lighting"
```

### Why This Step
LTX-2 creates motion that syncs to the audio - the singer's mouth moves when there are vocals, the guitarist strums when there's guitar. The starting image ensures visual consistency.

### Limits
- **Max frames:** 481 (~19 seconds at 25fps)
- For longer shots, generate in segments and concatenate

### Output
Individual MP4 clips for each shot

## Step 8: Merge with Smooth Audio

### What We Did
Concatenate video clips but replace audio with a single continuous track from the original file.

### Technical Details
```bash
# Step 1: Extract continuous audio segment
ffmpeg -i original.mp3 -ss 72.5 -t 29.5 -y segment_audio.mp3

# Step 2: Create concat list
cat > concat.txt << EOF
file 'clips/shot_01.mp4'
file 'clips/shot_02.mp4'
file 'clips/shot_03.mp4'
EOF

# Step 3: Concatenate videos WITHOUT audio
ffmpeg -f concat -safe 0 -i concat.txt -an -c:v copy video_only.mp4

# Step 4: Mux video with continuous audio
ffmpeg -i video_only.mp4 -i segment_audio.mp3 -c:v copy -c:a aac -shortest final.mp4
```

### Why This Step
Concatenating audio chunks creates audible seams at clip boundaries. Using one continuous audio track eliminates choppiness.

### Output
Final smooth video with professional-sounding audio

## Step 9: Lyrics Overlay (Optional)

### What We Did
Add animated lyrics using Remotion with timestamp offset handling.

### Technical Details
**CRITICAL: Offset timestamps for video segments**

```typescript
// Video segment starts at 72.5s in the original song
// But video timeline starts at 0
const VIDEO_OFFSET = 72.5;

// ElevenLabs says "dreaming" at 75.52s
// Adjusted: 75.52 - 72.5 = 3.02s
{ word: 'dreaming', start: 3.02, end: 3.5 }
```

```bash
cd ~/remotion-assistant
npx remotion render LyricsOverlay output.mp4 --props='{"style":"karaoke"}'
```

**Styles available:**
- `karaoke` - Words highlight as they're sung
- `fade` - Words fade in
- `minimal` - Line shows, current word highlights

### Why This Step
Adds professional polish and helps viewers follow along with lyrics.

### Output
Final video with synchronized lyrics overlay

## Complete Pipeline Summary

```
1. ElevenLabs Transcribe --> Word timing (ground truth)
2. Gemini Analysis       --> Creative shot list + lyrics per shot
3. Claude Alignment      --> Accurate timestamps from lyrics matching
4. Image Generation      --> 4K 3x3 collage (visual consistency)
5. ImageMagick Split     --> 9 individual angle images
6. FFmpeg Audio Chunks   --> Per-shot audio segments
7. LTX-2 Video Gen       --> Audio-driven video clips
8. FFmpeg Merge          --> Smooth continuous audio
9. Remotion (optional)   --> Lyrics overlay
```

**Total processing time:** ~10-15 minutes for a 30-second video
**Estimated cost:** ~$5-10 (mostly video generation API calls)
