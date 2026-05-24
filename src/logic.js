// ═══════════════════════════════════════════════════════════════════════════
// logic.js — Game engine (pure functions only, no DOM, no state, no side effects)
//
// All game rules live here. Files outside this one should call these functions
// rather than re-implement any rule inline. Sections:
//   1. Grand Prix scoring
//   2. ELO rating system
//   3. Pairing engine (Swiss / Round-Robin)
//   4. Prize allocation
//   5. Tournament format rules (phase, game-over)
//   6. Round scoring (all three scoring modes)
//   7. Standings tiebreaker helpers
// ═══════════════════════════════════════════════════════════════════════════


// ── 1. GRAND PRIX SCORING ────────────────────────────────────────────────────

// GP scoring: sum the best N rounds, optionally dropping the worst M of those N.
// "Ghost padding" fills missing early rounds with the player's personal worst score
// so a player who joined late isn't artificially boosted by having fewer rounds counted.
//   scores — array of per-round point totals (chronological, may be short for late joiners)
//   last   — window size N (how many recent rounds count), default 4
//   drop   — how many worst scores to discard within the window, default 1
//   ghost  — if true, pad missing rounds with the player's worst actual score
function gpBestOf(scores, last, drop, ghost) {
  const lastN = Math.max(2, Number(last));
  const dropCount = Math.max(0, Number(drop));
  let padded = scores;
  // Pad missing rounds with the player's worst score so late joiners aren't over-rewarded.
  if (ghost && padded.length > 0 && padded.length < lastN) {
    const worst = Math.min(...padded);
    while (padded.length < lastN) padded = [worst, ...padded];
  }
  // If fewer rounds played than (window - drop), just sum everything — nothing to drop yet.
  if (padded.length <= lastN - dropCount) return padded.reduce((a, b) => a + b, 0);
  const recent = padded.slice(-lastN);
  const sorted = [...recent].sort((a, b) => a - b);
  // Drop the lowest scores, sum the rest.
  return sorted.slice(dropCount).reduce((a, b) => a + b, 0);
}


// ── 2. ELO RATING SYSTEM ─────────────────────────────────────────────────────

// Standard ELO expected score: probability that player A beats player B.
// Formula: 1 / (1 + 10^((Rb - Ra) / scale))
function eloExpected(a, b, scale) {
  return 1 / (1 + Math.pow(10, (b - a) / scale));
}

// Read a player's ELO from the db object. Keys are lowercased player names.
// Returns defaultElo if the player has no entry.
function getElo(db, name, defaultElo = 0) {
  return db[name.toLowerCase()]?.elo ?? defaultElo;
}

// Write a player's ELO. Returns a new db object (immutable — never mutates in place).
// isTest marks the entry as a test player so it can be filtered out of production stats.
function setElo(db, name, elo, isTest) {
  return { ...db, [name.toLowerCase()]: { elo, name, test: !!isTest } };
}

// Calculate ELO delta for a head-to-head result.
//   ratingA, ratingB — current ELO ratings
//   score            — actual score for player A (1 = win, 0.5 = draw, 0 = loss)
//   kMax             — K-factor cap (sensitivity)
// Returns { dA, dB } — how many ELO points each player gains/loses.
// NOTE: eCalc is defined here for completeness but not currently called by the app.
// scoreRound() handles multi-player ELO inline since it needs to loop over all pairs.
function eCalc(ratingA, ratingB, score, kMax, scale) {
  const k = kMax;
  const expected = eloExpected(ratingA, ratingB, scale),
    rawDelta = k * (score - expected),
    delta = Math.round(Math.max(-k, Math.min(k, rawDelta)));
  return { dA: delta, dB: -delta };
}


// ── 3. PAIRING ENGINE ────────────────────────────────────────────────────────

