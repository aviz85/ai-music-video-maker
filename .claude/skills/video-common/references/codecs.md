# Video Codecs & Export Settings

## Quick Reference

| Use Case | Codec | Command |
|----------|-------|---------|
| General/YouTube | h264 | `--codec=h264` |
| Small file size | h265 | `--codec=h265` |
| Web/transparent | vp9 | `--codec=vp9` |
| Professional edit | prores | `--codec=prores` |

## H264 (Default - Most Compatible)

```bash
npx remotion render CompositionId out.mp4 --codec=h264
```

Quality control with CRF (lower = better quality, larger file):
- `--crf=18` - High quality
- `--crf=23` - Default/balanced
- `--crf=28` - Smaller file

Speed presets:
- `--preset=ultrafast` - Fast, larger file
- `--preset=medium` - Balanced (default)
- `--preset=slow` - Better compression

## ProRes (For Editing)

```bash
npx remotion render CompositionId out.mov --codec=prores --prores-profile=hq
```

Profiles: `proxy`, `light`, `standard`, `hq`, `4444`, `4444-xq`

## WebM (VP9)

```bash
npx remotion render CompositionId out.webm --codec=vp9
```

Good for web, supports transparency.

## Common Options

```bash
--scale=0.5          # Half resolution (for previews)
--frames=0-30        # Render subset
--concurrency=4      # Parallel rendering
--overwrite          # Replace existing
--log=verbose        # Debug output
```

## Aspect Ratios

| Format | Dimensions | Use |
|--------|-----------|-----|
| 16:9 | 1920x1080 | YouTube, landscape |
| 9:16 | 1080x1920 | Stories, Reels, TikTok |
| 1:1 | 1080x1080 | Instagram feed |
| 4:5 | 1080x1350 | Instagram portrait |
