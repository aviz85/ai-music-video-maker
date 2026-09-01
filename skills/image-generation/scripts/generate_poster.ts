// Image Generation Script
// Supports: Google Gemini (default) and fal.ai FLUX.2 klein 4B (--cheap)
//
// Install dependencies:
// npm install @google/genai @fal-ai/client mime dotenv
// npm install -D @types/node typescript ts-node

import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from '@google/genai';
import { fal } from '@fal-ai/client';
import mime from 'mime';
import { writeFile, writeFileSync, copyFileSync, existsSync, readFileSync } from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ATLAS_API_BASE = 'https://api.atlascloud.ai/api/v1';
const ATLAS_TEXT_MODEL = 'google/nano-banana-2/text-to-image-developer';
const ATLAS_EDIT_MODEL = 'google/nano-banana-2/edit-developer';

// Load environment variables
dotenv.config();

function saveBinaryFile(fileName: string, content: Buffer) {
  writeFile(fileName, content, (err) => {
    if (err) {
      console.error(`Error writing file ${fileName}:`, err);
      return;
    }
    console.log(`File ${fileName} saved to file system.`);
  });
}

// Copy file to destination with collision avoidance
function copyToDestination(sourcePath: string, destPath: string): string {
  let finalPath = destPath;

  if (existsSync(destPath)) {
    // File exists, add suffix
    const dir = path.dirname(destPath);
    const ext = path.extname(destPath);
    const base = path.basename(destPath, ext);
    let counter = 1;

    while (existsSync(finalPath)) {
      finalPath = path.join(dir, `${base}_${counter}${ext}`);
      counter++;
    }
  }

  copyFileSync(sourcePath, finalPath);
  return finalPath;
}

// Map aspect ratio to fal.ai image_size enum
function aspectToFalSize(aspectRatio: string): string {
  const mapping: Record<string, string> = {
    '1:1': 'square',
    '3:2': 'landscape_4_3',
    '2:3': 'portrait_4_3',
    '16:9': 'landscape_16_9',
    '9:16': 'portrait_16_9',
  };
  return mapping[aspectRatio] || 'landscape_4_3';
}

// Parse command line arguments
interface ParsedArgs {
  prompt: string;
  aspectRatio: string;
  assets: string[];
  destination: string | null;
  quality: string;
  cheap: boolean;
  atlas: boolean;
}

export function parseArgs(args: string[]): ParsedArgs {
  let aspectRatio = '3:2'; // default - best for most social media
  let assets: string[] = [];
  let destination: string | null = null;
  let quality = '1K'; // default quality
  let cheap = false;
  let atlas = false;
  let promptParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--aspect' || args[i] === '-a') {
      if (args[i + 1]) {
        aspectRatio = args[i + 1];
        i++; // skip next arg
      }
    } else if (args[i] === '--assets') {
      if (args[i + 1]) {
        // Support comma-separated assets or full paths
        assets = args[i + 1].split(',').map(a => a.trim());
        i++; // skip next arg
      }
    } else if (args[i] === '--destination' || args[i] === '-d') {
      if (args[i + 1]) {
        destination = args[i + 1];
        i++; // skip next arg
      }
    } else if (args[i] === '--quality' || args[i] === '-q') {
      if (args[i + 1]) {
        quality = args[i + 1].toUpperCase();
        i++; // skip next arg
      }
    } else if (args[i] === '--cheap' || args[i] === '-c') {
      cheap = true;
    } else if (args[i] === '--atlas') {
      atlas = true;
    } else if (args[i] === '--save-to-gallery') {
      if (args[i + 1]) {
        i++; // skip next arg (gallery name)
      }
    } else {
      promptParts.push(args[i]);
    }
  }

  return { prompt: promptParts.join(' '), aspectRatio, assets, destination, quality, cheap, atlas };
}

export class AtlasHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AtlasHttpError';
    this.status = status;
  }
}

type FetchImplementation = typeof fetch;

