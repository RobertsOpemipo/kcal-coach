import jpeg from 'jpeg-js';
import { INPUT_CHANNELS, INPUT_SIZE } from './contract';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Int16Array(128).fill(-1);
for (let i = 0; i < B64.length; i++) LOOKUP[B64.charCodeAt(i)] = i;

/** Base64 to bytes without atob or Buffer (not guaranteed in every runtime). Ignores whitespace and data-URI prefix. */
export function base64ToBytes(input: string): Uint8Array {
  const s = input.replace(/^data:[^,]*,/, '').replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < s.length; i += 4) {
    const a = LOOKUP[s.charCodeAt(i)] ?? 0;
    const b = LOOKUP[s.charCodeAt(i + 1)] ?? 0;
    const c = i + 2 < s.length ? (LOOKUP[s.charCodeAt(i + 2)] ?? 0) : 0;
    const d = i + 3 < s.length ? (LOOKUP[s.charCodeAt(i + 3)] ?? 0) : 0;
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

/** Largest centred square inside w x h. */
export function centerSquare(w: number, h: number): { originX: number; originY: number; width: number; height: number } {
  const side = Math.min(w, h);
  return { originX: Math.floor((w - side) / 2), originY: Math.floor((h - side) / 2), width: side, height: side };
}

/** RGBA bytes to a float32 RGB tensor with raw 0..255 values, as the model contract says. */
export function rgbaToFloat32(rgba: ArrayLike<number>, width: number, height: number): Float32Array {
  const px = width * height;
  if (rgba.length < px * 4) throw new RangeError('pixel buffer is smaller than width x height x 4');
  const out = new Float32Array(px * INPUT_CHANNELS);
  for (let i = 0, j = 0; i < px; i++) {
    out[j++] = rgba[i * 4] as number;
    out[j++] = rgba[i * 4 + 1] as number;
    out[j++] = rgba[i * 4 + 2] as number;
  }
  return out;
}

/** Decode JPEG bytes that are already INPUT_SIZE x INPUT_SIZE into the model input tensor. */
export function jpegToTensor(bytes: Uint8Array): Float32Array {
  const img = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
  if (img.width !== INPUT_SIZE || img.height !== INPUT_SIZE) {
    throw new RangeError(`expected ${INPUT_SIZE}x${INPUT_SIZE}, got ${img.width}x${img.height}`);
  }
  return rgbaToFloat32(img.data, img.width, img.height);
}

export const toArrayBuffer = (f: Float32Array): ArrayBuffer =>
  f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength) as ArrayBuffer;
