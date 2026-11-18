# Handoff log (newest first)

## 2026-11-13 · Claude · Phase 2 plumbing
**DONE:** Scan screen (camera, choose photo, analyse, top 3 guesses, search fallback); on-device pipeline (expo-image-manipulator, jpeg-js, react-native-fast-tflite); demo model and manifest; Today "Scan your plate" button; training scripts (`training/`); photo collection guide (`docs/DATA_COLLECTION.md`).
**CONTRACTS TOUCHED:** model contract and manifest (CONTRACTS.md, Phase 2 additions).
**DECISIONS ADDED:** D14 to D18.
**TESTS:** 163 pass.
**NEEDS FROM THE OTHER ENGINEER:** none.
**NEXT:** owner collects photos, trains, drops `plate.tflite` and `manifest.json` into `assets/model/`. Then phase 3 (calculators screens, meal plan, weight history).
**RISKS:** native build untested by me; EXIF orientation of camera photos unverified; expo-image-manipulator `manipulateAsync` is marked deprecated in SDK 58 (still works); demo model guesses are meaningless.

## 2026-11-13 · Claude · Phase 1
**DONE:** Onboarding (units, sex, birth year, height, weight, activity, goal, pregnancy flag); Today screen (kcal left as the one big number, macro bars, water, four meals, previous/next day, copy yesterday, remove); add-food search with recents and "log again"; portion screen; custom food form; 48 scannable + 4 other starter foods; water, profile, weight and food repos; app icons and brand SVGs.
**CONTRACTS TOUCHED:** see CONTRACTS.md, "Phase 1 changes".
**DECISIONS ADDED:** D8 to D13.
**TESTS:** 149 pass. Owner passed the gate on 2026-11-13.
**NEEDS FROM THE OTHER ENGINEER:** none.
**RISKS:** food values and water goal unverified; no edit-entry screen (remove and re-add); no weight history screen yet.

## 2026-11-12 · Claude · Phase 0
**DONE:** Expo SDK 58 project; Forest Sage theme + fonts + K flame logo; health engine (BMI, BMR x3, TDEE, body fat x4, ideal weight x4, goals with floors and refer cases); SQLite schema v1, migration runner, log repo with outbox and tombstones.
**CONTRACTS TOUCHED:** initial contracts file.
**DECISIONS ADDED:** D1 to D7.
**TESTS:** see STATUS.md.
**NEEDS FROM THE OTHER ENGINEER:** none yet.
**NEXT (phase 1, after owner passes the gate):** Today screen, quick-add log flow, verified food list seed, water entry repo.
**RISKS:** health constants unverified; app not yet run on a device; fonts and logo untested on hardware.
