# Decisions

| # | Decision | Why |
|---|---|---|
| D1 | Name Kcal Coach; Forest Sage palette; K flame logo | Owner choice |
| D2 | Expo SDK 58 with Expo Router, routes in `src/app/` | Template default for SDK 58 |
| D3 | Local-first SQLite, device-generated UUIDs, outbox, tombstones, Africa/Lagos local date | Offline use is the main case; sync comes later |
| D4 | DB code talks to a `SqlDriver`; expo-sqlite on device, node:sqlite in tests | Lets migrations and repos be tested without a device |
| D5 | Health constants unverified, kept in `src/health/config/needs-review.ts` | BRD says a dietitian must confirm them |
| D6 | Stop-and-refer cases return `maintenance_only` with a reason, not an error | The UI can show a kind message and still give a number |
| D7 | `npm install --legacy-peer-deps` | react 19.3.0 vs react-dom 19.3.1 peer conflict in the SDK 58 tree; revisit when fixed |
| D8 | Migration 2 adds food columns (aliases, portion, needs_review) | Search and default portions; migration 1 left untouched |
| D9 | Built-in foods are ~52 rows per 100 g in `src/food/seed.ts`, all `needsReview: true` | Placeholder until a dietitian verifies; ids are stable (`seed-<slug>`) |
| D10 | Over-goal is shown as a neutral number ("Above today's goal"), never red | No-shaming UX |
| D11 | Repos are reached through `repos()` in `src/db/app.ts`; screens re-read via `useQuery` after any write | No state library needed yet |
| D12 | Water goal fixed at 2000 ml in `needs-review.ts` | Placeholder; dietitian to review |
| D13 | Onboarding collects birth year only; age is calendar-year arithmetic | Avoids asking for a full date of birth |
| D14 | Capture with `expo-camera`, classify with `react-native-fast-tflite`; vision-camera not used | vision-camera 5 is a new API; expo-camera is matched to the SDK. Revisit for live scanning |
| D15 | Scan is photo-then-classify, not live frames | Simplest reliable pipeline; target under 1 s per photo |
| D16 | Image to tensor in JS (expo-image-manipulator + jpeg-js) | No frame-processor or worklet dependencies |
| D17 | Native libraries are loaded lazily; the Scan screen explains itself in Expo Go | Keeps Expo Go working for everything else |
| D18 | A placeholder model ships (`isPlaceholder: true`) and the UI says "Demo model" | Lets the flow be tested before training |
| D19 | `log_entry` stores kcal and macros unrounded; screens round for display | Avoids drift when grams are edited (each rescale multiplies the stored values) and keeps the rounding rule in one layer |
| D20 | `weight_entry` outbox payload is always the full `WeightEntry` shape; `profileRepo.save` and `weightRepo.add` aligned | Two payload shapes for the same entity would force the eventual sync merge to special-case; align now while volume is zero. Guarded by `src/db/outboxShape.test.ts` |
| D21 | `MealPlanInput.kcalFloor` is a required input; the caller supplies `GOAL_CONFIG.floorKcal[sex]` | The generator must not read `profile.sex`; the safety floor arrives with the target, same as everything else |
| D22 | Protein constraint is a LOWER bound only. Days with protein above the target range are valid. Kcal window and kcal floor stay strict. | A plan should not fail just because it overshot on protein; undershooting is the risk that matters for satiety and muscle retention. Protein min remains the current proteinGPerKg-derived value; do not change that config without dietitian sign-off. |