// Backtracking search: find a valid partition of `names` into groups of `groupSize`
// where no two players in a group have already faced each other (unless allow=true).
//   names     — player name array (pre-sorted by seed/rank)
//   prev      — map of { playerName → Set<opponentName> } from getPrev()
//   groupSize — match size (matchMax); 2 = head-to-head, 3+ = pod
//   allow     — if true, rematches are permitted (fallback when no clean pairing exists)
// Returns array of groups (each group is array of indices into `names`), or null if impossible.
function findGroups(names, prev, groupSize, allow) {
  const n = names.length;
  if (!n) return [];
  if (n % groupSize !== 0) return null; // can't divide evenly — caller must handle byes first
  const used = new Array(n).fill(false), groups = [];
  function backtrack() {
    const i = used.indexOf(false); // find next unpaired player
    if (i === -1) return true;     // all players paired — success
    used[i] = true;
    function pick(group, start) {
      if (group.length === groupSize) {
        groups.push([...group]);
        if (backtrack()) return true; // recurse to pair remaining players
        groups.pop();
        return false;
      }
      for (let j = start; j < n; j++) {
        if (used[j]) continue;
        // Skip if this would create a rematch (unless rematches are allowed).
        if (!allow && group.some(gi => (prev[names[gi]] || new Set()).has(names[j]))) continue;
        used[j] = true; group.push(j);
        if (pick(group, j + 1)) return true;
        group.pop(); used[j] = false;
      }
      return false;
    }
    if (!pick([i], i + 1)) { used[i] = false; return false; }
    return true;
  }
  return backtrack() ? groups : null;
}

// Build opponent history map from all completed rounds.
// Returns { playerName → Set<opponentName> } for active players only.
// Used by findGroups() to prevent rematches.
function getPrev(history, activePlayers) {
  const activeSet = new Set(activePlayers.map(p => p.name)), prev = {};
  history.forEach(r => r.forEach(x => {
    if (x.isBye) return;
    const active = x.players.filter(n => activeSet.has(n));
    active.forEach((n1, i) => active.forEach((n2, j) => {
      if (i !== j) (prev[n1] = prev[n1] || new Set()).add(n2);
    }));
  }));
  return prev;
}

// Count how many byes each active player has received across all rounds.
// Returns { playerName → byeCount }. Used to give byes to players with fewest byes first.
function getByes(history, activePlayers) {
  const counts = {};
  activePlayers.forEach(p => (counts[p.name] = 0));
  history.forEach(r => r.forEach(m => {
    if (m.isBye && counts[m.players[0]] !== undefined) counts[m.players[0]]++;
  }));
  return counts;
}

// Distribute n players into groups of at most `max`, returning an array of group sizes.
// round="up" creates fewer, larger groups; anything else creates more, smaller groups.
// Example: splitGroups(7, 4, "up") → [4, 3]; splitGroups(7, 4, "down") → [3, 2, 2]
function splitGroups(n, max, round) {
  if (n <= 0) return [];
  let g;
  if (round === "up") {
    g = Math.max(1, Math.floor(n / max));
    while (g * (max + 1) < n) g++;
  } else {
    g = Math.max(1, Math.ceil(n / max));
  }
  const base = Math.floor(n / g), extra = n % g;
  // Distribute remainder: first `extra` groups get one extra player.
  return Array.from({ length: g }, (_, i) => (i < extra ? base + 1 : base));
}

