# Kcal Coach

Calorie tracking for Nigeria and West Africa. Local-first, free on-device AI plate scanning, no shaming UX.
Expo SDK 58 · TypeScript (strict) · Expo Router · expo-sqlite. Palette: Forest Sage. Logo: K flame.

## Commands
```
npm install --legacy-peer-deps   # react / react-dom peer mismatch in SDK 58 tree
npm run check                    # typecheck + lint + tests (must pass before every handoff)
npm test                         # vitest, pure logic only (health, db via node:sqlite)
npx expo start --dev-client      # needs an EAS dev build; Expo Go cannot run vision-camera or fast-tflite
```

## Layout
| Path | Owns |
|---|---|
| `src/app/` | Expo Router screens (routes only) |
| `src/ui/` | Shared components |
| `src/theme/` | Forest Sage tokens, ThemeProvider, contrast helper |
| `src/health/` | Pure health engine. Constants needing review live in `config/needs-review.ts` |
| `src/db/` | SQL driver interface, migrations, repos, outbox |
| `src/contracts/` | Shared types only. Log every change in `docs/CONTRACTS.md` |
| `src/food`, `src/meal-plan`, `src/coach` | Later phases |

## Working with more than one AI engineer
Read `docs/STATUS.md` first, then `docs/HANDOFF.md`. Rules are in `docs/PROTOCOL.md`.
