// Audio to Video Generation using fal.ai LTX-2 19B
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

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Validation
  if (!args.audioPath) {
    console.error('Error: --audio is required');
    process.exit(1);
  }
  if (!args.destination) {
    console.error('Error: --destination (-d) is required');
    process.exit(1);
  }
  if (!args.prompt) {
    console.error('Error: prompt is required');
    process.exit(1);
  }
  if (!process.env.FAL_KEY) {
    console.error('Error: FAL_KEY not found. Check ~/.claude/skills/image-generation/scripts/.env');
    process.exit(1);
  }

  // Configure fal
  fal.config({ credentials: process.env.FAL_KEY });

  console.log('Audio to Video Generation');
  console.log('=========================');
  console.log(`Audio: ${args.audioPath}`);
  if (args.imagePath) console.log(`Image: ${args.imagePath}`);
  if (args.endImagePath) console.log(`End Image: ${args.endImagePath}`);
  console.log(`Size: ${args.size}`);
  console.log(`FPS: ${args.fps}`);
  console.log(`Quality: ${args.quality}`);
  console.log(`Camera: ${args.camera}`);
  console.log(`Match audio length: ${args.matchAudioLength}`);
  console.log(`Prompt: "${args.prompt}"`);
  console.log('');

  // Upload files
  console.log('Uploading files...');
  const audioUrl = await uploadFile(args.audioPath);
  const imageUrl = args.imagePath ? await uploadFile(args.imagePath) : undefined;
  const endImageUrl = args.endImagePath ? await uploadFile(args.endImagePath) : undefined;

  // Build request
  const input: Record<string, any> = {
    prompt: args.prompt,
    audio_url: audioUrl,
    match_audio_length: args.matchAudioLength,
    video_size: args.size,
    fps: args.fps,
    video_quality: args.quality,
    video_output_type: 'X264 (.mp4)',
    enable_prompt_expansion: true,
    use_multiscale: true,
  };

  if (imageUrl) input.image_url = imageUrl;
  if (endImageUrl) input.end_image_url = endImageUrl;
  if (args.camera !== 'none') input.camera_lora = args.camera;

  // Generate video
  console.log('Generating video...');
  const result = await fal.subscribe('fal-ai/ltx-2-19b/distilled/audio-to-video', {
    input,
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS' && update.logs) {
        update.logs.map((log) => log.message).forEach(console.log);
      }
    },
  });

  // Download result
  if (result.data?.video?.url) {
    console.log(`\nDownloading from: ${result.data.video.url}`);
    const response = await fetch(result.data.video.url);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Ensure destination directory exists
    const destDir = path.dirname(args.destination);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.writeFileSync(args.destination, buffer);
    console.log(`\nVideo saved to: ${args.destination}`);

    if (result.data.video.duration) {
      console.log(`Duration: ${result.data.video.duration}s`);
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
