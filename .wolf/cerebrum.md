# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Last updated: 2026-08-17

## User Preferences

- Skills-first repo: operational truth lives in `.claude/skills/*/SKILL.md`, not the blog
- Aviz works on `main`, commit+push often; `projects/` stay local (gitignored)
- Personal ElevenLabs key only (`sk_354de…`) — never VocalVault / dreemz keys
- Hebrew lyrics + RTL overlays are first-class (isRTL on Remotion components)
- Y2Y shortcode = full e2e: YouTube → transcribe → analyze → collage → split → LTX → merge → lyrics → upload

## Key Learnings

- **Not an app.** No package.json at root, no server. Claude/Grok orchestrates skills + CLIs.
- **Two-brain timing:** ElevenLabs word JSON is ground truth. Gemini is the only model that *listens* — use it for structure, identity, shot prompts, LYRICS field. Never for cut points.
- **LYRICS field is the join key.** Songs repeat choruses; pick the occurrence closest to Gemini's suggested time.
- **Collage = consistency.** One 4K 3x3 generation, ImageMagick `magick` (v7) split via `split_collage.sh`. Separate images = 9 different concerts.
- **Audio has two jobs.** Per-shot chunks drive LTX motion; final mux uses one continuous extract from `original.mp3` (`-an` concat, then mux + 2s fade).
- **Singer-first (post-85398b0):** 60–70% ANGLE_2/8. Vocals → singer. Instruments/crowd only on breaks. Singer prompt must demand lip sync.
- **Live video model:** `fal-ai/ltx-2.3/audio-to-video` (audio 2–20s). Image-only: `fal-ai/ltx-2.3/image-to-video`. Keys from `~/.claude/skills/image-generation/scripts/.env`.
- **Remotion lives in `~/remotion-assistant`.** Copy templates from `.claude/skills/lyrics-overlay/remotion-templates/`. Cleanup Temp_* compositions after render.
- **Lyrics offset:** filter `words` to `>= CHORUS_START` then `shiftLyricsTiming(..., -CHORUS_START)`. `Math.max(0, …)` in the shifter would pin pre-chorus words to 0 if you skip the filter.
- **Scripts hardcode Aviz home paths** (`/Users/aviz/.claude/skills/...`). Project also has a local `audio-to-video`; music-video skill still points some steps at the global copies.
- **Cost:** ~$1.44 / 30s default; LTX is the driver. Image is Gemini Nano Banana Pro 4K (~$0.24) or FLUX klein cheap.
- **Docs site:** `docs/index.html` is a static case-study page (carousel, pricing, embeds). Blog posts 01–07 are the writeup, now stale vs skills.

## Do-Not-Repeat

- [2026-02] Do not cut on Gemini timestamps. Align via lyrics → ElevenLabs words.
- [2026-02] Do not generate 9 separate angle images. One collage, then split.
- [2026-02] Do not concat clip audio into the final. Continuous original track only.
- [2026-02] Do not write static LTX prompts ("singer on stage"). Describe MOTION + camera + lighting event.
- [2026-02] Do not hold clips >15s. 2–5s. Never same subject consecutively.
- [2026-02] Remotion: always all-keyframe remux (`-g 1`) and `fps={24}`. Never leave pre-chorus words in the transcript.
- [2026-08] Do not follow `docs/blog/` or `docs/03_tools_and_apis.md` for model names/fps/endpoints. Skills + scripts are current (LTX 2.3, 24fps).
- [2026-08] Do not use project-local `.claude/skills/transcribe` — deleted. Global `~/.claude/skills/transcribe`.

## Decision Log

- Collage-then-split over 9 gens → visual continuity + cheaper.
- Gemini creative + ElevenLabs timing over one-model-does-both → only way cuts land on words.
- Continuous audio mux over concat chunks → kills boundary clicks.
- LTX 2.3 upgrade (03fac17) + native 24fps Remotion (9c3e8b5) + all-keyframe remux (acb4d50) + singer-first (85398b0).
- `projects/*` gitignored (595a3b4) so media stays local; only `example-project/` is the template.
- song-research extracted as pre-prod so Gemini listen + official lyrics + artist refs happen before the expensive LTX loop.
