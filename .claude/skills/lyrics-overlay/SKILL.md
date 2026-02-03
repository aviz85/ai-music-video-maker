---
name: lyrics-overlay
description: "Beautiful animated lyrics overlay for videos using Remotion. Use for: lyrics, captions, subtitles, karaoke, song text overlay."
---

# Lyrics Overlay Skill

Add beautiful animated lyrics/captions to videos using Remotion with multiple template styles.

## Style Selection Guide (For Agent)

Choose style based on song mood, genre, and visual aesthetic:

| Style | Component | Best For | Mood/Vibe |
|-------|-----------|----------|-----------|
| **karaoke** | `LyricsOverlay` | Pop, dance, singalong | Energetic, fun, accessible |
| **minimal** | `LyricsOverlay` | Ballads, acoustic | Clean, elegant, subtle |
| **fade** | `LyricsOverlay` | Narration, spoken word | Gentle, smooth, understated |
| **neon** | `LyricsOverlayNeon` | Electronic, synthwave, EDM | Cyberpunk, futuristic, high-energy |
| **cinematic** | `LyricsOverlayCinematic` | Epic, orchestral, trailers | Dramatic, powerful, movie-like |
| **bounce** | `LyricsOverlayBounce` | Kids, fun, upbeat | Playful, colorful, joyful |
| **typewriter** | `LyricsOverlayTypewriter` | Storytelling, retro, indie | Nostalgic, intimate, artistic |

### Style Details

#### 1. Karaoke (Default)
- **Position:** Bottom
- **Animation:** Spring bounce word-by-word, current word glows
- **Colors:** White text, gold/orange highlight
- **Use when:** Standard music videos, pop songs, singalong content

#### 2. Minimal
- **Position:** Bottom
- **Animation:** Full line shows, current word scales up slightly
- **Colors:** Subtle white/gray
- **Use when:** Clean look needed, don't distract from visuals

#### 3. Fade
- **Position:** Bottom
- **Animation:** Words fade in smoothly as spoken
- **Colors:** Pure white
- **Use when:** Speeches, narration, gentle songs

