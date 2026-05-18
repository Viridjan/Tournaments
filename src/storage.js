// ═══════════════════════════════════════════════════════
// Storage helpers and pairing generator
function now() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
function makeId() {
  const c = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let i = "";
  for (let x = 0; x < 6; x++) i += c[Math.floor(Math.random() * c.length)];
  return i;
}
function loadLS(k, f) {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : f;
  } catch {
    return f;
  }
}
function saveLS(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}
function getSheetsUrl() {
  try {
    return localStorage.getItem(SK) || DU;
  } catch {
    return DU;
  }
}
function buildSnap(state) {
  const t = state.tournaments?.[state.tournamentId];
  return {
    v: 3,
    tournamentMode: state.tournamentId,
    tournamentName: t?.name || "",
    tournamentStarted: state.tournamentStarted,
    playerCount: state.players.length,
    round: state.currentRound,
    state: {
      players: state.players,
      currentRound: state.currentRound,
      phase: state.phase,
      pairings: state.pairings,
      history: state.history,
      matchLog: state.matchLog,
      startedAt: state.startedAt,
    },
    prizes: state.prizes,
    ranks: state.ranks,
    entryCost: state.entryCost,
    prizePct: state.prizePct,
    prizePctRoundUp: state.prizePctRoundUp,
    roundUpPct: state.roundUpPct,
    roundUpPctRoundUp: state.roundUpPctRoundUp,
    featureOverrides: state.featureOverrides,
    testMode: state.testMode,
    experimental: state.experimental,
    advancedSetup: state.advancedSetup,
  };
}
function autoSeedSave(state) {
  const url = getSheetsUrl();
  if (!url || !state.tournamentStarted || !state.players.length || state.testMode) return;
  const t = state.tournaments?.[state.tournamentId];
  const id = makeId();
  const label = `${t?.icon || ""} ${t?.name || ""} · ${state.players.length}p · R${state.currentRound} [auto]`;
  try {
    fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "seed_save", id, label, data: JSON.stringify(buildSnap(state)) }),
    }).catch(() => {});
  } catch {}
}
function makePairings(st, pl, h, ph) {
  const cfg = { ...st.tournaments?.[st.tournamentId]?.features, ...st.featureOverrides };
  if (!cfg) return [];
  const activeElo = st.eloDb?.[cfg.eloDB || "ELO"] || {};
  return genPairings(pl, h, ph, cfg, activeElo);
}
