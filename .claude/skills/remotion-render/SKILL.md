---
name: remotion-render
description: "Render Remotion video compositions to MP4/WebM. Use for: rendering videos, exporting compositions, batch renders, previewing."
---

# Remotion Render

Render video compositions to output files.

## Quick Commands

```bash
# Start dev studio (browser preview)
npm run dev

# List available compositions
npx remotion compositions src/index.tsx

# Render specific composition
npx remotion render <CompositionId> out/<filename>.mp4

# Render with options
npx remotion render HelloWorld out/hello.mp4 --codec=h264 --crf=18
```

## Render Workflow

1. **Preview first**: `npm run dev` → open http://localhost:3000
2. **Check composition**: Verify it looks correct in studio
3. **Render**: `npx remotion render <id> out/<name>.mp4`

## Common Render Commands

### Standard quality (YouTube, general use)
```bash
npx remotion render HelloWorld out/video.mp4
```

### High quality
```bash
npx remotion render HelloWorld out/video.mp4 --crf=18
```

### Fast preview (half resolution)
```bash
npx remotion render HelloWorld out/preview.mp4 --scale=0.5
```

### Specific frames only
```bash
npx remotion render HelloWorld out/clip.mp4 --frames=0-60
```

### With props override
```bash
npx remotion render HelloWorld out/custom.mp4 --props='{"text":"Custom Text"}'
```

## Output Formats

| Format | Extension | Command |
|--------|-----------|---------|
| MP4 (H.264) | .mp4 | `--codec=h264` (default) |
| WebM (VP9) | .webm | `--codec=vp9` |
| ProRes | .mov | `--codec=prores` |
| GIF | .gif | `--codec=gif` |

## Troubleshooting

**Slow render?**
- Use `--scale=0.5` for testing
- Check `--log=verbose` for bottlenecks
- Reduce concurrency if memory issues: `--concurrency=2`

**Black frames?**
- Assets not loaded - use Remotion's `<Img>`, `<Video>` components
- Check paths use `staticFile()` for public/ assets

See [../video-common/references/codecs.md](../video-common/references/codecs.md) for detailed codec options.
