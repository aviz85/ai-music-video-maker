import {
	AbsoluteFill,
	Video,
	OffthreadVideo,
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	Easing,
} from 'remotion';
import { LyricsData, LyricLine, LyricWord } from './LyricsOverlay';

export type { LyricsData, LyricLine, LyricWord };

export type TypewriterPosition = 'bottom' | 'center' | 'top';
export type TypewriterTheme = 'classic' | 'terminal' | 'vintage';

export interface LyricsOverlayTypewriterProps {
	videoSrc: string;
	lyrics: LyricsData;
	fontSize?: number;
	position?: TypewriterPosition;
	theme?: TypewriterTheme;
	fontFamily?: string;
	isRTL?: boolean;
	useOffthreadVideo?: boolean;
	showCursor?: boolean;
	typeSpeed?: number; // characters per second
}

const isRTLText = (text: string): boolean => {
	const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/;
	return rtlRegex.test(text);
};

// Theme configurations
const themes = {
	classic: {
		bgColor: 'rgba(0, 0, 0, 0.7)',
		textColor: '#FFFFFF',
		cursorColor: '#FFFFFF',
		paperTexture: false,
	},
	terminal: {
		bgColor: 'rgba(0, 20, 0, 0.85)',
		textColor: '#00FF00',
		cursorColor: '#00FF00',
		paperTexture: false,
	},
	vintage: {
		bgColor: 'rgba(45, 35, 25, 0.85)',
		textColor: '#D4C5A9',
		cursorColor: '#8B7355',
		paperTexture: true,
	},
};

// Typewriter line - character by character reveal
interface TypewriterLineProps {
	line: LyricLine;
	frame: number;
	fps: number;
	theme: TypewriterTheme;
	fontSize: number;
	isRTL: boolean;
	showCursor: boolean;
	typeSpeed: number;
	lineIndex: number;
}

const TypewriterLine: React.FC<TypewriterLineProps> = ({
	line,
	frame,
	fps,
	theme,
	fontSize,
	isRTL,
	showCursor,
	typeSpeed,
	lineIndex,
}) => {
	const lineStartFrame = line.lineStart * fps;
	const lineEndFrame = line.lineEnd * fps;

	// Extended visibility for slower decay
	if (frame < lineStartFrame || frame > lineEndFrame + 45) return null;

	const themeConfig = themes[theme];

	// Build the full line text with timing
	const fullText = line.words.map(w => w.word).join(' ');
	const lineDuration = line.lineEnd - line.lineStart;
	const framesPerChar = fps / typeSpeed;

	// Calculate how many characters to show
	const localFrame = frame - lineStartFrame;
	const charsToShow = Math.floor(localFrame / framesPerChar);
	const visibleText = fullText.slice(0, Math.min(charsToShow, fullText.length));
	const isTyping = charsToShow < fullText.length;

	// Current word highlighting
	let currentWordIndex = -1;
	let charCount = 0;
	for (let i = 0; i < line.words.length; i++) {
		const word = line.words[i];
		if (frame >= word.start * fps && frame <= word.end * fps) {
			currentWordIndex = i;
			break;
		}
		charCount += word.word.length + 1; // +1 for space
	}

	// Exit animation - slower decay
	const exitStart = lineEndFrame;
	const exitProgress = frame > exitStart
		? interpolate(frame, [exitStart, exitStart + 40], [0, 1], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		})
		: 0;
	const exitOpacity = 1 - exitProgress;

	// Cursor blink
	const cursorVisible = showCursor && isTyping && Math.floor(frame / 8) % 2 === 0;

	// Render text with word highlighting
	const renderText = () => {
		let charIdx = 0;
		return line.words.map((word, wordIdx) => {
			const wordStart = charIdx;
			const wordEnd = charIdx + word.word.length;
			charIdx = wordEnd + 1; // +1 for space

			// Only show if within visible range
			if (wordStart >= visibleText.length) return null;

			const visibleWord = word.word.slice(0, Math.max(0, visibleText.length - wordStart));
			if (!visibleWord) return null;

			const isCurrentWord = wordIdx === currentWordIndex;

			return (
				<span key={wordIdx}>
					<span
						style={{
							color: isCurrentWord ? (theme === 'terminal' ? '#AAFFAA' : '#FFD700') : themeConfig.textColor,
							fontWeight: isCurrentWord ? 700 : 500,
							textShadow: isCurrentWord
								? `0 0 10px ${theme === 'terminal' ? '#00FF00' : '#FFD700'}`
								: 'none',
							transition: 'all 0.1s ease',
						}}
					>
						{visibleWord}
					</span>
					{wordEnd < visibleText.length && ' '}
				</span>
			);
		});
	};

	return (
		<div
			style={{
				opacity: exitOpacity,
				padding: '20px 40px',
				background: themeConfig.bgColor,
				borderRadius: theme === 'vintage' ? 0 : 8,
				border: theme === 'vintage' ? '2px solid #8B7355' : 'none',
				boxShadow: theme === 'terminal'
					? '0 0 20px rgba(0, 255, 0, 0.2), inset 0 0 60px rgba(0, 255, 0, 0.03)'
					: '0 4px 30px rgba(0, 0, 0, 0.5)',
				direction: isRTL ? 'rtl' : 'ltr',
				textAlign: isRTL ? 'right' : 'left',
				maxWidth: '90%',
				margin: '0 auto',
			}}
		>
			{/* Paper texture for vintage */}
			{theme === 'vintage' && (
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						opacity: 0.1,
						background: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
						pointerEvents: 'none',
					}}
				/>
			)}

			<span
				style={{
					fontSize,
					fontFamily: theme === 'terminal'
						? '"Fira Code", "Source Code Pro", monospace'
						: theme === 'vintage'
						? '"American Typewriter", "Courier New", monospace'
						: '"Courier Prime", "Courier New", monospace',
					letterSpacing: theme === 'terminal' ? '0.05em' : '0.02em',
					lineHeight: 1.4,
				}}
			>
				{/* Terminal prompt */}
				{theme === 'terminal' && (
					<span style={{ color: '#00AA00', marginRight: 8 }}>{'>'}</span>
				)}

				{renderText()}

				{/* Cursor */}
				{cursorVisible && (
					<span
						style={{
							display: 'inline-block',
							width: theme === 'terminal' ? '0.6em' : '2px',
							height: '1.1em',
							background: themeConfig.cursorColor,
							marginLeft: 2,
							verticalAlign: 'text-bottom',
							boxShadow: theme === 'terminal' ? '0 0 5px #00FF00' : 'none',
						}}
					/>
				)}
			</span>
		</div>
	);
};

