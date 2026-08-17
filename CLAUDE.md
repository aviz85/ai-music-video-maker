# AI Music Video Maker

@.wolf/OPENWOLF.md

Skill-orchestrated pipeline: one audio file → 20–30s multi-camera concert video.

**Trust the skills, not `docs/blog/`.** The blog is a Feb 2026 retrospective (LTX-2 19B / 25fps). Live pipeline is LTX 2.3 / 24fps / singer-first.

## How a video gets made

```
YouTube/audio → ElevenLabs words (WHEN) → Gemini listens (WHAT + prompts)
→ Claude aligns lyrics to timestamps → 4K 3x3 collage → ImageMagick split
→ LTX 2.3 clips (audio-driven) → ffmpeg merge + continuous original audio
→ Remotion lyrics (all-keyframe + fps=24 + offset-filtered words)
```

Entry skill: `.claude/skills/music-video/SKILL.md`

## Skills

| Skill | Role |
|-------|------|
| `music-video` | Full pipeline orchestrator |
| `song-research` | Pre-prod: refs + official lyrics + Gemini listen |
| `audio-to-video` | LTX 2.3 CLI (`generate.ts`) + Gemini storyboard (`analyze_audio.ts`) |
| `lyrics-overlay` | 7 Remotion styles, copy into `~/remotion-assistant` |
| `remotion-render` / `video-common` / `remotion-best-practices` | Render + shared Remotion knowledge |

External (not in this repo):
- Transcribe: `~/.claude/skills/transcribe` (`npx tsx transcribe.ts -i … -o … --json`)
- Images: `~/.claude/skills/image-generation` (`generate_poster.ts`)
- Remotion project: `~/remotion-assistant`

Keys live in `~/.claude/skills/image-generation/scripts/.env` (`FAL_KEY`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`). Personal ElevenLabs only (`sk_354de…`).

## Hard rules (quality comes from these)

1. **ElevenLabs = WHEN. Gemini = WHAT.** Gemini timestamps run 10–20s early. Match `LYRICS:` to word JSON.
2. **Singer-first:** 60–70% of shots are ANGLE_2 or ANGLE_8 while vocals are audible. Cutaways only on instrumental breaks. Singer prompts must include `mouth open singing, lip sync, close-up face`.
3. **Never same subject twice in a row.** Singer → wide/crowd/silhouette → singer. Consecutive singer angles = jump cut.
4. **One collage, then split.** Never generate 9 separate images. Prompt must say `SEAMLESS ZERO borders` and describe all 9 frames mid-action.
5. **Clips 2–5s.** LTX 2.3 max ~20s; quality dies after ~15s.
6. **Continuous original audio on the final mux.** Clip audio is only for motion sync. 2s fade out.
7. **Remotion: three landmines**
   - Re-encode `merged.mp4` with `-g 1 -keyint_min 1` → `merged_remotion.mp4` or seeking is choppy
   - `fps={24}` to match LTX 2.3 (do not 25)
   - Filter words to `t >= CHORUS_START` *before* parse, then `shiftLyricsTiming(raw, -CHORUS_START)`. Unfiltered words clamp to t=0 and pile up on frame 0.

## Camera bible (fixed 9)

1 wide · 2 singer CU · 3 guitar · 4 drums · 5 bass · 6 crowd · 7 silhouette · 8 low-angle singer · 9 behind-band

## Project folder

```
projects/<slug>/
  audio/{original.mp3,chorus_audio.mp3,chunks/}
  subtitles/{words,words.srt}
  images/{collage.jpg,angles/angle_1..9.jpg}
  videos/{clips/,video_only.mp4,merged.mp4,merged_remotion.mp4,final.mp4}
  storyboard.md
  references/{images/,lyrics.txt}   # if song-research ran
```

`projects/` is gitignored except `example-project/`. ~24 local song folders exist; they are not on remote.

## Cost (30s, Feb 2026)

Default ~$1.44 (LTX is ~90%). Cheap mode ~$1.20. See `PRICING.md`.

## Drift / leftovers (don't "fix" unless asked)

- `analyze_audio.ts` still calls `gemini-2.0-flash` (docs say Gemini 3 Flash)
- `generate.ts` default `--fps 25` is only used on the image-to-video path; A2V ignores fps
- Root `skills/` is an old snapshot of image-generation + transcribe
- `.claude/skills/remotion-lyrics/` is empty
- Project-local transcribe skill was deleted; use the global one
