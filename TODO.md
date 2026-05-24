# TODO

## Global user settings (localStorage, independent of tournament)

`ELO_DEFAULT`, `ELO_K_MAX`, `ELO_SCALE` are hardcoded constants in `src/config.js`.
They apply across all tournaments but are never user-configurable at runtime.

**Goal:** let users set these once in a "Global settings" UI and persist them in localStorage.
They should act as fallback defaults when no tournament-level override exists.

- Add localStorage keys (e.g. `tournament_global_settings_v1`) to `config.js`
- Load on init (alongside ELO db restore in `reducer.js`) and store in state or read directly where needed
- Expose in a settings panel (AdvancedTab, SettingsTab, or dedicated screen)
- `eloDefault` in particular should remove the `ELO_DEFAULT` constant as last-resort fallback once user-set values are reliable

Affected constants: `ELO_DEFAULT` (1000), `ELO_K_MAX` (50), `ELO_SCALE` (500)

---

## DEFAULT_SHEETS_URL

`DEFAULT_SHEETS_URL` in `src/config.js` is a hardcoded public Apps Script deployment URL.
Anyone who forks or self-hosts the app shares this URL until they override it in the Advanced tab.

**Goal:** remove the hardcoded default so the app starts with no URL and prompts the user to configure one on first load.

- Change `DEFAULT_SHEETS_URL` to `""` (empty string)
- `getSheetsUrl()` in `storage.js` returns `localStorage.getItem(LS_SHEETS_URL) || ""` — callers already handle empty URL gracefully (`if (!url) return`)
- `App.jsx` `fetchTournaments` already skips when URL is falsy (`if (!u) { setLoading(false); return; }`)
- LandingScreen should show a prompt/onboarding when no URL is configured
- Keep `DEFAULT_SHEETS_URL` constant for documentation/copy-paste reference in the Advanced tab UI
