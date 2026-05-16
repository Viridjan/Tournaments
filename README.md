# Tournament Manager

Single-page tournament manager. React 18 + Babel Standalone via CDN, no bundler. All source files concatenated by `build.sh` into one `<script type="text/babel">` block. No import/export — everything is a global. Google Apps Script web app serves as backend (read/write to Google Sheet). Sheet is sole source of truth for ELO players and tournament configs.

**Live cycle**: Load → fetch ELO + tournaments from Sheet → landing screen → pick tournament → run rounds (pairing → results → ELO → next round) → standings. State backed up to localStorage each change.

---

## Build

```bash
bash build.sh
```

Concatenates `src/` files in fixed order into `index.html`. Edit source files, then rebuild. CI runs `build.sh` on push to `main` and deploys to GitHub Pages.

### Load order (matters — globals must exist before use)

1. `src/config.js` — constants, localStorage keys, default Apps Script URL (`DU`)
2. `src/logic.js` — pure functions: ELO, pairing, prize calc, GP scoring
3. `src/storage.js` — localStorage helpers, `gSU()`, `mkP()` pairing dispatcher
4. `src/reducer.js` — initial state + all reducer cases
5. `src/ui.js` — `C` (colors), `S` (styles), `Card`/`Btn`/`Tag`/`TabBar`/`Hearts`
6. `src/components/` — feature components in dependency order (see `build.sh`)
7. `src/App.jsx` — root component

---

## Architecture

### State (`src/reducer.js`)

Single `useReducer(reducer, init)` in `App.jsx`. All state transitions go through `reducer.js`.

| Key | Type | Description |
|---|---|---|
| `screen` | string | `"landing"` \| `"tournament"` |
| `tournamentId` | string\|null | Key into `state.tournaments` |
| `tournaments` | object | `{id: {id, name, icon, desc, features{}}}` — loaded from Sheets Settings tab |
| `featureOverrides` | object | Runtime overrides merged over tournament features at dispatch time |
| `players` | array | `{name, score, w, d, l, eliminated, paid, firstCount, eloStart?}` |
| `pairings` | array | Current round matches (1v1 or multi) |
| `history` | array | Past rounds (array of pairing arrays) |
| `matchLog` | array | `{type, label, ts}` timeline |
| `eloDb` | object | `{nameLower: {elo, name, test}}` — replaced from Sheet on load |
| `currentRound` | number | 1-indexed, 0 before start |
| `phase` | string | `"roundrobin"` \| `"swiss"` |
| `tournamentStarted` | bool | Controls tab visibility + auto-backup |
| `prizes` | array | Prize pool definitions |
| `ranks` | array | Payout % per rank |
| `spinnerOptions` | array | Weighted random spinner entries |
| `testMode`, `experimental`, `advancedSetup` | bool | Unlock extra tabs |
| `sheetsUrl` | string | Apps Script deployment URL |

**Feature config access pattern** (used everywhere):
```js
const c = { ...state.tournaments[state.tournamentId]?.features, ...state.featureOverrides };
```

### Feature Flags (live in Sheets Settings tab)

| Flag | Type | Effect |
|---|---|---|
| `scoring` | string | `"lifepoints"` \| `"swiss"` \| `"points"` |
| `pairing` | string | `"1v1"` \| `"multi"` |
| `startScore` | number | Initial score per player |
| `winPoints` / `drawPoints` / `lossPoints` | number | Score deltas |
| `cumulativeDrawPenalty` | bool | Extra loss on repeated draws |
| `rrRounds` | number | Round-robin rounds before Swiss |
| `timerMinutes` | number | Match timer duration |
| `draft` | bool | Show Draft sub-tab |
| `elo` | bool | ELO tracking active |
| `eloKMax` | number | Max ELO K-factor |
| `firstPlayer` | bool | Track who goes first |
| `grandPrix` | bool | GP cumulative scoring mode |
| `gpBestOfLast` / `gpDropWorst` | number | GP score window |
| `prizes` | bool | Show prize allocation |
| `timeout` | bool | Hard cutoff at `timeoutTime` |
| `timeoutTime` | string | `"HH:MM"` cutoff |
| `spinner` | bool | Show spinner tab |
| `rules` | bool | Show rules tab |
| `matchMin` / `matchMax` | number | Multi-match group size |

### localStorage Keys

| Constant | Key string | Content |
|---|---|---|
| `EK` | `tournament_elo_db_v2` | ELO database object |
| `SK` | `tournament_sheets_url_v1` | Apps Script URL |
| `BK` | `tournament_local_backup` | Full tournament snapshot (auto-restored on next open) |

---

## Google Apps Script Backend

Source: `apps-script.js` (deploy separately). Embed: `src/apps-script-embed.js` (regenerate after edits).

**Required Sheet tabs**: `ELO` | `Seeds` | `Rules` | `Settings`

| Action | Method | Sheet | Description |
|---|---|---|---|
| `load` | GET | ELO | Returns `{entries:[{name,elo,test}]}` |
| `save` | POST | ELO | Upserts by name, deduplicates |
| `seed_list` | GET | Seeds | Returns `{seeds:[{id,label,timestamp}]}` |
| `seed_load&id=X` | GET | Seeds | Returns snapshot JSON |
| `seed_save` | POST | Seeds | Appends row |
| `seed_delete` | POST | Seeds | Deletes matching rows |
| `rules&tournament=X` | GET | Rules | Filters by tournament name |
| `tournament_list` | GET | Settings | Returns all tournament configs |
| `tournament_save` | POST | Settings | Upserts tournament config by id |

After editing `apps-script.js`, regenerate the embed then redeploy as a new Apps Script version and update `DU` in `src/config.js`:

```bash
python3 -c "
content = open('apps-script.js').read()
escaped = content.replace('\\\\', '\\\\\\\\').replace(\"'\", \"\\\\'\"  ).replace('\n', '\\\\n')
open('src/apps-script-embed.js', 'w').write(\"const APPS_SCRIPT =\\n  '\" + escaped + \"';\\n\")
"
```

---

## Expanding the App

### New tournament type
Add a row to the Sheets Settings tab. No code change needed — appears on landing screen automatically.

### New feature flag
1. Add column to Sheets Settings tab
2. Add key to `TOURNAMENT_FEATURE_KEYS` in `apps-script.js` → redeploy
3. Consume in component: `if (c.myNewFlag) { ... }`
4. Optionally expose in `AdvancedTab` for runtime override

### New tab
1. Create `src/components/MyTab.jsx` — function component receiving `{state, dispatch, config}`
2. Add to `build.sh` at correct dependency position
3. In `Shell.jsx`: add to tabs array (gate with `c.myFeature && {id, label}`) + add render case

### New scoring mode
Add scoring function in `src/logic.js` + handle in `reducer.js` `NEXT_ROUND` case.

### New pairing mode
Add pairing function in `src/logic.js` + add branch in `storage.js` `mkP()`.

### New backend endpoint
Add handler + doGet/doPost branch in `apps-script.js` → regenerate embed → redeploy → call via `fetch(gSU() + "?action=my_action")`.

### New persistent state field
Add to `reducer.js` `init` + relevant actions + `RESTORE_SNAPSHOT` (if it should survive reload).
