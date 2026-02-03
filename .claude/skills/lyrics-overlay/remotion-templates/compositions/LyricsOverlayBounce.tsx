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

export type { LyricsData, LyricLine, LyricWord };

export type BouncePosition = 'bottom' | 'center' | 'top';

export interface LyricsOverlayBounceProps {
	videoSrc: string;
	lyrics: LyricsData;
	fontSize?: number;
	position?: BouncePosition;
	primaryColor?: string;
	highlightColor?: string;
	fontFamily?: string;
	isRTL?: boolean;
	useOffthreadVideo?: boolean;
	bounceIntensity?: number; // 0-1
}

const isRTLText = (text: string): boolean => {
	const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/;
	return rtlRegex.test(text);
};

// Color palette for variety
const colors = [
	'#FF6B6B', // Coral
	'#4ECDC4', // Teal
	'#FFE66D', // Yellow
	'#95E1D3', // Mint
	'#F38181', // Salmon
	'#AA96DA', // Lavender
	'#FCBAD3', // Pink
	'#A8D8EA', // Sky blue
];

// Bouncy word with playful physics
interface BounceWordProps {
	word: LyricWord;
	lineEnd: number;
	frame: number;
	fps: number;
	index: number;
	primaryColor: string;
	highlightColor: string;
	fontSize: number;
	isRTL: boolean;
	bounceIntensity: number;
	seed: string;
}

const BounceWord: React.FC<BounceWordProps> = ({
	word,
	lineEnd,
	frame,
	fps,
	index,
	primaryColor,
	highlightColor,
	fontSize,
	isRTL,
	bounceIntensity,
	seed,
}) => {
	const wordStartFrame = word.start * fps;
	const wordEndFrame = word.end * fps;
	const lineEndFrame = lineEnd * fps;
	const localFrame = frame - wordStartFrame;

	// Not visible yet
	if (frame < wordStartFrame) {
		return (
			<span style={{ opacity: 0, display: 'inline-block' }}>
				{word.word}
			</span>
		);
	}

	const isActive = frame >= wordStartFrame && frame <= wordEndFrame;

	// Random starting position for each word
	const startY = (random(`${seed}-y`) - 0.5) * 100 * bounceIntensity;
	const startX = (random(`${seed}-x`) - 0.5) * 40 * bounceIntensity;
	const startRotation = (random(`${seed}-rot`) - 0.5) * 30 * bounceIntensity;

	// Extra bouncy spring for entrance
	const springProgress = spring({
		frame: localFrame,
		fps,
		config: {
			damping: 8,
			stiffness: 180,
			mass: 0.4,
		},
	});

	// Position animation
	const translateY = interpolate(springProgress, [0, 1], [startY + 60, 0]);
	const translateX = interpolate(springProgress, [0, 1], [startX, 0]);
	const rotation = interpolate(springProgress, [0, 1], [startRotation, 0]);
	const scale = spring({
		frame: localFrame,
		fps,
		config: { damping: 6, stiffness: 200, mass: 0.3 },
	});

	// Continuous subtle bounce for active word
	const activeBounce = isActive
		? Math.sin(localFrame * 0.5) * 3
		: 0;

	// Exit animation - slower decay
	const exitDuration = 35;
	const exitStart = lineEndFrame; // Start AFTER line ends
	const exitProgress = frame > exitStart
		? interpolate(frame, [exitStart, exitStart + exitDuration], [0, 1], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		})
		: 0;

	const exitY = exitProgress * -50;
	const exitOpacity = 1 - exitProgress;
	const exitScale = 1 - exitProgress * 0.3;

	// Opacity entrance
	const opacity = interpolate(localFrame, [0, 5], [0, 1], { extrapolateRight: 'clamp' });

	// Pick a fun color for each word
	const wordColor = isActive
		? highlightColor
		: colors[index % colors.length];

	// Size based on emphasis
	const getFontSize = () => {
		switch (word.emphasis) {
			case 'hero': return fontSize * 1.4;
			case 'strong': return fontSize * 1.15;
			default: return fontSize;
		}
	};

	const textShadow = isActive
		? `0 0 20px ${highlightColor}, 0 0 40px ${highlightColor}66, 0 4px 15px rgba(0,0,0,0.8)`
		: `0 4px 15px rgba(0,0,0,0.6), 0 0 10px ${wordColor}44`;

	return (
		<span
			style={{
				display: 'inline-block',
				opacity: opacity * exitOpacity,
				transform: `
					translateY(${translateY + activeBounce + exitY}px)
					translateX(${translateX}px)
					rotate(${rotation}deg)
					scale(${scale * exitScale})
				`,
				fontSize: getFontSize(),
				fontWeight: 700,
				color: wordColor,
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

// Bounce line
interface BounceLineProps {
	line: LyricLine;
	frame: number;
	fps: number;
	primaryColor: string;
	highlightColor: string;
	fontSize: number;
	isRTL: boolean;
	bounceIntensity: number;
	lineIndex: number;
}

const BounceLine: React.FC<BounceLineProps> = ({
	line,
	frame,
	fps,
	primaryColor,
	highlightColor,
	fontSize,
	isRTL,
	bounceIntensity,
	lineIndex,
}) => {
	const lineStartFrame = line.lineStart * fps;
	const lineEndFrame = line.lineEnd * fps;

	// Extended visibility for slower decay
	if (frame < lineStartFrame - 5 || frame > lineEndFrame + 40) return null;

	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				flexWrap: 'wrap',
				direction: isRTL ? 'rtl' : 'ltr',
				gap: '8px 0',
			}}
		>
			{line.words.map((word, index) => (
				<BounceWord
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
					bounceIntensity={bounceIntensity}
					seed={`line-${lineIndex}-word-${index}`}
				/>
			))}
		</div>
	);
};

