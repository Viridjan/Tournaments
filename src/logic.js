// ═══════════════════════════════════════════════════════
// Pure functions: ELO, pairing, scoring, prizes (no DOM, no state)
function gpBestOf(scores, last, drop) {
  const l = Math.max(2, Number(last) || 4);
  const d = Math.max(0, Number(drop) || 1);
  if (scores.length <= l - d) return scores.reduce((a, b) => a + b, 0);
  const recent = scores.slice(-l);
  const sorted = [...recent].sort((a, b) => a - b);
  return sorted.slice(d).reduce((a, b) => a + b, 0);
}
function eloExpected(a, b, scale) {
  return 1 / (1 + Math.pow(10, (b - a) / (scale || ES)));
}
function getElo(d, n) {
  return d[n.toLowerCase()]?.elo ?? ED;
}
function setElo(d, n, e, t) {
  return { ...d, [n.toLowerCase()]: { elo: e, name: n, test: !!t } };
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
  function bt() {
    const i = used.indexOf(false);
    if (i === -1) return true;
    used[i] = true;
    function pick(group, start) {
      if (group.length === groupSize) {
        groups.push([...group]);
        if (bt()) return true;
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
  return bt() ? groups : null;
}
function getPrev(h, a) {
  const s = new Set(a.map(p => p.name)), m = {};
  h.forEach(r => r.forEach(x => {
    if (x.isBye) return;
    const inv = x.players.filter(n => s.has(n));
    inv.forEach((n1, i) => inv.forEach((n2, j) => {
      if (i !== j) (m[n1] = m[n1] || new Set()).add(n2);
    }));
  }));
  return m;
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
  const pr = getPrev(h, activePlayers);
  const pa = [];
  let tp = sorted;

  if (groupSize <= 2 && sorted.length % 2 === 1) {
    const bc = getByes(h, activePlayers);
    const mb = Math.min(...Object.values(bc));
    let byeName = null;
    for (let i = sorted.length - 1; i >= 0; i--)
      if (bc[sorted[i].name] <= mb) { byeName = sorted[i].name; break; }
    if (!byeName) byeName = sorted[sorted.length - 1].name;
    tp = sorted.filter(p => p.name !== byeName);
    pa.push({ players: [byeName], scores: {}, result: "done", isBye: true, rematch: false, eloDeltas: {}, noElo: false });
  }

  const ns = tp.map(p => p.name);
  const mkMatch = playerNames => {
    const hasRematch = playerNames.some((p1, i) =>
      playerNames.some((p2, j) => j > i && (pr[p1] || new Set()).has(p2))
    );
    return { players: playerNames, scores: Object.fromEntries(playerNames.map(n => [n, ""])), result: null, isBye: false, rematch: hasRematch, eloDeltas: {}, noElo: false };
  };

  let grouped = false;
  if (ns.length > 0 && ns.length % groupSize === 0) {
    let groups = findGroups(ns, pr, groupSize, false);
    if (!groups) groups = findGroups(ns, pr, groupSize, true);
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

  if (c.firstPlayer && groupSize === 2) {
    const cm = {};
    pl.forEach(p => (cm[p.name] = p.firstCount || 0));
    pa.forEach(mm => {
      if (mm.isBye || mm.players.length !== 2) return;
      const [a, b] = mm.players;
      if ((cm[a] || 0) > (cm[b] || 0) || ((cm[a] || 0) === (cm[b] || 0) && Math.random() < 0.5))
        [mm.players[0], mm.players[1]] = [b, a];
      cm[mm.players[0]] = (cm[mm.players[0]] || 0) + 1;
    });
  }

  return pa;
}
function rkLbl(i) {
  if (i === 0) return "Winner";
  const n = i + 1,
    s = n % 100,
    x = s >= 11 && s <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  return `${n}${x}`;
}
function defRanks() {
  const t = [30, 15, 15, 10, 10, 10, 5, 5],
    s = t.reduce((a, v) => a + v, 0),
    o = t.map((v) => Math.round((v / s) * 1000) / 10);
  o[o.length - 1] = Math.round((o[o.length - 1] + (100 - o.reduce((a, v) => a + v, 0))) * 10) / 10;
  return o.map((p, i) => ({ label: rkLbl(i), pct: p }));
}

function calcAlloc(pl, pr, rk, ec, prizePct, prizePctUp, ruPct, ruPctUp) {
  const tp = ec * pl.length;
  if (!tp || !rk.length || !pr.length) return null;
  const ppct = prizePct || 50;
  const rawAc = (pl.length * ppct) / 100;
  const allocated = prizePctUp ? Math.ceil(rawAc) : Math.floor(rawAc);
  if (allocated < 1) return null;
  const rupct = ruPct || 50;
  const rawRu = (allocated * rupct) / 100;
  const ruCount = ruPctUp ? Math.ceil(rawRu) : Math.floor(rawRu);
  const ar = rk.slice(0, allocated),
    inv = pr.map((p) => ({ ...p }));
  const gbr = {};
  const avoidMap = {};
  inv.forEach((p) => {
    const gList = String(p.guaranteed || "")
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => n > 0 && n <= ar.length);
    gList.forEach((g) => {
      if (p.maxQty > 0) {
        (gbr[g - 1] = gbr[g - 1] || []).push({
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
  function fbc(tgt, rd, avoided) {
    const av = inv.filter((p) => p.maxQty > 0 && p.value > 0 && !(avoided && avoided.has(p.name))),
      mu = av.map((p) =>
        Math.max(
          0,
          Math.min((p.maxQtyPerPlayer || 1) <= 1 ? 1 : p.maxQty, Math.ceil(tgt / p.value) + 1),
        ),
      );
    let best = null;
    function con(c, v) {
      if (rd ? v <= tgt : v >= tgt)
        if (!best || (rd ? v > best.value : v < best.value)) best = { combo: c.slice(), value: v };
    }
    function dfs(i, c, v) {
      if (i >= av.length) {
        con(c, v);
        return;
      }
      for (let q = 0; q <= mu[i]; q++) {
        c.push({ prize: av[i], qty: q });
        dfs(i + 1, c, v + q * av[i].value);
        c.pop();
        if (!rd && v + q * av[i].value > tgt + (best ? best.value - tgt : Infinity)) break;
      }
    }
    dfs(0, [], 0);
    return best;
  }
  let gt = 0;
  const al = ar.map((r, ri) => {
    const rd = ri >= ruCount;
    const tgt = (tp * r.pct) / 100;
    const ch = (gbr[ri] || []).map((g) => ({ ...g }));
    let f = ch.reduce((s, c) => s + c.total, 0);
    const rem = tgt - f;
    if (rem > 0.001) {
      const res = fbc(rem, rd, avoidMap[ri]);
      if (res)
        res.combo.forEach(({ prize, qty }) => {
          if (qty > 0) {
            const ip = inv.find((x) => x.name === prize.name),
              ex = ch.find((c) => c.name === prize.name);
            if (ex) {
              ex.qty += qty;
              ex.total += qty * prize.value;
            } else ch.push({ name: prize.name, value: prize.value, qty, total: qty * prize.value });
            ip.maxQty -= qty;
            f += qty * prize.value;
          }
        });
    }
    if (!ch.length) {
      const cheapest = inv.filter((p) => p.maxQty > 0 && p.value > 0).sort((a, b) => a.value - b.value)[0];
      if (cheapest) {
        ch.push({ name: cheapest.name, value: cheapest.value, qty: 1, total: cheapest.value });
        cheapest.maxQty--;
      }
    }
    const av = ch.reduce((s, c) => s + c.total, 0);
    gt += av;
    return { rank: r.label, target: tgt, chosen: ch, actualValue: av };
  });
  const tk =
    inv.find((p) => p.name === "Token" && p.value > 0) ||
    inv.filter((p) => p.value > 0).sort((a, b) => a.value - b.value)[0];
  if (tk)
    for (let h = 0; h < al.length - 1; h++)
      for (let l = h + 1; l < al.length; l++)
        while (al[h].actualValue < al[l].actualValue && tk.maxQty > 0) {
          const ex = al[h].chosen.find((c) => c.name === tk.name);
          if (ex) {
            ex.qty++;
            ex.total += tk.value;
          } else al[h].chosen.push({ name: tk.name, value: tk.value, qty: 1, total: tk.value });
          al[h].actualValue += tk.value;
          gt += tk.value;
          tk.maxQty--;
        }
  return { allocs: al, totalPool: tp, grandTotal: gt };
}
