import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load env from global image-generation skill
dotenv.config({ path: "/Users/aviz/.claude/skills/image-generation/scripts/.env" });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function analyzeAudioAndCreateStoryboard(audioPath: string, maxDuration?: number, specificRequest?: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not found in environment");
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // Read audio file and convert to base64
  const audioBuffer = fs.readFileSync(audioPath);
  const audioBase64 = audioBuffer.toString("base64");
  const mimeType = audioPath.endsWith(".mp3") ? "audio/mp3" : "audio/wav";

  // Get audio duration (we'll estimate based on file size or use provided duration)
  const audioDuration = maxDuration || 60; // Default to 60 seconds if not provided

  const prompt = `You are a professional music video director with perfect pitch and timing. Listen CAREFULLY to this audio track and create a musically-accurate storyboard.

## YOUR CRITICAL TASK

**IMPORTANT: If the requested duration is SHORTER than the full song, you MUST find and use the section with the BEST VOCALS/LYRICS.** Don't just use the beginning - find where the singer is clearly audible and build the storyboard around that section. Report the recommended start time.

${specificRequest ? `## SPECIFIC REQUEST FROM USER
**"${specificRequest}"**
You MUST address this specific request in a dedicated section called "SPECIFIC REQUEST RESPONSE" in your output. If the user asks for the chorus, identify EXACTLY when the chorus starts and ends. If they ask for a specific part, find it precisely.` : ""}

1. **LISTEN DEEPLY** - Identify exact timestamps where:
   - Vocals/lyrics are clearly audible (these are PRIORITY for singer shots)
   - Guitar solos or prominent guitar riffs occur
   - Drum fills or powerful drum sections
   - Bass grooves or bass-forward moments
   - Instrumental breaks with no vocals
   - Energy peaks (choruses, climaxes)
   - Quiet/building sections (verses, intros)

2. **MATCH VISUALS TO AUDIO** - This is the MOST IMPORTANT rule:
   - When you hear VOCALS → Show SINGER (ANGLE_2 or ANGLE_8)
   - When you hear GUITAR SOLO → Show GUITARIST (ANGLE_3)
   - When you hear DRUM FILL → Show DRUMMER (ANGLE_4)
   - When you hear BASS GROOVE → Show BASSIST (ANGLE_5)
   - When you hear FULL BAND → Show WIDE SHOT (ANGLE_1)
   - During instrumental breaks → Show CROWD or SILHOUETTES (ANGLE_6, ANGLE_7)
   - NEVER show drummer when guitar is soloing. NEVER show guitarist when drums are featured.

3. **FIND THE BEST MOMENTS**:
   - Identify the section with the CLEAREST, STRONGEST vocals
   - Identify the most POWERFUL instrumental moment
   - Identify where the song PEAKS emotionally
   - Start the video during an engaging moment, not a quiet intro

## CAMERA ANGLES (9 fixed)
- ANGLE_1: Wide establishing shot (full stage)
- ANGLE_2: Singer close-up (face/upper body) - USE FOR VOCALS
- ANGLE_3: Guitar player close-up - USE FOR GUITAR PARTS
- ANGLE_4: Drummer close-up - USE FOR DRUM FILLS
- ANGLE_5: Bass player close-up - USE FOR BASS GROOVES
- ANGLE_6: Crowd/audience shot - USE FOR ENERGY/CHORUSES
- ANGLE_7: Stage side silhouette - USE FOR DRAMATIC MOMENTS
- ANGLE_8: Low angle singer - USE FOR POWERFUL VOCAL MOMENTS
- ANGLE_9: Behind band POV - USE FOR TRANSITIONS

## OUTPUT FORMAT (Readable Markdown - Claude will read this)

# MUSIC VIDEO STORYBOARD

## Theme
[One sentence describing the visual aesthetic]

## Music Analysis
- Genre: [what genre]
- Tempo: [BPM estimate, feel]
- Instruments heard: [list what you hear]
- Energy arc: [describe how energy changes through the track]

## Audio Events Timeline
List exact timestamps for key audio moments:

**Vocals:**
- 0:05-0:15 - Verse 1 vocals (clear lyrics about...)
- 0:32-0:48 - Chorus vocals (powerful, emotional)
- etc.

**Guitar highlights:**
- 0:20-0:28 - Guitar riff (prominent, should show guitarist)
- 1:05-1:20 - Guitar solo
- etc.

**Drum highlights:**
- 0:00-0:04 - Drum intro fill
- 0:30-0:32 - Big drum fill before chorus
- etc.

**Energy peaks:** 0:32, 0:58, 1:24 (chorus hits)

**Best vocal section:** 0:32-0:48 - This is the strongest vocal moment because...

## RECOMMENDED SEGMENT (for partial video)
If making a shorter video, USE THIS SECTION:
- **Start at:** 0:32 (where vocals/action begins)
- **Why:** Clear vocals, high energy, represents the song well
- **This ${audioDuration}s segment covers:** 0:32 to 0:XX

## 9 Camera Angles
1. ANGLE_1: [Detailed description of wide shot]
2. ANGLE_2: [Singer close-up details]
3. ANGLE_3: [Guitar player details]
4. ANGLE_4: [Drummer details]
5. ANGLE_5: [Bass player details]
6. ANGLE_6: [Crowd shot details]
7. ANGLE_7: [Silhouette shot details]
8. ANGLE_8: [Low angle singer details]
9. ANGLE_9: [Behind band POV details]

## Shot List
Format: [START-END] ANGLE_X - Description | AUDIO REASON | LYRICS: "exact lyrics heard"

**CRITICAL: Include LYRICS field for EVERY shot where vocals are heard. Write the EXACT Hebrew/English words sung during that shot. This is essential for timing alignment.**

[0:00-0:03] ANGLE_1 - Wide establishing shot | Full band playing intro | LYRICS: (instrumental)
[0:03-0:05] ANGLE_4 - Drummer close-up | Drum fill prominent here | LYRICS: (instrumental)
[0:05-0:09] ANGLE_2 - Singer face | Vocals begin here | LYRICS: "הכל מתחיל מכאן"
[0:09-0:12] ANGLE_3 - Guitarist hands | Guitar riff takes over | LYRICS: (instrumental)
... continue for full ${audioDuration} seconds ...

## RULES
- Total duration: ${audioDuration} seconds
- Shot length: 2-5 seconds each (vary based on energy - faster cuts for high energy, longer for emotional moments)
- EVERY shot must have AUDIO REASON explaining why that angle
- EVERY shot with vocals MUST include LYRICS field with exact words
- Show what we HEAR - vocals = singer, guitar = guitarist, etc.
- Cut on beat changes
- More cuts during high energy sections

## SHOT VARIETY (CRITICAL)
**NEVER show the same subject in 2 consecutive shots.** This creates jarring jump cuts.

BAD examples (DON'T DO THIS):
- [0:00-0:03] ANGLE_2 - Singer closeup → [0:03-0:06] ANGLE_8 - Singer low angle (SAME SUBJECT!)
- [0:10-0:13] ANGLE_3 - Guitarist → [0:13-0:16] ANGLE_3 - Guitarist hands (SAME SUBJECT!)

GOOD examples (DO THIS):
- [0:00-0:03] ANGLE_2 - Singer closeup → [0:03-0:05] ANGLE_1 - Wide shot → [0:05-0:08] ANGLE_8 - Singer low angle
- [0:10-0:13] ANGLE_3 - Guitarist → [0:13-0:15] ANGLE_6 - Crowd → [0:15-0:18] ANGLE_3 - Guitarist hands

**PACING VARIETY:**
- Alternate between CLOSE-UP → WIDE → CLOSE-UP or CLOSE-UP → DIFFERENT CLOSE-UP
- High energy sections: 1.5-2 second cuts (fast, punchy)
- Emotional/building sections: 3-5 second cuts (let moments breathe)
- Transitions/breaks: Use ANGLE_7 silhouette or ANGLE_9 behind band
- Match cut rhythm to music tempo - faster song = faster cuts

**DYNAMIC FLOW:**
- Start with establishing wide shot (ANGLE_1) for context
- Build intensity by moving closer (wide → medium → closeup)
- Peak moments: fast cuts between multiple angles
- Quiet moments: hold on singer or silhouette longer
- End sections with transition shots (ANGLE_7 or ANGLE_9)`;

  console.log("Analyzing audio with Gemini...");
  console.log(`Audio file: ${audioPath}`);
  console.log(`Duration to analyze: ${audioDuration} seconds`);

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
          { text: prompt },
        ],
      },
    ],
  });

  const text = response.text || "";

  // Return raw markdown - Claude will read and interpret it
  return text;
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log("Usage: npx ts-node analyze_audio.ts <audio_path> [duration_seconds] [output_file] [--request 'specific request']");
    process.exit(1);
  }

  const audioPath = args[0];
  const duration = args[1] ? parseInt(args[1]) : undefined;

  // Check for --request flag
  const requestIndex = args.indexOf("--request");
  let specificRequest = "";
  let outputPath = "/tmp/storyboard.md";

  if (requestIndex !== -1 && args[requestIndex + 1]) {
    specificRequest = args[requestIndex + 1];
    // Output path is arg before --request if it exists
    if (args[2] && args[2] !== "--request") {
      outputPath = args[2];
    }
  } else if (args[2]) {
    outputPath = args[2];
  }

  if (specificRequest) {
    console.log(`Specific request: "${specificRequest}"`);
  }

  if (!fs.existsSync(audioPath)) {
    console.error(`Audio file not found: ${audioPath}`);
    process.exit(1);
  }

  try {
    const storyboard = await analyzeAudioAndCreateStoryboard(audioPath, duration, specificRequest);

    // Print the storyboard (readable markdown)
    console.log("\n" + storyboard);

    // Save to file
    fs.writeFileSync(outputPath, storyboard);
    console.log(`\n---\nStoryboard saved to: ${outputPath}`);

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
