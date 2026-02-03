import {
	AbsoluteFill,
	Video,
	OffthreadVideo,
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	spring,
	Easing,
} from 'remotion';
import { LyricsData, LyricLine, LyricWord } from './LyricsOverlay';

export type { LyricsData, LyricLine, LyricWord };

export interface LyricsOverlayCinematicProps {
	videoSrc: string;
	lyrics: LyricsData;
	fontSize?: number;
	primaryColor?: string;
	accentColor?: string;
	fontFamily?: string;
	isRTL?: boolean;
	useOffthreadVideo?: boolean;
	letterSpacing?: number;
}

const isRTLText = (text: string): boolean => {
	const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/;
	return rtlRegex.test(text);
};

// Cinematic word - big, dramatic, center-screen
interface CinematicWordProps {
	word: LyricWord;
	lineStart: number;
	lineEnd: number;
	frame: number;
	fps: number;
	index: number;
	totalWords: number;
	primaryColor: string;
	accentColor: string;
	fontSize: number;
	isRTL: boolean;
	letterSpacing: number;
}

const CinematicWord: React.FC<CinematicWordProps> = ({
	word,
	lineStart,
	lineEnd,
	frame,
	fps,
	index,
	totalWords,
	primaryColor,
	accentColor,
	fontSize,
	isRTL,
	letterSpacing,
}) => {
	const wordStartFrame = word.start * fps;
	const wordEndFrame = word.end * fps;
	const lineEndFrame = lineEnd * fps;
	const localFrame = frame - wordStartFrame;

	// Not visible yet
	if (frame < wordStartFrame - 10) return null;

	const isActive = frame >= wordStartFrame && frame <= wordEndFrame;
	const isPast = frame > wordEndFrame;

	// Dramatic scale entrance - starts big, settles to normal
	const entranceScale = spring({
		frame: Math.max(0, localFrame),
		fps,
		config: { damping: 15, stiffness: 100, mass: 0.8 },
	});

	// Pre-entrance: word is very large and faded
	const preEntranceScale = frame < wordStartFrame
		? interpolate(frame, [wordStartFrame - 10, wordStartFrame], [2.5, 1], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		})
		: 1;

	const preEntranceOpacity = frame < wordStartFrame
		? interpolate(frame, [wordStartFrame - 10, wordStartFrame], [0, 1], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		})
		: 1;

	// Exit animation - slower decay, words linger after timing ends
	const exitDuration = 45; // 1.8 sec at 25fps - much slower decay
	const exitStart = lineEndFrame; // Start fading AFTER line ends, not before
	const exitProgress = frame > exitStart
		? interpolate(frame, [exitStart, exitStart + exitDuration], [0, 1], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
			easing: Easing.out(Easing.cubic), // Smooth ease-out for natural decay
		})
		: 0;

	const exitScale = 1 + exitProgress * 0.15; // Subtler scale
	const exitOpacity = 1 - exitProgress;

	// Blur effect for dramatic entrance
	const blur = frame < wordStartFrame
		? interpolate(frame, [wordStartFrame - 10, wordStartFrame], [8, 0], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		})
		: exitProgress * 4;

	// Glow intensity
	const glowIntensity = isActive ? 40 : isPast ? 15 : 25;

	// Size based on emphasis
	const getFontSize = () => {
		switch (word.emphasis) {
			case 'hero': return fontSize * 1.5;
			case 'strong': return fontSize * 1.2;
			default: return fontSize;
		}
	};

	const textShadow = `
		0 0 ${glowIntensity}px ${accentColor},
		0 0 ${glowIntensity * 2}px ${accentColor}88,
		0 0 ${glowIntensity * 3}px ${accentColor}44,
		0 8px 30px rgba(0,0,0,0.9)
	`;

	const finalScale = preEntranceScale * entranceScale * exitScale;
	const finalOpacity = preEntranceOpacity * exitOpacity;

	return (
		<span
			style={{
				display: 'inline-block',
				opacity: finalOpacity,
				transform: `scale(${finalScale})`,
				fontSize: getFontSize(),
				fontWeight: 800,
				color: isActive ? '#FFFFFF' : primaryColor,
				textShadow,
				filter: `blur(${blur}px)`,
				letterSpacing: `${letterSpacing}em`,
				textTransform: 'uppercase',
				marginLeft: isRTL ? 20 : 0,
				marginRight: isRTL ? 0 : 20,
				transition: 'color 0.2s ease',
			}}
		>
			{word.word}
		</span>
	);
};

