import { CONFIDENCE, NOT_SURE_BELOW, type ScanCandidate } from './contract';

export function softmax(x: ArrayLike<number>): number[] {
  let max = -Infinity;
  for (let i = 0; i < x.length; i++) if ((x[i] as number) > max) max = x[i] as number;
  const e = Array.from(x, (v) => Math.exp(v - max));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
}

/** Models should output probabilities already; if they output logits, convert. */
export function ensureProbabilities(scores: ArrayLike<number>): number[] {
  const arr = Array.from(scores, (v) => (Number.isFinite(v) ? v : 0));
  const sum = arr.reduce((a, b) => a + b, 0);
  const inRange = arr.every((v) => v >= 0 && v <= 1);
  return inRange && Math.abs(sum - 1) < 0.05 ? arr : softmax(arr);
}

export function topK(scores: ArrayLike<number>, classIds: readonly string[], k: number): ScanCandidate[] {
  if (scores.length !== classIds.length) throw new RangeError(`got ${scores.length} scores for ${classIds.length} classes`);
  const p = ensureProbabilities(scores);
  return p
    .map((probability, i) => ({ foodId: classIds[i] as string, probability }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, k);
}

export type ConfidenceWord = 'Likely' | 'Possible' | 'Unlikely';
export const describeConfidence = (p: number): ConfidenceWord =>
  p >= CONFIDENCE.likely ? 'Likely' : p >= CONFIDENCE.possible ? 'Possible' : 'Unlikely';

/** True when the top guess is weak enough that the screen should lead with "Not sure". */
export const isNotSure = (candidates: readonly ScanCandidate[]): boolean =>
  (candidates[0]?.probability ?? 0) < NOT_SURE_BELOW;
