import jpeg from 'jpeg-js';
import { describe, expect, it } from 'vitest';
import { SEED_FOODS } from '../food/seed';
import { INPUT_SIZE } from './contract';
import { base64ToBytes, centerSquare, jpegToTensor, rgbaToFloat32, toArrayBuffer } from './imageTensor';
import { manifest } from './manifest';
import { describeConfidence, ensureProbabilities, isNotSure, softmax, topK } from './ranking';

describe('base64ToBytes', () => {
  it('decodes with and without padding, whitespace and data-URI prefix', () => {
    const text = (b: Uint8Array) => Array.from(b, (x) => String.fromCharCode(x)).join('');
    expect(text(base64ToBytes('aGVsbG8='))).toBe('hello');
    expect(text(base64ToBytes('aGVsbG8'))).toBe('hello');
    expect(text(base64ToBytes('aGVs\nbG8='))).toBe('hello');
    expect(text(base64ToBytes('data:image/jpeg;base64,aGk='))).toBe('hi');
    expect(base64ToBytes('').length).toBe(0);
  });
  it('round-trips random bytes', () => {
    for (const len of [1, 2, 3, 4, 5, 100, 1001]) {
      const bytes = Uint8Array.from({ length: len }, (_, i) => (i * 37 + 11) & 255);
      expect(Array.from(base64ToBytes(Buffer.from(bytes).toString('base64')))).toEqual(Array.from(bytes));
    }
  });
});

describe('centerSquare', () => {
  it('crops the long side evenly', () => {
    expect(centerSquare(300, 200)).toEqual({ originX: 50, originY: 0, width: 200, height: 200 });
    expect(centerSquare(200, 300)).toEqual({ originX: 0, originY: 50, width: 200, height: 200 });
    expect(centerSquare(224, 224)).toEqual({ originX: 0, originY: 0, width: 224, height: 224 });
  });
});

describe('tensor conversion', () => {
  it('drops alpha and keeps raw 0..255 RGB', () => {
    const f = rgbaToFloat32([10, 20, 30, 255, 40, 50, 60, 128], 2, 1);
    expect(Array.from(f)).toEqual([10, 20, 30, 40, 50, 60]);
  });
  it('rejects a short buffer', () => expect(() => rgbaToFloat32([1, 2, 3, 4], 2, 2)).toThrow());
  it('decodes a real JPEG to the model input size', () => {
    const data = Buffer.alloc(INPUT_SIZE * INPUT_SIZE * 4);
    for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) data.set([200, 100, 50, 255], i * 4);
    const encoded = jpeg.encode({ data, width: INPUT_SIZE, height: INPUT_SIZE }, 95).data;
    const t = jpegToTensor(new Uint8Array(encoded));
    expect(t.length).toBe(INPUT_SIZE * INPUT_SIZE * 3);
    expect(t[0]).toBeGreaterThan(190);
    expect(t[0]).toBeLessThan(210);
    expect(t[1]).toBeGreaterThan(90);
    expect(t[1]).toBeLessThan(110);
    expect(t[2]).toBeGreaterThan(40);
    expect(t[2]).toBeLessThan(60);
  });
  it('refuses a JPEG of the wrong size', () => {
    const encoded = jpeg.encode({ data: Buffer.alloc(16 * 16 * 4, 255), width: 16, height: 16 }, 90).data;
    expect(() => jpegToTensor(new Uint8Array(encoded))).toThrow(/expected/);
  });
  it('toArrayBuffer copies exactly the view', () => {
    const big = new Float32Array([1, 2, 3, 4]);
    expect(new Float32Array(toArrayBuffer(big.subarray(1, 3)))).toEqual(new Float32Array([2, 3]));
  });
});

describe('ranking', () => {
  const ids = ['a', 'b', 'c', 'd'];
  it('returns the k best, sorted', () => {
    expect(topK([0.1, 0.5, 0.15, 0.25], ids, 3).map((c) => c.foodId)).toEqual(['b', 'd', 'c']);
  });
  it('turns logits into probabilities', () => {
    const p = softmax([2, 1, 0]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(ensureProbabilities([2, 1, 0]).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(ensureProbabilities([0.7, 0.3])).toEqual([0.7, 0.3]);
  });
  it('survives NaN and mismatched lengths', () => {
    expect(topK([NaN, 1, 0, 0], ids, 1)[0]?.foodId).toBe('b');
    expect(() => topK([1, 2], ids, 3)).toThrow();
  });
  it('words the confidence and detects a weak top guess', () => {
    expect(describeConfidence(0.9)).toBe('Likely');
    expect(describeConfidence(0.3)).toBe('Possible');
    expect(describeConfidence(0.05)).toBe('Unlikely');
    expect(isNotSure([{ foodId: 'a', probability: 0.2 }])).toBe(true);
    expect(isNotSure([{ foodId: 'a', probability: 0.7 }])).toBe(false);
    expect(isNotSure([])).toBe(true);
  });
});

describe('bundled model manifest', () => {
  it('lists only known foods, once each, at the contract input size', () => {
    const known = new Set(SEED_FOODS.map((f) => f.id));
    expect(manifest.inputSize).toBe(INPUT_SIZE);
    expect(new Set(manifest.classIds).size).toBe(manifest.classIds.length);
    for (const id of manifest.classIds) expect(known.has(id), id).toBe(true);
  });
  it('real models carry test metrics that pass the gate', () => {
    if (manifest.isPlaceholder) return;
    expect(manifest.metrics?.top3).toBeGreaterThanOrEqual(0.8);
  });
});