// Main pairing generator. Called once per round via storage.makePairings().
//   pl  — full player list (includes eliminated)
//   h   — match history (array of rounds, each round is array of pairings)
//   ph  — current phase: "roundrobin" | "swiss"
//   cfg — merged feature config
//   db  — current ELO db
//
// Pairing strategy:
//   Round-robin: sort by ELO descending (seed-based seating)
//   Swiss: sort by win-rate descending, then score (best vs best)
//
// Bye assignment: odd player count → lowest-ranked player with fewest historical byes gets the bye.
// Rematch avoidance: backtracking first tries no-rematch pairings; if impossible, allows rematches.
// Player order rotation (cfg.playerOrder): each player accumulates a positionSum (sum of seat numbers received). Higher sum goes first next round; ties broken randomly. Works for any match size.
function genPairings(players, history, phase, cfg, eloDb) {
  const groupSize = Math.max(2, Number(cfg.matchMax) || 2);
  const matchRound = cfg.matchRound || "none";
  const activePlayers = players.filter(p => !p.eliminated);
  const sorted = [...activePlayers].sort((a, b) =>
    phase === "roundrobin"
      ? getElo(eloDb, b.name, cfg.eloDefault) - getElo(eloDb, a.name, cfg.eloDefault)
      : b.w / (b.w + b.d + b.l || 1) - a.w / (a.w + a.d + a.l || 1) || b.score - a.score
  );
  const prev = getPrev(history, activePlayers);
  const pairings = [];
  let unpaired = sorted;

  // Assign bye to lowest-ranked player with the fewest accumulated byes.
  if (groupSize <= 2 && sorted.length % 2 === 1) {
    const byeCounts = getByes(history, activePlayers);
    const minByes = Math.min(...Object.values(byeCounts));
    let byeName = null;
    // Scan from bottom of standings upward — lower-ranked players get byes first.
    for (let i = sorted.length - 1; i >= 0; i--)
      if (byeCounts[sorted[i].name] <= minByes) { byeName = sorted[i].name; break; }
    if (!byeName) byeName = sorted[sorted.length - 1].name;
    unpaired = sorted.filter(p => p.name !== byeName);
    pairings.push({ players: [byeName], scores: {}, result: "done", isBye: true, rematch: false, eloDeltas: {}, noElo: false });
  }

  const names = unpaired.map(p => p.name);
  // Build a match object for a set of player names. Marks rematches for UI warning display.
  const mkMatch = playerNames => {
    const hasRematch = playerNames.some((p1, i) =>
      playerNames.some((p2, j) => j > i && (prev[p1] || new Set()).has(p2))
    );
    return { players: playerNames, scores: Object.fromEntries(playerNames.map(n => [n, ""])), result: null, isBye: false, rematch: hasRematch, eloDeltas: {}, noElo: false, extraPoints: {} };
  };

  // Try clean pairings first (no rematches). Fall back to rematches if unavoidable.
  let grouped = false;
  if (names.length > 0 && names.length % groupSize === 0) {
    let groups = findGroups(names, prev, groupSize, false);
    if (!groups) groups = findGroups(names, prev, groupSize, true); // fallback: allow rematches
    if (groups) {
      for (const group of groups) pairings.push(mkMatch(group.map(i => names[i])));
      grouped = true;
    }
  }

  // If backtracking couldn't solve it (e.g. player count not divisible by groupSize),
  // fall back to sequential slicing using splitGroups().
  if (!grouped && names.length > 0) {
    const sizes = splitGroups(names.length, groupSize, matchRound);
    let offset = 0;
    for (const size of sizes) {
      if (size > 0) pairings.push(mkMatch(names.slice(offset, offset + size)));
      offset += size;
    }
  }

  // Sort players within each match by positionSum desc: higher accumulated seat number goes first.
  // Ties broken randomly. Works for any match size.
  if (cfg.playerOrder) {
    const sums = {};
    players.forEach(p => (sums[p.name] = p.positionSum || 0));
    pairings.forEach(match => {
      if (match.isBye) return;
      match.players.sort((a, b) => {
        const diff = (sums[b] || 0) - (sums[a] || 0);
        return diff !== 0 ? diff : Math.random() - 0.5;
      });
    });
  }

  return pairings;
}


// ── 4. PRIZE ALLOCATION ──────────────────────────────────────────────────────

// Convert 0-based rank index to ordinal label: 0 → "Winner", 1 → "2nd", 2 → "3rd", etc.
function rkLbl(i) {
  if (i === 0) return "Winner";
  const rank = i + 1,
    mod100 = rank % 100,
    suffix = mod100 >= 11 && mod100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[rank % 10] || "th";
  return `${rank}${suffix}`;
}

