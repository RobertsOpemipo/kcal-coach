import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { INPUT_SIZE, ScanError } from './contract';
import { base64ToBytes, centerSquare, jpegToTensor } from './imageTensor';

/**
 * Photo file to model tensor, all on the device:
 * 1. shrink (so we learn the real, orientation-corrected size cheaply)
 * 2. crop the centre square, resize to 224 x 224, get JPEG as base64
 * 3. decode to RGB floats in JS
 */
export async function preparePhoto(uri: string): Promise<Float32Array> {
  try {
    const small = await manipulateAsync(uri, [{ resize: { width: 448 } }], { format: SaveFormat.JPEG, compress: 0.9 });
    const box = centerSquare(small.width, small.height);
    const sq = await manipulateAsync(
      small.uri,
      [{ crop: box }, { resize: { width: INPUT_SIZE, height: INPUT_SIZE } }],
      { format: SaveFormat.JPEG, compress: 0.92, base64: true },
    );
    if (!sq.base64) throw new Error('no image data');
    return jpegToTensor(base64ToBytes(sq.base64));
  } catch (e) {
    throw new ScanError('bad_image', `Could not read that photo: ${String(e)}`);
  }
}
