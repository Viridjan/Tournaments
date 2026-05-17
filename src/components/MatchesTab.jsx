// Sub-tabs: Draft (groups) | Pairings (cards) | Log (history)
// Matches tab — pairing cards, match log, timer, draft sub-tabs
function MatchCard({ match, index, dispatch, scoring, eloDb }) {
  if (match.isBye)
    return (
      <Card style={{ background: C.bg, borderStyle: "dashed", padding: "10px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{match.players[0]}</div>
          <Tag variant="grey">BYE</Tag>
        </div>
      </Card>
    );

  if (scoring === "points") {
    return (
      <Card style={{ padding: "10px 14px" }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: C.purple, marginBottom: 8 }}>
          Match {index + 1} · {match.players.length}p
          {match.rematch && <> <Tag variant="amber">re</Tag></>}
        </div>
        {match.players.map((n) => (
          <div
            key={n}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `0.5px solid ${C.bL}` }}
          >
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{n}</span>
            <span style={{ fontSize: 11, color: C.faint }}>{gE(eloDb, n)}</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="—"
              value={match.scores[n] ?? ""}
              onChange={(e) => dispatch({ type: "SET_MATCH_SCORE", index, player: n, value: e.target.value })}
              style={{ ...S.input, width: 56, textAlign: "center", fontSize: 13, padding: "4px 6px" }}
            />
          </div>
        ))}
      </Card>
    );
  }

  // swiss / lifepoints: winner-selection UI
  const [p1, p2] = match.players;
  const sc = match.scores;
  const isDone = match.result === "done";
  const p1Score = sc[p1], p2Score = sc[p2];
  const sel = !isDone ? null : p1Score > p2Score ? "p1" : p2Score > p1Score ? "p2" : "draw";

  if (match.players.length === 2) {
    const bs = (active, t) => ({
      flex: 1, display: "flex", flexDirection: "column", padding: "6px 8px", borderRadius: 5,
      cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500, lineHeight: 1.3,
      border: `0.5px solid ${active ? (t === "d" ? C.aBd : C.gBd) : "#ddd"}`,
      background: active ? (t === "d" ? C.aBg : C.gBg) : "transparent",
      color: active ? (t === "d" ? C.amber : C.green) : C.muted,
      textAlign: t === "r" ? "right" : t === "d" ? "center" : "left",
      alignItems: t === "r" ? "flex-end" : t === "d" ? "center" : "flex-start",
    });
    const pick = (result) => {
      if (isDone && sel === result) {
        dispatch({ type: "SET_MATCH_RESULT", index, reset: true });
        return;
      }
      const scores = result === "p1" ? { [p1]: 1, [p2]: 0 } : result === "p2" ? { [p1]: 0, [p2]: 1 } : { [p1]: 0.5, [p2]: 0.5 };
      dispatch({ type: "SET_MATCH_RESULT", index, scores });
    };
    return (
      <Card style={{ padding: "10px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: 4, alignItems: "stretch" }}>
          <button style={bs(sel === "p1", "l")} onClick={() => pick("p1")}>
            <span>{p1}{match.rematch && <> <Tag variant="amber">re</Tag></>}</span>
          </button>
          <button style={bs(sel === "draw", "d")} onClick={() => pick("draw")}>draw</button>
          <button style={bs(sel === "p2", "r")} onClick={() => pick("p2")}>
            <span>{p2}</span>
          </button>
        </div>
      </Card>
    );
  }

  // N-player swiss/lifepoints: tap to select winner(s), tap again to deselect
  const winners = match.players.filter(n => sc[n] === 1);
  const toggle = (name) => {
    const newWinners = winners.includes(name) ? winners.filter(x => x !== name) : [...winners, name];
    if (!newWinners.length) { dispatch({ type: "SET_MATCH_RESULT", index, reset: true }); return; }
    const scores = Object.fromEntries(match.players.map(n => [n, newWinners.includes(n) ? (newWinners.length > 1 ? 0.5 : 1) : 0]));
    dispatch({ type: "SET_MATCH_RESULT", index, scores });
  };
  return (
    <Card style={{ padding: "10px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: C.purple, marginBottom: 8 }}>
        Match {index + 1} · {match.players.length}p
        {match.rematch && <> <Tag variant="amber">re</Tag></>}
      </div>
      {match.players.map((n) => {
        const isWinner = sc[n] === 1, isDraw = sc[n] === 0.5;
        return (
          <button
            key={n}
            onClick={() => toggle(n)}
            style={{
              display: "flex", alignItems: "center", width: "100%", gap: 8, padding: "7px 8px",
              borderRadius: 5, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              border: `0.5px solid ${isWinner ? C.gBd : isDraw ? C.aBd : "#ddd"}`,
              background: isWinner ? C.gBg : isDraw ? C.aBg : "transparent",
              color: isWinner ? C.green : isDraw ? C.amber : C.text,
              fontWeight: isWinner || isDraw ? 600 : 400, fontSize: 13, marginBottom: 4,
            }}
          >
            <span style={{ flex: 1 }}>{n}</span>
            <span style={{ fontSize: 11, color: C.faint }}>{gE(eloDb, n)}</span>
            {isWinner && <span style={{ fontSize: 11 }}>Win</span>}
            {isDraw && <span style={{ fontSize: 11 }}>Draw</span>}
          </button>
        );
      })}
    </Card>
  );
}
function ML({ state }) {
  let ri = 0;
  if (!state.matchLog.length)
    return <div style={{ textAlign: "center", padding: 32, color: C.faint }}>No activity.</div>;
  return (
    <div>
      {state.matchLog.map((ev, ei) => {
        if (ev.type === "round") {
          const rd = state.history[ri++];
          if (!rd) return null;
          const isMulti = rd.some((m) => !m.isBye && m.players.length > 2);
          if (isMulti) {
            return (
              <div key={ei} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, padding: "0 4px" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 500 }}>{ev.label}</h3>
                  <span style={{ fontSize: 11, color: C.faint }}>{ev.ts}</span>
                </div>
                {rd.map((m, mi) => (
                  <Card key={mi} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.purple, marginBottom: 6 }}>
                      Table {mi + 1} · {m.players.length}p
                    </div>
                    {m.players.map((n) => (
                      <div key={n} style={{ fontSize: 13, padding: "4px 0", display: "flex", justifyContent: "space-between", borderBottom: `0.5px solid ${C.bL}` }}>
                        <span style={{ fontWeight: 500 }}>{n}</span>
                        <span style={{ color: C.muted }}>
                          {m.scores[n] != null && m.scores[n] !== "" ? `${m.scores[n]}pt` : "—"}
                          {m.eloDeltas?.[n] != null && (
                            <span style={{ color: m.eloDeltas[n] > 0 ? C.green : m.eloDeltas[n] < 0 ? C.red : C.muted, fontWeight: 500, fontSize: 11, marginLeft: 4 }}>
                              {m.eloDeltas[n] > 0 ? "+" : ""}{m.eloDeltas[n]}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </Card>
                ))}
              </div>
            );
          }
          return (
            <Card key={ei} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 500 }}>{ev.label}</h3>
                <span style={{ fontSize: 11, color: C.faint }}>{ev.ts}</span>
              </div>
              {rd.map((m, mi) => {
                if (m.isBye)
                  return (
                    <div key={mi} style={{ fontSize: 13, padding: "4px 0", borderBottom: `0.5px solid ${C.bL}` }}>
                      {m.players[0]} — <Tag variant="grey">BYE</Tag>
                    </div>
                  );
                const [p1, p2] = m.players;
                const s1 = parseFloat(m.scores[p1] || 0), s2 = parseFloat(m.scores[p2] || 0);
                const isDraw = s1 === s2 && m.result === "done";
                const w = !isDraw ? (s1 > s2 ? p1 : p2) : null;
                const l = !isDraw ? (s1 > s2 ? p2 : p1) : null;
                const wd = w && m.eloDeltas?.[w];
                return (
                  <div key={mi} style={{ fontSize: 13, padding: "4px 0", display: "flex", gap: 12, borderBottom: `0.5px solid ${C.bL}`, alignItems: "center" }}>
                    <span style={{ fontWeight: 500, color: isDraw ? C.text : C.green }}>{w || p1}</span>
                    <span style={{ color: "#555" }}>{l || p2}</span>
                    {wd != null && (
                      <span style={{ fontSize: 11, fontWeight: 500, color: wd > 0 ? C.green : wd < 0 ? C.red : C.muted }}>
                        {wd > 0 ? "+" : ""}{wd}
                      </span>
                    )}
                    {isDraw && <span style={{ color: C.amber, fontWeight: 500, fontSize: 11 }}>Draw</span>}
                    {m.rematch && <Tag variant="amber">re</Tag>}
                    {m.forfeit && <Tag variant="amber">forfeit</Tag>}
                  </div>
                );
              })}
            </Card>
          );
        }
        const ic = { start: "🏁", abandon: "⚑", "draft-end": "📋", "tournament-timeout": "⏰" },
          bg = { start: C.gBg, abandon: C.aBg, "draft-end": C.bBg, "tournament-timeout": C.rBg },
          co = { start: C.green, abandon: C.amber, "draft-end": C.blue, "tournament-timeout": C.red };
        return (
          <div key={ei} style={{ background: bg[ev.type] || C.subtle, borderRadius: 8, padding: "8px 12px", marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: co[ev.type] || C.text }}>
              {ic[ev.type] || "•"} {ev.label}
            </span>
            <span style={{ fontSize: 11, color: C.faint }}>{ev.ts}</span>
          </div>
        );
      })}
    </div>
  );
}

function MatchesTab({ state, dispatch, config }) {
  const c = config.features,
    st = [
      c.draft && { id: "draft", label: "Draft" },
      { id: "pairings", label: "Pairings" },
      { id: "log", label: "Log" },
    ].filter(Boolean);
  const isRR = state.phase === "roundrobin" && c.rrRounds > 0,
    rl = isRR
      ? `Round Robin — R${state.currentRound}/${c.rrRounds}`
      : `Swiss — R${state.currentRound - (isRR ? 0 : c.rrRounds)}`;
  return (
    <div>
      <TabBar
        tabs={st}
        active={state.matchSubTab}
        onSelect={(id) => dispatch({ type: "SET_MATCH_SUBTAB", tab: id })}
      />
      {state.matchSubTab === "draft" && (
        <DraftGroups players={state.players} eloDb={state.eloDb} dispatch={dispatch} />
      )}
      {state.matchSubTab === "pairings" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{rl}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                {isRR ? "By ELO" : "By win rate"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Btn
                onClick={() => {
                  const u = state.pairings.filter((m) => !m.isBye && m.result !== "done");
                  if (u.length && !confirm(`${u.length} unresolved.`)) return;
                  dispatch({ type: "NEXT_ROUND" });
                }}
              >
                Next round ↗
              </Btn>
              {c.grandPrix && state.tournamentStarted && (
                <Btn
                  onClick={() => {
                    if (confirm("New session?")) dispatch({ type: "NEW_GP_SESSION" });
                  }}
                  style={{ borderColor: "#e63946", color: "#e63946" }}
                >
                  New session ＋
                </Btn>
              )}
              {c.scoring !== "lifepoints" && state.tournamentStarted && (
                <Btn
                  onClick={() => {
                    if (confirm("End?")) dispatch({ type: "END_TOURNAMENT" });
                  }}
                  style={{ borderColor: C.red, color: C.red }}
                >
                  End
                </Btn>
              )}
            </div>
          </div>
          {c.timerMinutes > 0 && <Timer minutes={c.timerMinutes} key={state.currentRound} />}
          {c.firstPlayer && state.pairings.some((m) => !m.isBye && m.players.length === 2) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 2fr",
                gap: 4,
                marginBottom: 6,
                padding: "0 14px",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 500, color: C.green, textAlign: "center" }}>
                ⚡ First
              </div>
              <div />
              <div />
            </div>
          )}
          {!state.pairings.length && (
            <div style={{ textAlign: "center", padding: 32, color: C.faint }}>No pairings.</div>
          )}
          {state.pairings.map((m, i) => (
            <MatchCard key={i} match={m} index={i} dispatch={dispatch} scoring={c.scoring} eloDb={state.eloDb[c.eloDB || "ELO"] || {}} />
          ))}
        </div>
      )}
      {state.matchSubTab === "log" && <ML state={state} />}
    </div>
  );
}