#### 4. Neon (Cyberpunk)
- **Position:** Bottom or center
- **Animation:** Chromatic aberration, glitch on entrance, flicker
- **Colors:** Magenta glow (#FF00FF), cyan split (#00FFFF)
- **Effects:** Scanlines, RGB split, multi-layer glow
- **Use when:** Electronic music, synthwave, futuristic aesthetic

#### 5. Cinematic (Movie Trailer)
- **Position:** CENTER (large, dramatic)
- **Animation:** Words scale from big to normal with blur, uppercase
- **Colors:** Gold accent (#FFD700) on white
- **Effects:** Vignette, letterbox bars, dramatic glow
- **Use when:** Epic songs, trailers, powerful moments, orchestral

#### 6. Bounce (Playful)
- **Position:** Center
- **Animation:** Words bounce in from random positions, rotation
- **Colors:** Rainbow palette, each word different color
- **Effects:** Continuous subtle bounce on active word
- **Use when:** Fun/upbeat songs, kids content, party vibes

#### 7. Typewriter (Retro)
- **Position:** Center
- **Animation:** Character-by-character reveal with cursor
- **Themes:** `classic` (white), `terminal` (green), `vintage` (sepia)
- **Effects:** Blinking cursor, themed backgrounds
- **Use when:** Storytelling, indie, nostalgic feel, artistic

## Quick Start

### 1. Prepare Lyrics Data

```bash
cd skills/transcribe/scripts
npx tsx transcribe.ts -i <audio.mp3> -o <project>/subtitles --json
```

### 2. Create Composition

```typescript
// Pick the right component for your style:
import { LyricsOverlay } from './LyricsOverlay';           // karaoke, minimal, fade
import { LyricsOverlayNeon } from './LyricsOverlayNeon';   // neon
import { LyricsOverlayCinematic } from './LyricsOverlayCinematic'; // cinematic
import { LyricsOverlayBounce } from './LyricsOverlayBounce';       // bounce
import { LyricsOverlayTypewriter } from './LyricsOverlayTypewriter'; // typewriter

import { parseElevenLabsTranscript } from './LyricsOverlay';
import { staticFile } from 'remotion';

const transcript = require('../../public/lyrics/subtitles.json');

export const MyVideo: React.FC = () => {
  const lyrics = parseElevenLabsTranscript(transcript, {
    maxWordsPerLine: 6,
    lineGapThreshold: 0.8,
  });

  // Example: Cinematic style
  return (
    <LyricsOverlayCinematic
      videoSrc={staticFile('videos/input.mp4')}
      lyrics={lyrics}
      fontSize={90}
      accentColor="#FFD700"
      isRTL={true}
      useOffthreadVideo={true}
    />
  );
};
```

### 3. Render

```bash
cd ~/remotion-assistant
npx remotion render MyVideo out/final.mp4
```

## Props Reference

### Common Props (All Styles)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `videoSrc` | string | required | Video file path |
| `lyrics` | LyricsData | required | Parsed lyrics data |
| `fontSize` | number | varies | Base font size |
| `isRTL` | boolean | auto | Right-to-left mode |
| `useOffthreadVideo` | boolean | false | Use OffthreadVideo for better memory |

### LyricsOverlay (karaoke/minimal/fade)

| Prop | Type | Default |
|------|------|---------|
| `style` | 'karaoke' \| 'minimal' \| 'fade' | 'karaoke' |
| `position` | 'bottom' \| 'center' \| 'top' | 'bottom' |
| `primaryColor` | string | '#FFFFFF' |
| `highlightColor` | string | '#FF6B35' |

### LyricsOverlayNeon

| Prop | Type | Default |
|------|------|---------|
| `glowColor` | string | '#FF00FF' |
| `secondaryGlow` | string | '#00FFFF' |
| `glitchIntensity` | number | 0.5 |

### LyricsOverlayCinematic

| Prop | Type | Default |
|------|------|---------|
| `accentColor` | string | '#FFD700' |
| `letterSpacing` | number | 0.15 |
| **Position** | - | **CENTER (fixed)** |

### LyricsOverlayBounce

| Prop | Type | Default |
|------|------|---------|
| `highlightColor` | string | '#FFFFFF' |
| `bounceIntensity` | number | 0.7 |
| `position` | 'bottom' \| 'center' \| 'top' | 'center' |

### LyricsOverlayTypewriter

| Prop | Type | Default |
|------|------|---------|
| `theme` | 'classic' \| 'terminal' \| 'vintage' | 'classic' |
| `showCursor` | boolean | true |
| `typeSpeed` | number | 20 |
| `position` | 'bottom' \| 'center' \| 'top' | 'center' |

## Color Presets

### By Style

| Style | Recommended Colors |
|-------|-------------------|
| karaoke | Gold `#FFD700`, Orange `#FF6B35` |
| neon | Magenta `#FF00FF` + Cyan `#00FFFF` |
| cinematic | Gold `#FFD700`, Silver `#C0C0C0` |
| bounce | Rainbow (automatic) |
| typewriter | Theme-based (green/sepia/white) |

### By Song Genre

| Genre | Style | Colors |
|-------|-------|--------|
| Pop | karaoke | `#FF6B35` highlight |
| Electronic | neon | `#FF00FF` / `#00FFFF` |
| Rock/Metal | cinematic | `#FF0000` accent |
| Ballad | minimal | `#FFFFFF` highlight |
| Kids | bounce | Rainbow |
| Indie | typewriter vintage | Sepia |

## Integration with music-video

This skill is called in Step 7 of the music-video pipeline.

The agent should select style based on:
1. **Song genre** (electronic → neon, epic → cinematic)
2. **Energy level** (high → bounce/neon, low → minimal/fade)
3. **Visual aesthetic** (modern → neon, retro → typewriter, dramatic → cinematic)

## Dependencies

- `~/remotion-assistant` - Remotion project
- `transcribe` skill - For word-level timing
