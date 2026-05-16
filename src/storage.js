// ═══════════════════════════════════════════════════════
// Storage helpers and pairing generator
function now() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
function mkId() {
  const c = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let i = "";
  for (let x = 0; x < 6; x++) i += c[Math.floor(Math.random() * c.length)];
  return i;
}
function lLS(k, f) {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : f;
  } catch {
    return f;
  }
}
function sLS(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}
function gSU() {
  try {
    return localStorage.getItem(SK) || DU;
  } catch {
    return DU;
  }
}
function mkP(st, pl, h, ph) {
  const c = { ...st.tournaments?.[st.tournamentId]?.features, ...st.featureOverrides };
  if (!c) return [];
  return c.pairing === "multi"
    ? genMulti(pl, c.matchMin, c.matchMax, st.eloDb)
    : gen1v1(pl, h, ph, c.rrRounds, st.eloDb, c.firstPlayer);
}
