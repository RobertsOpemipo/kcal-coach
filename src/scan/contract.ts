/**
 * Model contract (also in docs/CONTRACTS.md). Training (`training/`) and the app must agree on this.
 *  - Input : 1 tensor, float32, shape [1, 224, 224, 3], RGB, raw pixel values 0..255.
 *            Any preprocessing (scaling to -1..1 etc.) is INSIDE the model.
 *  - Output: 1 tensor, float32, shape [1, N], probabilities that sum to about 1, in the order of
 *            `classIds` in assets/model/manifest.json. Each class id is a food id (e.g. "seed-jollof-rice").
 */
export const INPUT_SIZE = 224;
export const INPUT_CHANNELS = 3;
export const TOP_K = 3;

/** Probability bands used for wording. NEEDS TUNING on the held-out set. */
export const CONFIDENCE = { likely: 0.6, possible: 0.2 } as const;
/** Below this the screen leads with "Not sure" and offers search first. */
export const NOT_SURE_BELOW = 0.35;

export interface ScanManifest {
  modelVersion: string;
  /** True for the demo model: its guesses are meaningless. The UI says so. */
  isPlaceholder: boolean;
  inputSize: number;
  classIds: string[];
  metrics?: { top1: number; top3: number; testImages: number };
}

export interface ScanCandidate {
  foodId: string;
  probability: number;
}

export interface ScanOutcome {
  candidates: ScanCandidate[];
  isPlaceholder: boolean;
  modelVersion: string;
  ms: number;
}

export class ScanError extends Error {
  constructor(public code: 'unavailable' | 'model_mismatch' | 'bad_image' | 'failed', message: string) {
    super(message);
    this.name = 'ScanError';
  }
}
