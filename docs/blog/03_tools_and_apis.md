# Tools and APIs

## Complete Tech Stack

| Tool | Purpose | Endpoint/Package |
|------|---------|------------------|
| ElevenLabs Scribe | Word-level transcription | `elevenlabs` npm package |
| Google Gemini | Audio analysis & storyboarding | `@google/genai` (gemini-3-flash-preview) |
| fal.ai LTX-2 | Audio-to-video generation | `fal-ai/ltx-2-19b/distilled/audio-to-video` |
| fal.ai FLUX | Image generation (collages) | `fal-ai/flux-pro/v1.1-ultra` |
| FFmpeg | Audio/video processing | CLI |
| ImageMagick | Image splitting | CLI (v7 `magick` command) |
| Remotion | Lyrics overlay | `remotion` npm package |

## ElevenLabs Transcription

### Purpose
Get word-level timing as ground truth for lyric synchronization.

### Setup
```bash
npm install elevenlabs
export ELEVENLABS_API_KEY=your_key
```

### Usage
```typescript
import { ElevenLabsClient } from 'elevenlabs';

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

const result = await client.audioNative.convertText({
  file: fs.createReadStream('song.mp3'),
  model_id: 'scribe_v1',
  language: 'auto'
});

// Returns word-level timing
result.words.forEach(w => {
  console.log(`${w.start}-${w.end}: ${w.word}`);
});
```

### Output Format
```json
{
  "text": "full transcription",
  "words": [
    { "word": "hello", "start": 0.5, "end": 0.8 },
    { "word": "world", "start": 0.9, "end": 1.2 }
  ]
}
```

### Cost
- ~$0.0001 per second of audio
- 3-minute song: ~$0.02

### Gotchas
- Hebrew/non-English may need language hint
- Very noisy audio reduces accuracy
- Background music can interfere with word detection

## Google Gemini Audio Analysis

### Purpose
Creative audio analysis - understands musical structure, identifies instruments, suggests shot timing.

### Setup
```bash
npm install @google/genai
export GEMINI_API_KEY=your_key
```

### Usage
```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const audioBuffer = fs.readFileSync('song.mp3');
const audioBase64 = audioBuffer.toString('base64');

const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: [{
    role: "user",
    parts: [
      { inlineData: { mimeType: "audio/mp3", data: audioBase64 }},
      { text: "Analyze this audio and create a shot list..." }
    ]
  }]
});
```

### Key Capabilities
- Identifies instruments and their prominence
- Detects vocal sections vs instrumental
- Understands energy arc (verse/chorus/bridge)
- Can recommend best segment for short videos
- Suggests camera angles based on audio content

### Cost
- Free tier: 60 requests/minute
- Pay-as-you-go: ~$0.001 per 1K input tokens

### Gotchas
- **Timestamps are often inaccurate** - use for creative direction, not timing
- Long audio files may need chunking
- Model may hallucinate lyrics - always verify with transcription

### Limitations
- Timing accuracy: +/- 5-20 seconds off
- Cannot reliably detect exact beat positions
- May miss quiet instrumental details

## fal.ai LTX-2 (Audio-to-Video)

### Purpose
Generate video clips driven by audio - motion syncs to sound.

### Setup
```bash
npm install @fal-ai/client
export FAL_KEY=your_key
```

### Usage
```typescript
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY });

// Upload files first
const audioUrl = await fal.storage.upload(audioFile);
const imageUrl = await fal.storage.upload(imageFile);

const result = await fal.subscribe('fal-ai/ltx-2-19b/distilled/audio-to-video', {
  input: {
    prompt: "Singer performing on stage, mouth moving, intense emotion",
    audio_url: audioUrl,
    image_url: imageUrl,
    match_audio_length: true,
    video_size: 'landscape_16_9',
    fps: 25,
    video_quality: 'high',
    enable_prompt_expansion: true
  }
});

// Download result
const videoUrl = result.data.video.url;
```

### Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | string | required | Motion description |
| `audio_url` | string | required | Uploaded audio file URL |
| `image_url` | string | optional | Starting frame |
| `end_image_url` | string | optional | Ending frame |
| `match_audio_length` | boolean | true | Auto-match video duration to audio |
| `video_size` | string | 'landscape_16_9' | Output aspect ratio |
| `fps` | number | 25 | Frames per second |
| `video_quality` | string | 'high' | low/medium/high/maximum |
| `camera_lora` | string | none | dolly_in/dolly_out/jib_up/jib_down/static |

### Video Sizes
- `landscape_16_9` (default)
- `landscape_4_3`
- `portrait_16_9`
- `portrait_4_3`
- `square_hd`
- `square`
- `auto`