// Default prize rank percentages for up to 8 paid spots.
// Percentages are rounded to one decimal place; last entry absorbs rounding error.
const DEFAULT_PRIZE_PCTS = [30, 15, 15, 10, 10, 10, 5, 5];
function defRanks() {
  const rawPcts = DEFAULT_PRIZE_PCTS,
    total = rawPcts.reduce((a, v) => a + v, 0),
    pcts = rawPcts.map((v) => Math.round((v / total) * 1000) / 10);
  pcts[pcts.length - 1] = Math.round((pcts[pcts.length - 1] + (100 - pcts.reduce((a, v) => a + v, 0))) * 10) / 10;
  return pcts.map((p, i) => ({ label: rkLbl(i), pct: p }));
}

// Full prize allocation algorithm.
// Determines which ranks get prizes, what prizes they receive, and handles guaranteed/avoid constraints.
//
// Parameters:
//   players     — player array (length used for pool calculation)
//   prizes      — prize inventory [{ name, value, maxQty, guaranteed, avoid, maxQtyPerPlayer }]
//   ranks       — rank definitions [{ label, pct }] from defRanks() or user config
//   entryCost   — entry fee per player
//   prizrPlCount  — % of players that receive prizes
//   prizePlCountRUp — round allocated count up (true) or down (false)
//   rUpPlCount    — % of prize ranks that round UP their target value (the "runup" winners)
//   rUpPlCountRUp — round runup count up (true) or down (false)
//
// Returns { allocs, totalPool, grandTotal } or null if pool is empty/unconfigured.
//   allocs — array of { rank, target, chosen, actualValue } per paying rank
//
// Algorithm:
//   1. Calculate how many ranks pay out (allocated = floor/ceil of players * prizrPlCount%)
//   2. Split paying ranks into "runup" (round up to target) and normal (round down)
//   3. Pre-place guaranteed prizes (prize.guaranteed = "1,3" means it goes to ranks 1 and 3)
//   4. For each rank, find the best prize combo using backtracking search (findBestCombo)
//   5. If a rank ends up with nothing, assign the cheapest available prize as fallback
//   6. Post-pass: ensure higher ranks are always worth more than lower ranks
//      by adding cheapest available prizes to any rank that violates the monotonic constraint
function calcAlloc(players, prizes, ranks, entryCost, prizrPlCount, prizePlCountRUp, rUpPlCount, rUpPlCountRUp) {
  const totalPool = entryCost * players.length;
  if (!totalPool || !ranks.length || !prizes.length || prizrPlCount == null || rUpPlCount == null) return null;
  const prizePercent = prizrPlCount;
  const rawAllocated = (players.length * prizePercent) / 100;
  const allocated = prizePlCountRUp ? Math.ceil(rawAllocated) : Math.floor(rawAllocated);
  if (allocated < 1) return null;
  const runupPercent = rUpPlCount;
  const rawRunup = (allocated * runupPercent) / 100;
  // runupCount: how many top ranks round their payout UP to the target value.
  // Remaining ranks round DOWN (they get at most the target, not over).
  const runupCount = rUpPlCountRUp ? Math.ceil(rawRunup) : Math.floor(rawRunup);
  const prizeRanks = ranks.slice(0, allocated),
    inventory = prizes.map((p) => ({ ...p })); // working copy — maxQty gets decremented

  // Pre-index guaranteed prizes and avoid constraints from prize definitions.
  const guaranteedByRank = {}; // rank index → [{ name, value, qty, total }]
  const avoidMap = {};         // rank index → Set<prizeName>
  inventory.forEach((p) => {
    const gList = String(p.guaranteed || "")
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => n > 0 && n <= prizeRanks.length);
    gList.forEach((g) => {
      if (p.maxQty > 0) {
        (guaranteedByRank[g - 1] = guaranteedByRank[g - 1] || []).push({
          name: p.name,
          value: p.value,
          qty: 1,
          total: p.value,
        });
        p.maxQty--;
      }
    });
    const aList = String(p.avoid || "")
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => n > 0);
    aList.forEach((a) => {
      (avoidMap[a - 1] = avoidMap[a - 1] || new Set()).add(p.name);
    });
  });

  // Backtracking search for the best prize combination that hits `target`.
  // roundDown=true → find highest combo ≤ target (don't exceed budget).
  // roundDown=false → find lowest combo ≥ target (meet or exceed target).
  // avoided → Set of prize names forbidden for this rank.
  function findBestCombo(target, roundDown, avoided) {
    const available = inventory.filter((p) => p.maxQty > 0 && p.value > 0 && !(avoided && avoided.has(p.name))),
      maxQtys = available.map((p) =>
        Math.max(
          0,
          Math.min((p.maxQtyPerPlayer || 1) <= 1 ? 1 : p.maxQty, Math.ceil(target / p.value) + 1),
        ),
      );
    let best = null;
    function consider(combo, val) {
      if (roundDown ? val <= target : val >= target)
        if (!best || (roundDown ? val > best.value : val < best.value)) best = { combo: combo.slice(), value: val };
    }
    function search(i, combo, val) {
      if (i >= available.length) {
        consider(combo, val);
        return;
      }
      for (let q = 0; q <= maxQtys[i]; q++) {
        combo.push({ prize: available[i], qty: q });
        search(i + 1, combo, val + q * available[i].value);
        combo.pop();
        // Prune: if already overshooting and rounding up, no need to keep searching.
        if (!roundDown && val + q * available[i].value > target + (best ? best.value - target : Infinity)) break;
      }
    }
    search(0, [], 0);
    return best;
  }

  let grandTotal = 0;
  const allocs = prizeRanks.map((r, ri) => {
    const roundDown = ri >= runupCount; // runup ranks round up; normal ranks round down
    const target = (totalPool * r.pct) / 100;
    const chosen = (guaranteedByRank[ri] || []).map((g) => ({ ...g }));
    let filled = chosen.reduce((s, c) => s + c.total, 0);
    const rem = target - filled;
    if (rem > 0.001) {
      const res = findBestCombo(rem, roundDown, avoidMap[ri]);
      if (res)
        res.combo.forEach(({ prize, qty }) => {
          if (qty > 0) {
            const ip = inventory.find((x) => x.name === prize.name),
              ex = chosen.find((c) => c.name === prize.name);
            if (ex) {
              ex.qty += qty;
              ex.total += qty * prize.value;
            } else chosen.push({ name: prize.name, value: prize.value, qty, total: qty * prize.value });
            ip.maxQty -= qty;
            filled += qty * prize.value;
          }
        });
    }
    // Fallback: if no combo found and rank still has nothing, assign the cheapest available prize.
    if (!chosen.length) {
      const cheapest = inventory.filter((p) => p.maxQty > 0 && p.value > 0).sort((a, b) => a.value - b.value)[0];
      if (cheapest) {
        chosen.push({ name: cheapest.name, value: cheapest.value, qty: 1, total: cheapest.value });
        cheapest.maxQty--;
      }
    }
    const actualValue = chosen.reduce((s, c) => s + c.total, 0);
    grandTotal += actualValue;
    return { rank: r.label, target, chosen, actualValue };
  });

  // Post-pass: enforce monotonic prize values (higher rank must always be worth more).
  // If rank hi is worth less than rank li (lower rank), top up rank hi with the cheapest prize.
  const tiebreaker = inventory.filter((p) => p.value > 0).sort((a, b) => a.value - b.value)[0];
  if (tiebreaker)
    for (let hi = 0; hi < allocs.length - 1; hi++)
      for (let li = hi + 1; li < allocs.length; li++)
        while (allocs[hi].actualValue < allocs[li].actualValue && tiebreaker.maxQty > 0) {
          const ex = allocs[hi].chosen.find((c) => c.name === tiebreaker.name);
          if (ex) {
            ex.qty++;
            ex.total += tiebreaker.value;
          } else allocs[hi].chosen.push({ name: tiebreaker.name, value: tiebreaker.value, qty: 1, total: tiebreaker.value });
          allocs[hi].actualValue += tiebreaker.value;
          grandTotal += tiebreaker.value;
          tiebreaker.maxQty--;
        }
  return { allocs, totalPool, grandTotal };
}


