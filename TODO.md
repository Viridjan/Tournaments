# TODO

## DEFAULT_SHEETS_URL

`DEFAULT_SHEETS_URL` in `src/config.js` is a hardcoded public Apps Script deployment URL.
Anyone who forks or self-hosts the app shares this URL until they override it in the Advanced tab.

**Goal:** remove the hardcoded default so the app starts with no URL and prompts the user to configure one on first load.

- Change `DEFAULT_SHEETS_URL` to `""` (empty string)
- `getSheetsUrl()` in `storage.js` returns `localStorage.getItem(LS_SHEETS_URL) || ""` — callers already handle empty URL gracefully (`if (!url) return`)
- `App.jsx` `fetchTournaments` already skips when URL is falsy (`if (!u) { setLoading(false); return; }`)
- LandingScreen should show a prompt/onboarding when no URL is configured
- Keep `DEFAULT_SHEETS_URL` constant for documentation/copy-paste reference in the Advanced tab UI

---

## Prize rank defaults (DEFAULT_PRIZE_PCTS)

`DEFAULT_PRIZE_PCTS = [30, 15, 15, 10, 10, 10, 5, 5]` in `src/logic.js` seeds the initial rank split when a tournament opens.

**Goal:** make rank definitions per-tournament and load them from the Sheet. Needs a dedicated **Prize ranks tab** (or a section in Settings) where each row is a rank with its label and percentage.

- Add a new "Ranks" sheet or extend Settings with rank columns
- Load ranks from `?action=ranks` (new endpoint) alongside tournament features
- Remove `DEFAULT_PRIZE_PCTS` and `defRanks()` from logic.js once Sheet-sourced
- Until then the in-app Advanced tab editor (existing) serves as the runtime override

---

## Remove Google Sheets entirely

Tournaments already load from `config/tournaments.json`. Remaining Sheets dependencies to cut:

- **Global settings** (`?action=global_settings`) — move to `config/global-settings.json`, embed as `GLOBAL_SETTINGS` in build, dispatch `SET_GLOBAL_SETTINGS` synchronously on mount
- **ELO database** (`?action=load`, `?action=elo_cols`) — ELO is already mirrored in localStorage (`LS_ELO_DB`). Drop the Sheets fetch; load from localStorage only on mount. Remove `eloLoadedCols` / `eloColOptions` state from App.jsx
- **ELO save** (`POST ?action=save`) — currently fired by `SheetsSync.jsx`. Replace with localStorage-only persistence or JSON export/import via file download
- **Seeds** (`seed_list`, `seed_load`, `seed_save`, `seed_delete`) — move to localStorage. Seeds are already backed up there; the AdvancedTab seeds browser needs to read from localStorage instead of fetching
- **Rules** (`?action=rules`) — move to `config/rules.json`, load at build time or fetch from a static file
- **Auto-seed save** (`autoSeedSave()` in `storage.js`) — remove the fire-and-forget POST; keep the 2s debounce but write to localStorage only
- **Cleanup** — remove `DEFAULT_SHEETS_URL` and `LS_SHEETS_URL`, remove URL field from AdvancedTab, remove `SheetsSync.jsx`, remove `apps-script-embed.js` from build, retire `apps-script.js`
