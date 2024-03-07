import pako from "pako";

export default async function compressFile(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const compressedArray = pako.gzip(new Uint8Array(arrayBuffer), {
        level: 9,
    });

    return new Blob([compressedArray]);
}
