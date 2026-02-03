import {
	AbsoluteFill,
	Video,
	OffthreadVideo,
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	spring,
	Easing,
	random,
} from 'remotion';
import { LyricsData, LyricLine, LyricWord } from './LyricsOverlay';

// Re-export types
export type { LyricsData, LyricLine, LyricWord };

export type NeonLyricsPosition = 'bottom' | 'center' | 'top';

export interface LyricsOverlayNeonProps {
	videoSrc: string;
	lyrics: LyricsData;
	fontSize?: number;
	position?: NeonLyricsPosition;
	primaryColor?: string;
	glowColor?: string;
	secondaryGlow?: string;
	fontFamily?: string;
	isRTL?: boolean;
	showGradientOverlay?: boolean;
	useOffthreadVideo?: boolean;
	glitchIntensity?: number; // 0-1
}

// Helper to detect Hebrew/Arabic text for RTL
const isRTLText = (text: string): boolean => {
	const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/;
	return rtlRegex.test(text);
};

// Neon word with glitch and chromatic aberration
interface NeonWordProps {
	word: LyricWord;
	lineEnd: number;
	frame: number;
	fps: number;
	index: number;
	primaryColor: string;
	glowColor: string;
	secondaryGlow: string;
	fontSize: number;
	isRTL: boolean;
	glitchIntensity: number;
	seed: string;
}

const NeonWord: React.FC<NeonWordProps> = ({
	word,
	lineEnd,
	frame,
	fps,
	index,
	primaryColor,
	glowColor,
	secondaryGlow,
	fontSize,
	isRTL,
	glitchIntensity,
	seed,
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
					opacity: 0.15,
					display: 'inline-block',
					color: primaryColor,
					fontSize,
					filter: 'blur(2px)',
				}}
			>
				{word.word}
			</span>
		);
	}

	// Calculate states
	const isActive = frame >= wordStartFrame && frame <= wordEndFrame;
	const isPast = frame > wordEndFrame;
	const justAppeared = localFrame < 8;

	// Entrance spring
	const scale = spring({
		frame: localFrame,
		fps,
		config: {
			damping: 10,
			stiffness: 200,
			mass: 0.3,
		},
	});

	// Glitch effect on entrance
	const glitchOffset = justAppeared
		? random(`${seed}-glitch-${index}`) * 6 * glitchIntensity * (1 - localFrame / 8)
		: 0;

	// Chromatic aberration offset
	const chromaOffset = isActive ? 2 : 0;

	// Entrance animation
	const translateY = interpolate(localFrame, [0, 6], [25, 0], {
		extrapolateRight: 'clamp',
		easing: Easing.out(Easing.back(1.5)),
	});

	const opacity = interpolate(localFrame, [0, 4], [0, 1], { extrapolateRight: 'clamp' });

	// Line exit animation - slower decay
	const exitDuration = 35;
	const exitStart = lineEndFrame; // Start AFTER line ends
	const exitProgress = frame > exitStart
		? interpolate(frame, [exitStart, exitStart + exitDuration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
		: 0;
	const exitOpacity = 1 - exitProgress;
	const exitScale = 1 - exitProgress * 0.2;
	const exitBlur = exitProgress * 4;

	// Neon flicker for active word
	const flicker = isActive
		? 0.9 + random(`${seed}-flicker-${frame % 5}`) * 0.1
		: 1;

	// Sizing based on emphasis
	const getFontSize = () => {
		switch (word.emphasis) {
			case 'hero': return fontSize * 1.4;
			case 'strong': return fontSize * 1.15;
			default: return fontSize;
		}
	};

	// Glow intensity
	const glowIntensity = isActive ? 1 : isPast ? 0.4 : 0.2;

	const textShadow = `
		0 0 ${10 * glowIntensity}px ${glowColor},
		0 0 ${20 * glowIntensity}px ${glowColor},
		0 0 ${40 * glowIntensity}px ${glowColor},
		0 0 ${80 * glowIntensity}px ${glowColor}88,
		0 4px 20px rgba(0,0,0,0.9)
	`;

	return (
		<span
			style={{
				position: 'relative',
				display: 'inline-block',
				marginLeft: isRTL ? 14 : 0,
				marginRight: isRTL ? 0 : 14,
			}}
		>
			{/* Chromatic aberration layers */}
			{isActive && (
				<>
					<span
						style={{
							position: 'absolute',
							left: -chromaOffset,
							top: 0,
							opacity: 0.7 * flicker,
							fontSize: getFontSize(),
							fontWeight: 700,
							color: '#FF0066',
							filter: 'blur(1px)',
							transform: `translateY(${translateY + glitchOffset}px) scale(${scale * exitScale})`,
						}}
					>
						{word.word}
					</span>
					<span
						style={{
							position: 'absolute',
							left: chromaOffset,
							top: 0,
							opacity: 0.7 * flicker,
							fontSize: getFontSize(),
							fontWeight: 700,
							color: '#00FFFF',
							filter: 'blur(1px)',
							transform: `translateY(${translateY + glitchOffset}px) scale(${scale * exitScale})`,
						}}
					>
						{word.word}
					</span>
				</>
			)}

			{/* Main text */}
			<span
				style={{
					position: 'relative',
					display: 'inline-block',
					opacity: opacity * exitOpacity * flicker,
					transform: `translateY(${translateY + glitchOffset}px) scale(${scale * exitScale})`,
					fontSize: getFontSize(),
					fontWeight: 700,
					color: isActive ? '#FFFFFF' : primaryColor,
					textShadow,
					filter: `blur(${exitBlur}px)`,
					letterSpacing: isActive ? '0.05em' : '0',
					transition: 'letter-spacing 0.2s ease',
				}}
			>
				{word.word}
			</span>
		</span>
	);
};

// Neon line component
interface NeonLineProps {
	line: LyricLine;
	frame: number;
	fps: number;
	primaryColor: string;
	glowColor: string;
	secondaryGlow: string;
	fontSize: number;
	isRTL: boolean;
	glitchIntensity: number;
	lineIndex: number;
}

const NeonLine: React.FC<NeonLineProps> = ({
	line,
	frame,
	fps,
	primaryColor,
	glowColor,
	secondaryGlow,
	fontSize,
	isRTL,
	glitchIntensity,
	lineIndex,
}) => {
	const lineStartFrame = line.lineStart * fps;
	const lineEndFrame = line.lineEnd * fps;

	// Line not visible yet or already gone (extended for slower decay)
	if (frame < lineStartFrame - 5 || frame > lineEndFrame + 40) return null;

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
			{line.words.map((word, index) => (
				<NeonWord
					key={`${word.word}-${index}`}
					word={word}
					lineEnd={line.lineEnd}
					frame={frame}
					fps={fps}
					index={index}
					primaryColor={primaryColor}
					glowColor={glowColor}
					secondaryGlow={secondaryGlow}
					fontSize={fontSize}
					isRTL={isRTL}
					glitchIntensity={glitchIntensity}
					seed={`line-${lineIndex}-word-${index}`}
				/>
			))}
		</div>
	);
};

