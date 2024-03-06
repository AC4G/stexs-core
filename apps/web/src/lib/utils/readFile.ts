export default async function readFile(file: File): Promise<Uint8Array> {
    return new Promise(resolve => {
        const fileReader = new FileReader();

        fileReader.onload = () => {
            resolve(new Uint8Array(fileReader.result as ArrayBuffer));
        };

        fileReader.onerror = () => {
            resolve(new Uint8Array([]));
        };

        fileReader.readAsArrayBuffer(file);
    });
}
