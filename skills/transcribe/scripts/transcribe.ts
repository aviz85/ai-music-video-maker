#!/usr/bin/env npx ts-node
/**
 * Transcribe audio/video to SRT + readable text using ElevenLabs Scribe v2
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { program } from 'commander';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io';

interface Word {
  word: string;
  start: number;
  end: number;
  speaker_id?: string;
}

interface TranscriptResult {
  text: string;
  words: Word[];
  duration: number;
  language: string;
}

interface DubbingStatus {
  dubbing_id: string;
  name: string;
  status: string;
  target_languages: string[];
  error?: string;
}

interface SubtitleEntry {
  index: number;
  start: number;
  end: number;
  text: string;
}

function secondsToSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
}

async function transcribe(inputPath: string, language?: string, enableSpeakers: boolean = true): Promise<TranscriptResult> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not set in .env');
  }

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  console.log(`Transcribing: ${path.basename(inputPath)}`);
  console.log(`Language: ${language || 'auto-detect'}`);
  console.log(`Speaker diarization: ${enableSpeakers ? 'enabled' : 'disabled'}`);

  const formData = new FormData();
  const fileBuffer = fs.readFileSync(inputPath);
  const blob = new Blob([fileBuffer]);
  formData.append('file', blob, path.basename(inputPath));
  formData.append('model_id', 'scribe_v2');
  formData.append('tag_audio_events', 'false');

  // Enable speaker diarization
  if (enableSpeakers) {
    formData.append('diarize', 'true');
  }

  if (language) {
    formData.append('language_code', language);
  }

  const response = await fetch(`${ELEVENLABS_BASE_URL}/v1/speech-to-text`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcription failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json() as any;

  const words: Word[] = (result.words || []).map((w: any) => ({
    word: w.text || w.word || '',
    start: w.start || 0,
    end: w.end || 0,
    speaker_id: w.speaker_id || undefined,
  }));

  const duration = words.length > 0 ? Math.max(...words.map(w => w.end)) : 0;

  console.log(`Done: ${words.length} words, ${duration.toFixed(1)}s`);

  return {
    text: result.text || '',
    words,
    duration,
    language: result.language_code || language || 'unknown',
  };
}

function generateSrt(
  words: Word[],
  options: {
    maxWords: number;
    maxDuration: number;
    maxChars: number;
    timingOffset: number;
  }
): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  let currentWords: Word[] = [];
  let currentStart: number | null = null;

  for (const word of words) {
    const wordText = word.word.trim();
    if (!wordText) continue;

    if (currentStart === null) {
      currentStart = word.start;
    }

    const testText = [...currentWords.map(w => w.word), wordText].join(' ');
    const entryDuration = word.end - currentStart;

    const shouldBreak =
      testText.length > options.maxChars ||
      entryDuration > options.maxDuration ||
      currentWords.length >= options.maxWords;

    if (shouldBreak && currentWords.length > 0) {
      const lastWord = currentWords[currentWords.length - 1];
      const entryEnd = lastWord.end;
      const text = currentWords.map(w => w.word).join(' ');

      entries.push({
        index: entries.length + 1,
        start: currentStart + options.timingOffset,
        end: entryEnd + options.timingOffset,
        text,
      });

      currentWords = [word];
      currentStart = word.start;
    } else {
      currentWords.push(word);
    }
  }

  // Add final entry
  if (currentWords.length > 0 && currentStart !== null) {
    const lastWord = currentWords[currentWords.length - 1];
    const text = currentWords.map(w => w.word).join(' ');

    entries.push({
      index: entries.length + 1,
      start: currentStart + options.timingOffset,
      end: lastWord.end + options.timingOffset,
      text,
    });
  }

  return entries;
}

function writeSrt(entries: SubtitleEntry[], outputPath: string): void {
  const lines: string[] = [];

  for (const entry of entries) {
    lines.push(entry.index.toString());
    lines.push(`${secondsToSrtTime(entry.start)} --> ${secondsToSrtTime(entry.end)}`);
    lines.push(entry.text);
    lines.push('');
  }

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  console.log(`Written: ${outputPath} (${entries.length} entries)`);
}

function formatTimeSimple(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function generateReadableText(
  words: Word[],
  options: {
    timestampInterval: number; // seconds between timestamps (default 300 = 5 min)
    inputFileName: string;
  }
): string {
  const lines: string[] = [];
  let currentSpeaker: string | null = null;
  let currentParagraph: string[] = [];
  let paragraphStart: number | null = null;
  let lastTimestamp = 0;

  // Header
  lines.push(`# תמלול: ${options.inputFileName}`);
  lines.push(`**תאריך:** ${new Date().toLocaleDateString('he-IL')}`);
  const totalDuration = words.length > 0 ? Math.max(...words.map(w => w.end)) : 0;
  lines.push(`**משך:** ${formatTimeSimple(totalDuration)}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordText = word.word.trim();
    if (!wordText) continue;

    // Check if we need a timestamp marker (every ~5 minutes)
    if (word.start - lastTimestamp >= options.timestampInterval) {
      // Flush current paragraph
      if (currentParagraph.length > 0) {
        lines.push(currentParagraph.join(' '));
        lines.push('');
        currentParagraph = [];
      }
      // Add timestamp marker
      lines.push(`**[${formatTimeSimple(word.start)}]**`);
      lines.push('');
      lastTimestamp = word.start;
      paragraphStart = word.start;
    }

    // Check for speaker change
    const speakerId = word.speaker_id || 'unknown';
    if (speakerId !== currentSpeaker) {
      // Flush current paragraph
      if (currentParagraph.length > 0) {
        lines.push(currentParagraph.join(' '));
        lines.push('');
        currentParagraph = [];
      }

      currentSpeaker = speakerId;

      // Add speaker label (only if we have actual speaker info)
      if (word.speaker_id) {
        const speakerLabel = `דובר ${speakerId.replace('speaker_', '')}`;
        lines.push(`**${speakerLabel}:**`);
      }
      paragraphStart = word.start;
    }

    if (paragraphStart === null) {
      paragraphStart = word.start;
    }

    currentParagraph.push(wordText);

    // Natural paragraph breaks: after sentence-ending punctuation + some length
    const endsWithPunctuation = /[.!?،]$/.test(wordText);
    const isParagraphLongEnough = currentParagraph.join(' ').length > 300;

    if (endsWithPunctuation && isParagraphLongEnough) {
      lines.push(currentParagraph.join(' '));
      lines.push('');
      currentParagraph = [];
      paragraphStart = null;
    }
  }

  // Flush remaining paragraph
  if (currentParagraph.length > 0) {
    lines.push(currentParagraph.join(' '));
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*תמלול אוטומטי - ElevenLabs Scribe v2*');

  return lines.join('\n');
}

function writeReadableText(words: Word[], outputPath: string, inputFileName: string, timestampInterval: number = 300): void {
  const content = generateReadableText(words, {
    timestampInterval,
    inputFileName,
  });

  fs.writeFileSync(outputPath, content, 'utf-8');
  console.log(`Written: ${outputPath} (readable text)`);
}

async function main() {
  program
    .requiredOption('-i, --input <path>', 'Input audio/video file')
    .requiredOption('-o, --output <path>', 'Output SRT file path')
    .option('-l, --language <code>', 'Language code (en, he, ar, etc.)')
    .option('--max-words <n>', 'Max words per subtitle', '5')
    .option('--max-duration <s>', 'Max duration per subtitle in seconds', '3.0')
    .option('--max-chars <n>', 'Max characters per subtitle', '70')
    .option('--timing-offset <s>', 'Timing offset in seconds', '0.25')
    .option('--json', 'Also output raw transcript JSON')
    .option('--text', 'Also output readable text file (with speakers + timestamps)')
    .option('--no-srt', 'Skip SRT generation (only generate text/json)')
    .option('--no-speakers', 'Disable speaker diarization')
    .option('--timestamp-interval <s>', 'Interval for timestamps in readable text (seconds)', '300')
    .parse();

  const opts = program.opts();

  try {
    const enableSpeakers = opts.speakers !== false;
    const transcript = await transcribe(opts.input, opts.language, enableSpeakers);

    // Generate SRT (unless --no-srt)
    if (opts.srt !== false) {
      const entries = generateSrt(transcript.words, {
        maxWords: parseInt(opts.maxWords),
        maxDuration: parseFloat(opts.maxDuration),
        maxChars: parseInt(opts.maxChars),
        timingOffset: parseFloat(opts.timingOffset),
      });
      writeSrt(entries, opts.output);
    }

    // Generate readable text (if --text or always by default now)
    const textPath = opts.output.replace(/\.srt$/i, '.md');
    const inputFileName = path.basename(opts.input);
    writeReadableText(
      transcript.words,
      textPath,
      inputFileName,
      parseInt(opts.timestampInterval)
    );

    // Generate JSON (if --json)
    if (opts.json) {
      const jsonPath = opts.output.replace(/\.srt$/i, '_transcript.json');
      fs.writeFileSync(jsonPath, JSON.stringify(transcript, null, 2), 'utf-8');
      console.log(`Written: ${jsonPath}`);
    }

    console.log('\n✓ Transcription complete!');
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
