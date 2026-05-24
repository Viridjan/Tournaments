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

Config JSON files are embedded as globals first, then source files in dependency order:

1. `config/prizes.json` → `PRIZES` global
2. `config/spinner.json` → `SPINNER_OPTIONS` global
3. `config/tournaments.json` → `TOURNAMENTS` global
4. `config/scoring.json` → `SCORING_PRESETS` global
5. `config/global-settings.json` → `GLOBAL_SETTINGS` global
6. `src/config.js` — localStorage key constants (`LS_ELO_DB`, `LS_SHEETS_URL`, `LS_BACKUP`, `LS_BACKUP_LAST`), default Apps Script URL (`DEFAULT_SHEETS_URL`)
7. `src/logic.js` — Pure functions: ELO math, pairing algorithms, prize allocation
8. `src/storage.js` — localStorage helpers (`loadLS`, `saveLS`), `buildSnap()`, `autoSeedSave()`, `makePairings()` dispatcher, `now()`
9. `src/reducer.js` — Initial state (`init`) + all state transitions (`reducer`)
10. `src/ui.js` — Color palette (`C`), style objects (`S`), shared primitives (`Card`, `Btn`, `Tag`, `TabBar`, `Hearts`)
11. `src/components/` — Feature components in dependency order (see `build.sh`)
12. `src/App.jsx` — Root component

### Config files

All tournament configuration lives in `config/`. Edit these files and rebuild — no Sheet changes needed:

- `config/tournaments.json` — Array of tournament definitions. Each entry has `id`, `name`, `icon`, `desc`, `features{}`. Only tournament-specific flags go here; scoring-mode fields go in `scoring.json` and global defaults in `global-settings.json`.
- `config/scoring.json` — Per-mode scoring presets keyed by scoring mode name (`lifepoints`, `swiss`, `points`). Merged into tournament features at `SET_TOURNAMENTS` time — tournament values override preset values.
- `config/global-settings.json` — ELO defaults (`eloDefault`, `eloKMax`, `eloScale`) and prize allocation defaults. Lowest priority in the config merge.

`App.jsx` validates config on mount via `validateConfig()` and shows an error screen (not a crash) for missing/invalid fields before anything runs.

### State model

Single `useReducer(reducer, init)` in `App.jsx`. All state transitions go through `reducer.js`. Key state:

- `screen` — `"landing"` | `"tournament"`
- `tournamentId` — key into `state.tournaments`
- `tournaments` — `{id: {id, name, icon, desc, features{}}}` — loaded from `TOURNAMENTS` global at mount, with `SCORING_PRESETS[scoring]` merged in as the base layer
- `featureOverrides` — runtime overrides, in-memory only; never saved to Sheets
- `players` — `{name, score, w, d, l, eliminated, paid, positionSum, gpScores?, eloStart?}`
- `eloDb` — `{colName: {nameLower: {elo, name, test}}}` persisted under `LS_ELO_DB`; auto-synced from Sheets on mount
- `globalSettings` — loaded from `GLOBAL_SETTINGS` global at mount; lowest-priority config layer
- `draftEnded` — hides Draft sub-tab after draft phase completes
- `testMode` / `experimental` / `advancedSetup` — booleans that unhide the Test, Spinner, and Advanced tabs
- State auto-backed-up to `localStorage` under `LS_BACKUP + "_" + tournamentId` during a tournament; restored on next load

**Feature config access pattern** (used everywhere components need feature flags — three layers, last wins):
```js
const cfg = { ...state.globalSettings, ...state.tournaments[state.tournamentId]?.features, ...state.featureOverrides };
```
Priority: `globalSettings` (lowest) → tournament `features` → `featureOverrides` (runtime, highest).

### Scoring modes (`src/logic.js`)

- `lifepoints` — players start with `startScore` lives; loss/draw costs lives; elimination at 0
- `swiss` — points accumulate (win/draw/loss points)
- `points` (Grand Prix) — `gpBestOf()` takes best N of last M results, drops worst K; ghost-padding penalises late joiners

BYE = free win in all modes: BYE player gets `w++` and score equivalent to winning (winPoints for swiss, pts1 for points; lifepoints winPoints=0 so only w++ applies). OMW tiebreaker skips BYE rounds entirely.

### Pairing modes

Mode is determined solely by `cfg.matchMax` (no separate flag):
- `matchMax = 2` — `genPairings()`: backtracking avoids rematches; falls back to allowing them if no clean solution; assigns BYE for odd player counts
- `matchMax > 2` — `genPairings()` + `splitGroups()`: splits active players into pods of up to `matchMax` size; `matchRound` controls rounding (BYE / up / down)

### Google Apps Script backend

`apps-script.js` is deployed separately to Google Apps Script (not bundled). `src/apps-script-embed.js` embeds its content as a string constant `APPS_SCRIPT` for display in the Advanced tab. `build.sh` auto-regenerates this embed on every build (requires Node). To regenerate manually:

```bash
node -e "
const c = require('fs').readFileSync('apps-script.js','utf8');
const e = JSON.stringify(c);
require('fs').writeFileSync('src/apps-script-embed.js','const APPS_SCRIPT = ' + e + ';\n');
"
```

The backend only handles ELO data, seeds, and rules. It no longer reads or writes tournament config or global settings — those are in `config/` files.

Active endpoints:
- `GET ?action=load&col=NAME` — load ELO entries for a column
- `GET ?action=elo_cols` — list available ELO columns
- `GET ?action=rules&tournament=NAME` — load rules rows
- `GET ?action=seed_load&id=ID` — load a seed
- `GET ?action=seed_list` — list seeds
- `GET ?action=debug_elo` — debug ELO sheet structure
- `POST action=save` — save ELO entries
- `POST action=seed_save` — save a seed
- `POST action=seed_delete` — delete a seed

On mount, `App.jsx` fetches `?action=elo_cols` then `?action=load&col=NAME` for each configured ELO column. ELO is auto-pushed to Sheets after each completed round (Shell.jsx) and can be manually pushed/pulled via SheetsSync.jsx.

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

**New feature flag** — Add key to `config/tournaments.json` for each tournament that needs it → consume in component: `if (cfg.myFlag) { … }` → optionally expose in `AdvancedTab.jsx` for runtime override via `SET_FEATURE` dispatch. If the flag belongs to a scoring mode, add it to `config/scoring.json` instead.

**New tournament** — Add entry to `config/tournaments.json`. Mandatory fields: `id`, `name`, `features.scoring`, `features.matchMax`. Rebuild. `validateConfig()` will catch missing required fields at load time.

**New tab** — Create `src/components/MyTab.jsx` (receives `{state, dispatch, config}`) → add to `build.sh` at correct dependency position → in `Shell.jsx` add to tabs array (gate with feature flag) and add render case.

**New scoring mode** — Add entry to `config/scoring.json` + add scoring function in `src/logic.js` + handle in `NEXT_ROUND` case in `reducer.js`.

**New pairing mode** — Add pairing function in `src/logic.js` + add branch in `makePairings()` in `storage.js`.

**New backend endpoint** — Add handler in `apps-script.js` + register in `doGet`/`doPost` → rebuild (embed auto-regenerates) → redeploy → call via `fetch(getSheetsUrl() + "?action=my_action")`.

**New persistent state field** — Add to `init` in `reducer.js` + handle in relevant actions + include in `buildSnap()` in `storage.js` if it should survive reload.
