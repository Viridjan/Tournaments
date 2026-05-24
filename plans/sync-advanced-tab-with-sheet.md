# Advanced tab / Sheet parity

All gaps resolved. No code changes needed.

| Key | Status | Notes |
|-----|--------|-------|
| `rules` | ✅ Done | `BoolF` in Features section, `TOURNAMENT_FEATURE_KEYS` has it |
| `eloScale` | ✅ Done | In `TOURNAMENT_FEATURE_KEYS` (line 287), AdvancedTab has it |
| `spinner` | ✅ Removed from scope | Not in Sheet (`TOURNAMENT_FEATURE_KEYS` never had it); gated by `state.experimental` only |
| `pairing` | ✅ Removed from scope | Mode determined by `matchMax` (2 = head-to-head, >2 = pod); no flag needed |

## Action required

Redeploy `apps-script.js` if your live deployment predates `eloScale` being in `TOURNAMENT_FEATURE_KEYS`. After redeploy, `eloScale` set in Sheet loads on mount as tournament default.
