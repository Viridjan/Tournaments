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
    // ELO db structure: { sheetName → { playerNameLower → { elo, name, test } } }
    // Legacy format (v1) stored entries flat at the top level (no sheet grouping).
    // Detect legacy by checking if any top-level value has an "elo" key directly,
    // and migrate it into the default "ELO" sheet on first load.
    const raw = loadLS(LS_ELO_DB, {});
    const vals = Object.values(raw);
    if (vals.length > 0 && vals.some((v) => v && typeof v === "object" && "elo" in v)) {
      // Legacy flat format — migrate to { "ELO": { ... } }
      const db = {};
      vals.forEach((e) => { if (e?.name) db[e.name.toLowerCase()] = e; });
      return { "ELO": db };
    }
    // Current format — normalize all entries to lowercase keys
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
  draftEnded: false,
  prizes: PRIZES,
  ranks: defRanks(),
  spinnerOptions: SPINNER_OPTIONS,
  tournaments: {},
  globalSettings: {},
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
        draftEnded: false,
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
      const name = a.name.trim();
      if (!name || st.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return st;
      return {
        ...st,
        players: [
          ...st.players,
          { name, score: 0, w: 0, d: 0, l: 0, eliminated: false, paid: false, positionSum: 0 },
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
      const players = st.players.map((p, i) =>
        i === a.index ? { ...p, eliminated: true, score: 0 } : p,
      );
      // Auto-resolve any open 2-player match as a forfeit: opponent scores 1, abandoner scores 0.
      // noElo=true prevents ELO from changing on a forfeit — that would unfairly penalize the winner.
      // Only affects unresolved 2-player matches; byes and multi-player pods are left alone.
      const pairings = st.pairings.map((m) => {
        if (m.result || m.isBye || m.players.length !== 2) return m;
        if (!m.players.includes(abandoned.name)) return m;
        const winner = m.players.find(n => n !== abandoned.name);
        const scores = Object.fromEntries(m.players.map(n => [n, n === winner ? 1 : 0]));
        return { ...m, scores, result: "done", noElo: true, forfeit: true };
      });
      return {
        ...st,
        players,
        pairings,
        matchLog: [...st.matchLog, { type: "abandon", label: `${abandoned.name} abandoned`, ts: now() }],
      };
    }
    // ── Tournament flow ──
    case "START_TOURNAMENT": {
      const cfg = { ...st.globalSettings, ...st.tournaments[st.tournamentId]?.features, ...st.featureOverrides };
      if (!cfg) return st;
      const ss = cfg.startScore ?? 0;
      const activeElo = st.eloDb[cfg.eloDB || "ELO"] || {};
      const players = st.players.map((p) => ({
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
        positionSum: 0,
        eloStart: getElo(activeElo, p.name, cfg.eloDefault),
      }));
      const phase = initialPhase(cfg);
      const ns = {
        ...st,
        players,
        currentRound: 1,
        phase,
        history: [],
        tournamentStarted: true,
        startedAt: Date.now(),
        matchLog: [
          { type: "start", label: `Tournament started — ${players.length} players`, ts: now() },
        ],
        activeTab: "matches",
        matchSubTab: cfg.draft ? "draft" : "pairings",
      };
      return { ...ns, pairings: makePairings(ns, players, [], phase) };
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
      // Toggle semantics: if the player already has extra points on this match, remove them (diff = -currentEp).
      // If not, apply the delta (diff = delta). This lets the UI use the same button for on/off.
      const delta = a.delta || 1;
      const currentEp = st.pairings[a.index]?.extraPoints?.[a.player] || 0;
      const isOn = currentEp > 0;
      const diff = isOn ? -currentEp : delta;
      return {
        ...st,
        players: st.players.map((p) =>
          p.name !== a.player ? p : { ...p, score: p.score + diff }
        ),
        pairings: st.pairings.map((m, i) => {
          if (i !== a.index) return m;
          return { ...m, extraPoints: { ...(m.extraPoints || {}), [a.player]: isOn ? 0 : delta } };
        }),
      };
    }
    case "NEXT_ROUND": {
      const cfg = { ...st.globalSettings, ...st.tournaments[st.tournamentId]?.features, ...st.featureOverrides };
      if (!cfg) return st;
      const eloSheet = cfg.eloDB || "ELO";
      const players = st.players.map((p) => ({ ...p })),
        db = { ...(st.eloDb[eloSheet] || {}) };
      const roundPairings = st.pairings.map((m) => ({ ...m }));
      const { players: scoredPlayers, db: scoredDb, roundPairings: scoredPairings } =
        scoreRound(roundPairings, players, cfg, db);
      const h = [...st.history, scoredPairings],
        nextRound = st.currentRound + 1;
      let phase = st.phase;
      phase = advancePhase(phase, nextRound, cfg);
      const activePlayers = scoredPlayers.filter((p) => !p.eliminated),
        gameOver = isGameOver(cfg.scoring, activePlayers);
      const newEloDb = { ...st.eloDb, [eloSheet]: scoredDb };
      const ns = {
        ...st,
        players: scoredPlayers,
        eloDb: newEloDb,
        history: h,
        currentRound: nextRound,
        phase,
        matchLog: [
          ...st.matchLog,
          { type: "round", label: `Round ${st.currentRound} completed`, ts: now() },
        ],
        activeTab: "matches",
        matchSubTab: gameOver ? "standings" : st.matchSubTab,
      };
      saveLS(LS_ELO_DB, newEloDb);
      return { ...ns, pairings: gameOver ? [] : makePairings(ns, scoredPlayers, h, phase) };
    }
    case "END_TOURNAMENT": {
      try {
        localStorage.removeItem(LS_BACKUP + "_" + st.tournamentId);
        localStorage.removeItem(LS_BACKUP_LAST);
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
      const cfg = { ...st.globalSettings, ...st.tournaments[st.tournamentId]?.features, ...st.featureOverrides };
      if (!cfg) return st;
      const ph = initialPhase(cfg);
      const ns = { ...st, currentRound: 1, phase: ph, pairings: [] };
      return { ...ns, pairings: makePairings(ns, st.players, st.history, ph) };
    }
    // ── Remote data ──
    case "SET_TOURNAMENTS": {
      const tournaments = {};
      a.tournaments.forEach((t) => { if (t.id) tournaments[t.id] = t; });
      return { ...st, tournaments };
    }
    case "SET_GLOBAL_SETTINGS":
      return { ...st, globalSettings: a.settings || {} };
    case "SET_ELO_DB": {
      const sheet = a.col || "ELO";
      const db = {};
      Object.values(a.db).forEach((e) => {
        if (e?.name) db[e.name.toLowerCase()] = e;
      });
      const newEloDb = { ...st.eloDb, [sheet]: db };
      saveLS(LS_ELO_DB, newEloDb);
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
        { ...st.globalSettings, ...st.tournaments[st.tournamentId]?.features, ...st.featureOverrides }.eloDB
        : null) || "ELO";
      let db = { ...(st.eloDb[testNs] || {}) };
      const newPlayers = [];
      for (let i = 0; i < a.count; i++) {
        const n = ns[i] || `Player ${i + 1}`;
        db = setElo(db, n, 800 + Math.floor(Math.random() * 800), true);
        newPlayers.push({
          name: n,
          score: 0,
          w: 0,
          d: 0,
          l: 0,
          eliminated: false,
          paid: false,
          positionSum: 0,
        });
      }
      return { ...st, players: newPlayers, eloDb: { ...st.eloDb, [testNs]: db } };
    }
    case "AUTO_SELECT_WINNERS": {
      const autoC = { ...st.globalSettings, ...st.tournaments[st.tournamentId]?.features, ...st.featureOverrides };
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
        localStorage.removeItem(LS_BACKUP + "_" + st.tournamentId);
        localStorage.removeItem(LS_BACKUP_LAST);
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
        if (a.url) localStorage.setItem(LS_SHEETS_URL, a.url);
        else localStorage.removeItem(LS_SHEETS_URL);
      } catch {}
      return { ...st, sheetsUrl: a.url };
    case "DRAFT_END":
      return {
        ...st,
        draftEnded: true,
        matchSubTab: "pairings",
        matchLog: [...st.matchLog, { type: "draft-end", label: "Draft ended", ts: now(), tables: a.tables }],
      };
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
