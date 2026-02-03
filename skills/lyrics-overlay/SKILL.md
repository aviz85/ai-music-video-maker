---
name: lyrics-overlay
description: "Beautiful animated lyrics overlay for videos using Remotion. Use for: lyrics, captions, subtitles, karaoke, song text overlay."
---

# Lyrics Overlay Skill

Add beautiful animated lyrics/captions to videos using Remotion with multiple template styles.

## Templates

| Template | Description | Best For |
|----------|-------------|----------|
| `karaoke` | Word-by-word spring animation, current word glows orange | Music videos, songs |
| `minimal` | Full line shows, current word highlights | Clean, professional |
| `fade` | Words fade in smoothly as spoken | Narration, speeches |
| `hero` | Large center text with dramatic emphasis | Impact moments |
| `lower-third` | Classic TV-style bottom captions | Tutorials, documentaries |

## Quick Start

### 1. Prepare Lyrics Data

From ElevenLabs transcription JSON (word-level timing):

```bash
# Get word-level transcription first
cd ~/.claude/skills/transcribe/scripts
npx tsx transcribe.ts -i <audio.mp3> -o <project>/subtitles --json
```

### 2. Create Composition

In `~/remotion-assistant/src/compositions/`, create your composition:

```typescript
import { LyricsOverlay, parseElevenLabsTranscript } from './LyricsOverlay';
import { staticFile } from 'remotion';

// Load ElevenLabs JSON
const transcript = require('../../public/lyrics/subtitles.json');

export const MyLyricsVideo: React.FC = () => {
  const lyrics = parseElevenLabsTranscript(transcript, {
    maxWordsPerLine: 6,       // Hebrew = shorter lines
    lineGapThreshold: 0.8,    // Break line after 0.8s gap
    punctuationBreak: true
  });

  return (
    <LyricsOverlay
      videoSrc={staticFile('videos/input.mp4')}
      lyrics={lyrics}
      style="karaoke"            // Template: karaoke | minimal | fade
      position="bottom"          // bottom | center | top
      fontSize={56}
      highlightColor="#FF6B35"   // Current word color
      primaryColor="#FFFFFF"
      isRTL={true}               // Hebrew
    />
  );
};
```

### 3. Register & Render

```typescript
// In Root.tsx
<Composition
  id="MyLyricsVideo"
  component={MyLyricsVideo}
  durationInFrames={fps * duration}
  fps={25}
  width={1920}
  height={1080}
/>
```

```bash
cd ~/remotion-assistant
npx remotion render MyLyricsVideo out/final.mp4
```

## Template Styles

### Karaoke (Default for Music)
```typescript
style="karaoke"
```
- Words appear with spring bounce animation
- Current word glows with highlight color
- Past words stay visible, dimmed
- Line fades out at end

### Minimal
```typescript
style="minimal"
```
- Full line appears at once
- Current word scales up slightly + highlights
- Clean, readable, professional

### Fade
```typescript
style="fade"
```
- Words fade in as spoken
- Smooth, gentle appearance
- Good for narration

## Hebrew/RTL Support

Auto-detected, or set explicitly:

```typescript
isRTL={true}   // Force RTL for Hebrew
```

This affects:
- Text direction
- Word spacing
- Line alignment

## Offset for Segments

When video is extracted from a longer song:

```typescript
import { shiftLyricsTiming } from '../utils/lyricsParser';

// Original song timing: 105s-130s, video starts at 0
const offsetLyrics = shiftLyricsTiming(lyrics, -105);
```

## Emphasis

Add emphasis to specific words:

```typescript
import { applyEmphasis } from '../utils/lyricsParser';

const emphasized = applyEmphasis(lyrics,
  ['אהבה', 'חלום'],     // Hero words (large, dramatic)
  ['לב', 'נשמה']        // Strong words (bold)
);
```

## Color Schemes

| Style | Primary | Highlight | Use |
|-------|---------|-----------|-----|
| Classic | `#FFFFFF` | `#FF6B35` | Orange glow |
| Gold | `#F5F5DC` | `#FFD700` | Elegant |
| Neon | `#00FFFF` | `#FF00FF` | Party |
| Minimal | `#E0E0E0` | `#FFFFFF` | Clean |

## Integration with music-video

This skill is invoked automatically by the `music-video` skill in Step 7.

```markdown
### In music-video pipeline:
1. ElevenLabs transcription → word-level JSON
2. ... video generation ...
3. Use lyrics-overlay skill → beautiful animated titles
```

## Dependencies

- `~/remotion-assistant` - Remotion project
- `@remotion/captions` - Caption utilities
- `transcribe` skill - For word-level timing