export const LyricsOverlayBounce: React.FC<LyricsOverlayBounceProps> = ({
	videoSrc,
	lyrics,
	fontSize = 64,
	position = 'center',
	primaryColor = '#FFFFFF',
	highlightColor = '#FFFFFF',
	fontFamily = '"Fredoka One", "Bubblegum Sans", "Comic Sans MS", cursive',
	isRTL,
	useOffthreadVideo = false,
	bounceIntensity = 0.7,
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const effectiveRTL = isRTL ?? (lyrics.lines.length > 0 && lyrics.lines[0].words.length > 0
		? isRTLText(lyrics.lines[0].words[0].word)
		: false);

	const getPositionStyle = (): React.CSSProperties => {
		switch (position) {
			case 'top':
				return { top: 100, left: 60, right: 60 };
			case 'center':
				return { top: '50%', left: 60, right: 60, transform: 'translateY(-50%)' };
			case 'bottom':
			default:
				return { bottom: 120, left: 60, right: 60 };
		}
	};

	const VideoComponent = useOffthreadVideo ? OffthreadVideo : Video;

	return (
		<AbsoluteFill style={{ fontFamily }}>
			<VideoComponent
				src={videoSrc}
				style={{ width: '100%', height: '100%', objectFit: 'cover' }}
			/>

			{/* Colorful gradient overlay */}
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)',
					pointerEvents: 'none',
				}}
			/>

			{/* Lyrics container */}
			<div
				style={{
					position: 'absolute',
					...getPositionStyle(),
					textAlign: 'center',
				}}
			>
				{lyrics.lines.map((line, index) => (
					<BounceLine
						key={index}
						line={line}
						lineIndex={index}
						frame={frame}
						fps={fps}
						primaryColor={primaryColor}
						highlightColor={highlightColor}
						fontSize={fontSize}
						isRTL={effectiveRTL}
						bounceIntensity={bounceIntensity}
					/>
				))}
			</div>
		</AbsoluteFill>
	);
};

export { parseSRT, parseElevenLabsTranscript } from '../utils/lyricsParser';
