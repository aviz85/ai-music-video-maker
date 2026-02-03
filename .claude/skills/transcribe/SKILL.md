---
name: transcribe
description: "Transcribe audio/video to SRT subtitles using ElevenLabs Scribe v2. Use for: transcription, subtitles, captions, SRT generation."
---

# Transcribe

Generate SRT subtitle files + readable text from audio/video using ElevenLabs Scribe v2.

## Quick Start

```bash
cd .claude/skills/transcribe/scripts

# Basic transcription (generates both SRT + readable .md)
npx ts-node transcribe.ts -i /path/to/video.mp4 -o /path/to/output.srt

# Specify language
npx ts-node transcribe.ts -i /path/to/video.mp4 -o /path/to/output.srt -l he

# Only readable text (skip SRT)
npx ts-node transcribe.ts -i /path/to/meeting.m4a -o /path/to/output.srt --no-srt

# Shorter timestamp intervals (every 2 minutes)
npx ts-node transcribe.ts -i /path/to/video.mp4 -o /path/to/output.srt --timestamp-interval 120

# Disable speaker diarization
npx ts-node transcribe.ts -i /path/to/video.mp4 -o /path/to/output.srt --no-speakers
```

## Output Files

The script **always** generates:
1. `.srt` - Standard subtitle file (for embedding)
2. `.md` - Readable text with speakers + timestamps every ~5 min

Optional:
3. `_transcript.json` - Raw word-level data (with `--json`)

## Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--input` | `-i` | (required) | Input audio/video file |
| `--output` | `-o` | (required) | Output SRT file path |
| `--language` | `-l` | auto | Language code (en, he, ar, etc.) |
| `--max-words` | | 5 | Max words per subtitle entry |
| `--max-duration` | | 3.0 | Max seconds per subtitle entry |
| `--max-chars` | | 70 | Max characters per subtitle entry |
| `--timing-offset` | | 0.25 | Timing offset in seconds |
| `--json` | | false | Also output raw transcript JSON |
| `--no-srt` | | false | Skip SRT, only generate text |
| `--no-speakers` | | false | Disable speaker diarization |
| `--timestamp-interval` | | 300 | Seconds between timestamps in text (5 min) |

## Language Codes

- `en` - English
- `he` - Hebrew
- `ar` - Arabic
- `es` - Spanish
- `fr` - French
- `de` - German
- `ru` - Russian
- `zh` - Chinese
- `ja` - Japanese
- (or omit for auto-detection)

## Readable Text Format

The `.md` file includes:
- **Header** with filename, date, duration
- **Speaker labels** (דובר 1, דובר 2...) when diarization detects speaker changes
- **Timestamps** every ~5 minutes (configurable)
- **Paragraphs** broken naturally at sentence boundaries

Example:
```markdown
# תמלול: meeting.m4a
**תאריך:** 27.1.2026
**משך:** 45:32

---

**דובר 1:**
שלום לכולם, אני רוצה להתחיל את הפגישה...

**דובר 2:**
בסדר, בוא נדבר על הנושא הראשון...

**[5:00]**

**דובר 1:**
עכשיו נעבור לחלק השני...
```

## Translation

If target language differs from audio language:

1. Transcribe first (get original language SRT)
2. Read the SRT, translate each entry preserving timestamps
3. Write translated SRT file

No API needed - translate directly.

## Post-Transcription Refinement (Claude's Job)

After generating the raw SRT, **always refine it semantically**. The transcription API chunks by time intervals, not meaning - this creates awkward splits like:

```
1
00:00:00,500 --> 00:00:01,922
anything a human being can

2
00:00:02,002 --> 00:00:03,320
do, your Claude bot can
```

The word "do" belongs with the previous sentence! **Always regroup by semantic meaning:**

### Refinement Rules

1. **Complete sentences/clauses together** - Never split subject from verb, verb from object
2. **Move orphaned words** - If a line starts with a word that completes the previous thought, merge it
3. **Punctuation guides splits** - Periods, question marks, exclamations are natural break points
4. **Preserve parallel structure** - Keep matching phrases together (e.g., "if X can do it, Y can do it")
5. **Emphasis stays standalone** - Repeated words for emphasis ("Anything. Anything!") get their own line
6. **Action chains can split** - Lists of actions can be separate lines if they're complete thoughts

### Refinement Process

1. Read the raw SRT
2. Concatenate all text to see full content
3. Identify natural sentence/clause boundaries
4. Redistribute words into semantic groups
5. Adjust timestamps: line starts at first word's time, ends at last word's time + small buffer
6. Write refined SRT

### Example Before/After

**Before (raw):**
```
1
00:00:00,500 --> 00:00:01,922
anything a human being can

2
00:00:02,002 --> 00:00:03,320
do, your Claude bot can

3
00:00:03,341 --> 00:00:06,282
do. Anything. Anything!
```

**After (refined):**
```
1
00:00:00,500 --> 00:00:02,100
anything a human being can do,

2
00:00:02,100 --> 00:00:03,500
your Claude bot can do.

3
00:00:03,600 --> 00:00:06,100
Anything. Anything!
```

**Always apply this refinement after transcription. The user expects semantically coherent subtitles.**

## Environment

API key stored in `scripts/.env`:
```
ELEVENLABS_API_KEY=your_key_here
```
