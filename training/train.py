"""Train the plate classifier and export the TFLite model the app bundles.

Usage:   python train.py --data data --classes classes.txt --out out
Output:  out/plate.tflite, out/manifest.json, out/report.json
Gate:    top-3 accuracy on the held-out test set must be >= 0.80 (BRD phase 2).
Model contract (must match src/scan/contract.ts):
  input  float32 [1,224,224,3], raw 0..255 pixels (scaling happens inside the model)
  output float32 [1,N] softmax probabilities in classes.txt order
"""
import argparse, datetime, json
from pathlib import Path

import numpy as np
import tensorflow as tf

SIZE = 224


def load(split_dir, classes, batch, shuffle):
    return tf.keras.utils.image_dataset_from_directory(
        split_dir, labels='inferred', label_mode='int', class_names=classes,
        image_size=(SIZE, SIZE), batch_size=batch, shuffle=shuffle, seed=7)


def build(n, pretrained):
    inp = tf.keras.Input((SIZE, SIZE, 3), name='image')  # raw 0..255
    aug = tf.keras.Sequential([
        tf.keras.layers.RandomFlip('horizontal'),
        tf.keras.layers.RandomRotation(0.08),
        tf.keras.layers.RandomZoom(0.15),
        tf.keras.layers.RandomContrast(0.2),
        tf.keras.layers.RandomBrightness(0.2, value_range=(0, 255)),
    ], name='augment')
    x = aug(inp)  # only active in training
    x = tf.keras.layers.Rescaling(1 / 127.5, offset=-1, name='scale')(x)  # MobileNet expects -1..1
    base = tf.keras.applications.MobileNetV2(
        input_shape=(SIZE, SIZE, 3), include_top=False, weights='imagenet' if pretrained else None)
    base.trainable = False
    x = base(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    out = tf.keras.layers.Dense(n, activation='softmax', name='probs')(x)
    return tf.keras.Model(inp, out), base


def topk(model, ds, k=3):
    hit1 = hitk = total = 0
    for x, y in ds:
        p = model.predict(x, verbose=0)
        order = np.argsort(-p, axis=1)[:, :k]
        y = y.numpy()
        hit1 += int((order[:, 0] == y).sum())
        hitk += int(sum(y[i] in order[i] for i in range(len(y))))
        total += len(y)
    return hit1 / max(total, 1), hitk / max(total, 1), total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default='data')
    ap.add_argument('--classes', default='classes.txt')
    ap.add_argument('--out', default='out')
    ap.add_argument('--epochs', type=int, default=12)
    ap.add_argument('--finetune-epochs', type=int, default=8)
    ap.add_argument('--batch', type=int, default=32)
    ap.add_argument('--no-pretrained', action='store_true', help='for quick pipeline tests only')
    a = ap.parse_args()

    classes = [c.strip() for c in Path(a.classes).read_text().splitlines() if c.strip()]
    data = Path(a.data)
    train, val, test = (load(data / s, classes, a.batch, s == 'train') for s in ('train', 'val', 'test'))
    model, base = build(len(classes), not a.no_pretrained)

    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    model.fit(train, validation_data=val, epochs=a.epochs)
    if a.finetune_epochs > 0:
        base.trainable = True
        for layer in base.layers[:-30]:
            layer.trainable = False
        model.compile(optimizer=tf.keras.optimizers.Adam(1e-5), loss='sparse_categorical_crossentropy', metrics=['accuracy'])
        model.fit(train, validation_data=val, epochs=a.finetune_epochs)

    top1, top3, n = topk(model, test)
    print(f'TEST top-1 {top1:.3f}  top-3 {top3:.3f}  ({n} images)')
    print('GATE (top-3 >= 0.80):', 'PASS' if top3 >= 0.80 else 'FAIL')

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    conv = tf.lite.TFLiteConverter.from_keras_model(model)
    conv.optimizations = [tf.lite.Optimize.DEFAULT]
    conv.target_spec.supported_types = [tf.float16]
    tflite = conv.convert()
    (out / 'plate.tflite').write_bytes(tflite)

    # Check the exported file agrees with the Keras model on a few test images
    interp = tf.lite.Interpreter(model_content=tflite)
    interp.allocate_tensors()
    i, o = interp.get_input_details()[0], interp.get_output_details()[0]
    assert list(i['shape']) == [1, SIZE, SIZE, 3] and i['dtype'] == np.float32, i
    x, _ = next(iter(test))
    agree = 0
    for k in range(min(8, len(x))):
        interp.set_tensor(i['index'], x[k:k + 1].numpy().astype(np.float32))
        interp.invoke()
        agree += int(np.argmax(interp.get_tensor(o['index'])) == np.argmax(model.predict(x[k:k + 1], verbose=0)))
    print(f'TFLite agrees with Keras on {agree}/{min(8, len(x))} sample images')

    passed = top3 >= 0.80
    manifest_name = 'manifest.json' if passed else 'manifest.NOT-SHIPPABLE.json'
    (out / manifest_name).write_text(json.dumps({
        'modelVersion': datetime.date.today().isoformat(),
        'isPlaceholder': False,
        'inputSize': SIZE,
        'classIds': classes,
        'metrics': {'top1': round(top1, 4), 'top3': round(top3, 4), 'testImages': n},
    }, indent=2) + '\n')
    (out / 'report.json').write_text(json.dumps({'top1': top1, 'top3': top3, 'testImages': n, 'gatePass': top3 >= 0.80}, indent=2))
    print(f'Wrote {out}/plate.tflite ({len(tflite) / 1e6:.1f} MB), {manifest_name}, report.json')
    if passed:
        print('Copy plate.tflite and manifest.json into assets/model/ in the app.')
    else:
        print('Gate failed: do NOT ship this model. Collect more meals for weak dishes and retrain.')


if __name__ == '__main__':
    main()
