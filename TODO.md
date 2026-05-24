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

## Draft table size

`Math.floor(n / 5)` in `src/logic.js` (draftGroups) hardcodes 5 players per table.

**Goal:** make configurable via a tournament feature flag (e.g. `draftTableSize`).

- Add `draftTableSize` to `TOURNAMENT_FEATURE_KEYS` in `apps-script.js`
- Use `cfg.draftTableSize || 5` in `draftGroups()`