// ── 5. TOURNAMENT FORMAT RULES ───────────────────────────────────────────────

const SCORING_MODES = [
  { value: "lifepoints", label: "Lifepoints", pairingSort: "By win rate" },
  { value: "swiss",      label: "Swiss",       pairingSort: "By win rate" },
  { value: "points",     label: "Ranks",       pairingSort: "By points"   },
];

const MATCH_ROUND_OPTIONS = [
  { value: "none", label: "BYE"        },
  { value: "up",   label: "round up"   },
  { value: "down", label: "round down" },
];

// Determine starting phase from config.
// If rrRounds > 0, start with round-robin; after those rounds are done, switch to swiss.
function initialPhase(cfg) {
  return cfg.rrRounds > 0 ? "roundrobin" : "swiss";
}

// Advance to the next phase if the round-robin stage is complete.
// Round-robin runs for exactly cfg.rrRounds rounds, then permanently switches to swiss.
function advancePhase(phase, nextRound, cfg) {
  if (phase === "roundrobin" && nextRound > cfg.rrRounds) return "swiss";
  return phase;
}

// Lifepoints mode ends when only one (or zero) players remain uneliminated.
// Other scoring modes run for a fixed number of rounds — game-over is handled elsewhere.
function isGameOver(scoring, activePlayers) {
  return scoring === "lifepoints" && activePlayers.length <= 1;
}

