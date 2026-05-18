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

1. `src/config.js` — Tournament definitions (`T` object), localStorage key constants (`EK`, `SK`, `BK`), default Apps Script URL (`DU`)
2. `src/logic.js` — Pure functions: ELO math, pairing algorithms, prize allocation
3. `src/storage.js` — localStorage helpers (`lLS`, `sLS`), `mkP()` pairing dispatcher, `now()`
4. `src/reducer.js` — Initial state (`init`) + all state transitions (`reducer`)
5. `src/ui.js` — Color palette (`C`), style objects (`S`), shared primitives (`Card`, `Btn`, `Tag`, `TabBar`, `Hearts`)
6. `src/components/` — Feature components in dependency order (see `build.sh`)
7. `src/App.jsx` — Root component

### State model

Single `useReducer(reducer, init)` in `App.jsx`. All state transitions go through `reducer.js`. Key state:

- `screen` — `"landing"` | `"tournament"`
- `tournamentId` — key into `T` object
- `featureOverrides` — runtime overrides on top of `T[id].features`; merged at action time via `{ ...T[id].features, ...featureOverrides }`
- `eloDb` — persisted to `localStorage` under `EK`; auto-synced from Google Sheets on mount
- State auto-backed-up to `localStorage` under `BK` during a tournament; restored on next load

### Tournament types (`src/config.js`)

Three hardcoded tournaments in `T`:
- `drunken-draft` — lifepoints elimination, 1v1
- `vintage-draft` — Swiss scoring, 1v1
- `risk-grand-prix` — multi-player points with Grand Prix cumulative scoring

Each has a `features` object controlling scoring mode, pairing mode, ELO, timers, draft phase, prizes, etc.

### Scoring modes (`src/logic.js`)

- `lifepoints` — players start with `startScore` lives; loss/draw costs lives; elimination at 0
- `swiss` — points accumulate (win/draw/loss points)
- `points` (Grand Prix) — `gpScore()` takes best N of last M results, drops worst K

### Pairing modes

- `1v1` — `gen1v1()`: backtracking algorithm avoiding rematches; falls back to allowing rematches if no clean pairing exists; handles BYEs for odd player counts
- `multi` — `genMulti()`: splits active players into groups of `[matchMin, matchMax]` size

### Google Apps Script backend

`apps-script.js` is the source deployed separately to Google Apps Script (not part of the JS bundle). `src/apps-script-embed.js` embeds its content as a string constant `APPS_SCRIPT` so the UI can display it.

The backend handles: ELO load/save, seed save/load/delete/list, rules load. All via GET/POST to the deployed web app URL stored in `localStorage` under `SK`.

### Adding a new tournament type

Add an entry to `T` in `src/config.js` with a `features` object. All feature flags are consumed by `reducer.js` and components via `{ ...T[id].features, ...state.featureOverrides }`.
