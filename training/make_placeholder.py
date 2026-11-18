"""Makes the DEMO model the app ships until you train a real one. Its guesses are meaningless;
manifest.json marks it isPlaceholder so the app says so on screen.
Usage: python make_placeholder.py --classes classes.txt --out ../assets/model
"""
import argparse, json
from pathlib import Path

import numpy as np
import tensorflow as tf


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--classes', default='classes.txt')
    ap.add_argument('--out', default='../assets/model')
    a = ap.parse_args()
    classes = [c.strip() for c in Path(a.classes).read_text().splitlines() if c.strip()]
    tf.keras.utils.set_random_seed(11)

    inp = tf.keras.Input((224, 224, 3), name='image')
    x = tf.keras.layers.Rescaling(1 / 127.5, offset=-1)(inp)
    x = tf.keras.layers.Conv2D(8, 5, strides=8, activation='relu')(x)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    out = tf.keras.layers.Dense(len(classes), activation='softmax', name='probs')(x)
    model = tf.keras.Model(inp, out)

    tflite = tf.lite.TFLiteConverter.from_keras_model(model).convert()
    d = Path(a.out)
    d.mkdir(parents=True, exist_ok=True)
    (d / 'plate.tflite').write_bytes(tflite)
    (d / 'manifest.json').write_text(json.dumps({
        'modelVersion': 'placeholder-0',
        'isPlaceholder': True,
        'inputSize': 224,
        'classIds': classes,
    }, indent=2) + '\n')
    print(f'{len(classes)} classes, {len(tflite)} bytes')


if __name__ == '__main__':
    main()
