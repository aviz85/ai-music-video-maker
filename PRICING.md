# Music Video E2E Pricing (30-Second Clip)

Detailed cost breakdown for generating a 30-second multi-camera AI music video.

## Pipeline Summary

```
YouTube → Transcribe → Analyze → Collage → Split → Video Gen → Merge → Lyrics → YouTube
```

## Cost Breakdown

| Step | Service | Usage | Unit Price | Cost |
|------|---------|-------|------------|------|
| 1. Download | YouTube (yt-dlp) | 1 song | Free | $0.00 |
| 2. Transcribe | ElevenLabs Scribe v2 | 30 sec | ~$0.28/hour | $0.002 |
| 3. Audio Analysis | Gemini 2.5 Flash | ~1K tokens | ~$0.15/1M | ~$0.0001 |
| 4. Collage Generation | Gemini Nano Banana Pro | 1 × 4K image | $0.24/image | $0.24 |
| 5. Split Collage | ImageMagick (local) | 9 frames | Free | $0.00 |
| 6. Audio Chunks | FFmpeg (local) | 8 chunks | Free | $0.00 |
| 7. **Video Generation** | fal.ai LTX-2 Pro | **30 sec @ 720p** | **$0.04/sec** | **$1.20** |
| 8. Merge + Fade | FFmpeg (local) | 1 video | Free | $0.00 |
| 9. Lyrics Overlay | Remotion (local) | 675 frames | Free | $0.00 |
| 10. Upload | YouTube API | 1 video | Free | $0.00 |

### **Total: ~$1.44 per 30-second clip**

## Cost Drivers

### LTX-2 Video Generation (90% of cost)

| Model | Resolution | Price/sec | 30 sec Cost |
|-------|------------|-----------|-------------|
| LTX-2 **Fast** | **720p** | **$0.04/sec** | **$1.20** (default) |
| LTX-2 Pro | 1080p | $0.06/sec | $1.80 |
| LTX-2 Pro | 1440p | $0.12/sec | $3.60 |
| LTX-2 Pro | 4K | $0.24/sec | $7.20 |

**Note:** 720p is sufficient for most social media. 8 clips × ~4 sec each = ~32 sec total.

### Cheap Mode vs Default

| Mode | Video Model | Image Model | 30 sec Cost |
|------|-------------|-------------|-------------|
| **Default** | LTX-2 Fast 720p | Gemini Nano Banana Pro 4K | ~$1.44 |
| **Cheap** | LTX-2 Fast 720p | FLUX klein 1K | ~$1.20 |

Cheap mode savings: ~17% (mainly on collage image)

## Scaling Analysis

| Duration | Default Cost | Cheap Mode | Notes |
|----------|-------------|------------|-------|
| 15 sec | ~$0.84 | ~$0.63 | Short hook/teaser |
| **30 sec** | **~$1.44** | **~$1.20** | Standard clip |
| 60 sec | ~$2.64 | ~$2.40 | Full verse |
| 120 sec | ~$5.04 | ~$4.80 | Extended |
| 180 sec (3 min) | ~$7.44 | ~$7.20 | Full song section |

## API Details

### ElevenLabs Transcription
- **Model:** Scribe v2 (most accurate ASR)
- **Price:** ~$0.28/hour ($0.0047/min)
- **Output:** Word-level JSON with timestamps
- **Source:** [ElevenLabs Pricing](https://elevenlabs.io/pricing)

### Gemini Image Generation
- **Model:** Nano Banana Pro (Gemini 3 Pro Image)
- **Price:** $0.134/image (2K), $0.24/image (4K)
- **Output:** 3x3 collage with 9 camera angles at 4K resolution
- **Source:** [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)

### fal.ai LTX-2 Video
- **Model:** LTX Video 2.0 Pro (Image-to-Video)
- **Price:** $0.04-$0.24/sec depending on model and resolution
- **Output:** Synced video clips with audio lip-sync
- **Source:** [fal.ai Pricing](https://fal.ai/pricing)

### Free Components
- **FFmpeg:** Local audio/video processing
- **ImageMagick:** Local image splitting
- **Remotion:** Local React-based video composition
- **YouTube API:** Free upload with quota (10,000 units/day)

## Optimization Tips

1. **Use Cheap Mode** for drafts/iterations
2. **Shorter clips** = lower cost (15 sec = half price)
3. **1080p is sufficient** for most social media
4. **Batch similar content** to reuse collages

## Example: Believer Project

```
Song: Believer - Imagine Dragons
Segment: 27 seconds (peak chorus)
Clips: 8 × ~3.4 sec average

Costs:
- Transcription: $0.002
- Gemini Analysis: ~$0.0001
- Collage (4K): $0.24
- LTX-2 Video (27s @ 720p): $1.08
- Remotion Lyrics: $0.00
- YouTube Upload: $0.00

Total: ~$1.32
```

---

*Prices as of February 2026. Subject to change.*

*Sources:*
- [fal.ai Pricing](https://fal.ai/pricing)
- [ElevenLabs Pricing](https://elevenlabs.io/pricing)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
