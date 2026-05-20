// ═══════════════════════════════════════════════════════
// Pure functions: ELO, pairing, scoring, prizes (no DOM, no state)
function gpBestOf(scores, last, drop, ghost) {
  const lastN = Math.max(2, Number(last) || 4);
  const dropCount = Math.max(0, Number(drop) || 1);
  let padded = scores;
  if (ghost && padded.length > 0 && padded.length < lastN) {
    const worst = Math.min(...padded);
    while (padded.length < lastN) padded = [worst, ...padded];
  }
  if (padded.length <= lastN - dropCount) return padded.reduce((a, b) => a + b, 0);
  const recent = padded.slice(-lastN);
  const sorted = [...recent].sort((a, b) => a - b);
  return sorted.slice(dropCount).reduce((a, b) => a + b, 0);
}
function eloExpected(a, b, scale) {
  return 1 / (1 + Math.pow(10, (b - a) / (scale || ES)));
}
function getElo(d, n) {
  return d[n.toLowerCase()]?.elo ?? ED;
}
function setElo(d, n, e, isTest) {
  return { ...d, [n.toLowerCase()]: { elo: e, name: n, test: !!isTest } };
}
function eCalc(a, b, s, kMax, scale) {
  const k = kMax || EM;
  const e = eloExpected(a, b, scale),
    r = k * (s - e),
    d = Math.round(Math.max(-k, Math.min(k, r)));
  return { dA: d, dB: -d };
}
function findGroups(names, prev, groupSize, allow) {
  const n = names.length;
  if (!n) return [];
  if (n % groupSize !== 0) return null;
  const used = new Array(n).fill(false), groups = [];
  function backtrack() {
    const i = used.indexOf(false);
    if (i === -1) return true;
    used[i] = true;
    function pick(group, start) {
      if (group.length === groupSize) {
        groups.push([...group]);
        if (backtrack()) return true;
        groups.pop();
        return false;
      }
      for (let j = start; j < n; j++) {
        if (used[j]) continue;
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
function getByes(h, a) {
  const counts = {};
  a.forEach(p => (counts[p.name] = 0));
  h.forEach(r => r.forEach(m => {
    if (m.isBye && counts[m.players[0]] !== undefined) counts[m.players[0]]++;
  }));
  return counts;
}
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
  return Array.from({ length: g }, (_, i) => (i < extra ? base + 1 : base));
}
function genPairings(pl, h, ph, cfg, db) {
  const groupSize = Math.max(2, Number(cfg.matchMax) || 2);
  const matchRound = cfg.matchRound || "none";
  const activePlayers = pl.filter(p => !p.eliminated);
  const sorted = [...activePlayers].sort((a, b) =>
    ph === "roundrobin"
      ? getElo(db, b.name) - getElo(db, a.name)
      : b.w / (b.w + b.d + b.l || 1) - a.w / (a.w + a.d + a.l || 1) || b.score - a.score
  );
  const prev = getPrev(h, activePlayers);
  const pa = [];
  let tp = sorted;

  if (groupSize <= 2 && sorted.length % 2 === 1) {
    const byeCounts = getByes(h, activePlayers);
    const minByes = Math.min(...Object.values(byeCounts));
    let byeName = null;
    for (let i = sorted.length - 1; i >= 0; i--)
      if (byeCounts[sorted[i].name] <= minByes) { byeName = sorted[i].name; break; }
    if (!byeName) byeName = sorted[sorted.length - 1].name;
    tp = sorted.filter(p => p.name !== byeName);
    pa.push({ players: [byeName], scores: {}, result: "done", isBye: true, rematch: false, eloDeltas: {}, noElo: false });
  }

  const ns = tp.map(p => p.name);
  const mkMatch = playerNames => {
    const hasRematch = playerNames.some((p1, i) =>
      playerNames.some((p2, j) => j > i && (prev[p1] || new Set()).has(p2))
    );
    return { players: playerNames, scores: Object.fromEntries(playerNames.map(n => [n, ""])), result: null, isBye: false, rematch: hasRematch, eloDeltas: {}, noElo: false, extraPoints: {} };
  };

  let grouped = false;
  if (ns.length > 0 && ns.length % groupSize === 0) {
    let groups = findGroups(ns, prev, groupSize, false);
    if (!groups) groups = findGroups(ns, prev, groupSize, true);
    if (groups) {
      for (const group of groups) pa.push(mkMatch(group.map(i => ns[i])));
      grouped = true;
    }
  }

  if (!grouped && ns.length > 0) {
    const sizes = splitGroups(ns.length, groupSize, matchRound);
    let offset = 0;
    for (const size of sizes) {
      if (size > 0) pa.push(mkMatch(ns.slice(offset, offset + size)));
      offset += size;
    }
  }

  if (cfg.firstPlayer && groupSize === 2) {
    const firstCounts = {};
    pl.forEach(p => (firstCounts[p.name] = p.firstCount || 0));
    pa.forEach(match => {
      if (match.isBye || match.players.length !== 2) return;
      const [a, b] = match.players;
      if ((firstCounts[a] || 0) > (firstCounts[b] || 0) || ((firstCounts[a] || 0) === (firstCounts[b] || 0) && Math.random() < 0.5))
        [match.players[0], match.players[1]] = [b, a];
      firstCounts[match.players[0]] = (firstCounts[match.players[0]] || 0) + 1;
    });
  }

  return pa;
}
function rkLbl(i) {
  if (i === 0) return "Winner";
  const rank = i + 1,
    mod100 = rank % 100,
    suffix = mod100 >= 11 && mod100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[rank % 10] || "th";
  return `${rank}${suffix}`;
}
function defRanks() {
  const rawPcts = [30, 15, 15, 10, 10, 10, 5, 5],
    total = rawPcts.reduce((a, v) => a + v, 0),
    pcts = rawPcts.map((v) => Math.round((v / total) * 1000) / 10);
  pcts[pcts.length - 1] = Math.round((pcts[pcts.length - 1] + (100 - pcts.reduce((a, v) => a + v, 0))) * 10) / 10;
  return pcts.map((p, i) => ({ label: rkLbl(i), pct: p }));
}

function calcAlloc(players, prizes, ranks, entryCost, prizePct, prizePctUp, ruPct, ruPctUp) {
  const totalPool = entryCost * players.length;
  if (!totalPool || !ranks.length || !prizes.length) return null;
  const prizePercent = prizePct || 50;
  const rawAllocated = (players.length * prizePercent) / 100;
  const allocated = prizePctUp ? Math.ceil(rawAllocated) : Math.floor(rawAllocated);
  if (allocated < 1) return null;
  const runupPercent = ruPct || 50;
  const rawRunup = (allocated * runupPercent) / 100;
  const runupCount = ruPctUp ? Math.ceil(rawRunup) : Math.floor(rawRunup);
  const prizeRanks = ranks.slice(0, allocated),
    inventory = prizes.map((p) => ({ ...p }));
  const guaranteedByRank = {};
  const avoidMap = {};
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
        if (!roundDown && val + q * available[i].value > target + (best ? best.value - target : Infinity)) break;
      }
    }
    search(0, [], 0);
    return best;
  }
  let grandTotal = 0;
  const allocs = prizeRanks.map((r, ri) => {
    const roundDown = ri >= runupCount;
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
