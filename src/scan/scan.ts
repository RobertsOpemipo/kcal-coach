import { TOP_K, type ScanOutcome } from './contract';
import { runModel } from './engine';
import { manifest } from './manifest';
import { preparePhoto } from './photo';
import { topK } from './ranking';

/** Photo file in, ranked food guesses out. No network is used anywhere on this path. */
export async function scanPhoto(uri: string): Promise<ScanOutcome> {
  const t0 = Date.now();
  const tensor = await preparePhoto(uri);
  const scores = await runModel(tensor);
  return {
    candidates: topK(scores, manifest.classIds, TOP_K),
    isPlaceholder: manifest.isPlaceholder,
    modelVersion: manifest.modelVersion,
    ms: Date.now() - t0,
  };
}