// Cinematic line - centered, large
interface CinematicLineProps {
	line: LyricLine;
	frame: number;
	fps: number;
	primaryColor: string;
	accentColor: string;
	fontSize: number;
	isRTL: boolean;
	letterSpacing: number;
	lineIndex: number;
}

const CinematicLine: React.FC<CinematicLineProps> = ({
	line,
	frame,
	fps,
	primaryColor,
	accentColor,
	fontSize,
	isRTL,
	letterSpacing,
	lineIndex,
}) => {
	const lineStartFrame = line.lineStart * fps;
	const lineEndFrame = line.lineEnd * fps;

	// Extended visibility: allow words to linger 45 frames (1.8 sec) after line ends
	if (frame < lineStartFrame - 15 || frame > lineEndFrame + 50) return null;

	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				flexWrap: 'wrap',
				direction: isRTL ? 'rtl' : 'ltr',
			}}
		>
			{line.words.map((word, index) => (
				<CinematicWord
					key={`${word.word}-${index}`}
					word={word}
					lineStart={line.lineStart}
					lineEnd={line.lineEnd}
					frame={frame}
					fps={fps}
					index={index}
					totalWords={line.words.length}
					primaryColor={primaryColor}
					accentColor={accentColor}
					fontSize={fontSize}
					isRTL={isRTL}
					letterSpacing={letterSpacing}
				/>
			))}
		</div>
	);
};

export const LyricsOverlayCinematic: React.FC<LyricsOverlayCinematicProps> = ({
	videoSrc,
	lyrics,
	fontSize = 90,
	primaryColor = '#E8E8E8',
	accentColor = '#FFD700', // Gold
	fontFamily = '"Bebas Neue", "Anton", Impact, sans-serif',
	isRTL,
	useOffthreadVideo = false,
	letterSpacing = 0.15,
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const effectiveRTL = isRTL ?? (lyrics.lines.length > 0 && lyrics.lines[0].words.length > 0
		? isRTLText(lyrics.lines[0].words[0].word)
		: false);

	const VideoComponent = useOffthreadVideo ? OffthreadVideo : Video;

	return (
		<AbsoluteFill style={{ fontFamily }}>
			<VideoComponent
				src={videoSrc}
				style={{ width: '100%', height: '100%', objectFit: 'cover' }}
			/>

			{/* Dark cinematic bars */}
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					height: '15%',
					background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 100%)',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					bottom: 0,
					left: 0,
					right: 0,
					height: '15%',
					background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
				}}
			/>

			{/* Vignette */}
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
					pointerEvents: 'none',
				}}
			/>

			{/* Center lyrics */}
			<div
				style={{
					position: 'absolute',
					top: '50%',
					left: 80,
					right: 80,
					transform: 'translateY(-50%)',
					textAlign: 'center',
				}}
			>
				{lyrics.lines.map((line, index) => (
					<CinematicLine
						key={index}
						line={line}
						lineIndex={index}
						frame={frame}
						fps={fps}
						primaryColor={primaryColor}
						accentColor={accentColor}
						fontSize={fontSize}
						isRTL={effectiveRTL}
						letterSpacing={letterSpacing}
					/>
				))}
			</div>
		</AbsoluteFill>
	);
};

export { parseSRT, parseElevenLabsTranscript } from '../utils/lyricsParser';
