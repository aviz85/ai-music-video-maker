import type { LyricsData, LyricLine, LyricWord } from '../compositions/LyricsOverlay';

// ElevenLabs transcript format
export interface ElevenLabsWord {
	word: string;
	start: number;
	end: number;
	speaker_id?: string;
}

export interface ElevenLabsTranscript {
	text: string;
	words: ElevenLabsWord[];
	duration: number;
	language?: string;
}

// SRT parsing types
interface SRTEntry {
	index: number;
	startTime: number;
	endTime: number;
	text: string;
}

/**
 * Parse SRT timestamp to seconds
 * Format: HH:MM:SS,mmm or HH:MM:SS.mmm
 */
function parseSRTTime(timeStr: string): number {
	const parts = timeStr.replace(',', '.').split(':');
	const hours = parseInt(parts[0], 10);
	const minutes = parseInt(parts[1], 10);
	const seconds = parseFloat(parts[2]);
	return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Parse SRT file content into LyricsData
 * SRT format typically has line-level timing, not word-level
 * This function creates approximate word timings by distributing time evenly
 */
export function parseSRT(srtContent: string): LyricsData {
	const lines: LyricLine[] = [];

	// Split by double newline to get entries
	const entries = srtContent.trim().split(/\n\n+/);

	for (const entry of entries) {
		const entryLines = entry.trim().split('\n');
		if (entryLines.length < 3) continue;

		// Skip index line (first line is the entry number)
		const timeLine = entryLines[1];
		const textLines = entryLines.slice(2).join(' ');

		// Parse time codes
		const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
		if (!timeMatch) continue;

		const startTime = parseSRTTime(timeMatch[1]);
		const endTime = parseSRTTime(timeMatch[2]);

		// Split text into words
		const wordTexts = textLines.split(/\s+/).filter(w => w.length > 0);
		if (wordTexts.length === 0) continue;

		// Distribute time evenly across words
		const totalDuration = endTime - startTime;
		const wordDuration = totalDuration / wordTexts.length;

		const words: LyricWord[] = wordTexts.map((word, idx) => ({
			word,
			start: startTime + idx * wordDuration,
			end: startTime + (idx + 1) * wordDuration,
			emphasis: 'normal' as const,
		}));

		lines.push({
			lineStart: startTime,
			lineEnd: endTime,
			words,
		});
	}

	const duration = lines.length > 0 ? lines[lines.length - 1].lineEnd : 0;

	return { lines, duration };
}

/**
 * Parse ElevenLabs JSON transcript into LyricsData
 * ElevenLabs provides word-level timing which we can use directly
 */
export function parseElevenLabsTranscript(
	transcript: ElevenLabsTranscript,
	options: {
		maxWordsPerLine?: number;
		lineGapThreshold?: number; // seconds - if gap between words exceeds this, start new line
		punctuationBreak?: boolean; // break lines on sentence-ending punctuation
	} = {}
): LyricsData {
	const {
		maxWordsPerLine = 8,
		lineGapThreshold = 0.8,
		punctuationBreak = true,
	} = options;

	const lines: LyricLine[] = [];
	let currentLine: LyricWord[] = [];
	let lineStart = 0;

	// Filter out whitespace-only words
	const meaningfulWords = transcript.words.filter(w => w.word.trim().length > 0);

	for (let i = 0; i < meaningfulWords.length; i++) {
		const word = meaningfulWords[i];
		const nextWord = meaningfulWords[i + 1];

		const lyricWord: LyricWord = {
			word: word.word.trim(),
			start: word.start,
			end: word.end,
			emphasis: detectEmphasis(word.word),
		};

		if (currentLine.length === 0) {
			lineStart = word.start;
		}

		currentLine.push(lyricWord);

		// Decide whether to end the current line
		let shouldEndLine = false;

		// Max words reached
		if (currentLine.length >= maxWordsPerLine) {
			shouldEndLine = true;
		}

		// Gap before next word
		if (nextWord && (nextWord.start - word.end) > lineGapThreshold) {
			shouldEndLine = true;
		}

		// Punctuation break (sentence endings)
		if (punctuationBreak && /[.!?]$/.test(word.word.trim())) {
			shouldEndLine = true;
		}

		// Last word
		if (!nextWord) {
			shouldEndLine = true;
		}

		if (shouldEndLine && currentLine.length > 0) {
			lines.push({
				lineStart,
				lineEnd: word.end,
				words: [...currentLine],
			});
			currentLine = [];
		}
	}

	return {
		lines,
		duration: transcript.duration,
	};
}

/**
 * Detect word emphasis based on punctuation and common patterns
 */
function detectEmphasis(word: string): 'hero' | 'strong' | 'normal' {
	const trimmed = word.trim();

	// Exclamation or all caps = hero
	if (/!$/.test(trimmed) || (trimmed.length > 2 && trimmed === trimmed.toUpperCase())) {
		return 'hero';
	}

	// Question marks, quotes = strong
	if (/[?"]/.test(trimmed)) {
		return 'strong';
	}

	return 'normal';
}

/**
 * Convert LyricsData to SRT format string
 */
export function lyricsToSRT(lyrics: LyricsData): string {
	const lines: string[] = [];

	lyrics.lines.forEach((line, index) => {
		const startTime = formatSRTTime(line.lineStart);
		const endTime = formatSRTTime(line.lineEnd);
		const text = line.words.map(w => w.word).join(' ');

		lines.push(`${index + 1}`);
		lines.push(`${startTime} --> ${endTime}`);
		lines.push(text);
		lines.push('');
	});

	return lines.join('\n');
}

/**
 * Format seconds to SRT timestamp
 */
function formatSRTTime(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);
	const ms = Math.round((seconds % 1) * 1000);

	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * Merge multiple LyricsData objects (for multi-part songs)
 */
export function mergeLyrics(...parts: LyricsData[]): LyricsData {
	const allLines: LyricLine[] = [];
	let maxDuration = 0;

	for (const part of parts) {
		allLines.push(...part.lines);
		maxDuration = Math.max(maxDuration, part.duration);
	}

	// Sort by start time
	allLines.sort((a, b) => a.lineStart - b.lineStart);

	return {
		lines: allLines,
		duration: maxDuration,
	};
}

/**
 * Shift all timing in lyrics by offset (positive = later, negative = earlier)
 */
export function shiftLyricsTiming(lyrics: LyricsData, offsetSeconds: number): LyricsData {
	return {
		lines: lyrics.lines.map(line => ({
			lineStart: Math.max(0, line.lineStart + offsetSeconds),
			lineEnd: Math.max(0, line.lineEnd + offsetSeconds),
			words: line.words.map(word => ({
				...word,
				start: Math.max(0, word.start + offsetSeconds),
				end: Math.max(0, word.end + offsetSeconds),
			})),
		})),
		duration: Math.max(0, lyrics.duration + offsetSeconds),
	};
}

/**
 * Scale lyrics timing by factor (useful for tempo changes)
 */
export function scaleLyricsTiming(lyrics: LyricsData, factor: number): LyricsData {
	return {
		lines: lyrics.lines.map(line => ({
			lineStart: line.lineStart * factor,
			lineEnd: line.lineEnd * factor,
			words: line.words.map(word => ({
				...word,
				start: word.start * factor,
				end: word.end * factor,
			})),
		})),
		duration: lyrics.duration * factor,
	};
}

/**
 * Apply emphasis to specific words based on patterns or word list
 */
export function applyEmphasis(
	lyrics: LyricsData,
	heroWords: string[] = [],
	strongWords: string[] = []
): LyricsData {
	const heroSet = new Set(heroWords.map(w => w.toLowerCase()));
	const strongSet = new Set(strongWords.map(w => w.toLowerCase()));

	return {
		...lyrics,
		lines: lyrics.lines.map(line => ({
			...line,
			words: line.words.map(word => {
				const cleanWord = word.word.toLowerCase().replace(/[.,!?]/g, '');
				let emphasis = word.emphasis || 'normal';

				if (heroSet.has(cleanWord)) {
					emphasis = 'hero';
				} else if (strongSet.has(cleanWord)) {
					emphasis = 'strong';
				}

				return { ...word, emphasis };
			}),
		})),
	};
}
