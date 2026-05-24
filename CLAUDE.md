# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build

```bash
bash build.sh
```

No npm, no Node. Concatenates `src/` files in a fixed order into `index.html`. Edit source files, then rebuild. The order in `build.sh` is the load order — it matters because all files share a single `<script>` tag and globals must be defined before use.

CI runs `build.sh` on push to `main` and deploys `index.html` to GitHub Pages.

## Architecture

Single-page app with no bundler. React 18 + Babel Standalone loaded via CDN. All source files are concatenated into one `<script type="text/babel">` block. No `import`/`export` — everything is a global.

### Source load order (from `build.sh`)

1. `src/config.js` — localStorage key constants (`LS_ELO_DB`, `LS_SHEETS_URL`, `LS_BACKUP`, `LS_BACKUP_LAST`), default Apps Script URL (`DEFAULT_SHEETS_URL`)
2. `src/logic.js` — Pure functions: ELO math, pairing algorithms, prize allocation
3. `src/storage.js` — localStorage helpers (`loadLS`, `saveLS`), `buildSnap()`, `autoSeedSave()`, `makePairings()` dispatcher, `now()`
4. `src/reducer.js` — Initial state (`init`) + all state transitions (`reducer`)
5. `src/ui.js` — Color palette (`C`), style objects (`S`), shared primitives (`Card`, `Btn`, `Tag`, `TabBar`, `Hearts`)
6. `src/components/` — Feature components in dependency order (see `build.sh`)
7. `src/App.jsx` — Root component

### State model

Single `useReducer(reducer, init)` in `App.jsx`. All state transitions go through `reducer.js`. Key state:

- `screen` — `"landing"` | `"tournament"`
- `tournamentId` — key into `state.tournaments`
- `tournaments` — `{id: {id, name, icon, desc, features{}}}` loaded from Sheets on mount via `SET_TOURNAMENTS`
- `featureOverrides` — runtime overrides merged over tournament features; merged at action time via `{ ...state.tournaments[id]?.features, ...featureOverrides }`
- `players` — `{name, score, w, d, l, eliminated, paid, positionSum, gpScores?, eloStart?}`
- `eloDb` — `{colName: {nameLower: {elo, name, test}}}` persisted under `LS_ELO_DB`; auto-synced from Sheets on mount
- `draftEnded` — hides Draft sub-tab after draft phase completes
- State auto-backed-up to `localStorage` under `LS_BACKUP + "_" + tournamentId` during a tournament; restored on next load

**Feature config access pattern** (used everywhere components need feature flags):
```js
const c = { ...state.tournaments[state.tournamentId]?.features, ...state.featureOverrides };
```

### Tournament types

Loaded dynamically from the Google Sheet's Settings tab on mount — **not hardcoded**. `state.tournaments` starts as `{}` and is populated by `SET_TOURNAMENTS` after `?action=tournament_list`. Adding a new tournament type requires only a new row in the Sheet (no code change).

### Scoring modes (`src/logic.js`)

- `lifepoints` — players start with `startScore` lives; loss/draw costs lives; elimination at 0
- `swiss` — points accumulate (win/draw/loss points)
- `points` (Grand Prix) — `gpBestOf()` takes best N of last M results, drops worst K; ghost-padding penalises late joiners

### Pairing modes

Mode is determined solely by `cfg.matchMax` (no separate flag):
- `matchMax = 2` — `genPairings()`: backtracking avoids rematches; falls back to allowing them if no clean solution; assigns BYE for odd player counts
- `matchMax > 2` — `genPairings()` + `splitGroups()`: splits active players into pods of up to `matchMax` size; `matchRound` controls rounding (BYE / up / down)

### Google Apps Script backend

`apps-script.js` is deployed separately to Google Apps Script (not bundled). `src/apps-script-embed.js` embeds its content as a string constant `APPS_SCRIPT` for display in the Advanced tab. Regenerate after editing `apps-script.js`:

```bash
node -e "
const c = require('fs').readFileSync('apps-script.js','utf8');
const e = JSON.stringify(c);
require('fs').writeFileSync('src/apps-script-embed.js','const APPS_SCRIPT = ' + e + ';\n');
"
```

`TOURNAMENT_FEATURE_KEYS` in `apps-script.js` controls which Sheet columns are parsed as feature flags. Add new columns there when adding new feature flags.

### Auto-save

`autoSeedSave()` fires 2 s after any change to pairings, history, players, round, or phase — and immediately before dispatch on **New session** and **End tournament**. Fire-and-forget (`mode: "no-cors"`); failures are silent. Seeds are labelled `[auto]`.

### localStorage keys

| Constant | Key string | Content |
|---|---|---|
| `LS_ELO_DB` | `tournament_elo_db_v2` | ELO database |
| `LS_SHEETS_URL` | `tournament_sheets_url_v1` | Apps Script URL |
| `LS_BACKUP` | `tournament_local_backup` | Prefix; suffixed `_<tournamentId>` |
| `LS_BACKUP_LAST` | `tournament_local_backup_last` | Most recently active tournament id |

## Expansion patterns

**New feature flag** — Add column to Sheet Settings tab → add key to `TOURNAMENT_FEATURE_KEYS` in `apps-script.js` and redeploy → consume in component: `if (c.myFlag) { … }` → optionally expose in `AdvancedTab.jsx` for runtime override.

**New tab** — Create `src/components/MyTab.jsx` (receives `{state, dispatch, config}`) → add to `build.sh` at correct dependency position → in `Shell.jsx` add to tabs array (gate with feature flag) and add render case.

**New scoring mode** — Add scoring function in `src/logic.js` + handle in `NEXT_ROUND` case in `reducer.js`.

**New pairing mode** — Add pairing function in `src/logic.js` + add branch in `makePairings()` in `storage.js`.

**New backend endpoint** — Add handler in `apps-script.js` + register in `doGet`/`doPost` → regenerate embed → redeploy → call via `fetch(getSheetsUrl() + "?action=my_action")`.

**New persistent state field** — Add to `init` in `reducer.js` + handle in relevant actions + include in `buildSnap()` in `storage.js` if it should survive reload.