async function atlasRequestJson<T>(
  url: string,
  init: RequestInit,
  fetchImpl: FetchImplementation = fetch
): Promise<T> {
  const response = await fetchImpl(url, init);
  const responseText = await response.text();
  let envelope: any;

  try {
    envelope = JSON.parse(responseText);
  } catch {
    if (!response.ok) {
      throw new AtlasHttpError(response.status, `Atlas request failed (${response.status})`);
    }
    throw new Error('Atlas returned an invalid JSON response');
  }

  if (!response.ok) {
    throw new AtlasHttpError(
      response.status,
      `Atlas request failed (${response.status}): ${envelope.message || 'unknown error'}`
    );
  }
  if (envelope.code !== undefined && ![0, 200, '200'].includes(envelope.code)) {
    throw new Error(`Atlas request failed: ${envelope.message || 'unknown error'}`);
  }
  return (envelope.data ?? envelope) as T;
}

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function submitAtlasGeneration(
  payload: Record<string, unknown>,
  apiKey: string,
  fetchImpl: FetchImplementation = fetch
): Promise<{ id: string }> {
  return atlasRequestJson<{ id: string }>(
    `${ATLAS_API_BASE}/model/generateImage`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    fetchImpl
  );
}

export async function getAtlasPrediction(
  requestId: string,
  apiKey: string,
  maxGetRetries = 3,
  fetchImpl: FetchImplementation = fetch,
  sleepImpl: (milliseconds: number) => Promise<void> = sleep
): Promise<any> {
  for (let attempt = 0; attempt <= maxGetRetries; attempt++) {
    try {
      return await atlasRequestJson<any>(
        `${ATLAS_API_BASE}/model/prediction/${encodeURIComponent(requestId)}`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
        fetchImpl
      );
    } catch (error) {
      const transient =
        (error instanceof AtlasHttpError && (error.status === 429 || error.status >= 500)) ||
        error instanceof TypeError;
      if (!transient || attempt === maxGetRetries) throw error;
      await sleepImpl(Math.min(1000 * 2 ** attempt, 4000));
    }
  }
  throw new Error('Atlas prediction request failed');
}

async function uploadAtlasAsset(assetPath: string, apiKey: string): Promise<string> {
  const form = new FormData();
  const content = new Uint8Array(readFileSync(assetPath));
  form.append('file', new Blob([content]), path.basename(assetPath));
  const result = await atlasRequestJson<{ download_url?: string }>(
    `${ATLAS_API_BASE}/model/uploadMedia`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    }
  );
  if (!result.download_url) throw new Error('Atlas upload completed without a download URL');
  return result.download_url;
}

async function pollAtlasPrediction(requestId: string, apiKey: string): Promise<string> {
  for (let poll = 0; poll < 100; poll++) {
    const prediction = await getAtlasPrediction(requestId, apiKey);
    if (['completed', 'succeeded'].includes(prediction.status)) {
      const output = prediction.outputs?.[0];
      if (!output) throw new Error('Atlas generation completed without an output URL');
      return output;
    }
    if (prediction.status === 'failed') {
      throw new Error(`Atlas generation failed: ${prediction.error || 'unknown error'}`);
    }
    await sleep(2000);
  }
  throw new Error('Atlas image generation timed out');
}

async function generateWithAtlas(
  prompt: string,
  aspectRatio: string,
  assets: string[],
  destination: string | null,
  quality: string
): Promise<void> {
  const apiKey = process.env.ATLASCLOUD_API_KEY;
  if (!apiKey) {
    console.error('Error: ATLASCLOUD_API_KEY not found in environment variables');
    process.exit(1);
  }

  const imageUrls: string[] = [];
  for (const assetPath of assets) {
    console.log(`Uploading asset to Atlas Cloud: ${assetPath}...`);
    imageUrls.push(await uploadAtlasAsset(assetPath, apiKey));
  }

  const model = imageUrls.length > 0 ? ATLAS_EDIT_MODEL : ATLAS_TEXT_MODEL;
  const payload: Record<string, unknown> = {
    model,
    prompt,
    aspect_ratio: aspectRatio,
    resolution: quality.toLowerCase(),
  };
  if (imageUrls.length > 0) payload.images = imageUrls;

  console.log(`Generating with Atlas Cloud (${model})...`);
  const generation = await submitAtlasGeneration(payload, apiKey);
  if (!generation.id) throw new Error('Atlas generation did not return a prediction ID');
  const outputUrl = await pollAtlasPrediction(generation.id, apiKey);

  const response = await fetch(outputUrl);
  if (!response.ok) throw new Error(`Could not download Atlas output (${response.status})`);
  const localFile = 'poster_0.jpg';
  writeFileSync(localFile, Buffer.from(await response.arrayBuffer()));
  console.log(`File ${localFile} saved to file system.`);

  if (destination) {
    const finalPath = copyToDestination(localFile, destination);
    console.log(`Copied to: ${finalPath}`);
  }
}

