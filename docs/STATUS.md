# Status

**Current phase:** 2 Scan, plumbing built; real model and gate pending photos. Phases 0 and 1 passed (owner, 2026-11-13).

| Phase | Gate | State |
|---|---|---|
| 0 Foundations | typecheck, lint, tests green; theme, health engine, local DB in place | Passed |
| 1 Log and Today | Log a meal in under 10 seconds offline; Today shows one number first | Passed |
| 2 Scan | Top 3 correct on 80%+ of the held-out set; zero network use while scanning | Plumbing built with a DEMO model. Gate needs real photos and training |
| 3 Plan and tools | Meal plan respects target; calculators match reference values | Not started |
| 4 Ship | Store builds, crash-free, privacy copy reviewed | Not started |

## Phase 0 evidence
- `npm run check` result is recorded in HANDOFF.md.
- Verified: Android JS bundle builds with Metro (`expo export`).
- Not verified yet: app launch on a device (needs an EAS dev build), font rendering, logo on device.

## Phase 1 evidence
- `npm run check`: typecheck, lint and 149 tests pass. Android JS bundle builds.
- Not verified: behaviour on a device (owner to run), keyboard handling on small screens, TalkBack/VoiceOver, splash configuration under SDK 58.
- Owner checks for the gate: onboarding saves; log a meal in under 10 seconds with no network (airplane mode); Today shows one number first; remove, water, copy yesterday, previous day, add your own food all work; kill and reopen the app and the data is still there.

## Phase 2 evidence (plumbing)
- `npm run check`: 163 tests pass. Android bundle builds with the model asset.
- `training/train.py` ran end to end on synthetic data: split, train, TFLite export, Keras vs TFLite agreement (8/8), gate printout. Real accuracy is unknown until real photos exist.
- Placeholder model contract verified with the TFLite interpreter: input float32 [1,224,224,3], output float32 [1,48], outputs sum to 1.
- NOT verified: the native build (`expo run:android`) with react-native-fast-tflite and expo-camera; camera preview and capture on a device; photo to tensor on a device (EXIF orientation); inference time on a phone; zero network use while scanning (nothing in the code uses the network, but it has not been measured).
- Gate for phase 2 (owner): real model passes top-3 >= 80% on the held-out test set from `training/train.py`, then a phone test with airplane mode on.
