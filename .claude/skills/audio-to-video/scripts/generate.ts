// Audio to Video Generation using fal.ai LTX-2.3
// npm install @fal-ai/client dotenv

import { fal } from '@fal-ai/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load env from image-generation skill (has FAL_KEY)
dotenv.config({ path: path.join(process.env.HOME || '', '.claude/skills/image-generation/scripts/.env') });

interface Args {
  prompt: string;
  audioPath: string;
  imagePath?: string;
  endImagePath?: string;
  destination: string;
  size: string;
  fps: number;
  quality: string;
  camera: string;
  matchAudioLength: boolean;
  guidanceScale?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    prompt: '',
    audioPath: '',
    destination: '',
    size: 'landscape_16_9',
    fps: 25,
    quality: 'high',
    camera: 'none',
    matchAudioLength: true,
  };

  const promptParts: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--audio' || arg === '-a') {
      args.audioPath = argv[++i];
    } else if (arg === '--image' || arg === '-i') {
      args.imagePath = argv[++i];
    } else if (arg === '--end-image') {
      args.endImagePath = argv[++i];
    } else if (arg === '--destination' || arg === '-d') {
      args.destination = argv[++i];
    } else if (arg === '--size' || arg === '-s') {
      args.size = argv[++i];
    } else if (arg === '--fps') {
      args.fps = parseInt(argv[++i], 10);
    } else if (arg === '--quality') {
      args.quality = argv[++i];
    } else if (arg === '--camera') {
      args.camera = argv[++i];
    } else if (arg === '--no-match-length') {
      args.matchAudioLength = false;
    } else if (arg === '--guidance-scale') {
      args.guidanceScale = parseFloat(argv[++i]);
    } else if (!arg.startsWith('-')) {
      promptParts.push(arg);
    }
  }

  args.prompt = promptParts.join(' ');
  return args;
}

async function uploadFile(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };

  const file = new File([buffer], path.basename(filePath), {
    type: mimeTypes[ext] || 'application/octet-stream',
  });

  const url = await fal.storage.upload(file);
  console.log(`Uploaded ${filePath} -> ${url}`);
  return url;
}

// Map old size names to LTX 2.3 aspect_ratio
function sizeToAspectRatio(size: string): string {
  const map: Record<string, string> = {
    'landscape_16_9': '16:9',
    'landscape_4_3': '4:3',
    'portrait_16_9': '9:16',
    'portrait_4_3': '3:4',
    'square_hd': '1:1',
    'square': '1:1',
    'auto': 'auto',
  };
  return map[size] || '16:9';
}

// Map quality to LTX 2.3 resolution
function qualityToResolution(quality: string): string {
  const map: Record<string, string> = {
    'low': '1080p',
    'medium': '1080p',
    'high': '1080p',
    'maximum': '1440p',
  };
  return map[quality] || '1080p';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Validation
  if (!args.audioPath && !args.imagePath) {
    console.error('Error: --audio or --image is required');
    process.exit(1);
  }
  if (!args.destination) {
    console.error('Error: --destination (-d) is required');
    process.exit(1);
  }
  if (!args.prompt && !args.audioPath) {
    console.error('Error: prompt is required when no audio is provided');
    process.exit(1);
  }
  if (!process.env.FAL_KEY) {
    console.error('Error: FAL_KEY not found. Check ~/.claude/skills/image-generation/scripts/.env');
    process.exit(1);
  }

  // Configure fal
  fal.config({ credentials: process.env.FAL_KEY });

  const aspectRatio = sizeToAspectRatio(args.size);
  const resolution = qualityToResolution(args.quality);

  console.log('Audio to Video Generation - LTX 2.3');
  console.log('=====================================');
  if (args.audioPath) console.log(`Audio: ${args.audioPath}`);
  if (args.imagePath) console.log(`Image: ${args.imagePath}`);
  if (args.endImagePath) console.log(`End Image: ${args.endImagePath}`);
  console.log(`Size: ${args.size} → aspect_ratio: ${aspectRatio}`);
  console.log(`Quality: ${args.quality} → resolution: ${resolution}`);
  console.log(`FPS: ${args.fps}`);
  if (args.prompt) console.log(`Prompt: "${args.prompt}"`);
  console.log('');

  // Upload files
  console.log('Uploading files...');
  const audioUrl = args.audioPath ? await uploadFile(args.audioPath) : undefined;
  const imageUrl = args.imagePath ? await uploadFile(args.imagePath) : undefined;
  const endImageUrl = args.endImagePath ? await uploadFile(args.endImagePath) : undefined;

  let endpoint: string;
  let input: Record<string, any>;

  if (audioUrl) {
    // Audio-to-video: LTX 2.3 audio-to-video endpoint (2-20 sec audio)
    endpoint = 'fal-ai/ltx-2.3/audio-to-video';
    input = {
      audio_url: audioUrl,
    };
    if (args.prompt) input.prompt = args.prompt;
    if (imageUrl) input.image_url = imageUrl;
    // guidance_scale: default 5 without image, 9 with image
    if (args.guidanceScale !== undefined) {
      input.guidance_scale = args.guidanceScale;
    } else if (imageUrl) {
      input.guidance_scale = 9;
    }
  } else {
    // Image-to-video: LTX 2.3 image-to-video endpoint
    endpoint = 'fal-ai/ltx-2.3/image-to-video';
    input = {
      image_url: imageUrl,
      prompt: args.prompt,
      aspect_ratio: aspectRatio,
      resolution: resolution,
      fps: args.fps,
      generate_audio: false,
    };
    if (endImageUrl) input.end_image_url = endImageUrl;
    if (args.guidanceScale !== undefined) input.guidance_scale = args.guidanceScale;
  }

  console.log(`Using endpoint: ${endpoint}`);
  console.log('Input:', JSON.stringify(input, null, 2));

  // Generate video
  console.log('\nGenerating video...');
  const result = await fal.subscribe(endpoint, {
    input,
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS' && update.logs) {
        update.logs.map((log: any) => log.message).forEach(console.log);
      }
    },
  });

  // Download result
  const videoUrl = result.data?.video?.url || result.data?.url;
  if (videoUrl) {
    console.log(`\nDownloading from: ${videoUrl}`);
    const response = await fetch(videoUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Ensure destination directory exists
    const destDir = path.dirname(args.destination);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.writeFileSync(args.destination, buffer);
    console.log(`\nVideo saved to: ${args.destination}`);

    const duration = result.data?.video?.duration || result.data?.duration;
    if (duration) {
      console.log(`Duration: ${duration}s`);
    }
  } else {
    console.error('No video generated');
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
