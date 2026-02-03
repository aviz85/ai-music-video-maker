# Automation Created

## Claude Code Skills Architecture

This project uses a modular skill-based architecture where each capability is encapsulated as a reusable skill. Skills are Claude Code's way of packaging domain knowledge and automation.

### Skills Created

```
.claude/skills/
  music-video/           # Main orchestration skill
    SKILL.md             # Pipeline documentation
    scripts/
      split_collage.sh   # ImageMagick 3x3 splitter

  audio-to-video/        # fal.ai LTX-2 wrapper
    SKILL.md             # API documentation
    scripts/
      generate.ts        # Video generation CLI
      analyze_audio.ts   # Gemini audio analysis

  remotion-render/       # Video rendering commands
    SKILL.md             # Render workflow

  video-common/          # Shared utilities
    SKILL.md             # Common patterns
    references/
      codecs.md          # Encoding options
      animations.md      # Animation patterns

  remotion-best-practices/  # Remotion knowledge base
    SKILL.md
    rules/               # 20+ specific rules
      timing.md
      audio.md
      fonts.md
      ...
```

### Skill: music-video

**Trigger:** "create music video", "multi-camera video"

**What it does:**
- Orchestrates the full pipeline from audio to final video
- Manages project folder structure
- Coordinates timing alignment between Gemini and ElevenLabs
- Handles both "default" (quality) and "cheap" (budget) modes

**Key automation:**
```markdown
## Modes
| Mode | Description |
|------|-------------|
| **Default** | Best quality - Gemini for images, full LTX quality |
| **Cheap** | Budget mode - fal.ai FLUX klein, lower video quality |
```

### Skill: audio-to-video

**Trigger:** "audio to video", "talking head", "lip sync"

**CLI wrapper for fal.ai:**
```bash
npx ts-node generate.ts \
  --audio /path/to/speech.mp3 \
  --image /path/to/face.png \
  -d /tmp/output.mp4 \
  "A woman speaks to camera, natural lighting"
```

**Key automation:**
- Handles file upload to fal.ai storage
- Manages API configuration from shared .env
- Downloads and saves output video
- Supports multiple quality/size options

### Skill: analyze_audio.ts

**Purpose:** Gemini-powered music director

**What it generates:**
1. Music analysis (genre, tempo, instruments, energy arc)
2. Audio events timeline (vocals, guitar, drums)
3. Best segment recommendation
4. 9 camera angle descriptions
5. Complete shot list with LYRICS field

**Key prompt engineering:**
```
When you hear VOCALS -> Show SINGER (ANGLE_2 or ANGLE_8)
When you hear GUITAR SOLO -> Show GUITARIST (ANGLE_3)
When you hear DRUM FILL -> Show DRUMMER (ANGLE_4)
```

### Skill: split_collage.sh

**Purpose:** Split 3x3 collage into 9 images

```bash
#!/bin/bash
# Get image dimensions
WIDTH=$(magick identify -format "%w" "$INPUT")
HEIGHT=$(magick identify -format "%h" "$INPUT")

# Calculate cell size
CELL_W=$((WIDTH / 3))
CELL_H=$((HEIGHT / 3))

# Extract 9 cells
magick "$INPUT" -crop ${CELL_W}x${CELL_H}+0+0 +repage angle_1.jpg
# ... etc
```

## Project Structure Convention

Each video project creates a dated subfolder:
```
projects/
  cholem-yosef-20260203/
    audio/
      original.mp3
      chunks/
        shot_01.mp3
        shot_02.mp3
    images/
      collage.jpg
      angles/
        angle_1.jpg ... angle_9.jpg
    videos/
      clips/
        shot_01.mp4 ... shot_09.mp4
      final.mp4
    storyboard.md
    aligned_shots.md
    transcription.json
    transcription.srt
```

## How Claude Code Agent Helped

### Iterative Problem Solving

The timing alignment problem was solved through conversation:

1. **First attempt:** Use Gemini timestamps directly
   - Result: Cuts happened at wrong moments
   - Learning: Gemini timing is creative but inaccurate

2. **Second attempt:** Run ElevenLabs separately
   - Result: Two different timing systems with no connection
   - Learning: Need to match lyrics to bridge the systems

3. **Final solution:** Use LYRICS field as alignment key
   - Gemini outputs lyrics per shot
   - ElevenLabs provides word-level timing
   - Claude matches lyrics to find accurate timestamps

### Real-Time API Integration

Claude called multiple APIs during development:
- Tested ElevenLabs transcription on sample audio
- Iterated on Gemini prompts to get LYRICS field
- Experimented with LTX-2 parameters for best motion

### Quality Review Loop

Each pipeline step was verified:
1. Review Gemini storyboard - does it match the music?
2. Check collage image - are all 9 angles distinct?
3. Verify split images - correct dimensions?
4. Review video clips - does motion match audio?
5. Test final merge - smooth audio playback?

### Communication

Results shared via:
- Screenshots of collages
- Sample video clips
- Side-by-side timing comparisons

## Reusable Components

### Timing Alignment Pattern

This pattern works for any audio-to-visual sync task:
```
1. Get ACCURATE timing (ElevenLabs word-level)
2. Get CREATIVE direction (Gemini analysis)
3. Use CONTENT as key (lyrics matching)
4. Output ALIGNED timeline
```

### Collage-to-Consistency Pattern

This pattern ensures visual consistency:
```
1. Generate ONE image with multiple views
2. Split into individual frames
3. Use frames as starting points for video
4. Result: Consistent visual style across all clips
```

### Smooth Audio Merge Pattern

This pattern eliminates audio seams:
```
1. Generate clips with individual audio (for sync)
2. Concatenate video tracks only (strip audio)
3. Mux with ONE continuous audio track
4. Result: Smooth playback
```

## CLAUDE.md Integration

The project can be enhanced with a CLAUDE.md file:
```markdown
# AI Music Video Maker

## Skills
- /music-video - Create multi-camera video from audio
- /audio-to-video - Generate single video clip from audio + image

## Default Workflow
1. User provides audio file
2. Run ElevenLabs transcription for ground truth
3. Run Gemini analysis for creative direction
4. Align timing and generate collage
5. Split and create video clips
6. Merge with smooth audio

## Cost Control
- Default mode: Best quality (~$2 per 30s)
- Cheap mode: Budget friendly (~$0.50 per 30s)
  - Use --cheap flag with image-generation
  - Use --quality low with audio-to-video
```

## Future Automation Opportunities

### Hook: Post-Video Generation
```yaml
trigger: after video generation completes
action:
  - Upload to review folder
  - Notify via WhatsApp
  - Create thumbnail
```

### Scheduled Task: Batch Processing
```yaml
trigger: cron daily at 2am
action:
  - Check for new audio files in queue/
  - Process each with default settings
  - Move completed to done/
```

### Agent: Music Video Assistant
```yaml
trigger: "create music video for [song]"
capabilities:
  - Search for song on YouTube
  - Download audio (youtube-dl)
  - Run full pipeline
  - Ask for feedback
  - Iterate on style
```
