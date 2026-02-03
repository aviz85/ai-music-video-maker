---
name: lyrics-overlay
description: "Beautiful animated lyrics overlay for videos using Remotion. Use for: lyrics, captions, subtitles, karaoke, song text overlay."
---

# Lyrics Overlay Skill

Add beautiful animated lyrics/captions to videos using Remotion with multiple template styles.

## Components

| Component | File | Description |
|-----------|------|-------------|
| `LyricsOverlay` | `LyricsOverlay.tsx` | Classic styles: karaoke, minimal, fade |
| `LyricsOverlayNeon` | `LyricsOverlayNeon.tsx` | Cyberpunk neon with glitch effects |

## Template Styles

### Classic Styles (`LyricsOverlay`)

| Style | Description | Best For |
|-------|-------------|----------|
| `karaoke` | Word-by-word spring animation, current word glows | Music videos, songs |
| `minimal` | Full line shows, current word highlights | Clean, professional |
| `fade` | Words fade in smoothly as spoken | Narration, speeches |

### Neon Style (`LyricsOverlayNeon`)

Cyberpunk-inspired with:
- **Chromatic aberration** - RGB split on active words
- **Glitch effects** - Subtle position jitter on entrance
- **Neon glow** - Multi-layer glow with flicker
- **Scanlines** - Retro CRT overlay
- **Dark gradient** - Purple-tinted background

## Quick Start

### 1. Prepare Lyrics Data

From ElevenLabs transcription JSON (word-level timing):

```bash
# Get word-level transcription first
cd skills/transcribe/scripts
npx tsx transcribe.ts -i <audio.mp3> -o <project>/subtitles --json
```

### 2. Create Composition

#### Classic Style (Karaoke)

```typescript
import { LyricsOverlay, parseElevenLabsTranscript } from './LyricsOverlay';
import { staticFile } from 'remotion';

const transcript = require('../../public/lyrics/subtitles.json');

export const MyLyricsVideo: React.FC = () => {
  const lyrics = parseElevenLabsTranscript(transcript, {
    maxWordsPerLine: 6,
    lineGapThreshold: 0.8,
    punctuationBreak: true
  });

  return (
    <LyricsOverlay
      videoSrc={staticFile('videos/input.mp4')}
      lyrics={lyrics}
      style="karaoke"
      position="bottom"
      fontSize={56}
      highlightColor="#FFD700"
      primaryColor="#FFFFFF"
      isRTL={true}
    />
  );
};
```

#### Neon Style (Cyberpunk)

```typescript
import { LyricsOverlayNeon, parseElevenLabsTranscript } from './LyricsOverlayNeon';
import { staticFile } from 'remotion';

const transcript = require('../../public/lyrics/subtitles.json');

export const MyNeonVideo: React.FC = () => {
  const lyrics = parseElevenLabsTranscript(transcript, {
    maxWordsPerLine: 5,
    lineGapThreshold: 0.6,
    punctuationBreak: true
  });

  return (
    <LyricsOverlayNeon
      videoSrc={staticFile('videos/input.mp4')}
      lyrics={lyrics}
      position="bottom"
      fontSize={58}
      glowColor="#FF00FF"      // Magenta neon
      secondaryGlow="#00FFFF"  // Cyan
      primaryColor="#E8E8E8"
      isRTL={true}
      glitchIntensity={0.4}    // 0-1
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

## Props Reference

### LyricsOverlay Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `videoSrc` | string | required | Video file path |
| `lyrics` | LyricsData | required | Parsed lyrics data |
| `style` | 'karaoke' \| 'minimal' \| 'fade' | 'karaoke' | Animation style |
| `position` | 'bottom' \| 'center' \| 'top' | 'bottom' | Text position |
| `fontSize` | number | 56 | Base font size |
| `primaryColor` | string | '#FFFFFF' | Default text color |
| `highlightColor` | string | '#FF6B35' | Active word color |
| `isRTL` | boolean | auto | Right-to-left mode |
| `showGradientOverlay` | boolean | true | Dark gradient behind text |
| `useOffthreadVideo` | boolean | false | Use OffthreadVideo |

### LyricsOverlayNeon Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `videoSrc` | string | required | Video file path |
| `lyrics` | LyricsData | required | Parsed lyrics data |
| `position` | 'bottom' \| 'center' \| 'top' | 'bottom' | Text position |
| `fontSize` | number | 60 | Base font size |
| `primaryColor` | string | '#E0E0E0' | Default text color |
| `glowColor` | string | '#FF00FF' | Main neon glow (magenta) |
| `secondaryGlow` | string | '#00FFFF' | Chromatic aberration (cyan) |
| `glitchIntensity` | number | 0.5 | Glitch effect strength (0-1) |
| `isRTL` | boolean | auto | Right-to-left mode |
| `showGradientOverlay` | boolean | true | Dark gradient behind text |
| `useOffthreadVideo` | boolean | false | Use OffthreadVideo |

## Color Schemes

### Classic

| Scheme | Primary | Highlight | Use |
|--------|---------|-----------|-----|
| Gold | `#FFFFFF` | `#FFD700` | Elegant, warm |
| Orange | `#FFFFFF` | `#FF6B35` | Energetic |
| Clean | `#E0E0E0` | `#FFFFFF` | Minimal |

### Neon

| Scheme | Glow | Secondary | Vibe |
|--------|------|-----------|------|
| Cyberpunk | `#FF00FF` | `#00FFFF` | Classic neon |
| Matrix | `#00FF00` | `#003300` | Hacker |
| Sunset | `#FF6600` | `#FF0066` | Warm neon |
| Ice | `#00FFFF` | `#0066FF` | Cool, electric |

## Hebrew/RTL Support

Auto-detected, or set explicitly:

```typescript
isRTL={true}   // Force RTL for Hebrew
```

## Offset for Segments

When video is extracted from a longer song:

```typescript
import { shiftLyricsTiming } from '../utils/lyricsParser';

// Original song timing: 105s-130s, video starts at 0
const offsetLyrics = shiftLyricsTiming(lyrics, -105);
```

## Integration with music-video

This skill is invoked automatically by the `music-video` skill in Step 7.

Default style is `karaoke`. Use `neon` for cyberpunk aesthetic.

## Dependencies

- `~/remotion-assistant` - Remotion project
- `@remotion/captions` - Caption utilities
- `transcribe` skill - For word-level timing