### Cost
- ~$0.001 per megapixel
- 1280x720 @ 25fps for 5 seconds (125 frames): ~$0.11
- 30-second video (9 clips): ~$1-2

### Limits
- **Max frames:** 481 (~19 seconds at 25fps)
- For longer clips, generate in segments

### Gotchas
- First frame heavily influences style
- Prompt should describe MOTION, not static scene
- Audio quality affects motion quality
- Complex prompts may be ignored - keep it simple

## fal.ai FLUX (Image Generation)

### Purpose
Generate the 4K collage image with 9 camera angles.

### Usage
```typescript
const result = await fal.subscribe('fal-ai/flux-pro/v1.1-ultra', {
  input: {
    prompt: "3x3 grid of concert camera angles...",
    aspect_ratio: '16:9',
    output_format: 'jpeg',
    safety_tolerance: 6
  }
});
```

### Critical Prompt Elements
```
"A 3x3 grid of 9 camera angles, SEAMLESS with ZERO borders between frames.
Row 1: [angle 1] | [angle 2] | [angle 3]
Row 2: [angle 4] | [angle 5] | [angle 6]
Row 3: [angle 7] | [angle 8] | [angle 9]
Each frame shows MID-ACTION, LIVE PERFORMANCE feel."
```

### Cost
- ~$0.03-0.05 per image at 4K
- Budget mode (FLUX klein): ~$0.01

### Gotchas
- Without "SEAMLESS" and "ZERO borders", may add visible grid lines
- Must specify all 9 frames in prompt
- "MID-ACTION" prevents static poses

## FFmpeg

### Purpose
Audio extraction, video concatenation, muxing.

### Key Commands

**Extract audio segment:**
```bash
ffmpeg -i original.mp3 -ss 72.5 -t 30 -y segment.mp3
```

**Concatenate videos (without audio):**
```bash
# Create concat list
cat > concat.txt << EOF
file 'shot_01.mp4'
file 'shot_02.mp4'
file 'shot_03.mp4'
EOF

# Concatenate
ffmpeg -f concat -safe 0 -i concat.txt -an -c:v copy video_only.mp4
```

**Mux video with audio:**
```bash
ffmpeg -i video_only.mp4 -i segment.mp3 -c:v copy -c:a aac -shortest final.mp4
```

### Installation
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg
```

### Gotchas
- `-safe 0` required for absolute paths in concat file
- `-shortest` prevents audio overrun
- Use `-y` to overwrite without prompting

## ImageMagick

### Purpose
Split 4K collage into 9 individual frames.

### Key Commands
```bash
# Get dimensions
magick identify -format "%w %h" collage.jpg

# Crop single cell (top-left)
magick collage.jpg -crop 1280x720+0+0 +repage angle_1.jpg

# Crop with offset (second column)
magick collage.jpg -crop 1280x720+1280+0 +repage angle_2.jpg
```

### Installation
```bash
# macOS (v7)
brew install imagemagick

# Ubuntu
sudo apt install imagemagick
```

### Gotchas
- Use `magick` command (v7), not `convert` (v6)
- `+repage` removes canvas offset metadata
- Calculate cell dimensions: `WIDTH/3` x `HEIGHT/3`

## Remotion

### Purpose
Add animated lyrics overlay with frame-accurate timing.

### Setup
```bash
npm create video@latest
cd my-video
npm install
```

### Key Concepts
```typescript
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export const LyricsOverlay: React.FC<{lyrics: LyricWord[]}> = ({lyrics}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  const currentWord = lyrics.find(w =>
    currentTime >= w.start && currentTime < w.end
  );

  return <div>{currentWord?.word}</div>;
};
```

### Render
```bash
npx remotion render LyricsOverlay output.mp4 --props='{"style":"karaoke"}'
```

### Gotchas
- Remember to offset timestamps when working with video segments
- Use `staticFile()` for assets in public folder
- `delayRender()`/`continueRender()` for async data loading

## Environment Variables Summary

```bash
# ~/.claude/skills/image-generation/scripts/.env
FAL_KEY=your_fal_api_key
GEMINI_API_KEY=your_gemini_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

## Cost Estimation (30-second video)

| Service | Usage | Cost |
|---------|-------|------|
| ElevenLabs | 3-min transcription | $0.02 |
| Gemini | 1 audio analysis | $0.01 |
| FLUX (collage) | 1 4K image | $0.05 |
| LTX-2 (video) | 9 clips @ 3-5s each | $1.50 |
| **Total** | | **~$1.58** |

With budget mode (FLUX klein, lower video quality): **~$0.50**
