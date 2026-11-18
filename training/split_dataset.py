"""Split raw photos into train/val/test, keeping every photo from one meal in the SAME split.

Why: photos of the same plate look almost identical. If some land in train and some in test,
the test score is inflated and the app will disappoint in real life.

Input layout  : raw/<class-id>/<meal>_<n>.jpg    e.g. raw/seed-jollof-rice/m012_3.jpg
                (<meal> is anything without an underscore that is the same for photos of one plate)
Output layout : data/{train,val,test}/<class-id>/*.jpg   (files are copied)
Usage         : python split_dataset.py --raw raw --out data
"""
import argparse, hashlib, shutil, sys
from collections import defaultdict
from pathlib import Path

EXTS = {'.jpg', '.jpeg', '.png', '.webp'}


def bucket(meal: str, seed: str) -> str:
    h = int(hashlib.sha256((seed + meal).encode()).hexdigest(), 16) % 100
    return 'train' if h < 70 else 'val' if h < 85 else 'test'


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', default='raw')
    ap.add_argument('--out', default='data')
    ap.add_argument('--classes', default='classes.txt')
    ap.add_argument('--seed', default='kcal-coach')
    a = ap.parse_args()

    classes = [c.strip() for c in Path(a.classes).read_text().splitlines() if c.strip()]
    raw, out = Path(a.raw), Path(a.out)
    unknown = [d.name for d in raw.iterdir() if d.is_dir() and d.name not in classes]
    if unknown:
        print('Ignoring folders that are not in classes.txt:', ', '.join(sorted(unknown)))

    # every split gets a folder for every class so the loader never fails on a missing one
    for split in ('train', 'val', 'test'):
        for cls in classes:
            (out / split / cls).mkdir(parents=True, exist_ok=True)

    counts = defaultdict(lambda: defaultdict(int))
    meals = defaultdict(set)
    for cls in classes:
        d = raw / cls
        if not d.is_dir():
            continue
        for f in sorted(d.iterdir()):
            if f.suffix.lower() not in EXTS:
                continue
            meal = f.stem.split('_')[0]
            meals[cls].add(meal)
            split = bucket(f'{cls}/{meal}', a.seed)
            dest = out / split / cls
            dest.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, dest / f.name)
            counts[cls][split] += 1

    print(f"{'class':36} {'train':>6} {'val':>5} {'test':>5} {'meals':>6}")
    weak = []
    for cls in classes:
        c = counts[cls]
        print(f"{cls:36} {c['train']:6} {c['val']:5} {c['test']:5} {len(meals[cls]):6}")
        if len(meals[cls]) < 10 or c['test'] == 0:
            weak.append(cls)
    if weak:
        print('\nNeed more MEALS (not just more photos) for:', ', '.join(weak))
    return 0


if __name__ == '__main__':
    sys.exit(main())
