# Tournament Manager

Single-page tournament manager built with React 18 + Babel Standalone (CDN), no bundler. All source files are concatenated by `build.sh` into one `<script type="text/babel">` block. No import/export — everything is a global. Tournament configuration lives in `config/` JSON files (bundled at build time). A Google Apps Script web app handles ELO ratings, seeds, and rules only.

**Live**: deployed automatically to GitHub Pages on every push to `main`.

---

## How It Works

### Setup (one-time)

1. Deploy `apps-script.js` to Google Apps Script (see [Backend setup](#backend-setup))
2. Paste the deployment URL into `DEFAULT_SHEETS_URL` in `src/config.js`
3. Rebuild and deploy

On load the app fetches ELO data from the Sheet. Tournament types and all feature flags come from `config/tournaments.json` — no Sheet changes needed for config.

### Running a tournament

1. **Landing screen** — pick a tournament type
2. **Players tab** — add players, then click Start
3. **Matches tab → Draft** (if draft enabled) — assign players to pods
4. **Matches tab → Pairings** — enter results round by round; click **Next round ↗** to advance
5. **Matches tab → Session** — **New session** resets the round counter (GP only); **End tournament** finalizes standings for all tournament types
6. **Standings tab** — live rankings throughout; final results after end
7. **Settings tab → Seeds** — save/load snapshots manually (auto-save also fires after every state change)

### Tabs overview

| Tab | Visibility | Purpose |
|---|---|---|
| Rules | `rules` feature flag | Tournament-specific rules pulled from Sheet |
| Players | always | Add players, start tournament, manage eliminations |
| Matches | after start | Pairings, draft groups, match log, session controls |
| Standings | after start | Live rankings, ELO changes, GP scores |
| Settings | always | Feature flags, test mode, advanced setup, seeds |
| ⚙ Advanced | opt-in | Per-session config overrides, prizes, Sheets sync |
| 🧪 Test | opt-in | Inject players, simulate rounds |
| 🎲 Spinner | opt-in (experimental) | Weighted random spinner |

### Matches sub-tabs

| Sub-tab | Description |
|---|---|
| Draft | Pod assignment grid (only when `draft` flag is on) |
| Pairings | Current round match cards + Next round button |
| Log | Full timeline of rounds and events |
| Session | New session (GP) and End tournament controls |

---

## Adding Tournament Types

Edit `config/tournaments.json` and rebuild. Each entry requires `id`, `name`, and `features.scoring` + `features.matchMax` at minimum. `validateConfig()` runs on mount and shows an error screen for missing/invalid fields.

Scoring-mode defaults go in `config/scoring.json` (merged as base layer). Global ELO and prize defaults go in `config/global-settings.json` (lowest priority).

### Feature flags

| Key | Type | Description |
|---|---|---|
| `scoring` | `lifepoints` \| `swiss` \| `points` | Scoring mode |
| `matchMax` | number | Max players per match (2 = 1v1, 3+ = multi-player) |
| `matchRound` | `BYE` \| `up` \| `down` | How to handle odd player count |
| `rrRounds` | number | Round-robin rounds before Swiss (0 = Swiss only) |
| `timerMinutes` | number | Round timer in minutes |
| `draft` | bool | Enable draft sub-tab |
| `draftTableSize` | number | Players per draft pod (required when `draft: true`) |
| `elo` | bool | Enable ELO tracking |
| `eloDB` | string | Column name in the ELO Sheet tab |
| `grandPrix` | bool | GP sliding-window scoring |
| `gpBestOfLast` | number | GP window size (default 4) |
| `gpDropWorst` | number | Worst scores dropped within window (default 1) |
| `gpGhostPoints` | bool | Pad missing rounds with worst score |
| `prizes` | bool | Enable prize pool |
| `timeout` | bool | Enable hard timeout warning |
| `timeoutTime` | `HH:MM` | Wall-clock time at which timeout fires |
| `rules` | bool | Enable rules tab (fetched from Sheet) |
| `playerOrder` | bool | Track and rotate seating order |
| `extraPoints` | bool | Per-match bonus point button |
| `extraPointsValue` | number | Points per bonus click (default 1) |

### Scoring modes

**`lifepoints`** — players start at `startScore` and lose points on loss or draw. Reaching 0 eliminates the player.

**`swiss`** — players accumulate `winPoints`/`drawPoints`/`lossPoints` per round. Pairings avoid rematches.

**`points`** — players score `pts1`/`pts2`/`pts3`/`ptsLast` per finish position within each match. With `grandPrix: true`, applies the GP sliding window.

BYE = free win in all modes: BYE player gets `w++` and score equivalent to winning that match.

### Multiple ELO leaderboards

Each tournament points at a different column in the ELO sheet via `eloDB`. Drunken Draft and Risk GP can have independent ELO tracks in the same Sheet.

---

## Visual Overview

### Full-stack data flow

```
╔══════════════════════════════════════════════════════════════════╗
║                     CONFIG FILES (build time)                    ║
║  tournaments.json   scoring.json   global-settings.json          ║
║  (tournament types) (mode presets) (ELO/prize defaults)          ║
╚════════════╤═════════════════════════════════════════════════════╝
             │ bundled into index.html at build time
             ▼
╔══════════════════════════════════════════════════════════════════╗
║                        GOOGLE SHEETS (runtime)                   ║
║  ELO tab              Seeds tab             Rules tab            ║
║  (player ratings)     (snapshots)           (rules text)         ║
╚════════════╤══════════════╤════════════════════╤════════════════╝
             │ on load      │ manual             │ on load
             ▼              ▼                    ▼
╔══════════════════════════════════════════════════════════════════╗
║                      LANDING SCREEN                              ║
║              Pick a tournament type                              ║
╚══════════════════════════╤═══════════════════════════════════════╝
                           │
                           ▼
╔══════════════════════════════════════════════════════════════════╗
║                    TOURNAMENT SCREEN                             ║
║                                                                  ║
║  ┌─────────┐  ┌─────────┐  ┌──────────────────┐  ┌──────────┐   ║
║  │  RULES  │  │ PLAYERS │  │     MATCHES      │  │STANDINGS │   ║
║  └────┬────┘  └────┬────┘  └────────┬─────────┘  └────┬─────┘   ║
║       │            │                │                 │         ║
║  Read-only    Add players      ┌────┴─────┐       Live rankings ║
║  from Sheet   ──────────────►  │  Draft   │       ELO deltas    ║
║               Start button     │ (groups) │       GP scores     ║
║                                ├──────────┤                     ║
║                                │Pairings  │                     ║
║                                │ → enter  │                     ║
║                                │  results │                     ║
║                                │ → Next   │◄──── repeats ────┐  ║
║                                │  round ↗ │                  │  ║
║                                ├──────────┤                  │  ║
║                                │   Log    │                  │  ║
║                                │(history) │                  │  ║
║                                ├──────────┤                  │  ║
║                                │ Session  │                  │  ║
║                                │New sess  ├──── GP only ─────┘  ║
║                                │End tourn ├──── finalizes        ║
║                                └──────────┘     standings       ║
╚══════════════════════════════════════════════════════════════════╝
```

### Configuration layers (lowest → highest priority)

```
global-settings.json  →  tournaments.json  →  featureOverrides (runtime, lost on reload)
(ELO/prize defaults)     (per-tournament)     (Advanced tab, in-memory only)
```

### Tab reference

| Tab | What the user does |
|---|---|
| Rules | Read tournament rules (fetched from Sheet, read-only) |
| Players | Add names, start the tournament |
| Matches → Draft | Assign players to draft pods (if draft is on) |
| Matches → Pairings | Enter round results, advance rounds |
| Matches → Log | Review the full history |
| Matches → Session | Start a new GP session or end the tournament |
| Standings | Watch live rankings during play |
| Settings | Toggle test/experimental/advanced modes, manage seeds |
| Advanced | Override feature flags for this session, configure prizes |

---

## Build

```bash
bash build.sh
```

Concatenates `src/` files in fixed order into `index.html`. Edit source files, then rebuild. CI runs `build.sh` on push to `main` and deploys to GitHub Pages.

### Source load order

| # | File / source | Globals |
|---|---|---|
| 1 | `config/prizes.json` | `PRIZES` |
| 2 | `config/spinner.json` | `SPINNER_OPTIONS` |
| 3 | `config/tournaments.json` | `TOURNAMENTS` |
| 4 | `config/scoring.json` | `SCORING_PRESETS` |
| 5 | `config/global-settings.json` | `GLOBAL_SETTINGS` |
| 6 | `src/config.js` | `LS_ELO_DB`, `LS_BACKUP`, `LS_BACKUP_LAST`, `DEFAULT_SHEETS_URL` |
| 7 | `src/logic.js` | `gpBestOf`, `eCalc`, `genPairings`, `calcAlloc`, … |
| 8 | `src/storage.js` | `now`, `makeId`, `loadLS`, `saveLS`, `getSheetsUrl`, `buildSnap`, `autoSeedSave`, `makePairings` |
| 9 | `src/reducer.js` | `init`, `reducer` |
| 10 | `src/ui.js` | `C`, `S`, `Card`, `Btn`, `Tag`, `TabBar`, `Hearts` |
| 11 | `src/components/` | feature components (dependency order — see `build.sh`) |
| 12 | `src/App.jsx` | `App` (root) |

---

## Architecture

### State (`src/reducer.js`)

Single `useReducer(reducer, init)` in `App.jsx`. All state transitions go through `reducer.js`.

| Key | Type | Description |
|---|---|---|
| `screen` | string | `"landing"` \| `"tournament"` |
| `tournamentId` | string | Key into `state.tournaments` |
| `tournaments` | object | `{id: {id, name, icon, desc, features{}}}` — loaded from `TOURNAMENTS` global at mount, with `SCORING_PRESETS[scoring]` merged as base layer |
| `globalSettings` | object | Loaded from `GLOBAL_SETTINGS` global; lowest-priority config layer |
| `featureOverrides` | object | Runtime overrides (in-memory only, lost on reload) |
| `players` | array | `{name, score, w, d, l, eliminated, paid, positionSum, gpScores?, eloStart?}` |
| `pairings` | array | Current round matches |
| `history` | array | Past rounds (array of pairing arrays) |
| `matchLog` | array | `{type, label, ts}` timeline entries |
| `eloDb` | object | `{colName: {nameLower: {elo, name, test}}}` persisted under `LS_ELO_DB` |
| `currentRound` | number | 1-indexed, 0 before start |
| `phase` | string | `"roundrobin"` \| `"swiss"` |
| `tournamentStarted` | bool | Controls tab visibility and auto-backup |
| `draftEnded` | bool | Draft phase complete; hides Draft subtab |
| `prizes` | array | Prize pool entries |
| `ranks` | array | Payout percentage per rank |
| `testMode` / `experimental` / `advancedSetup` | bool | Unlock extra tabs |

**Feature config access pattern** (used everywhere):
```js
const cfg = { ...state.globalSettings, ...state.tournaments[state.tournamentId]?.features, ...state.featureOverrides };
```

### localStorage keys

| Constant | Key | Content |
|---|---|---|
| `LS_ELO_DB` | `tournament_elo_db_v2` | ELO database object |
| `LS_BACKUP` | `tournament_local_backup` | Prefix; suffixed `_<tournamentId>` |
| `LS_BACKUP_LAST` | `tournament_local_backup_last` | Most recently active tournament id |

### Auto-save

`autoSeedSave(state)` fires automatically 2 seconds after any change to pairings, history, players, round, or phase — and immediately (before dispatch) on **New session** and **End tournament**. Saves are fire-and-forget (`mode: "no-cors"`); failures are silent. Seeds are labelled `[auto]`.

---

## Backend Setup

Source: `apps-script.js`. Deploy separately to Google Apps Script (not bundled into `index.html`). The embed at `src/apps-script-embed.js` is a string constant used to display the script in the Advanced tab — regenerate it after editing:

```bash
node -e "
const c = require('fs').readFileSync('apps-script.js','utf8');
const e = JSON.stringify(c);
require('fs').writeFileSync('src/apps-script-embed.js','const APPS_SCRIPT = ' + e + ';\n');
"
```

`build.sh` runs this automatically on every build (requires Node).

### Required Sheet tabs

| Tab | Headers |
|---|---|
| `ELO` | `Test \| Name \| <elo-col-name> \| …` |
| `Seeds` | `ID \| Label \| Timestamp \| Data` |
| `Rules` | `Tournament \| Category \| Rule \| Description \| Update` |

### API endpoints

| Action | Method | Description |
|---|---|---|
| `?action=load&col=X` | GET | Returns `{entries:[{name,elo,test}]}` for ELO column X |
| `?action=elo_cols` | GET | Returns all ELO column names |
| `?action=seed_list` | GET | Returns `{seeds:[{id,label,timestamp}]}` |
| `?action=seed_load&id=X` | GET | Returns snapshot JSON for seed ID X |
| `?action=rules&tournament=X` | GET | Returns rules rows for a tournament name |
| `?action=debug_elo` | GET | Returns raw ELO sheet structure for debugging |
| POST `{action:"save"}` | POST | Upserts ELO entries by name |
| POST `{action:"seed_save"}` | POST | Appends seed row |
| POST `{action:"seed_delete"}` | POST | Deletes all rows with matching ID |

---

## Expanding

### New tournament type
Add entry to `config/tournaments.json`. Required: `id`, `name`, `features.scoring`, `features.matchMax`. Rebuild. `validateConfig()` catches missing fields at load time.

### New feature flag
Add key to `config/tournaments.json` for each tournament that needs it. Consume in a component: `if (cfg.myFlag) { … }`. Optionally expose in `AdvancedTab.jsx` for runtime override via `SET_FEATURE` dispatch. If the flag belongs to a scoring mode, add it to `config/scoring.json` instead.

### New tab
1. Create `src/components/MyTab.jsx` (receives `{state, dispatch, config}`)
2. Add to `build.sh` at the correct dependency position
3. In `Shell.jsx`: add to tabs array (gate with feature flag) + add render case

### New scoring mode
Add entry to `config/scoring.json` + scoring function in `src/logic.js` + handle in `NEXT_ROUND` case in `reducer.js`.

### New pairing mode
Add pairing function in `src/logic.js` + branch in `makePairings()` in `storage.js`.

### New backend endpoint
Add handler in `apps-script.js` + register in `doGet`/`doPost` → rebuild (embed auto-regenerates) → redeploy → call via `fetch(getSheetsUrl() + "?action=my_action")`.

### New persistent state field
Add to `init` in `reducer.js` + handle in relevant actions + include in `buildSnap()` in `storage.js` if it should survive reload.