export const LyricsOverlayTypewriter: React.FC<LyricsOverlayTypewriterProps> = ({
	videoSrc,
	lyrics,
	fontSize = 48,
	position = 'center',
	theme = 'classic',
	fontFamily,
	isRTL,
	useOffthreadVideo = false,
	showCursor = true,
	typeSpeed = 20,
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const effectiveRTL = isRTL ?? (lyrics.lines.length > 0 && lyrics.lines[0].words.length > 0
		? isRTLText(lyrics.lines[0].words[0].word)
		: false);

	const getPositionStyle = (): React.CSSProperties => {
		switch (position) {
			case 'top':
				return { top: 80, left: 40, right: 40 };
			case 'center':
				return { top: '50%', left: 40, right: 40, transform: 'translateY(-50%)' };
			case 'bottom':
			default:
				return { bottom: 80, left: 40, right: 40 };
		}
	};

	const VideoComponent = useOffthreadVideo ? OffthreadVideo : Video;

	return (
		<AbsoluteFill>
			<VideoComponent
				src={videoSrc}
				style={{ width: '100%', height: '100%', objectFit: 'cover' }}
			/>

			{/* Scanlines for terminal theme */}
			{theme === 'terminal' && (
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
						pointerEvents: 'none',
						opacity: 0.5,
					}}
				/>
			)}

			{/* Lyrics container */}
			<div
				style={{
					position: 'absolute',
					...getPositionStyle(),
					display: 'flex',
					flexDirection: 'column',
					gap: 20,
				}}
			>
				{lyrics.lines.map((line, index) => (
					<TypewriterLine
						key={index}
						line={line}
						lineIndex={index}
						frame={frame}
						fps={fps}
						theme={theme}
						fontSize={fontSize}
						isRTL={effectiveRTL}
						showCursor={showCursor}
						typeSpeed={typeSpeed}
					/>
				))}
			</div>
		</AbsoluteFill>
	);
};

export { parseSRT, parseElevenLabsTranscript } from '../utils/lyricsParser';
