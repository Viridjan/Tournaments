// Rankings table with inline prize allocations in Status column
// Standings — rankings with inline prizes, ELO deltas
// Prizes show as green tags (e.g. '1x Pauper', '2x Booster')
function StandingsTab({ state, dispatch, config }) {
  const c = config.features,
    ac = state.players.filter((p) => !p.eliminated),
    gp = c.grandPrix,
    gs = (p) => p.score;
  const so = [...state.players].sort(
      (a, b) => gs(b) - gs(a) || b.w - a.w || gE(state.eloDb, a.name) - gE(state.eloDb, b.name),
    ),
    w = ac.length === 1 ? ac[0] : null;
  const al = c.prizes
    ? calcAlloc(
        state.players,
        state.prizes,
        state.ranks,
        state.entryCost,
        state.prizePct,
        state.prizePctRoundUp,
        state.roundUpPct,
        state.roundUpPctRoundUp,
      )
    : null;
  const prizeFor = (i) => {
    if (!al?.allocs?.[i]) return null;
    return al.allocs[i];
  };
  return (
    <div>
      {w && (
        <div
          style={{
            background: C.gBg,
            color: C.green,
            borderRadius: 10,
            padding: "12px 20px",
            fontSize: 16,
            fontWeight: 500,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          🏆 Winner: {w.name}
        </div>
      )}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}
      >
        <div style={S.metric}>
          <div style={{ fontSize: 12, color: C.muted }}>Round</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>
            {state.currentRound > 0 ? state.currentRound - 1 : "—"}
          </div>
        </div>
        <div style={S.metric}>
          <div style={{ fontSize: 12, color: C.muted }}>Players</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{state.players.length || "—"}</div>
        </div>
        <div style={S.metric}>
          <div style={{ fontSize: 12, color: C.muted }}>Active</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{ac.length || "—"}</div>
        </div>
      </div>
      <Card>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  "#",
                  "Player",
                  "ELO",
                  c.scoring === "lifepoints" ? "LP" : "Pts",
                  "W/D/L",
                  "Status",
                ].map((h, hi) => (
                  <th
                    key={hi}
                    style={{
                      fontWeight: 500,
                      fontSize: 12,
                      color: C.muted,
                      textAlign: "left",
                      padding: "6px 8px",
                      borderBottom: `0.5px solid ${C.border}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {so.map((p, i) => {
                const ds = gs(p);
                const pr = prizeFor(i);
                const elo = gE(state.eloDb, p.name);
                const eloDelta = c.elo && p.eloStart != null ? elo - p.eloStart : null;
                return (
                  <tr key={p.name}>
                    <td
                      style={{
                        padding: "7px 8px",
                        borderBottom: `0.5px solid ${C.bL}`,
                        fontWeight: 500,
                      }}
                    >
                      {i + 1}
                    </td>
                    <td style={{ padding: "7px 8px", borderBottom: `0.5px solid ${C.bL}` }}>
                      {p.name}
                    </td>
                    <td
                      style={{
                        padding: "7px 8px",
                        borderBottom: `0.5px solid ${C.bL}`,
                        fontWeight: 500,
                      }}
                    >
                      {elo}
                      {eloDelta != null && eloDelta !== 0 && (
                        <span style={{ fontSize: 11, fontWeight: 500, color: eloDelta > 0 ? C.green : C.red, marginLeft: 4 }}>
                          {eloDelta > 0 ? "+" : ""}{eloDelta}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "7px 8px", borderBottom: `0.5px solid ${C.bL}` }}>
                      {c.scoring === "lifepoints" ? (
                        <>
                          <Hearts score={p.score} max={c.startScore} />{" "}
                          <span style={{ fontSize: 11, color: C.faint }}>({p.score})</span>
                        </>
                      ) : (
                        <span style={{ fontWeight: 600 }}>
                          {ds}pt
                          {gp ? <span style={{ fontSize: 10, color: C.faint }}> GP</span> : ""}
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "7px 8px",
                        borderBottom: `0.5px solid ${C.bL}`,
                        color: C.muted,
                      }}
                    >
                      {p.w}/{p.d}/{p.l}
                    </td>
                    <td style={{ padding: "7px 8px", borderBottom: `0.5px solid ${C.bL}` }}>
                      {p.eliminated ? (
                        <Tag variant="amber">Out</Tag>
                      ) : pr && pr.chosen.length ? (
                        <div style={{ lineHeight: 1.7 }}>
                          {pr.chosen.map((x, xi) => (
                            <span
                              key={xi}
                              style={{
                                fontSize: 10,
                                borderRadius: 4,
                                padding: "2px 5px",
                                display: "inline-block",
                                background: C.gBg,
                                color: C.green,
                                fontWeight: 500,
                                marginRight: 3,
                                marginBottom: 1,
                              }}
                            >
                              {x.qty > 1 ? x.qty + "× " : ""}
                              {x.name}
                            </span>
                          ))}
                        </div>
                      ) : i === 0 ? (
                        <Tag variant="green">Leader</Tag>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {al && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 8, textAlign: "right" }}>
              Prize pool: €{al.totalPool.toFixed(2)} · Allocated: €{al.grandTotal.toFixed(2)}
            </div>
          )}
      </Card>
    </div>
  );
}
