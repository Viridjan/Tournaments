// ═══════════════════════════════════════════════════════
// Initial state and reducer — all state transitions
// All app state lives in this reducer. Key groups:

//   Navigation: OPEN_TOURNAMENT, SET_TAB
const init = {
  screen: "landing",
  tournamentId: null,
  players: [],
  currentRound: 0,
  phase: "roundrobin",
  pairings: [],
  history: [],
  matchLog: [],
  tournamentStarted: false,
  startedAt: null,
  eloDb: (() => {
    const raw = loadLS(EK, {});
    const vals = Object.values(raw);
    if (vals.length > 0 && vals.some((v) => v && typeof v === "object" && "elo" in v)) {
      const db = {};
      vals.forEach((e) => { if (e?.name) db[e.name.toLowerCase()] = e; });
      return { "ELO": db };
    }
    const result = {};
    Object.entries(raw).forEach(([sh, entries]) => {
      if (entries && typeof entries === "object") {
        const db = {};
        Object.values(entries).forEach((e) => { if (e?.name) db[e.name.toLowerCase()] = e; });
        result[sh] = db;
      }
    });
    return result;
  })(),
  activeTab: "players",
  matchSubTab: "pairings",
  prizes: [
    { name: "Pauper", value: 7, maxQty: 1, maxQtyPerPlayer: 1, guaranteed: "1", avoid: "" },
    { name: "Tournament", value: 5, maxQty: 1, maxQtyPerPlayer: 1, guaranteed: "2", avoid: "" },
    { name: "Booster", value: 6, maxQty: 99, maxQtyPerPlayer: 99, guaranteed: "", avoid: "" },
    { name: "Token", value: 3, maxQty: 99, maxQtyPerPlayer: 1, guaranteed: "", avoid: "" },
  ],
  ranks: defRanks(),
  entryCost: 3,
  prizePct: 50,
  prizePctRoundUp: false,
  roundUpPct: 50,
  roundUpPctRoundUp: true,
  spinnerOptions: [
    { name: "Small decks", weight: 20 },
    { name: "Plancia commanders", weight: 13 },
    { name: "Two heads bozos", weight: 20 },
    { name: "Vintage lands", weight: 20 },
    { name: "Drafting commanders", weight: 13 },
    { name: "Ante", weight: 20 },
    { name: "Pain rare", weight: 20 },
  ],
  tournaments: {},
  featureOverrides: {},
  testMode: false,
  experimental: false,
  advancedSetup: false,
  sheetsUrl: getSheetsUrl(),
};

function featureBase(st) {
  return st.tournaments[st.tournamentId]?.features || {};
}

