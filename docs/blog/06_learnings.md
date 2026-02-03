# Learnings

## What Worked Well

### 1. ElevenLabs as Ground Truth

**The approach:** Use word-level transcription as the timing anchor for all cuts.

**Why it worked:**
- ElevenLabs is remarkably accurate (within 0.1s)
- Word boundaries are natural cut points
- Works across languages (Hebrew, English tested)
- Provides both JSON (for parsing) and SRT (for quick search)

**Key insight:** Never trust AI audio analysis for timestamps. Trust it for creative direction.

### 2. Single Collage for Consistency

**The approach:** Generate one 4K image with all 9 camera angles, then split.

**Why it worked:**
- One "imagination" from the AI = consistent style
- Lighting, costumes, stage setup all match
- Cheaper than 9 separate images
- Faster generation time

**Key insight:** AI image generators have "sessions" - generating multiple images produces variations. Keep everything in one generation for consistency.

### 3. Continuous Audio Track

**The approach:** Generate videos with individual audio (for motion sync), but replace with continuous track for final output.

**Why it worked:**
- Video generation NEEDS individual audio to sync motion
- Final playback NEEDS continuous audio to avoid seams
- Best of both worlds

**Key insight:** The audio serves two purposes (generation sync and playback) that have different requirements.

### 4. LYRICS Field in Storyboard

**The approach:** Force Gemini to output exact lyrics for each shot.

**Why it worked:**
- Creates a matching key between Gemini and ElevenLabs
- Handles repeated lyrics (chorus) by finding closest occurrence
- Makes the alignment process deterministic

**Key insight:** When bridging two AI systems, you need a shared vocabulary. Lyrics are that vocabulary for music videos.

### 5. Two-Step Word Search

**The approach:** Quick scan SRT, then precise JSON lookup.

**Why it worked:**
- Full JSON files are 30K+ characters (expensive to process)
- SRT is human-readable and smaller
- Targeted JSON search only when you know approximate location

**Key insight:** Optimize for the common case. Most lyrics searches find words quickly in SRT.

## What Didn't Work

### 1. Gemini Timestamps

**What we tried:** Use Gemini's suggested timestamps directly.

**What happened:** Cuts were 10-20 seconds off, completely breaking the sync.

**Why it failed:** Gemini doesn't have frame-accurate audio timing. It "listens" holistically but doesn't track precise timestamps.

**Lesson:** Use Gemini for WHAT to show, ElevenLabs for WHEN.

### 2. Consecutive Same-Subject Shots

**What we tried:** Singer closeup -> Singer low angle (both showing singer).

**What happened:** Jump cut - jarring visual discontinuity.

**Why it failed:** Even if the angle changes, showing the same subject twice creates a perceived "jump" because the subject doesn't change smoothly.

**Lesson:** Always insert a different subject between same-subject shots: Singer -> Wide -> Singer.

### 3. Static Prompts for Video Generation

**What we tried:** "Singer on stage with band"

**What happened:** Generated mostly static video, singer standing still.

**Why it failed:** LTX-2 needs MOTION description, not scene description.

**Lesson:** Always describe ACTION: "Singer SINGING, mouth MOVING, head TILTING"

### 4. Generating Long Clips (>15 seconds)

**What we tried:** 20-second clips to reduce number of generations.

**What happened:** Motion quality degraded after ~15 seconds, became repetitive.

**Why it failed:** LTX-2 has a practical quality limit around 481 frames. Longer = degraded motion.

**Lesson:** Keep clips 2-5 seconds for best quality. More cuts = better video anyway.

### 5. Using Clip Audio for Final Output

**What we tried:** Just concatenate the clips with their generated audio.

**What happened:** Audible clicks/pops at every clip boundary.

**Why it failed:** Even with perfect timing, audio chunks have different phase alignment.

**Lesson:** Always use continuous audio for final output, regardless of how precise the chunks are.

