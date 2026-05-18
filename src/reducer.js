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
    const raw = lLS(EK, {});
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
  sheetsUrl: gSU(),
};

function reducer(st, a) {
  switch (a.type) {
    case "OPEN_TOURNAMENT":
      return { ...st, screen: "tournament", tournamentId: a.id, activeTab: "players", featureOverrides: {} };
    case "SET_TAB":
      return { ...st, activeTab: a.tab };
    case "SET_MATCH_SUBTAB":
      return { ...st, matchSubTab: a.tab };
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
      const ab = st.players[a.index];
      if (!ab) return st;
      const pl = st.players.map((p, i) =>
        i === a.index ? { ...p, eliminated: true, score: 0 } : p,
      );
      const pa = st.pairings.map((m) => {
        if (m.result || m.isBye || m.players.length !== 2) return m;
        if (!m.players.includes(ab.name)) return m;
        const winner = m.players.find(n => n !== ab.name);
        const scores = Object.fromEntries(m.players.map(n => [n, n === winner ? 1 : 0]));
        return { ...m, scores, result: "done", noElo: true, forfeit: true };
      });
      return {
        ...st,
        players: pl,
        pairings: pa,
        matchLog: [...st.matchLog, { type: "abandon", label: `${ab.name} abandoned`, ts: now() }],
      };
    }
    case "START_TOURNAMENT": {
      const c = { ...st.tournaments[st.tournamentId]?.features, ...st.featureOverrides };
      if (!c) return st;
      const ss = c.startScore ?? 0;
      const activeElo = st.eloDb[c.eloDB || "ELO"] || {};
      const pl = st.players.map((p) => ({
        ...p,
        score: ss,
        gpScores: [],
        w: 0,
        d: 0,
        l: 0,
        eliminated: false,
        firstCount: 0,
        eloStart: gE(activeElo, p.name),
      }));
      const ph = c.rrRounds > 0 ? "roundrobin" : "swiss";
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
        matchSubTab: c.draft ? "draft" : "pairings",
      };
      return { ...ns, pairings: mkP(ns, pl, [], ph) };
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
    case "NEXT_ROUND": {
      const c = { ...st.tournaments[st.tournamentId]?.features, ...st.featureOverrides };
      if (!c) return st;
      const eloNs = c.eloDB || "ELO";
      let pl = st.players.map((p) => ({ ...p })),
        db = { ...(st.eloDb[eloNs] || {}) };
      const sc = c.scoring,
        rp = st.pairings.map((m) => ({ ...m }));
      rp.forEach((m) => {
        if (m.isBye || m.result !== "done") return;
        const fl = m.players.filter((n) => String(m.scores[n]).trim() !== "");
        if (!fl.length) return;
        const so = [...fl].sort((a, b) => parseFloat(m.scores[b] || 0) - parseFloat(m.scores[a] || 0));
        const topScore = parseFloat(m.scores[so[0]] || 0);

        if (sc === "points") {
          const ptMap = [
            c.pts1 !== "" && c.pts1 !== undefined ? Number(c.pts1) : 3,
            c.pts2 !== "" && c.pts2 !== undefined ? Number(c.pts2) : 2,
            c.pts3 !== "" && c.pts3 !== undefined ? Number(c.pts3) : 1,
          ];
          const ptsLast = c.ptsLast !== "" && c.ptsLast !== undefined ? Number(c.ptsLast) : 0;
          const groups = [];
          let gi = 0;
          while (gi < so.length) {
            const gs = parseFloat(m.scores[so[gi]] || 0);
            let gj = gi;
            while (gj < so.length && parseFloat(m.scores[so[gj]] || 0) === gs) gj++;
            groups.push({ players: so.slice(gi, gj), score: gs });
            gi = gj;
          }
          const multiGroup = groups.length > 1;
          let rank = 1;
          groups.forEach((g, idx) => {
            const isLast = multiGroup && idx === groups.length - 1;
            const pts = isLast || g.score === 0 ? ptsLast : (ptMap[rank - 1] ?? ptsLast);
            g.players.forEach((n) => {
              const p = pl.find((x) => x.name === n);
              if (!p) return;
              if (c.grandPrix) {
                if (!p.gpScores) p.gpScores = [];
                p.gpScores.push(pts);
                p.score = gpBestOf(p.gpScores);
              } else {
                p.score += pts;
              }
              pts > 0 ? p.w++ : p.l++;
            });
            rank += g.players.length;
          });
        } else if (sc === "swiss") {
          const tied = so.filter(n => parseFloat(m.scores[n] || 0) === topScore);
          const multi = tied.length > 1;
          so.forEach(n => {
            const p = pl.find(x => x.name === n);
            if (!p) return;
            const isTop = parseFloat(m.scores[n] || 0) === topScore;
            if (isTop && multi) { p.d++; p.score += c.drawPoints ?? 1; }
            else if (isTop)     { p.w++; p.score += c.winPoints ?? 3; }
            else                { p.l++; p.score += c.lossPoints ?? 0; }
          });
        } else if (sc === "lifepoints") {
          const draw = so.every(n => parseFloat(m.scores[n] || 0) === topScore);
          so.forEach(n => {
            const p = pl.find(x => x.name === n);
            if (!p) return;
            const isTop = parseFloat(m.scores[n] || 0) === topScore;
            if (draw) {
              p.d++;
              const dp = c.cumulativeDrawPenalty ? 0.5 * p.d : 0.5;
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

        if (c.elo && !m.noElo) {
          const n = m.players.length,
            K = (c.eloKMax || 50) / n,
            dl = Object.fromEntries(m.players.map((p) => [p, 0]));
          for (let i = 0; i < n; i++)
            for (let j = i + 1; j < n; j++) {
              const pA = m.players[i], pB = m.players[j],
                sA = parseFloat(m.scores[pA] || 0), sB = parseFloat(m.scores[pB] || 0),
                rA = gE(db, pA), rB = gE(db, pB),
                eA = eExp(rA, rB, c.eloScale),
                scA = sA > sB ? 1 : sA < sB ? 0 : 0.5;
              dl[pA] += K * (scA - eA);
              dl[pB] += K * ((1 - scA) - (1 - eA));
            }
          m.eloDeltas = {};
          m.players.forEach((p) => {
            const d = Math.round(dl[p]);
            m.eloDeltas[p] = d;
            db = sE(db, p, gE(db, p) + d, db[p.toLowerCase()]?.test);
          });
        }
      });
      const h = [...st.history, rp],
        nr = st.currentRound + 1;
      let ph = st.phase;
      if (ph === "roundrobin" && nr > c.rrRounds) ph = "swiss";
      const ac = pl.filter((p) => !p.eliminated),
        go = c.scoring === "lifepoints" && ac.length <= 1;
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
        activeTab: go ? "standings" : st.activeTab,
      };
      sLS(EK, newEloDb);
      return { ...ns, pairings: go ? [] : mkP(ns, pl, h, ph) };
    }
    case "END_TOURNAMENT": {
      try {
        localStorage.removeItem(BK);
      } catch {}
      const so = [...st.players].sort((a, b) => b.score - a.score || b.w - a.w);
      return {
        ...st,
        players: st.players.map((p) => (p.name === so[0]?.name ? p : { ...p, eliminated: true })),
        activeTab: "standings",
      };
    }
    case "NEW_GP_SESSION": {
      const c = { ...st.tournaments[st.tournamentId]?.features, ...st.featureOverrides };
      if (!c) return st;
      const ph = c.rrRounds > 0 ? "roundrobin" : "swiss";
      const ns = { ...st, currentRound: 1, phase: ph, pairings: [] };
      return { ...ns, pairings: mkP(ns, st.players, st.history, ph) };
    }
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
      sLS(EK, newEloDb);
      return { ...st, eloDb: newEloDb };
    }

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
        db = sE(db, n, 800 + Math.floor(Math.random() * 800), true);
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
    case "FULL_RESET":
      try {
        localStorage.removeItem(BK);
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
      const base = st.tournaments[st.tournamentId]?.features || {};
      if (ov[a.key] !== undefined) delete ov[a.key];
      else ov[a.key] = !base[a.key];
      return { ...st, featureOverrides: ov };
    }
    case "SET_FEATURE": {
      const ov = { ...st.featureOverrides };
      const base = st.tournaments[st.tournamentId]?.features || {};
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
