import { TurboModuleRegistry } from 'react-native';
import { INPUT_CHANNELS, INPUT_SIZE, ScanError } from './contract';
import { manifest } from './manifest';
import { toArrayBuffer } from './imageTensor';

/** Minimal shape of the library model we rely on. */
interface Model {
  inputs: { shape: number[]; dataType: string }[];
  outputs: { shape: number[]; dataType: string }[];
  run(input: ArrayBuffer[]): Promise<ArrayBuffer[]>;
}

let loading: Promise<Model> | null = null;

/**
 * Is the native TFLite module linked into this app? In Expo Go it is not.
 * Checked BEFORE requiring the library: Metro reports an error thrown while a module loads as a
 * fatal redbox, so a try/catch around require() is not enough.
 */
function nativeLinked(): boolean {
  try {
    return TurboModuleRegistry.get('NitroModules') != null;
  } catch {
    return false;
  }
}

/** Loaded lazily so the app still starts where the native module is missing (Expo Go). */
function loadLibrary(): { loadTensorflowModel: (src: number, delegates: string[]) => Promise<Model> } | null {
  if (!nativeLinked()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-fast-tflite');
  } catch {
    return null;
  }
}

export const isEngineAvailable = (): boolean => {
  const lib = loadLibrary();
  return lib !== null && typeof lib.loadTensorflowModel === 'function';
};

async function getModel(): Promise<Model> {
  const lib = loadLibrary();
  if (!lib) throw new ScanError('unavailable', 'Scanning needs the development build');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const source: number = require('../../assets/model/plate.tflite');
  loading ??= lib
    .loadTensorflowModel(source, [])
    .then((m) => {
      const inShape = m.inputs[0]?.shape ?? [];
      const outShape = m.outputs[0]?.shape ?? [];
      const okIn = inShape.join() === [1, INPUT_SIZE, INPUT_SIZE, INPUT_CHANNELS].join() && m.inputs[0]?.dataType === 'float32';
      const okOut = outShape[outShape.length - 1] === manifest.classIds.length;
      if (!okIn || !okOut) {
        throw new ScanError('model_mismatch', `Model expects ${inShape.join('x')} and returns ${outShape.join('x')}; manifest has ${manifest.classIds.length} classes`);
      }
      return m;
    })
    .catch((e) => {
      loading = null;
      throw e instanceof ScanError ? e : new ScanError('failed', String(e));
    });
  return loading;
}

/** Runs the bundled model on one prepared tensor and returns raw output scores. */
export async function runModel(tensor: Float32Array): Promise<Float32Array> {
  const model = await getModel();
  const out = await model.run([toArrayBuffer(tensor)]);
  const first = out[0];
  if (!first) throw new ScanError('failed', 'Model returned no output');
  return new Float32Array(first);
}