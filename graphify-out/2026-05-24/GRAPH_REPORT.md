# Graph Report - .  (2026-05-24)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 223 nodes · 290 edges · 38 communities (19 shown, 19 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `397d8f1a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Tournament Engine & Concepts|Tournament Engine & Concepts]]
- [[_COMMUNITY_Feature Flag Docs & Parity|Feature Flag Docs & Parity]]
- [[_COMMUNITY_Pairing Algorithm Concepts|Pairing Algorithm Concepts]]
- [[_COMMUNITY_Build Pipeline & Advanced Tab|Build Pipeline & Advanced Tab]]
- [[_COMMUNITY_UI Components & App Root|UI Components & App Root]]
- [[_COMMUNITY_Apps Script Handlers|Apps Script Handlers]]
- [[_COMMUNITY_App Bootstrap & ELO Sync|App Bootstrap & ELO Sync]]
- [[_COMMUNITY_Build & Deploy Pipeline|Build & Deploy Pipeline]]
- [[_COMMUNITY_Claude Settings|Claude Settings]]
- [[_COMMUNITY_Tiebreaker Functions|Tiebreaker Functions]]
- [[_COMMUNITY_Build Script Entry|Build Script Entry]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_Config Module|Config Module]]
- [[_COMMUNITY_ELO Default|ELO Default]]
- [[_COMMUNITY_ELO K-Factor|ELO K-Factor]]
- [[_COMMUNITY_ELO Scale|ELO Scale]]
- [[_COMMUNITY_Backup Key|Backup Key]]
- [[_COMMUNITY_Backup Last Key|Backup Last Key]]
- [[_COMMUNITY_Prize Allocation|Prize Allocation]]
- [[_COMMUNITY_Opponent Match Win|Opponent Match Win]]
- [[_COMMUNITY_Game Win Rate|Game Win Rate]]
- [[_COMMUNITY_Tiebreaker Value|Tiebreaker Value]]
- [[_COMMUNITY_Color Palette|Color Palette]]
- [[_COMMUNITY_Style Objects|Style Objects]]
- [[_COMMUNITY_Hearts Component|Hearts Component]]
- [[_COMMUNITY_Draft Groups|Draft Groups]]
- [[_COMMUNITY_Landing Screen|Landing Screen]]
- [[_COMMUNITY_Players Tab|Players Tab]]

## God Nodes (most connected - your core abstractions)
1. `jsonResponse` - 15 edges
2. `Shell Component (layout + tab routing)` - 13 edges
3. `reducer` - 12 edges
4. `doGet()` - 10 edges
5. `AdvancedTab Component` - 10 edges
6. `doGet (Apps Script)` - 9 edges
7. `genPairings — Main Pairing Generator` - 9 edges
8. `scoreRound — Round Scoring Engine` - 9 edges
9. `MatchesTab()` - 8 edges
10. `getElo` - 8 edges

## Surprising Connections (you probably didn't know these)
- `RulesTab Component` --semantically_similar_to--> `Required Sheet tabs (ELO, Seeds, Rules, Settings)`  [INFERRED] [semantically similar]
  src/components/RulesTab.jsx → README.md
- `APPS_SCRIPT (embedded script string)` --semantically_similar_to--> `doGet (Apps Script)`  [INFERRED] [semantically similar]
  src/components/SheetsSync.jsx → apps-script.js
- `pairing key not editable from Advanced tab` --references--> `Shell Component (layout + tab routing)`  [INFERRED]
  plans/sync-advanced-tab-with-sheet.md → src/components/Shell.jsx
- `rules and spinner flags missing from Advanced tab` --references--> `Shell Component (layout + tab routing)`  [INFERRED]
  plans/sync-advanced-tab-with-sheet.md → src/components/Shell.jsx
- `Pairing Mode Determined by matchMax` --semantically_similar_to--> `matchMax Fully Determines Pairing Mode`  [EXTRACTED] [semantically similar]
  plans/sync-advanced-tab-with-sheet.md → src/logic.js

## Hyperedges (group relationships)
- **Pairing Engine Subsystem** — logic_js_gen_pairings, logic_js_find_groups, logic_js_get_prev, logic_js_get_byes, logic_js_split_groups, concept_rematch_avoidance, concept_bye_assignment [EXTRACTED 1.00]
- **Scoring Modes** — logic_js_scoring_mode_points, logic_js_scoring_mode_swiss, logic_js_scoring_mode_lifepoints, logic_js_score_round [EXTRACTED 1.00]
- **Feature Override Flow** — reducer_js_toggle_feature, reducer_js_set_feature, reducer_js_feature_overrides, components_advancedtab_boolf, components_advancedtab_numf, components_advancedtab_self [EXTRACTED 1.00]
- **Terminology Rename: 1v1->head-to-head, multi-player->pod** — logic_js_head_to_head_terminology, logic_js_pod_terminology, reducer_js_abandon_2player_comment, logic_js_matchmax_determines_mode [EXTRACTED 1.00]
- **All Sheet Sync Gaps Resolved** — plans_sync_rules_resolved, plans_sync_spinner_removed_scope, plans_sync_pairing_removed_scope, plans_sync_eloscale_redeploy [EXTRACTED 1.00]