// Assign players to draft tables using ELO-seeded snake order.
// Snake distribution: row 0 fills left-to-right, row 1 fills right-to-left, alternating.
// This balances ELO across tables — each table gets one top player, one bottom player, etc.
function draftGroups(players, eloDb, eloDefault = 0, tableSize) {
  const n = players.length;
  const groupCount = Math.max(1, Math.floor(n / tableSize));
  const sorted = [...players].sort((a, b) => getElo(eloDb, b.name, eloDefault) - getElo(eloDb, a.name, eloDefault));
  const groups = Array.from({ length: groupCount }, () => []);
  sorted.forEach((p, i) => {
    const row = Math.floor(i / groupCount); // which row of the snake
    groups[row % 2 === 0 ? i % groupCount : groupCount - 1 - (i % groupCount)].push(p);
  });
  return groups;
}


// ── 6. ROUND SCORING ─────────────────────────────────────────────────────────

// Score all completed matches in a round and update ELO.
// Mutates the player objects and pairing objects in-place (callers pass spread copies).
// Returns { players, db, roundPairings } with updated values.
//
// Scoring modes:
//   "points"     — rank players within the match by score; award pts1/pts2/pts3/ptsLast
//   "swiss"      — binary win/loss; draws if multiple players share top score
//   "lifepoints" — ongoing life total; LP changes applied, p.eliminated set when LP ≤ 0
//
// Grand Prix overlay (cfg.grandPrix): instead of accumulating score directly,
// each round's points are pushed into p.gpScores and gpBestOf() recalculates the total.
//
// ELO: after scoring, calculate pairwise ELO deltas for all player combinations in the match.
// K is divided by player count so pod matches have the same total ELO at stake as head-to-head.
function scoreRound(roundPairings, players, cfg, db) {
  let _db = db; // local copy — setElo() returns a new object, so we reassign on each update
  const scoring = cfg.scoring;
  roundPairings.forEach((m) => {
    if (m.isBye || m.result !== "done") return;
    const scored = m.players.filter((n) => String(m.scores[n]).trim() !== "");
    if (!scored.length) return;
    // Sort players by their score in this match, descending.
    const sorted = [...scored].sort((a, b) => parseFloat(m.scores[b] || 0) - parseFloat(m.scores[a] || 0));
    const topScore = parseFloat(m.scores[sorted[0]] || 0);

    if (scoring === "points") {
      // Group players that tied at the same score within the match.
      // Each group gets points based on the rank of their position (1st, 2nd, 3rd, last).
      const ptMap = [Number(cfg.pts1), Number(cfg.pts2), Number(cfg.pts3)];
      const ptsLast = Number(cfg.ptsLast);
      const groups = [];
      let gi = 0;
      while (gi < sorted.length) {
        const gs = parseFloat(m.scores[sorted[gi]] || 0);
        let gj = gi;
        while (gj < sorted.length && parseFloat(m.scores[sorted[gj]] || 0) === gs) gj++;
        groups.push({ players: sorted.slice(gi, gj), score: gs });
        gi = gj;
      }
      let rank = 1;
      groups.forEach((g, idx) => {
        const isLast = groups.length > 1 && idx === groups.length - 1;
        // Zero-scorers and last-place both get ptsLast regardless of position.
        const pts = isLast || g.score === 0 ? ptsLast : (ptMap[rank - 1] ?? ptsLast);
        g.players.forEach((n) => {
          const p = players.find((x) => x.name === n);
          if (!p) return;
          if (cfg.grandPrix) {
            if (!p.gpScores) p.gpScores = [];
            p.gpScores.push(pts + (m.extraPoints?.[n] || 0));
            p.score = gpBestOf(p.gpScores, cfg.gpBestOfLast, cfg.gpDropWorst, cfg.gpGhostPoints);
          } else {
            p.score += pts;
          }
          if (isLast || g.score === 0) p.pLast = (p.pLast || 0) + 1;
          else if (rank === 1)         p.p1 = (p.p1 || 0) + 1;
          else if (rank === 2)         p.p2 = (p.p2 || 0) + 1;
          else if (rank === 3)         p.p3 = (p.p3 || 0) + 1;
          else                         p.pLast = (p.pLast || 0) + 1;
        });
        rank += g.players.length;
      });

    } else if (scoring === "swiss") {
      // Multiple players at top score → draw for all of them.
      const tied = sorted.filter(n => parseFloat(m.scores[n] || 0) === topScore);
      const multi = tied.length > 1;
      sorted.forEach(n => {
        const p = players.find(x => x.name === n);
        if (!p) return;
        const isTop = parseFloat(m.scores[n] || 0) === topScore;
        let pts;
        if (isTop && multi) { p.d++; pts = cfg.drawPoints; }
        else if (isTop)     { p.w++; pts = cfg.winPoints; }
        else                { p.l++; pts = cfg.lossPoints; }
        if (cfg.grandPrix) {
          if (!p.gpScores) p.gpScores = [];
          p.gpScores.push(pts + (m.extraPoints?.[n] || 0));
          p.score = gpBestOf(p.gpScores, cfg.gpBestOfLast, cfg.gpDropWorst, cfg.gpGhostPoints);
        } else {
          p.score += pts;
        }
      });

    } else if (scoring === "lifepoints") {
      // All players share top score → draw; otherwise winner/loser.
      // Draw penalty can be cumulative (grows each time the same player draws).
      const draw = sorted.every(n => parseFloat(m.scores[n] || 0) === topScore);
      sorted.forEach(n => {
        const p = players.find(x => x.name === n);
        if (!p) return;
        const isTop = parseFloat(m.scores[n] || 0) === topScore;
        if (draw) {
          p.d++;
          const basePenalty = Math.abs(cfg.drawPoints); // accept positive or negative config values
          const dp = cfg.cumulativeDrawPenalty ? basePenalty * p.d : basePenalty;
          p.score = Math.max(0, p.score - dp);
          if (p.score <= 0) p.eliminated = true;
        } else if (isTop) {
          p.w++;
          p.score = Math.max(0, p.score + cfg.winPoints);
        } else {
          p.l++;
          p.score = Math.max(0, p.score + cfg.lossPoints);
          if (p.score <= 0) p.eliminated = true;
        }
      });
    }

    // Persist player order: add seat number (1-based) to positionSum for each player.
    // Higher positionSum next round = goes first (fairness rotation).
    if (cfg.playerOrder && !m.isBye) {
      m.players.forEach((name, idx) => {
        const p = players.find(x => x.name === name);
        if (p) p.positionSum = (p.positionSum || 0) + (idx + 1);
      });
    }

    // ELO delta calculation for all pairs in this match.
    // K-factor is split evenly across all pairings so pod matches
    // have the same total ELO at stake as a standard head-to-head.
    if (cfg.elo && !m.noElo) {
      const playerCount = m.players.length,
        K = cfg.eloKMax / playerCount,
        dl = Object.fromEntries(m.players.map((p) => [p, 0]));
      for (let i = 0; i < playerCount; i++)
        for (let j = i + 1; j < playerCount; j++) {
          const pA = m.players[i], pB = m.players[j],
            sA = parseFloat(m.scores[pA] || 0), sB = parseFloat(m.scores[pB] || 0),
            rA = getElo(_db, pA, cfg.eloDefault), rB = getElo(_db, pB, cfg.eloDefault),
            eA = eloExpected(rA, rB, cfg.eloScale),
            scA = sA > sB ? 1 : sA < sB ? 0 : 0.5; // normalize to 0/0.5/1
          dl[pA] += K * (scA - eA);
          dl[pB] += K * ((1 - scA) - (1 - eA));
        }
      m.eloDeltas = {};
      m.players.forEach((p) => {
        const eloChange = Math.round(dl[p]);
        m.eloDeltas[p] = eloChange;
        _db = setElo(_db, p, Math.max(0, getElo(_db, p, cfg.eloDefault) + eloChange), _db[p.toLowerCase()]?.test);
      });
    }
  });
  return { players, db: _db, roundPairings };
}


