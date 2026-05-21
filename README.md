# Tournament Manager

Single-page tournament manager built with React 18 + Babel Standalone (CDN), no bundler. All source files are concatenated by `build.sh` into one `<script type="text/babel">` block. No import/export — everything is a global. A Google Apps Script web app acts as the backend, reading and writing to a Google Sheet that is the sole source of truth for ELO ratings and tournament configurations.

**Live**: deployed automatically to GitHub Pages on every push to `main`.

---

## How It Works

### Setup (one-time)

1. Deploy `apps-script.js` to Google Apps Script (see [Backend setup](#backend-setup))
2. Copy the deployment URL
3. Open the app → paste the URL into the **Database URL** field in Settings → save

On load the app fetches ELO data and all tournament configurations from the Sheet. If no URL is configured it still runs with a hardcoded default URL (`DU` in `src/config.js`).

### Running a tournament

1. **Landing screen** — pick a tournament type (pulled from the Sheet's Settings tab)
2. **Players tab** — add players, then click Start
3. **Matches tab → Draft** (if draft enabled) — assign players to pods
4. **Matches tab → Pairings** — enter results round by round; click **Next round ↗** to advance
5. **Matches tab → Session** — **New session** resets the round counter (GP only); **End tournament** finalizes standings for all tournament types
6. **Standings tab** — live rankings throughout; final results after end
7. **Settings tab → Seeds** — save/load snapshots manually (auto-save also fires after every state change when a Sheets URL is configured)

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

## Adding Tournament Types via Spreadsheet

No code changes needed. Add a row to the **Settings** tab of the Sheet and redeploy isn't required — the app reads it on next load.

### Settings tab columns

| Column | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (used as key, no spaces) |
| `name` | string | Display name |
| `icon` | string | Emoji shown on the landing card |
| `desc` | string | Short description shown on the landing card |
| `scoring` | `lifepoints` \| `swiss` \| `points` | Scoring mode (see below) |
| `startScore` | number | Starting score per player (lifepoints only) |
| `pts1` | number | Points for 1st place (points mode) |
| `pts2` | number | Points for 2nd place |
| `pts3` | number | Points for 3rd place |
| `ptsLast` | number | Points for last place |
| `winPoints` | number | Points awarded for a win (swiss mode) |
| `drawPoints` | number | Points for a draw |
| `lossPoints` | number | Points for a loss |
| `cumulativeDrawPenalty` | TRUE/FALSE | Penalise repeated draws |
| `rrRounds` | number | Number of round-robin rounds before Swiss begins (0 = Swiss only) |
| `timerMinutes` | number | Round timer in minutes (0 = no timer) |
| `draft` | TRUE/FALSE | Enable draft sub-tab |
| `elo` | TRUE/FALSE | Enable ELO tracking |
| `eloKMax` | number | Maximum ELO K-factor (default 50) |
| `eloScale` | number | ELO scale factor (default 500) |
| `eloDB` | string | Column name in the ELO sheet to read/write |
| `playerOrder` | TRUE/FALSE | Track and rotate player seating order each round |
| `tiebreaker1` | `elo` \| `elo_rev` \| `omw` \| `gwr` \| `none` | Primary tiebreaker for standings |
| `tiebreaker2` | same as above | Secondary tiebreaker |
| `tiebreaker3` | same as above | Tertiary tiebreaker |
| `grandPrix` | TRUE/FALSE | Enable GP cumulative scoring (best 3 of last 4 rounds) |
| `prizes` | TRUE/FALSE | Enable prize pool allocation |
| `timeout` | TRUE/FALSE | Enable hard timeout warning |
| `timeoutTime` | `HH:MM` | Time of day at which the timeout fires |
| `spinner` | TRUE/FALSE | Enable the spinner tab |
| `rules` | TRUE/FALSE | Enable the rules tab |
| `matchRound` | `none` \| `up` \| `down` | What to do with leftover players: bye, round up to bigger groups, or round down |
| `matchMax` | number | Max players per match (2 = 1v1, 3+ = multi-player) |
| `gpBestOfLast` | number | GP window size — how many recent rounds count toward score (default 4) |
| `gpDropWorst` | number | GP worst-score drops within the window (default 1) |
| `gpGhostPoints` | TRUE/FALSE | Pad missing rounds with the player's worst score (penalises late joiners) |
| `extraPoints` | TRUE/FALSE | Enable per-match bonus point button |
| `extraPointsValue` | number | Points awarded per bonus point click (default 1) |

### Scoring modes

**`lifepoints`** — players start at `startScore` and lose points on loss or draw. Reaching 0 eliminates the player. Suitable for games with a life-total mechanic.

**`swiss`** — players accumulate `winPoints`/`drawPoints`/`lossPoints` per round. Pairings are sorted by win rate then score, avoiding rematches. Standard Swiss tournament format.

**`points`** — players score `pts1`/`pts2`/`pts3`/`ptsLast` per finish position within each match. With `grandPrix: TRUE`, applies the GP sliding window: scores from all rounds are kept but only the best 3 of the last 4 count toward standings.

### Multiple ELO leaderboards

Each tournament can point at a different column in the ELO sheet via `eloDB`. This lets you run a "Drunken Draft" ELO and a "Risk GP" ELO independently in the same Sheet.

---

## Visual Overview

### Full-stack data flow

```
╔══════════════════════════════════════════════════════════════════╗
║                        GOOGLE SHEETS                             ║
║  Settings tab         ELO tab           Seeds tab   Rules tab    ║
║  (tournament types)   (player ratings)  (snapshots) (rules)      ║
╚════════════╤══════════════╤════════════════╤════════════╤════════╝
             │ on load      │ on load        │ manual     │ on load
             ▼              ▼                ▼            ▼
╔══════════════════════════════════════════════════════════════════╗
║                      LANDING SCREEN                              ║
║              Pick a tournament type                              ║
╚══════════════════════════╤═══════════════════════════════════════╝
                           │
                           ▼
╔══════════════════════════════════════════════════════════════════╗
║                    TOURNAMENT SCREEN                             ║
║                                                                  ║
║  ┌─────────┐  ┌─────────┐  ┌──────────────────┐  ┌──────────┐    ║
║  │  RULES  │  │ PLAYERS │  │     MATCHES      │  │STANDINGS │    ║
║  └────┬────┘  └────┬────┘  └────────┬─────────┘  └────┬─────┘    ║
║       │            │                │                 │          ║
║  Read-only    Add players      ┌────┴─────┐       Live rankings  ║
║  from Sheet   ──────────────►  │  Draft   │       ELO deltas     ║
║               Start button     │ (groups) │       GP scores      ║
║                                ├──────────┤                      ║
║                                │Pairings  │                      ║
║                                │ → enter  │                      ║
║                                │  results │                      ║
║                                │ → Next   │◄──── repeats ────┐   ║
║                                │  round ↗ │                  │   ║
║                                ├──────────┤                  │   ║
║                                │   Log    │                  │   ║
║                                │(history) │                  │   ║
║                                ├──────────┤                  │   ║
║                                │ Session  │                  │   ║
║                                │New sess  ├──── GP only ─────┘   ║
║                                │End tourn ├──── finalizes        ║
║                                └──────────┘     standings        ║
╚══════════════════════════════════════════════════════════════════╝
```

### Configuration layers

```
╔══════════════════════════════════════════════════════════════════╗
║              SETTINGS & ADVANCED — how they modify               ║
╚══════════════════════════════════════════════════════════════════╝

  GOOGLE SHEETS                     SESSION ONLY
  (permanent,                       (lost on reload,
   affects all users)               per-device)
        │                                 │
        ▼                                 ▼
  ┌───────────────────┐        ┌───────────────────────┐
  │   Settings tab    │        │    Advanced tab       │
  │   in the Sheet    │        │    (in the app)       │
  │                   │        │                       │
  │ Add/edit rows to  │        │ Override any feature  │
  │ create tournament │        │ flag for this session │
  │ types with flags: │        │ only — overrides are  │
  │                   │        │ marked "mod"          │
  │ • scoring mode    │        │                       │
  │ • timer           │        │ • change scoring mode │
  │ • ELO on/off      │        │ • adjust timer        │
  │ • draft phase     │        │ • toggle ELO          │
  │ • match size      │        │ • prizes setup        │
  │ • GP mode         │        │ • Sheets URL / sync   │
  │ • prizes          │        └───────────────────────┘
  │ • rules tab       │
  │ • timeout         │
  └───────────────────┘
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

```
bash build.sh
```

Concatenates `src/` files in fixed order into `index.html`. Edit source files, then rebuild. CI runs `build.sh` on push to `main` and deploys to GitHub Pages.

### Source load order

| # | File | Exports (globals) |
|---|---|---|
| 1 | `src/config.js` | `ED`, `EM`, `ES`, `EK`, `SK`, `BK`, `DU` |
| 2 | `src/logic.js` | `gpBestOf`, `eCalc`, `genPairings`, `calcAlloc`, … |
| 3 | `src/storage.js` | `now`, `mkId`, `lLS`, `sLS`, `gSU`, `buildSnap`, `autoSeedSave`, `makePairings` |
| 4 | `src/reducer.js` | `init`, `reducer` |
| 5 | `src/ui.js` | `C`, `S`, `Card`, `Btn`, `Tag`, `TabBar`, `Hearts` |
| 6 | `src/components/` | feature components (dependency order — see `build.sh`) |
| 7 | `src/App.jsx` | `App` (root) |

---

## Architecture

### State (`src/reducer.js`)

Single `useReducer(reducer, init)` in `App.jsx`. All state transitions go through `reducer.js`.

| Key | Type | Description |
|---|---|---|
| `screen` | string | `"landing"` \| `"tournament"` |
| `tournamentId` | string | Key into `state.tournaments` |
| `tournaments` | object | `{id: {id, name, icon, desc, features{}}}` — loaded from Sheets |
| `featureOverrides` | object | Runtime overrides merged over tournament features |
| `players` | array | `{name, score, w, d, l, eliminated, paid, positionSum, gpScores?, eloStart?}` |
| `pairings` | array | Current round matches |
| `history` | array | Past rounds (array of pairing arrays) |
| `matchLog` | array | `{type, label, ts}` timeline entries |
| `eloDb` | object | `{colName: {nameLower: {elo, name, test}}}` |
| `currentRound` | number | 1-indexed, 0 before start |
| `phase` | string | `"roundrobin"` \| `"swiss"` |
| `tournamentStarted` | bool | Controls tab visibility and auto-backup |
| `draftEnded` | bool | Draft phase complete; hides Draft subtab for the rest of the session |
| `prizes` | array | Prize pool entries |
| `ranks` | array | Payout percentage per rank |
| `sheetsUrl` | string | Apps Script deployment URL |
| `testMode` / `experimental` / `advancedSetup` | bool | Unlock extra tabs |

**Feature config access pattern** (used everywhere):
```js
const c = { ...state.tournaments[state.tournamentId]?.features, ...state.featureOverrides };
```

### localStorage keys

| Constant | Key | Content |
|---|---|---|
| `EK` | `tournament_elo_db_v2` | ELO database object |
| `SK` | `tournament_sheets_url_v1` | Apps Script URL |
| `BK` | `tournament_local_backup` | Full in-progress snapshot (auto-restored on next open) |

### Auto-save

`autoSeedSave(state)` fires automatically 2 seconds after any change to pairings, history, players, round, or phase — and immediately (before dispatch) on **New session** and **End tournament**. Saves are fire-and-forget (`mode: "no-cors"`); failures are silent. Seeds are labelled `[auto]` to distinguish from manual saves.

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

### Required Sheet tabs

| Tab | Headers |
|---|---|
| `ELO` | `Test \| <elo-col-name> \| … \| Name` |
| `Seeds` | `ID \| Label \| Timestamp \| Data` |
| `Rules` | `Tournament \| Category \| Rule \| Description \| Update` |
| `Settings` | `id \| name \| icon \| desc \| <feature columns…>` |

### API endpoints

| Action | Method | Description |
|---|---|---|
| `?action=load&col=X` | GET | Returns `{entries:[{name,elo,test}]}` for ELO column X |
| `?action=elo_cols` | GET | Returns all ELO column names |
| `?action=seed_list` | GET | Returns `{seeds:[{id,label,timestamp}]}` |
| `?action=seed_load&id=X` | GET | Returns snapshot JSON for seed ID X |
| `?action=tournament_list` | GET | Returns all tournament configs from Settings tab |
| POST `{action:"save"}` | POST | Upserts ELO entries by name |
| POST `{action:"seed_save"}` | POST | Appends seed row |
| POST `{action:"seed_delete"}` | POST | Deletes all rows with matching ID |
| POST `{action:"tournament_save"}` | POST | Upserts tournament row by id |

---

## Expanding in Code

### New tournament type (no code)
Add a row to the Sheet's Settings tab. Appears on the landing screen automatically on next load.

### New feature flag
1. Add column to the Sheet's Settings tab
2. Add key to `TOURNAMENT_FEATURE_KEYS` in `apps-script.js` → redeploy
3. Consume in a component: `if (c.myNewFlag) { … }`
4. Optionally expose in `AdvancedTab.jsx` for runtime override

### New tab
1. Create `src/components/MyTab.jsx` — function receiving `{state, dispatch, config}`
2. Add to `build.sh` at the correct dependency position
3. In `Shell.jsx`: add to tabs array (gate with a feature flag if needed) + add render case

### New scoring mode
Add scoring function in `src/logic.js` + handle in the `NEXT_ROUND` case in `reducer.js`.

### New pairing mode
Add pairing function in `src/logic.js` + add a branch in `makePairings()` in `storage.js`.

### New backend endpoint
Add handler in `apps-script.js` + register in `doGet`/`doPost` → regenerate embed → redeploy → call via `fetch(gSU() + "?action=my_action")`.

### New persistent state field
Add to `init` in `reducer.js` + handle in relevant actions + include in `buildSnap()` in `storage.js` if it should survive reload.