## Surprises and Discoveries

### 1. Hebrew Transcription Works Well

**Surprise:** Expected ElevenLabs to struggle with Hebrew. It didn't.

**Discovery:** Word-level timing is accurate across languages. The model handles non-Latin scripts well.

### 2. Collage Prompts Are Finicky

**Surprise:** Expected "3x3 grid" to be enough. It wasn't.

**Discovery:** Must explicitly say:
- "SEAMLESS with ZERO borders"
- "Each frame shows MID-ACTION"
- Describe all 9 frames explicitly
- Mention aspect ratio of individual frames

### 3. Gemini Understands Music Structure

**Surprise:** Expected simple beat detection. Got sophisticated analysis.

**Discovery:** Gemini identifies:
- Verse/chorus/bridge structure
- Instrument prominence changes
- Energy arc of the entire song
- Emotional moments worth highlighting

### 4. Starting Image Matters More Than Prompt

**Surprise:** Expected detailed prompt to control video output. Starting image dominated.

**Discovery:** LTX-2 heavily references the starting image. A great prompt with a bad starting image = bad video. A simple prompt with a great starting image = good video.

### 5. Shot Variety Rules Are Critical

**Surprise:** Expected camera angle rules to be suggestions. They're requirements.

**Discovery:** The "never same subject consecutively" rule transforms amateur-looking edits into professional-looking videos. It's the single biggest quality factor.

## Recommendations for Similar Projects

### 1. Always Separate Timing and Creative Analysis

Don't trust any AI for both accurate timestamps AND creative decisions. Use specialized tools:
- ElevenLabs/Whisper for timing
- Gemini/GPT for creative direction
- Bridge them with matching content (lyrics, visual cues)

### 2. Generate Consistent Visual Assets Together

Whether it's 9 camera angles, 5 character poses, or 3 scene variations - generate them in ONE image/prompt. Split afterward.

### 3. Test Audio Quality Early

Audio problems are immediately noticeable. Test the concat-then-replace approach before generating all videos.

### 4. Iterate on Prompts with Quick Tests

Before running the full pipeline:
1. Generate one test collage with your prompt
2. Generate one test video clip
3. Verify quality before scaling up

### 5. Build for Two Modes: Quality and Budget

Every parameter should have a "best quality" and "good enough" option:
- Image resolution: 4K vs 2K
- Video quality: high vs low
- Model tier: FLUX Pro vs FLUX klein

Users will want both depending on context.

### 6. Document Alignment Corrections

Keep a log of timing corrections per song. You may reprocess with different creative direction, and knowing "this song's Gemini timing runs +20s early" saves debugging time.

## Technical Debt and Future Improvements

### Should Fix

1. **Hardcoded paths** - Scripts reference specific paths that should be configurable
2. **No progress feedback** - Long generations have no status updates
3. **Manual alignment** - Could be automated with fuzzy string matching

### Nice to Have

1. **Web interface** - Upload audio, get video back
2. **Batch processing** - Queue multiple songs
3. **Style presets** - "rock concert", "intimate acoustic", "EDM festival"
4. **Quality preview** - Low-res preview before full generation

### Research Needed

1. **Better lip sync** - Current approach is acceptable but not perfect
2. **Longer videos** - Currently practical limit is ~30 seconds
3. **Multiple performers** - System assumes single singer focus
4. **Live interaction** - Crowd shots don't respond to singer

## Final Thoughts

This project proves that AI can be a music video director, not just a clip generator. The key is understanding each AI's strengths:

- **ElevenLabs:** Accurate timing (trust it)
- **Gemini:** Creative analysis (use it for ideas)
- **LTX-2:** Motion generation (feed it good starting images)
- **Claude:** Orchestration and alignment (bridge the gaps)

The most important learning: **AI systems work best when orchestrated together, each doing what they're best at.** No single AI can do everything well, but a pipeline of specialists produces professional results.
