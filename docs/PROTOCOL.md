# Working protocol (Gemini + DeepSeek + the owner)

1. Read `STATUS.md`, `DECISIONS.md`, `CONTRACTS.md`, `HANDOFF.md` before touching code.
2. Branches: `<name>/<phase>-<topic>`, for example `gemini/p1-today-screen`. Never commit to `main` directly.
3. Folder ownership (change another owner's folder only through a CONTRACTS entry and a handoff note):
   - UI engineer: `src/app`, `src/ui`, `src/theme`
   - Logic engineer: `src/health`, `src/db`, `src/food`, `src/meal-plan`, `src/coach`
   - Shared: `src/contracts` (types only, no logic)
4. `npm run check` must pass before every handoff.
5. Constants that are not verified go in a named config file marked "needs expert review". Never inline them.
6. No shaming UX: no red over-target numbers, no public streaks, no paywalled core logging.
7. Do not start phase N+1 until the owner passes phase N's gate in STATUS.md.
8. Handoff format (append to HANDOFF.md): DONE / CONTRACTS TOUCHED / DECISIONS ADDED / TESTS / NEEDS FROM THE OTHER ENGINEER / NEXT / RISKS.
