# Example Project Structure

This shows the expected structure for a music video project.

```
example-project/
├── audio/
│   ├── original.mp3        # Original audio file
│   └── chunks/             # Audio segments for each shot
│       ├── shot_01.mp3
│       └── ...
├── images/
│   ├── collage.jpg         # 4K 3x3 collage (16:9)
│   └── angles/             # Split frames
│       ├── angle_1.jpg     # Wide stage
│       ├── angle_2.jpg     # Singer closeup
│       └── ...             # 9 total angles
├── videos/
│   ├── clips/              # Generated video clips
│   │   └── shot_XX.mp4
│   └── final.mp4           # Merged output
├── subtitles.srt           # ElevenLabs transcription (SRT)
├── subtitles               # Word-level timing (JSON)
└── storyboard.md           # Gemini analysis + shot list
```

## Workflow

1. **Transcribe** → ElevenLabs word-level timing (ground truth)
2. **Analyze** → Gemini audio analysis with lyrics per shot
3. **Align** → Match lyrics to precise timestamps
4. **Generate** → 4K collage → split → video clips
5. **Merge** → Concatenate with continuous audio
6. **Overlay** → Remotion lyrics animation (optional)
