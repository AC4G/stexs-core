import { FFmpeg } from '@ffmpeg/ffmpeg';
import readFile from './readFile';

let ffmpeg: FFmpeg;

async function loadFFmpeg() {
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

  ffmpeg = new FFmpeg();

  await ffmpeg.load({
    coreURL: `${baseURL}/ffmpeg-core.js`,
    wasmURL: `${baseURL}/ffmpeg-core.wasm`,
  });
}

export async function isWebPAnimated(file: File): Promise<boolean> {
  const buffer = await readFile(file);
  const view = new Uint8Array(buffer);

  const animString = 'ANIM';
  const animIndex = indexOfStringKMP(view, animString);

  return animIndex !== -1;
}

export async function processFile(
  file: File,
  options: {
    beforeArgs?: string[];
    additionalArgs: string[];
    outputPath?: string;
  },
): Promise<File> {
  if (!ffmpeg) await loadFFmpeg();

  const inputPath = `input.${file.type.split('/')[1]}`;
  const outputPath = options.outputPath || 'output.webp';

  ffmpeg.writeFile(inputPath, await readFile(file));

  await ffmpeg.exec([
    ...(options.beforeArgs ?? []),
    '-i',
    inputPath,
    ...options.additionalArgs,
    outputPath,
  ]);

  const data = await ffmpeg.readFile(outputPath);

  const blob = new Blob([data.buffer], { type: 'image/webp' });

  const processedFile = new File([blob], outputPath, { type: 'image/webp' });

  return processedFile;
}

export async function cropFile(file: File): Promise<File> {
  return processFile(file, {
    beforeArgs: ['-c:v', 'webp'],
    additionalArgs: ['-vf', 'crop=min(iw\\,ih):min(iw\\,ih),scale=200:200'],
  });
}

export async function convertImageToWebP(file: File): Promise<File> {
  return processFile(file, {
    additionalArgs: [
      '-compression_level',
      '6',
      '-vf',
      'crop=min(iw\\,ih):min(iw\\,ih),scale=200:200',
      '-quality',
      '85',
    ],
  });
}

export async function convertAnimatedToWebP(file: File): Promise<File> {
  return processFile(file, {
    additionalArgs: [
      '-loop',
      '0',
      '-compression_level',
      '6',
      '-vf',
      'crop=min(iw\\,ih):min(iw\\,ih),scale=200:200,fps=24',
      '-t',
      '00:00:10',
      '-quality',
      '85',
    ],
  });
}

// util functions for isWebPAnimated function above

function indexOfStringKMP(array: Uint8Array, searchString: string): number {
  const searchArray = new TextEncoder().encode(searchString);
  const lps = computeLPS(searchArray);

  let i = 0; // index for array[]
  let j = 0; // index for searchArray[]

  while (i < array.length) {
    if (searchArray[j] === array[i]) {
      i++;
      j++;
    }

    if (j === searchArray.length) {
      return i - j;
    } else if (i < array.length && searchArray[j] !== array[i]) {
      if (j !== 0) {
        j = lps[j - 1];
      } else {
        i++;
      }
    }
  }

  return -1;
}

function computeLPS(pattern: Uint8Array): number[] {
  const lps = new Array(pattern.length).fill(0);
  let len = 0;
  let i = 1;

  while (i < pattern.length) {
    if (pattern[i] === pattern[len]) {
      len++;
      lps[i] = len;
      i++;
    } else {
      if (len !== 0) {
        len = lps[len - 1];
      } else {
        lps[i] = 0;
        i++;
      }
    }
  }

  return lps;
}
