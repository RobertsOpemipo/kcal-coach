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
