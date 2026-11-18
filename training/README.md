# Training the plate model

Needs Python 3.10 to 3.13 and a few GB of disk. A laptop CPU works for a few thousand photos; Google Colab (free GPU) is faster.

```bash
cd training
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 1. Photos go in training/raw/<class-id>/<meal>_<n>.jpg  (see ../docs/DATA_COLLECTION.md)
python split_dataset.py --raw raw --out data            # shows photos and meals per class

# 2. Train, evaluate on the held-out test set, export
python train.py --data data --classes classes.txt --out out

# 3. If it prints "GATE (top-3 >= 0.80): PASS", copy into the app
cp out/plate.tflite out/manifest.json ../assets/model/  # Windows: copy

# 4. Back in the app folder
npm test            # checks the manifest against the food list
npx expo run:android
```

## Rules
- `classes.txt` is generated from the food list: `node --experimental-strip-types scripts/export-classes.ts` (run from the app folder). If you add a scannable food, regenerate and retrain.
- Do not hand-edit `manifest.json` from a real training run. `isPlaceholder` stays `false` only for a model that passed the gate.
- `make_placeholder.py` rebuilds the demo model (random weights, `isPlaceholder: true`). It exists so the app flow can be tested before any training.

## Model contract
Input `float32 [1,224,224,3]`, raw 0..255 RGB. Output `float32 [1,N]` softmax in `classes.txt` order. Scaling is inside the model. The app refuses a model that does not match (see `src/scan/engine.ts`).

## If the score is low
1. Look at `out/report.json`, then at which dishes are confused (swallows and soups often are). Collect more meals for those.
2. Add photos with different light, plates and angles before changing the model.
3. Merge dishes that look the same on a plate (for example the swallows) into one class with a follow-up question in the app.