// Generate with fal.ai FLUX.2 klein 4B
async function generateWithFal(
  prompt: string,
  aspectRatio: string,
  assets: string[],
  destination: string | null
): Promise<void> {
  if (!process.env.FAL_KEY) {
    console.error('Error: FAL_KEY not found in environment variables');
    console.error('Please add FAL_KEY=your_api_key to .env file');
    process.exit(1);
  }

  // Configure fal client
  fal.config({
    credentials: process.env.FAL_KEY,
  });

  const imageSize = aspectToFalSize(aspectRatio);
  console.log(`Using fal.ai FLUX.2 klein 4B (cheap mode)`);
  console.log(`Aspect ratio: ${aspectRatio} -> ${imageSize}`);

  let result: any;

  if (assets.length > 0) {
    // Image editing mode
    console.log(`Mode: Image editing with ${assets.length} reference image(s)`);

    // Upload images to fal storage
    const imageUrls: string[] = [];
    for (const assetPath of assets) {
      console.log(`Uploading asset: ${assetPath}...`);
      const fileBuffer = readFileSync(assetPath);
      const file = new File([fileBuffer], path.basename(assetPath), {
        type: mime.getType(assetPath) || 'image/jpeg',
      });
      const url = await fal.storage.upload(file);
      imageUrls.push(url);
      console.log(`Uploaded: ${url}`);
    }

    result = await fal.subscribe('fal-ai/flux-2/klein/4b/edit', {
      input: {
        prompt,
        image_urls: imageUrls,
        image_size: imageSize,
        num_inference_steps: 4,
        num_images: 1,
        output_format: 'jpeg',
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS' && update.logs) {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });
  } else {
    // Text-to-image mode
    console.log(`Mode: Text-to-image`);

    result = await fal.subscribe('fal-ai/flux-2/klein/4b', {
      input: {
        prompt,
        image_size: imageSize,
        num_inference_steps: 4,
        num_images: 1,
        output_format: 'jpeg',
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS' && update.logs) {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });
  }

  // Process results
  if (result.data?.images && result.data.images.length > 0) {
    for (let i = 0; i < result.data.images.length; i++) {
      const image = result.data.images[i];
      const imageUrl = image.url;

      // Download the image
      console.log(`Downloading image from: ${imageUrl}`);
      const response = await fetch(imageUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      const localFile = `poster_${i}.jpg`;
      saveBinaryFile(localFile, buffer);

      // Copy to destination if specified
      if (destination) {
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
          const finalPath = copyToDestination(localFile, destination);
          console.log(`Copied to: ${finalPath}`);
        } catch (err) {
          console.error(`Error copying to destination:`, err);
        }
      }
    }
  } else {
    console.error('No images generated');
    console.log('Result:', JSON.stringify(result, null, 2));
  }
}

// Generate with Google Gemini (original implementation)
async function generateWithGemini(
  prompt: string,
  aspectRatio: string,
  assets: string[],
  destination: string | null,
  quality: string
): Promise<void> {
  if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY not found in environment variables');
    console.error('Please create a .env file with GEMINI_API_KEY=your_api_key');
    process.exit(1);
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  // Upload asset images if provided
  const uploadedAssets: Array<{ name: string; uri: string; mimeType: string }> = [];

  for (const assetPath of assets) {
    try {
      console.log(`Uploading asset: ${assetPath}...`);
      const uploaded = await ai.files.upload({
        file: assetPath,
        config: { mimeType: mime.getType(assetPath) || 'image/jpeg' },
      });
      uploadedAssets.push({
        name: uploaded.name,
        uri: uploaded.uri,
        mimeType: uploaded.mimeType || 'image/jpeg',
      });
      console.log(`Asset uploaded successfully: ${uploaded.name}`);
    } catch (error) {
      console.error(`Warning: Could not upload asset ${assetPath}:`, error);
    }
  }

  const config = {
    responseModalities: [
        'IMAGE',
        'TEXT',
    ],
    imageConfig: {
      aspectRatio: aspectRatio,
      imageSize: quality, // 1K (default) or 2K
    },
  };

  const model = 'gemini-3-pro-image-preview';

  // Build content parts - include uploaded assets first, then prompt
  const contentParts: Array<any> = [];
  for (const asset of uploadedAssets) {
    contentParts.push(createPartFromUri(asset.uri, asset.mimeType));
  }
  if (uploadedAssets.length > 0) {
    contentParts.push('Use the provided reference image(s) as specified in the prompt.');
  }
  contentParts.push(prompt);

  const contents = createUserContent(contentParts);

  console.log(`Generating with Gemini...`);

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents,
  });

  let fileIndex = 0;
  for await (const chunk of response) {
    if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
      continue;
    }
    if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
      const fileName = `poster_${fileIndex++}`;
      const inlineData = chunk.candidates[0].content.parts[0].inlineData;
      const fileExtension = mime.getExtension(inlineData.mimeType || '');
      const buffer = Buffer.from(inlineData.data || '', 'base64');
      const localFile = `${fileName}.${fileExtension}`;
      saveBinaryFile(localFile, buffer);

      // Copy to destination if specified
      if (destination) {
        // Wait a bit for file to be written
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
          const finalPath = copyToDestination(localFile, destination);
          console.log(`Copied to: ${finalPath}`);
        } catch (err) {
          console.error(`Error copying to destination:`, err);
        }
      }
    }
    else {
      console.log(chunk.text);
    }
  }

  // Clean up: delete uploaded asset files
  for (const asset of uploadedAssets) {
    try {
      await ai.files.delete({ name: asset.name });
      console.log(`Asset ${asset.name} cleaned up from server.`);
    } catch (error) {
      console.error(`Warning: Could not delete asset ${asset.name}:`, error);
    }
  }
}

export async function main() {
  // Get prompt and options from command-line arguments
  const { prompt, aspectRatio, assets, destination, quality, cheap, atlas } = parseArgs(process.argv.slice(2));

  if (!prompt) {
    console.error('Error: Please provide a prompt as a command-line argument');
    console.error('Usage: npx ts-node generate_poster.ts [OPTIONS] "your prompt here"');
    console.error('');
    console.error('Options:');
    console.error('  --cheap, -c        Use fal.ai FLUX.2 klein 4B (fast, low cost)');
    console.error('  --atlas            Use Atlas Cloud Nano Banana 2');
    console.error('  --aspect, -a       Aspect ratio (1:1, 3:2, 2:3, 16:9, 9:16) - default: 3:2');
    console.error('  --quality, -q      Image quality (1K, 2K) - default: 1K (Gemini/Atlas)');
    console.error('  --assets           Comma-separated paths to reference images');
    console.error('  --destination, -d  Copy output to this path (auto-suffixes if exists)');
    console.error('');
    console.error('Examples:');
    console.error('  npx ts-node generate_poster.ts "A sunset over mountains"');
    console.error('  npx ts-node generate_poster.ts --cheap "A sunset over mountains"');
    console.error('  npx ts-node generate_poster.ts --aspect 16:9 "A wide landscape"');
    console.error('  npx ts-node generate_poster.ts -d /path/to/output.jpg "My poster"');
    console.error('  npx ts-node generate_poster.ts --cheap --assets "/path/to/image.jpg" "Edit this"');
    process.exit(1);
  }

  if (cheap && atlas) {
    console.error('Error: --cheap and --atlas select different providers and cannot be combined');
    process.exit(1);
  }

  // Validate aspect ratio
  const validRatios = ['1:1', '3:2', '2:3', '16:9', '9:16'];
  if (!validRatios.includes(aspectRatio)) {
    console.error(`Error: Invalid aspect ratio "${aspectRatio}"`);
    console.error(`Valid options: ${validRatios.join(', ')}`);
    process.exit(1);
  }

  const provider = atlas
    ? 'Atlas Cloud Nano Banana 2'
    : cheap
      ? 'fal.ai FLUX.2 klein 4B'
      : 'Google Gemini';
  console.log(`Provider: ${provider}`);
  console.log(`Aspect ratio: ${aspectRatio}`);
  if (!cheap) console.log(`Quality: ${quality}`);
  if (assets.length > 0) {
    console.log(`Assets: ${assets.join(', ')}`);
  }
  if (destination) {
    console.log(`Destination: ${destination}`);
  }
  console.log(`Prompt: "${prompt}"`);
  console.log('');

  if (atlas) {
    await generateWithAtlas(prompt, aspectRatio, assets, destination, quality);
  } else if (cheap) {
    await generateWithFal(prompt, aspectRatio, assets, destination);
  } else {
    await generateWithGemini(prompt, aspectRatio, assets, destination, quality);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
