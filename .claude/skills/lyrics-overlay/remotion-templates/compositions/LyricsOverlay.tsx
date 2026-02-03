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

// Types for lyrics data
export interface LyricWord {
	word: string;
	start: number; // seconds
	end: number; // seconds
	emphasis?: 'hero' | 'strong' | 'normal';
}

export interface LyricLine {
	lineStart: number;
	lineEnd: number;
	words: LyricWord[];
}

export interface LyricsData {
	lines: LyricLine[];
	duration: number;
}

// Style types
export type LyricsStyle = 'fade' | 'karaoke' | 'minimal';
export type LyricsPosition = 'bottom' | 'center' | 'top';

export interface LyricsOverlayProps {
	videoSrc: string;
	lyrics: LyricsData;
	style?: LyricsStyle;
	fontSize?: number;
	position?: LyricsPosition;
	primaryColor?: string;
	secondaryColor?: string;
	highlightColor?: string;
	fontFamily?: string;
	isRTL?: boolean;
	showGradientOverlay?: boolean;
	useOffthreadVideo?: boolean;
}

// Helper to detect Hebrew/Arabic text for RTL
const isRTLText = (text: string): boolean => {
	const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/;
	return rtlRegex.test(text);
};

// Animated word component for karaoke style
interface KaraokeWordProps {
	word: LyricWord;
	lineEnd: number;
	frame: number;
	fps: number;
	index: number;
	primaryColor: string;
	highlightColor: string;
	fontSize: number;
	isRTL: boolean;
}

const KaraokeWord: React.FC<KaraokeWordProps> = ({
	word,
	lineEnd,
	frame,
	fps,
	index,
	primaryColor,
	highlightColor,
	fontSize,
	isRTL,
}) => {
	const wordStartFrame = word.start * fps;
	const wordEndFrame = word.end * fps;
	const lineEndFrame = lineEnd * fps;
	const localFrame = frame - wordStartFrame;

	// Word hasn't appeared yet
	if (frame < wordStartFrame) {
		return (
			<span
				style={{
					opacity: 0.4,
					display: 'inline-block',
					color: primaryColor,
					fontSize,
				}}
			>
				{word.word}
				{!isRTL && '\u00A0'}
			</span>
		);
	}

	// Spring animation for entrance
	const getSpringConfig = () => {
		switch (word.emphasis) {
			case 'hero':
				return { damping: 8, stiffness: 200, mass: 0.3 };
			case 'strong':
				return { damping: 10, stiffness: 160, mass: 0.4 };
			default:
				return { damping: 12, stiffness: 140, mass: 0.5 };
		}
	};

	const scale = spring({
		frame: localFrame,
		fps,
		config: getSpringConfig(),
	});

	// Calculate if word is currently being spoken
	const isActive = frame >= wordStartFrame && frame <= wordEndFrame;
	const isPast = frame > wordEndFrame;

	// Entrance animation
	const translateY = interpolate(localFrame, [0, 5], [15, 0], {
		extrapolateRight: 'clamp',
		easing: Easing.out(Easing.cubic),
	});

	const opacity = interpolate(localFrame, [0, 3], [0.4, 1], { extrapolateRight: 'clamp' });

	// Line exit animation - slower decay, words linger after timing ends
	const exitDuration = 35; // ~1.4 sec at 25fps - slower decay
	const exitStart = lineEndFrame; // Start fading AFTER line ends
	const exitProgress = frame > exitStart
		? interpolate(frame, [exitStart, exitStart + exitDuration], [0, 1], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
			easing: Easing.out(Easing.cubic),
		})
		: 0;
	const exitOpacity = 1 - exitProgress;
	const exitTranslateY = exitProgress * 15;

	// Styling based on emphasis
	const getFontSize = () => {
		switch (word.emphasis) {
			case 'hero': return fontSize * 1.3;
			case 'strong': return fontSize * 1.1;
			default: return fontSize;
		}
	};

	const getColor = () => {
		if (isActive) return highlightColor;
		if (isPast) return primaryColor;
		return primaryColor;
	};

	const getFontWeight = () => {
		switch (word.emphasis) {
			case 'hero': return 900;
			case 'strong': return 700;
			default: return 600;
		}
	};

	const textShadow = isActive
		? `0 0 30px ${highlightColor}, 0 0 60px ${highlightColor}80, 0 4px 15px rgba(0,0,0,0.9)`
		: '0 2px 15px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.5)';

	return (
		<span
			style={{
				display: 'inline-block',
				opacity: opacity * exitOpacity,
				transform: `translateY(${translateY + exitTranslateY}px) scale(${scale})`,
				fontSize: getFontSize(),
				fontWeight: getFontWeight(),
				color: getColor(),
				textShadow,
				marginLeft: isRTL ? 12 : 0,
				marginRight: isRTL ? 0 : 12,
				transition: 'color 0.15s ease',
			}}
		>
			{word.word}
		</span>
	);
};

