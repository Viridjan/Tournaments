# Context

The spreadsheet Settings tab and the app's Advanced tab are out of sync. Some feature keys exist in the sheet but can't be edited from the app, and one key (`eloScale`) was added to the app but not to the Apps Script. Goal: full bidirectional parity.

---

# Gaps Found

## In sheet (`TOURNAMENT_FEATURE_KEYS`) but missing from Advanced tab UI

| Key | Type | Currently | Fix |
|-----|------|-----------|-----|
| `pairing` | select | Read-only in SettingsTab | Add SelF("1v1" \| "multi") in Rounds & Matches section |
| `rules` | bool | Consumed in Shell.jsx (shows Rules tab), not editable | Add BoolF in Features section |
| `spinner` | bool | Behind experimental flag, not in AdvancedTab | Add BoolF in Features section |

## In app but missing from sheet (`TOURNAMENT_FEATURE_KEYS`)

| Key | Where added | Fix |
|-----|-------------|-----|
| `eloScale` | AdvancedTab + reducer + logic | Add to `TOURNAMENT_FEATURE_KEYS` in `apps-script.js` → regenerate embed → user redeploys |

---

# Implementation

## 1. `src/components/AdvancedTab.jsx`

- **Rounds & Matches section** — add after `matchMin/matchMax` row:
  ```
  <SelF label="Pairing mode" k="pairing" options={["1v1", "multi"]} />
  ```

- **Features section** — add after existing BoolF rows:
  ```
  <BoolF label="Rules tab" k="rules" />
  <BoolF label="Spinner" k="spinner" />
  ```

## 2. `apps-script.js`

Add `"eloScale"` to `TOURNAMENT_FEATURE_KEYS` array (after `"eloKMax"`):
```js
var TOURNAMENT_FEATURE_KEYS = [
  "scoring", "startScore", "winPoints", "drawPoints", "lossPoints",
  "cumulativeDrawPenalty", "pairing", "rrRounds", "timerMinutes", "draft", "elo", "eloKMax",
  "eloScale", "eloCol", "firstPlayer", ...
];
```

## 3. `src/apps-script-embed.js`

Regenerate from updated `apps-script.js` (python3 one-liner already used in session).

## 4. Rebuild + commit + push

`bash build.sh` → git commit → git push

---

# Files to modify

- `src/components/AdvancedTab.jsx`
- `apps-script.js`
- `src/apps-script-embed.js` (regenerated)
- `index.html` (rebuilt)

---

# Verification

1. Open app → any tournament → Advanced tab
2. Confirm "Pairing mode" dropdown appears under Rounds & Matches
3. Confirm "Rules tab" and "Spinner" checkboxes appear under Features
4. Toggle each — confirm `mod` badge appears
5. User redeploys Apps Script → `eloScale` value now saves/loads from Settings sheet