## Communities (38 total, 19 thin omitted)

### Community 0 - "Tournament Engine & Concepts"
Cohesion: 0.09
Nodes (32): DraftGroups(), Shell(), ELO Rating System, Grand Prix Scoring, Swiss Pairing Algorithm, advancePhase, calcGWR, calcOMW (+24 more)

### Community 1 - "Feature Flag Docs & Parity"
Cohesion: 0.07
Nodes (36): Feature config access pattern (featureOverrides merge), Source load order (globals-before-use constraint), Plan: sync AdvancedTab with Sheet (parity gaps), eloScale missing from apps-script TOURNAMENT_FEATURE_KEYS, pairing key not editable from Advanced tab, rules and spinner flags missing from Advanced tab, Apps Script API endpoints, Configuration layers (Sheet permanent vs session-only overrides) (+28 more)

### Community 2 - "Pairing Algorithm Concepts"
Cohesion: 0.08
Nodes (28): BYE Assignment Strategy, Forfeit noElo Flag — No ELO Change on Abandon, Ghost Padding for Late-Joining GP Players, Pairing Mode Determined by matchMax, Rematch Avoidance with Fallback, eCalc — Head-to-Head ELO Delta, Pairwise ELO Delta in scoreRound, eloExpected — Expected Score Formula (+20 more)

### Community 3 - "Build Pipeline & Advanced Tab"
Cohesion: 0.10
Nodes (23): Apps Script Embed Auto-Regen Step, Build Pipeline, Source Concatenation Order, BoolF — Boolean Checkbox Widget, AdvancedTab Component, Features Card, Spinner BoolF in Features Section, Spreadsheet Reference Card (+15 more)

### Community 4 - "UI Components & App Root"
Cohesion: 0.13
Nodes (16): App (root component), AdvancedTab(), MatchCard(), MatchesTab(), MatchLog(), PlayersTab(), MATCH_ROUND_OPTIONS, SCORING_MODES (+8 more)

### Community 5 - "Apps Script Handlers"
Cohesion: 0.35
Nodes (17): debugElo, debugSettings, deleteSeed, doGet (Apps Script), doPost (Apps Script), eloColumns, jsonResponse, listSeeds (+9 more)

### Community 6 - "App Bootstrap & ELO Sync"
Cohesion: 0.18
Nodes (15): fetchTournaments, ELO DB (sheet-keyed), Feature Overrides (runtime config), Snapshot Format v3, DU (default Apps Script URL), EK (localStorage ELO key), SK (localStorage Sheets URL key), init (initial state) (+7 more)

### Community 7 - "Build & Deploy Pipeline"
Cohesion: 0.67
Nodes (3): Build system (build.sh concatenation, no bundler), index.html (built output), GitHub Actions Build & Deploy workflow

### Community 9 - "Tiebreaker Functions"
Cohesion: 0.67
Nodes (3): calcGWR — Game Win Rate, calcOMW — Opponent Match Win, Standings Tiebreaker Helpers

## Knowledge Gaps
- **67 isolated node(s):** `build.sh script`, `DEFAULT_PRIZE_PCTS`, `init`, `C`, `S` (+62 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ELO Rating System` connect `Tournament Engine & Concepts` to `Pairing Algorithm Concepts`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **Why does `Reducer — All State Transitions` connect `Pairing Algorithm Concepts` to `Tournament Engine & Concepts`?**
  _High betweenness centrality (0.151) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Shell Component (layout + tab routing)` (e.g. with `pairing key not editable from Advanced tab` and `rules and spinner flags missing from Advanced tab`) actually correct?**
  _`Shell Component (layout + tab routing)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `reducer` (e.g. with `setElo` and `initialPhase`) actually correct?**
  _`reducer` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `AdvancedTab Component` (e.g. with `Apps Script Embed Auto-Regen Step` and `Prize Allocation (calcAlloc)`) actually correct?**
  _`AdvancedTab Component` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `build.sh script`, `DEFAULT_PRIZE_PCTS`, `init` to the rest of the system?**
  _73 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tournament Engine & Concepts` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._