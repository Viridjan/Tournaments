// Standings — rankings, ELO deltas, inline prize tags
function StandingsTab({ state, dispatch, config }) {
  const cfg = config.features,
    activePlayers = state.players.filter((p) => !p.eliminated),
    isGrandPrix = cfg.grandPrix,
    activeElo = state.eloDb[cfg.eloDB || "ELO"] || {};
  const tb1 = cfg.tiebreaker1 || "elo",
    tb2 = cfg.tiebreaker2 || "none",
    tb3 = cfg.tiebreaker3 || "none";
  const playerStats = Object.fromEntries(
    state.players.map((p) => [p.name, {
      elo: getElo(activeElo, p.name, cfg.eloDefault),
      omw: calcOMW(p.name, state.history, state.players),
      gwr: calcGWR(p),
    }]),
  );
  const sorted = [...state.players].sort(
    (a, b) =>
      b.score - a.score ||
      (tb1 !== "none" ? calcTiebreakerValue(playerStats, b, tb1) - calcTiebreakerValue(playerStats, a, tb1) : 0) ||
      (tb2 !== "none" ? calcTiebreakerValue(playerStats, b, tb2) - calcTiebreakerValue(playerStats, a, tb2) : 0) ||
      (tb3 !== "none" ? calcTiebreakerValue(playerStats, b, tb3) - calcTiebreakerValue(playerStats, a, tb3) : 0),
  ),
    winner = activePlayers.length === 1 ? activePlayers[0] : null;
  const prizeMisconfigured =
    cfg.prizes && (cfg.entryCost == null || cfg.prizePct == null || cfg.roundUpPct == null);
  const prizeCalc =
    cfg.prizes && !prizeMisconfigured
      ? calcAlloc(
          state.players,
          state.prizes,
          state.ranks,
          cfg.entryCost,
          cfg.prizePct,
          cfg.prizePctRoundUp,
          cfg.roundUpPct,
          cfg.roundUpPctRoundUp,
        )
      : null;
  return (
    <div>
      {prizeMisconfigured && (
        <div
          style={{
            background: "#fff3cd",
            border: "0.5px solid #f0ad4e",
            borderRadius: 8,
            padding: "10px 16px",
            fontSize: 13,
            color: "#7d4e00",
            marginBottom: 12,
          }}
        >
          Prizes enabled but <strong>entryCost</strong>, <strong>prizePct</strong>, and <strong>roundUpPct</strong> must be set in the Settings tab.
        </div>
      )}
      {winner && (
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
          🏆 Winner: {winner.name}
        </div>
      )}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}
      >
        <div style={S.metric}>
          <div style={S.metricLabel}>Round</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>
            {state.currentRound > 0 ? state.currentRound - 1 : "—"}
          </div>
        </div>
        <div style={S.metric}>
          <div style={S.metricLabel}>Players</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{state.players.length || "—"}</div>
        </div>
        <div style={S.metric}>
          <div style={S.metricLabel}>Active</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{activePlayers.length || "—"}</div>
        </div>
      </div>
      <Card>
          <h3 style={S.cardTitle}>Standings</h3>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  "#",
                  "Player",
                  "ELO",
                  cfg.scoring === "lifepoints" ? "LP" : "Pts",
                  cfg.scoring === "points" ? "1/2/3/L" : "W/D/L",
                  "Status",
                ].map((h, hi) => (
                  <th
                    key={hi}
                    style={{
                      ...S.tableHeader,
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
              {sorted.map((p, i) => {
                const pr = prizeCalc?.allocs?.[i] || null;
                const elo = getElo(activeElo, p.name, cfg.eloDefault);
                const eloDelta = cfg.elo && p.eloStart != null ? elo - p.eloStart : null;
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
                      {cfg.scoring === "lifepoints" ? (
                        <>
                          <Hearts score={p.score} max={cfg.startScore} />{" "}
                          <span style={{ fontSize: 11, color: C.faint }}>({p.score})</span>
                        </>
                      ) : (
                        <span style={{ fontWeight: 600 }}>
                          {p.score}pt
                          {isGrandPrix ? <span style={{ fontSize: 10, color: C.faint }}> GP</span> : ""}
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
                      {cfg.scoring === "points"
                        ? `${p.p1||0}/${p.p2||0}/${p.p3||0}/${p.pLast||0}`
                        : `${p.w}/${p.d}/${p.l}`}
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
          {prizeCalc && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 8, textAlign: "right" }}>
              Prize pool: €{prizeCalc.totalPool.toFixed(2)} · Allocated: €{prizeCalc.grandTotal.toFixed(2)}
            </div>
          )}
      </Card>
    </div>
  );
}
