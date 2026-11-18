# Collecting dish photos for the scan model

The scan feature is only as good as these photos. Real photos of real plates beat anything downloaded.

## What to photograph
- The 48 dishes listed in `training/classes.txt`. Each line is a folder name (a food id such as `seed-jollof-rice`).
- Aim for **at least 40 different meals per dish, 3 to 5 photos each** (150 to 200 photos per dish; more is better).
  The number that matters is *different meals*, not photos of the same plate.
- Start with the 15 dishes people in your circle eat most. Train on those first and see the score before doing all 48.

## How to photograph
1. One dish per plate where you can. Mixed plates are fine too, but label the photo with the **main** dish only. Photograph mixed plates later, once the basics work.
2. Angles: about 45° from above, straight down, and a low side angle. Mix them across a meal.
3. Light: daylight by a window, indoor light, and evening. Not every photo should look perfect.
4. Containers: plate, bowl, wrap, takeaway pack, calabash. Use what people really eat from.
5. Distance: the plate should fill about two thirds of the frame. No zoom, no filters, no flash.
6. Portions: small, normal and large. Not staged.

## How to name and store
```
raw/
  seed-jollof-rice/
    m001_1.jpg  m001_2.jpg  m001_3.jpg     <- three photos of ONE plate (meal m001)
    m002_1.jpg                              <- a different plate
  seed-egusi-soup/
    ...
```
- The part before the first underscore (`m001`) identifies the plate. Give every plate a new id. Photos of one plate must share it.
- Folder names must match `training/classes.txt` exactly.

## Fairness and consent
- Photograph your own food and food friends and family agree to share. Make sure no faces or documents are in the frame.
- Tell contributors the photos are used only to train the on-device model.

## Held-out test set
`training/split_dataset.py` puts roughly 15% of the **meals** into a test set the model never trains on. The 80% top-3 gate is measured on it. Do not move photos between splits to improve the score.

## Next steps once you have photos
See `training/README.md`.
