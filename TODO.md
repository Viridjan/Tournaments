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