// ── 7. STANDINGS TIEBREAKER HELPERS ──────────────────────────────────────────

// Opponent Match Win: average standings score of all opponents faced.
// Works for any match size — sums all opponents' scores then divides by opponent count.
function calcOMW(playerName, history, players) {
  let sum = 0, count = 0;
  history.forEach((round) => {
    round.forEach((match) => {
      if (match.isBye || match.result !== "done") return;
      if (!match.players.includes(playerName)) return;
      match.players.forEach((opp) => {
        if (opp === playerName) return;
        const p = players.find((x) => x.name === opp);
        if (p) { sum += p.score || 0; count++; }
      });
    });
  });
  return count > 0 ? sum / count : 0;
}

// Game Win Rate: player's standings score divided by matches played.
// Scales correctly for both head-to-head and pod formats.
function calcGWR(player) {
  const total = player.w + player.d + player.l;
  return total > 0 ? (player.score || 0) / total : 0;
}

// Map a tiebreaker key to a numeric sort value for player p.
// Higher return value = better standing. Used in StandingsTab sort comparator.
//   "elo"     — higher ELO is better
//   "elo_rev" — lower ELO is better (e.g. tournaments that reward underdogs)
//   "omw"     — higher opponent win rate is better
//   "gwr"     — higher personal win rate is better
function calcTiebreakerValue(playerStats, p, tb) {
  const s = playerStats[p.name];
  if (tb === "elo") return s.elo;
  if (tb === "elo_rev") return -s.elo;
  if (tb === "omw") return s.omw;
  if (tb === "gwr") return s.gwr;
  return 0;
}