// Fade style word component
interface FadeWordProps {
	word: LyricWord;
	lineEnd: number;
	frame: number;
	fps: number;
	primaryColor: string;
	fontSize: number;
	isRTL: boolean;
}

const FadeWord: React.FC<FadeWordProps> = ({
	word,
	lineEnd,
	frame,
	fps,
	primaryColor,
	fontSize,
	isRTL,
}) => {
	const wordStartFrame = word.start * fps;
	const lineEndFrame = lineEnd * fps;
	const localFrame = frame - wordStartFrame;

	// Word hasn't appeared yet
	if (frame < wordStartFrame) {
		return <span style={{ opacity: 0 }}>{word.word}{!isRTL && '\u00A0'}</span>;
	}

	// Fade in
	const opacity = interpolate(localFrame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

	// Line exit - slower decay
	const exitDuration = 35;
	const exitStart = lineEndFrame;
	const exitOpacity = frame > exitStart
		? interpolate(frame, [exitStart, exitStart + exitDuration], [1, 0], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
			easing: Easing.out(Easing.cubic),
		})
		: 1;

	return (
		<span
			style={{
				display: 'inline-block',
				opacity: opacity * exitOpacity,
				fontSize,
				fontWeight: 600,
				color: primaryColor,
				textShadow: '0 2px 15px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.5)',
				marginLeft: isRTL ? 8 : 0,
				marginRight: isRTL ? 0 : 8,
			}}
		>
			{word.word}
		</span>
	);
};

// Minimal style - shows whole line, highlights current word
interface MinimalLineProps {
	line: LyricLine;
	frame: number;
	fps: number;
	primaryColor: string;
	highlightColor: string;
	fontSize: number;
	isRTL: boolean;
}

const MinimalLine: React.FC<MinimalLineProps> = ({
	line,
	frame,
	fps,
	primaryColor,
	highlightColor,
	fontSize,
	isRTL,
}) => {
	const lineStartFrame = line.lineStart * fps;
	const lineEndFrame = line.lineEnd * fps;

	// Extended visibility for slower decay
	if (frame < lineStartFrame - 5 || frame > lineEndFrame + 40) return null;

	// Line entrance/exit - slower decay after line ends
	const entranceProgress = interpolate(frame, [lineStartFrame - 5, lineStartFrame + 5], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const exitProgress = interpolate(frame, [lineEndFrame, lineEndFrame + 35], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: Easing.out(Easing.cubic),
	});
	const opacity = Math.min(entranceProgress, exitProgress);

	return (
		<div
			style={{
				opacity,
				direction: isRTL ? 'rtl' : 'ltr',
				textAlign: 'center',
			}}
		>
			{line.words.map((word, idx) => {
				const isActive = frame >= word.start * fps && frame <= word.end * fps;
				return (
					<span
						key={idx}
						style={{
							display: 'inline-block',
							fontSize,
							fontWeight: isActive ? 700 : 500,
							color: isActive ? highlightColor : primaryColor,
							textShadow: isActive
								? `0 0 20px ${highlightColor}, 0 2px 10px rgba(0,0,0,0.9)`
								: '0 2px 10px rgba(0,0,0,0.8)',
							marginLeft: isRTL ? 8 : 0,
							marginRight: isRTL ? 0 : 8,
							transition: 'all 0.15s ease',
							transform: isActive ? 'scale(1.05)' : 'scale(1)',
						}}
					>
						{word.word}
					</span>
				);
			})}
		</div>
	);
};

// Lyric line component
interface LyricLineComponentProps {
	line: LyricLine;
	frame: number;
	fps: number;
	style: LyricsStyle;
	primaryColor: string;
	highlightColor: string;
	fontSize: number;
	isRTL: boolean;
}