// Main Neon Lyrics Overlay component
export const LyricsOverlayNeon: React.FC<LyricsOverlayNeonProps> = ({
	videoSrc,
	lyrics,
	fontSize = 60,
	position = 'bottom',
	primaryColor = '#E0E0E0',
	glowColor = '#FF00FF', // Magenta neon
	secondaryGlow = '#00FFFF', // Cyan
	fontFamily = '"Orbitron", "Rajdhani", system-ui, sans-serif',
	isRTL,
	showGradientOverlay = true,
	useOffthreadVideo = false,
	glitchIntensity = 0.5,
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

	// Dark gradient with color tint
	const getGradientStyle = (): React.CSSProperties => {
		const gradientColor = 'rgba(10, 0, 20, 0.85)'; // Dark purple-black
		switch (position) {
			case 'top':
				return {
					top: 0,
					left: 0,
					right: 0,
					height: '40%',
					background: `linear-gradient(to bottom, ${gradientColor} 0%, rgba(10, 0, 20, 0.5) 60%, transparent 100%)`,
				};
			case 'center':
				return {
					top: '25%',
					left: 0,
					right: 0,
					height: '50%',
					background: `linear-gradient(to bottom, transparent 0%, ${gradientColor} 30%, ${gradientColor} 70%, transparent 100%)`,
				};
			case 'bottom':
			default:
				return {
					bottom: 0,
					left: 0,
					right: 0,
					height: '40%',
					background: `linear-gradient(to top, ${gradientColor} 0%, rgba(10, 0, 20, 0.5) 60%, transparent 100%)`,
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

			{/* Scanline effect */}
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
					pointerEvents: 'none',
					opacity: 0.3,
				}}
			/>

			{/* Lyrics container */}
			<div
				style={{
					position: 'absolute',
					...getPositionStyle(),
				}}
			>
				{lyrics.lines.map((line, index) => (
					<NeonLine
						key={index}
						line={line}
						lineIndex={index}
						frame={frame}
						fps={fps}
						primaryColor={primaryColor}
						glowColor={glowColor}
						secondaryGlow={secondaryGlow}
						fontSize={fontSize}
						isRTL={effectiveRTL}
						glitchIntensity={glitchIntensity}
					/>
				))}
			</div>
		</AbsoluteFill>
	);
};

// Re-export utility functions
export { parseSRT, parseElevenLabsTranscript } from '../utils/lyricsParser';
