# Contracts

Source: `src/contracts/index.ts`. Types only. Add a line here for every change.

| Date | Change | By |
|---|---|---|
| 2026-11-12 | Initial: Sex, ActivityLevel, GoalKind, MealSlot, EntrySource, BmrMethod, MacroRange, Macros, DailyTarget, LogEntry | Claude |

## Public surfaces other code may rely on
- `src/health`: `bmi`, `bmiCategory`, `bmr`, `tdee`, `navyBodyFat`, `jacksonPollock3`, `deurenberg`, `idealWeight`, `dailyTarget`, unit converters.
- `src/db`: `getDb()` (device), `migrate`, `createLogRepo(db)`. Add new tables only by appending a migration.
- `src/theme`: `useTheme()` returns `{ mode, c }`; tokens, `radius`, `space`, `fontFamily`.
