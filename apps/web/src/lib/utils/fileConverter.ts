import { FFmpeg } from "@ffmpeg/ffmpeg";
import readFile from './readFile';

let ffmpeg: FFmpeg;

export async function loadFFmpeg() {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

    ffmpeg = new FFmpeg();

    await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
    });
}

export async function convertToWebP(file: File) {
    if (!ffmpeg) await loadFFmpeg();

    const inputPath = `input.${file.type.split('/')[1]}`;
    const outputPath = 'output.webp';

    ffmpeg.writeFile(inputPath, await readFile(file));

    await ffmpeg.exec([
        '-i', 
        inputPath, 
        '-vcodec', 
        'libwebp', 
        '-loop', 
        '0',
        '-compression_level', 
        '6',
        '-vf',
        'crop=min(iw\\,ih):min(iw\\,ih)',
        '-quality',
        '75',
        outputPath
    ]);

    const data = await ffmpeg.readFile(outputPath);

    const blob = new Blob([data.buffer], { type: 'image/webp' });

    const convertedFile = new File([blob], 'output.webp', { type: 'image/webp' });

    return convertedFile;
}
