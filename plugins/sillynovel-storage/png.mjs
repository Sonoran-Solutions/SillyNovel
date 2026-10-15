import { inflateSync } from 'node:zlib';
import { PNG } from 'pngjs';
import { createHash } from 'node:crypto';
import { demand } from './schema.mjs';
export const MAX_BYTES = 5 * 1024 * 1024;
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export function decodePNG(bytes) {
    demand(Buffer.isBuffer(bytes) && bytes.length <= MAX_BYTES, 'IMAGE_LIMIT', 413);
    demand(bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), 'PNG_REQUIRED');
    demand(bytes.readUInt32BE(8) === 13 && bytes.toString('ascii',12,16) === 'IHDR', 'INVALID_PNG');
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    demand(width > 0 && height > 0 && width <= 4096 && height <= 4096 && width * height <= 16000000, 'IMAGE_LIMIT', 413);
    let ended = false; const compressed = [];
    for (let p = 8; p < bytes.length;) {
        demand(p + 12 <= bytes.length, 'INVALID_PNG');
        const length = bytes.readUInt32BE(p), type = bytes.toString('ascii',p+4,p+8);
        demand(p + length + 12 <= bytes.length && !['acTL','fcTL','fdAT'].includes(type), 'STATIC_PNG_REQUIRED');
        if (type === 'IDAT') compressed.push(bytes.subarray(p+8,p+8+length));
        p += length + 12;
        if (type === 'IEND') { demand(length === 0 && p === bytes.length, 'INVALID_PNG'); ended = true; }
    }
    demand(ended, 'INVALID_PNG');
    try {
        // Bound even interlaced inflate before the decoder's allocation path.
        inflateSync(Buffer.concat(compressed), { maxOutputLength: width * height * 8 + height * 8 + 1024 });
        const image = PNG.sync.read(bytes, { checkCRC: true });
        demand(image.width === width && image.height === height && image.data.length === width * height * 4, 'INVALID_PNG');
    } catch { demand(false, 'INVALID_PNG'); }
    return { width, height, sha256: digest(bytes) };
}