const LyricLineComponent: React.FC<LyricLineComponentProps> = ({
	line,
	frame,
	fps,
	style,
	primaryColor,
	highlightColor,
	fontSize,
	isRTL,
}) => {
	const lineStartFrame = line.lineStart * fps;
	const lineEndFrame = line.lineEnd * fps;

	// Line not visible yet or already gone (extended for slower decay)
	if (frame < lineStartFrame - 5 || frame > lineEndFrame + 40) return null;

	if (style === 'minimal') {
		return (
			<MinimalLine
				line={line}
				frame={frame}
				fps={fps}
				primaryColor={primaryColor}
				highlightColor={highlightColor}
				fontSize={fontSize}
				isRTL={isRTL}
			/>
		);
	}

	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'baseline',
				flexWrap: 'wrap',
				gap: '4px 0',
				direction: isRTL ? 'rtl' : 'ltr',
			}}
		>
			{line.words.map((word, index) =>
				style === 'karaoke' ? (
					<KaraokeWord
						key={`${word.word}-${index}`}
						word={word}
						lineEnd={line.lineEnd}
						frame={frame}
						fps={fps}
						index={index}
						primaryColor={primaryColor}
						highlightColor={highlightColor}
						fontSize={fontSize}
						isRTL={isRTL}
					/>
				) : (
					<FadeWord
						key={`${word.word}-${index}`}
						word={word}
						lineEnd={line.lineEnd}
						frame={frame}
						fps={fps}
						primaryColor={primaryColor}
						fontSize={fontSize}
						isRTL={isRTL}
					/>
				)
			)}
		</div>
	);
};

// Main LyricsOverlay component
export const LyricsOverlay: React.FC<LyricsOverlayProps> = ({
	videoSrc,
	lyrics,
	style = 'karaoke',
	fontSize = 56,
	position = 'bottom',
	primaryColor = '#FFFFFF',
	secondaryColor = '#E0E0E0',
	highlightColor = '#FF6B35',
	fontFamily = 'system-ui, -apple-system, sans-serif',
	isRTL,
	showGradientOverlay = true,
	useOffthreadVideo = false,
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Auto-detect RTL if not specified
	const effectiveRTL = isRTL ?? (lyrics.lines.length > 0 && lyrics.lines[0].words.length > 0
		? isRTLText(lyrics.lines[0].words[0].word)
		: false);

	// Position styling
	const getPositionStyle = (): React.CSSProperties => {
		switch (position) {
			case 'top':
				return { top: 80, left: 60, right: 60 };
			case 'center':
				return { top: '50%', left: 60, right: 60, transform: 'translateY(-50%)' };
			case 'bottom':
			default:
				return { bottom: 100, left: 60, right: 60 };
		}
	};

	// Gradient position
	const getGradientStyle = (): React.CSSProperties => {
		switch (position) {
			case 'top':
				return {
					top: 0,
					left: 0,
					right: 0,
					height: '35%',
					background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
				};
			case 'center':
				return {
					top: '30%',
					left: 0,
					right: 0,
					height: '40%',
					background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 30%, rgba(0,0,0,0.5) 70%, transparent 100%)',
				};
			case 'bottom':
			default:
				return {
					bottom: 0,
					left: 0,
					right: 0,
					height: '35%',
					background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
				};
		}
	};

	const VideoComponent = useOffthreadVideo ? OffthreadVideo : Video;

	return (
		<AbsoluteFill style={{ fontFamily }}>
			{/* Video background */}
			<VideoComponent
				src={videoSrc}
				style={{ width: '100%', height: '100%', objectFit: 'cover' }}
			/>

			{/* Gradient overlay for text readability */}
			{showGradientOverlay && (
				<div
					style={{
						position: 'absolute',
						...getGradientStyle(),
						pointerEvents: 'none',
					}}
				/>
			)}

			{/* Lyrics container */}
			<div
				style={{
					position: 'absolute',
					...getPositionStyle(),
				}}
			>
				{lyrics.lines.map((line, index) => (
					<LyricLineComponent
						key={index}
						line={line}
						frame={frame}
						fps={fps}
						style={style}
						primaryColor={primaryColor}
						highlightColor={highlightColor}
						fontSize={fontSize}
						isRTL={effectiveRTL}
					/>
				))}
			</div>
		</AbsoluteFill>
	);
};

// Re-export utility functions for parsing lyrics
export { parseSRT, parseElevenLabsTranscript } from '../utils/lyricsParser';

// Export default demo lyrics for testing
export const demoLyrics: LyricsData = {
	lines: [
		{
			lineStart: 0,
			lineEnd: 3,
			words: [
				{ word: 'Welcome', start: 0, end: 0.8, emphasis: 'hero' },
				{ word: 'to', start: 0.9, end: 1.2 },
				{ word: 'the', start: 1.3, end: 1.5 },
				{ word: 'lyrics', start: 1.6, end: 2.2, emphasis: 'strong' },
				{ word: 'overlay!', start: 2.3, end: 3, emphasis: 'hero' },
			],
		},
		{
			lineStart: 4,
			lineEnd: 7,
			words: [
				{ word: 'This', start: 4, end: 4.3 },
				{ word: 'is', start: 4.4, end: 4.6 },
				{ word: 'a', start: 4.7, end: 4.8 },
				{ word: 'demo', start: 4.9, end: 5.5, emphasis: 'strong' },
				{ word: 'composition.', start: 5.6, end: 7 },
			],
		},
	],
	duration: 10,
};