function reducer(st, a) {
  switch (a.type) {
    // ── Navigation ──
    case "OPEN_TOURNAMENT":
      return {
        ...st,
        screen: "tournament",
        tournamentId: a.id,
        activeTab: "players",
        matchSubTab: "pairings",
        featureOverrides: {},
        players: [],
        currentRound: 0,
        phase: "roundrobin",
        pairings: [],
        history: [],
        matchLog: [],
        tournamentStarted: false,
        startedAt: null,
      };
    case "SET_TAB":
      return { ...st, activeTab: a.tab };
    case "SET_MATCH_SUBTAB":
      return { ...st, matchSubTab: a.tab };
    // ── Player management ──
    case "ADD_PLAYER": {
      const n = a.name.trim();
      if (!n || st.players.some((p) => p.name.toLowerCase() === n.toLowerCase())) return st;
      return {
        ...st,
        players: [
          ...st.players,
          { name: n, score: 0, w: 0, d: 0, l: 0, eliminated: false, paid: false, firstCount: 0 },
        ],
      };
    }
    case "REMOVE_PLAYER":
      return { ...st, players: st.players.filter((_, i) => i !== a.index) };
    case "TOGGLE_PAID":
      return {
        ...st,
        players: st.players.map((p, i) => (i === a.index ? { ...p, paid: !p.paid } : p)),
      };
    case "ABANDON_PLAYER": {
      const abandoned = st.players[a.index];
      if (!abandoned) return st;
      const pl = st.players.map((p, i) =>
        i === a.index ? { ...p, eliminated: true, score: 0 } : p,
      );
      const pa = st.pairings.map((m) => {
        if (m.result || m.isBye || m.players.length !== 2) return m;
        if (!m.players.includes(abandoned.name)) return m;
        const winner = m.players.find(n => n !== abandoned.name);
        const scores = Object.fromEntries(m.players.map(n => [n, n === winner ? 1 : 0]));
        return { ...m, scores, result: "done", noElo: true, forfeit: true };
      });
      return {
        ...st,
        players: pl,
        pairings: pa,
        matchLog: [...st.matchLog, { type: "abandon", label: `${abandoned.name} abandoned`, ts: now() }],
      };
    }
    // ── Tournament flow ──
    case "START_TOURNAMENT": {
      const cfg = { ...st.tournaments[st.tournamentId]?.features, ...st.featureOverrides };
      if (!cfg) return st;
      const ss = cfg.startScore ?? 0;
      const activeElo = st.eloDb[cfg.eloDB || "ELO"] || {};
      const pl = st.players.map((p) => ({
        ...p,
        score: ss,
        gpScores: [],
        w: 0,
        d: 0,
        l: 0,
        p1: 0,
        p2: 0,
        p3: 0,
        pLast: 0,
        eliminated: false,
        firstCount: 0,
        eloStart: getElo(activeElo, p.name),
      }));
      const ph = cfg.rrRounds > 0 ? "roundrobin" : "swiss";
      const ns = {
        ...st,
        players: pl,
        currentRound: 1,
        phase: ph,
        history: [],
        tournamentStarted: true,
        startedAt: Date.now(),
        matchLog: [
          { type: "start", label: `Tournament started — ${pl.length} players`, ts: now() },
        ],
        activeTab: "matches",
        matchSubTab: cfg.draft ? "draft" : "pairings",
      };
      return { ...ns, pairings: makePairings(ns, pl, [], ph) };
    }
    case "SET_MATCH_RESULT":
      return {
        ...st,
        pairings: st.pairings.map((m, i) => {
          if (i !== a.index) return m;
          if (a.reset) return { ...m, scores: Object.fromEntries(m.players.map(n => [n, ""])), result: null };
          return { ...m, scores: a.scores, result: "done" };
        }),
      };
    case "SET_MATCH_SCORE":
      return {
        ...st,
        pairings: st.pairings.map((m, i) => {
          if (i !== a.index) return m;
          const scores = { ...m.scores, [a.player]: a.value.replace(/[^0-9.\-]/g, "") };
          const done = m.players.every(n => String(scores[n]).trim() !== "");
          return { ...m, scores, result: done ? "done" : null };
        }),
      };
    case "ADD_EXTRA_POINTS": {
      const delta = a.delta || 1;
      return {
        ...st,
        players: st.players.map((p) =>
          p.name !== a.player ? p : { ...p, score: p.score + delta, extraScore: (p.extraScore || 0) + delta }
        ),
        pairings: st.pairings.map((m, i) => {
          if (i !== a.index) return m;
          const ep = { ...(m.extraPoints || {}), [a.player]: ((m.extraPoints || {})[a.player] || 0) + delta };
          return { ...m, extraPoints: ep };
        }),
      };
    }
    case "NEXT_ROUND": {
      const cfg = { ...st.tournaments[st.tournamentId]?.features, ...st.featureOverrides };
      if (!cfg) return st;
      const eloNs = cfg.eloDB || "ELO";
      let pl = st.players.map((p) => ({ ...p })),
        db = { ...(st.eloDb[eloNs] || {}) };
      const sc = cfg.scoring,
        rp = st.pairings.map((m) => ({ ...m }));
      rp.forEach((m) => {
        if (m.isBye || m.result !== "done") return;
        const scored = m.players.filter((n) => String(m.scores[n]).trim() !== "");
        if (!scored.length) return;
        const sorted = [...scored].sort((a, b) => parseFloat(m.scores[b] || 0) - parseFloat(m.scores[a] || 0));
        const topScore = parseFloat(m.scores[sorted[0]] || 0);

        if (sc === "points") {
          const ptMap = [
            cfg.pts1 !== "" && cfg.pts1 !== undefined ? Number(cfg.pts1) : 3,
            cfg.pts2 !== "" && cfg.pts2 !== undefined ? Number(cfg.pts2) : 2,
            cfg.pts3 !== "" && cfg.pts3 !== undefined ? Number(cfg.pts3) : 1,
          ];
          const ptsLast = cfg.ptsLast !== "" && cfg.ptsLast !== undefined ? Number(cfg.ptsLast) : 0;
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
            const pts = isLast || g.score === 0 ? ptsLast : (ptMap[rank - 1] ?? ptsLast);
            g.players.forEach((n) => {
              const p = pl.find((x) => x.name === n);
              if (!p) return;
              if (cfg.grandPrix) {
                if (!p.gpScores) p.gpScores = [];
                p.gpScores.push(pts);
                p.score = gpBestOf(p.gpScores, cfg.gpBestOfLast, cfg.gpDropWorst) + (p.extraScore || 0);
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
        } else if (sc === "swiss") {
          const tied = sorted.filter(n => parseFloat(m.scores[n] || 0) === topScore);
          const multi = tied.length > 1;
          sorted.forEach(n => {
            const p = pl.find(x => x.name === n);
            if (!p) return;
            const isTop = parseFloat(m.scores[n] || 0) === topScore;
            let pts;
            if (isTop && multi) { p.d++; pts = cfg.drawPoints ?? 1; }
            else if (isTop)     { p.w++; pts = cfg.winPoints ?? 3; }
            else                { p.l++; pts = cfg.lossPoints ?? 0; }
            if (cfg.grandPrix) {
              if (!p.gpScores) p.gpScores = [];
              p.gpScores.push(pts);
              p.score = gpBestOf(p.gpScores, cfg.gpBestOfLast, cfg.gpDropWorst) + (p.extraScore || 0);
            } else {
              p.score += pts;
            }
          });
        } else if (sc === "lifepoints") {
          const draw = sorted.every(n => parseFloat(m.scores[n] || 0) === topScore);
          sorted.forEach(n => {
            const p = pl.find(x => x.name === n);
            if (!p) return;
            const isTop = parseFloat(m.scores[n] || 0) === topScore;
            if (draw) {
              p.d++;
              const dp = cfg.cumulativeDrawPenalty ? 0.5 * p.d : 0.5;
              p.score = Math.max(0, p.score - dp);
              if (p.score <= 0) p.eliminated = true;
            } else if (isTop) {
              p.w++;
            } else {
              p.l++;
              p.score = Math.max(0, p.score - 1);
              if (p.score <= 0) p.eliminated = true;
            }
          });
        }

        if (cfg.elo && !m.noElo) {
          const n = m.players.length,
            K = (cfg.eloKMax || 50) / n,
            dl = Object.fromEntries(m.players.map((p) => [p, 0]));
          for (let i = 0; i < n; i++)
            for (let j = i + 1; j < n; j++) {
              const pA = m.players[i], pB = m.players[j],
                sA = parseFloat(m.scores[pA] || 0), sB = parseFloat(m.scores[pB] || 0),
                rA = getElo(db, pA), rB = getElo(db, pB),
                eA = eloExpected(rA, rB, cfg.eloScale),
                scA = sA > sB ? 1 : sA < sB ? 0 : 0.5;
              dl[pA] += K * (scA - eA);
              dl[pB] += K * ((1 - scA) - (1 - eA));
            }
          m.eloDeltas = {};
          m.players.forEach((p) => {
            const d = Math.round(dl[p]);
            m.eloDeltas[p] = d;
            db = setElo(db, p, getElo(db, p) + d, db[p.toLowerCase()]?.test);
          });
        }
      });
      const h = [...st.history, rp],
        nr = st.currentRound + 1;
      let ph = st.phase;
      if (ph === "roundrobin" && nr > cfg.rrRounds) ph = "swiss";
      const activePlayers = pl.filter((p) => !p.eliminated),
        go = cfg.scoring === "lifepoints" && activePlayers.length <= 1;
      const newEloDb = { ...st.eloDb, [eloNs]: db };
      const ns = {
        ...st,
        players: pl,
        eloDb: newEloDb,
        history: h,
        currentRound: nr,
        phase: ph,
        matchLog: [
          ...st.matchLog,
          { type: "round", label: `Round ${st.currentRound} completed`, ts: now() },
        ],
        activeTab: "matches",
        matchSubTab: go ? "standings" : st.matchSubTab,
      };
      saveLS(EK, newEloDb);
      return { ...ns, pairings: go ? [] : makePairings(ns, pl, h, ph) };
    }
    case "END_TOURNAMENT": {
      try {
        localStorage.removeItem(BK + "_" + st.tournamentId);
        localStorage.removeItem(BK_LAST);
      } catch {}
      const sorted = [...st.players].sort((a, b) => b.score - a.score || b.w - a.w);
      return {
        ...st,
        players: st.players.map((p) => (p.name === sorted[0]?.name ? p : { ...p, eliminated: true })),
        activeTab: "matches",
        matchSubTab: "standings",
      };
    }
    case "NEW_GP_SESSION": {
      const cfg = { ...st.tournaments[st.tournamentId]?.features, ...st.featureOverrides };
      if (!cfg) return st;
      const ph = cfg.rrRounds > 0 ? "roundrobin" : "swiss";
      const ns = { ...st, currentRound: 1, phase: ph, pairings: [] };
      return { ...ns, pairings: makePairings(ns, st.players, st.history, ph) };
    }
    // ── Remote data ──
    case "SET_TOURNAMENTS": {
      const tournaments = {};
      a.tournaments.forEach((t) => { if (t.id) tournaments[t.id] = t; });
      return { ...st, tournaments };
    }
    case "SET_ELO_DB": {
      const sheet = a.col || "ELO";
      const db = {};
      Object.values(a.db).forEach((e) => {
        if (e?.name) db[e.name.toLowerCase()] = e;
      });
      const newEloDb = { ...st.eloDb, [sheet]: db };
      saveLS(EK, newEloDb);
      return { ...st, eloDb: newEloDb };
    }

    // ── Prizes ──
    case "ADD_PRIZE":
      return {
        ...st,
        prizes: [
          ...st.prizes,
          { name: "", value: 0, maxQty: 1, maxQtyPerPlayer: 1, guaranteed: "", avoid: "" },
        ],
      };
    case "REMOVE_PRIZE":
      return { ...st, prizes: st.prizes.filter((_, i) => i !== a.index) };
    case "UPDATE_PRIZE":
      return {
        ...st,
        prizes: st.prizes.map((p, i) => (i === a.index ? { ...p, [a.field]: a.value } : p)),
      };
    case "UPDATE_RANK":
      return {
        ...st,
        ranks: st.ranks.map((r, i) => (i === a.index ? { ...r, [a.field]: a.value } : r)),
      };
    case "SET_ENTRY_COST":
      return { ...st, entryCost: a.value };
    case "SET_PRIZE_PCT":
      return { ...st, prizePct: a.value };
    case "SET_PRIZE_PCT_ROUNDUP":
      return { ...st, prizePctRoundUp: a.value };
    case "SET_ROUNDUP_PCT":
      return { ...st, roundUpPct: a.value };
    case "SET_ROUNDUP_PCT_ROUNDUP":
      return { ...st, roundUpPctRoundUp: a.value };
    case "ADD_SPINNER_OPTION":
      return { ...st, spinnerOptions: [...st.spinnerOptions, a.option] };
    case "REMOVE_SPINNER_OPTION":
      return { ...st, spinnerOptions: st.spinnerOptions.filter((_, i) => i !== a.index) };
    case "UPDATE_SPINNER_WEIGHT":
      return {
        ...st,
        spinnerOptions: st.spinnerOptions.map((o, i) =>
          i === a.index ? { ...o, weight: Math.max(1, parseInt(a.value) || 1) } : o,
        ),
      };
    // ── Dev / test ──
    case "INJECT_TEST_PLAYERS": {
      const ns = [
        "Alice",
        "Bob",
        "Carol",
        "Dave",
        "Eve",
        "Frank",
        "Grace",
        "Hank",
        "Iris",
        "Jack",
        "Karen",
        "Leo",
        "Mia",
        "Ned",
        "Olivia",
        "Pete",
        "Quinn",
        "Rose",
        "Sam",
        "Tina",
        "Uma",
        "Victor",
        "Wendy",
        "Xander",
        "Yara",
        "Zoe",
        "Aaron",
        "Beth",
        "Caleb",
        "Diana",
        "Ethan",
        "Fiona",
        "George",
        "Hannah",
        "Ivan",
        "Julia",
      ];
      const testNs = (st.tournaments?.[st.tournamentId] ?
        { ...st.tournaments[st.tournamentId]?.features, ...st.featureOverrides }.eloDB
        : null) || "ELO";
      let db = { ...(st.eloDb[testNs] || {}) };
      const pl = [];
      for (let i = 0; i < a.count; i++) {
        const n = ns[i] || `Player ${i + 1}`;
        db = setElo(db, n, 800 + Math.floor(Math.random() * 800), true);
        pl.push({
          name: n,
          score: 0,
          w: 0,
          d: 0,
          l: 0,
          eliminated: false,
          paid: false,
          firstCount: 0,
        });
      }
      return { ...st, players: pl, eloDb: { ...st.eloDb, [testNs]: db } };
    }
    case "AUTO_SELECT_WINNERS": {
      const autoC = { ...st.tournaments[st.tournamentId]?.features, ...st.featureOverrides };
      return {
        ...st,
        pairings: st.pairings.map((m) => {
          if (m.result || m.isBye) return m;
          if (autoC?.scoring === "points") {
            const sc = { ...m.scores };
            m.players.forEach((n) => { sc[n] = String(Math.floor(Math.random() * 21)); });
            return { ...m, scores: sc, result: "done" };
          }
          const wi = Math.floor(Math.random() * m.players.length);
          const scores = Object.fromEntries(m.players.map((n, i) => [n, i === wi ? 1 : 0]));
          return { ...m, scores, result: "done" };
        }),
      };
    }
    // ── Session / settings ──
    case "FULL_RESET":
      try {
        localStorage.removeItem(BK + "_" + st.tournamentId);
        localStorage.removeItem(BK_LAST);
      } catch {}
      return {
        ...init,
        eloDb: {},
        screen: "tournament",
        tournamentId: st.tournamentId,
        activeTab: "players",
        sheetsUrl: st.sheetsUrl,
      };
    case "SET_SHEETS_URL":
      try {
        if (a.url) localStorage.setItem(SK, a.url);
        else localStorage.removeItem(SK);
      } catch {}
      return { ...st, sheetsUrl: a.url };
    case "LOG_EVENT":
      return {
        ...st,
        matchLog: [...st.matchLog, { type: a.eventType, label: a.label, ts: now() }],
      };
    case "TOGGLE_FEATURE": {
      const ov = { ...st.featureOverrides };
      const base = featureBase(st);
      if (ov[a.key] !== undefined) delete ov[a.key];
      else ov[a.key] = !base[a.key];
      return { ...st, featureOverrides: ov };
    }
    case "SET_FEATURE": {
      const ov = { ...st.featureOverrides };
      const base = featureBase(st);
      if (a.value === base[a.key]) delete ov[a.key];
      else ov[a.key] = a.value;
      return { ...st, featureOverrides: ov };
    }
    case "SET_TEST_MODE":
      return { ...st, testMode: a.value };
    case "SET_EXPERIMENTAL":
      return { ...st, experimental: a.value };
    case "SET_ADVANCED":
      return { ...st, advancedSetup: a.value };
    case "RESTORE_SNAPSHOT": {
      const snap = a.snapshot;
      return {
        ...st,
        ...snap.state,
        tournamentStarted: !!snap.tournamentStarted,
        tournamentId: snap.tournamentMode || st.tournamentId,
        prizes: snap.prizes || st.prizes,
        ranks: snap.ranks || st.ranks,
        entryCost: snap.entryCost ?? st.entryCost,
        prizePct: snap.prizePct ?? st.prizePct,
        prizePctRoundUp: snap.prizePctRoundUp ?? st.prizePctRoundUp,
        roundUpPct: snap.roundUpPct ?? st.roundUpPct,
        roundUpPctRoundUp: snap.roundUpPctRoundUp ?? st.roundUpPctRoundUp,
        featureOverrides: snap.featureOverrides || st.featureOverrides,
        testMode: snap.testMode ?? st.testMode,
        experimental: snap.experimental ?? st.experimental,
        advancedSetup: snap.advancedSetup ?? st.advancedSetup,
        screen: "tournament",
        activeTab: snap.tournamentStarted ? "matches" : "players",
      };
    }
    default:
      return st;
  }
}
