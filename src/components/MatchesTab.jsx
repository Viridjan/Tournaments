// Sub-tabs: Draft (groups) | Pairings (cards) | Log (history)
// Matches tab — pairing cards, match log, timer, draft sub-tabs
function MatchCard({ match, index, dispatch, scoring, eloDb, eloDefault = 0, extraPoints, extraPointsValue, playerOrder }) {
  if (match.isBye)
    return (
      <Card variant="bye">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{match.players[0]}</div>
          <Tag variant="grey">BYE</Tag>
        </div>
      </Card>
    );

  if (scoring === "points") {
    return (
      <Card variant="compact">
        <div style={S.matchLabel}>
          Match {index + 1} · {match.players.length}p
          {match.rematch && <> <Tag variant="amber">re</Tag></>}
        </div>
        {match.players.map((n) => {
          const epOn = match.extraPoints?.[n] || 0;
          return (
            <div
              key={n}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `0.5px solid ${C.bL}` }}
            >
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{n}</span>
              <span style={{ fontSize: 11, color: C.faint }}>{getElo(eloDb, n, eloDefault)}</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="—"
                value={match.scores[n] ?? ""}
                onChange={(e) => dispatch({ type: "SET_MATCH_SCORE", index, player: n, value: e.target.value })}
                style={S.inputSm}
              />
              {extraPoints && (
                <button
                  onClick={() => dispatch({ type: "ADD_EXTRA_POINTS", index, player: n, delta: extraPointsValue || 1 })}
                  style={{ ...S.epBtn, padding: "3px 0", background: epOn ? C.aBg : "transparent", border: `0.5px solid ${epOn ? C.aBd : "#ddd"}`, color: epOn ? C.amber : C.muted }}
                >
                  {epOn ? "EP" : "+EP"}
                </button>
              )}
            </div>
          );
        })}
      </Card>
    );
  }

  // swiss / lifepoints: winner-selection UI
  const [p1, p2] = match.players;
  const scores = match.scores;
  const isDone = match.result === "done";
  const p1Score = scores[p1], p2Score = scores[p2];
  const sel = !isDone ? null : p1Score > p2Score ? "p1" : p2Score > p1Score ? "p2" : "draw";

  if (match.players.length === 2) {
    const btnStyle = (active, t) => ({
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
    const mkEpBtn = (n) => {
      const epOn = match.extraPoints?.[n] || 0;
      return (
        <button
          onClick={() => dispatch({ type: "ADD_EXTRA_POINTS", index, player: n, delta: extraPointsValue || 1 })}
          style={{ ...S.epBtn, background: epOn ? C.aBg : "transparent", border: `0.5px solid ${epOn ? C.aBd : "#ddd"}`, color: epOn ? C.amber : C.muted, alignSelf: "stretch", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {epOn ? "EP" : "+EP"}
        </button>
      );
    };
    return (
      <Card variant="compact">
        <div style={{ display: "flex", gap: 4, alignItems: "stretch" }}>
          {extraPoints && mkEpBtn(p1)}
          <button style={{ ...btnStyle(sel === "p1", "l"), flex: 2 }} onClick={() => pick("p1")}>
            <span>{p1}{match.rematch && <> <Tag variant="amber">re</Tag></>}</span>
          </button>
          <button style={{ ...btnStyle(sel === "draw", "d"), flex: 1 }} onClick={() => pick("draw")}>draw</button>
          <button style={{ ...btnStyle(sel === "p2", "r"), flex: 2 }} onClick={() => pick("p2")}>
            <span>{p2}</span>
          </button>
          {extraPoints && mkEpBtn(p2)}
        </div>
      </Card>
    );
  }

  // N-player swiss/lifepoints: tap to select winner(s), tap again to deselect
  const winners = match.players.filter(n => scores[n] === 1);
  const toggle = (name) => {
    const newWinners = winners.includes(name) ? winners.filter(x => x !== name) : [...winners, name];
    if (!newWinners.length) { dispatch({ type: "SET_MATCH_RESULT", index, reset: true }); return; }
    const scores = Object.fromEntries(match.players.map(n => [n, newWinners.includes(n) ? (newWinners.length > 1 ? 0.5 : 1) : 0]));
    dispatch({ type: "SET_MATCH_RESULT", index, scores });
  };
  return (
    <Card style={{ padding: "10px 14px" }}>
      <div style={S.matchLabel}>
        Match {index + 1} · {match.players.length}p
        {match.rematch && <> <Tag variant="amber">re</Tag></>}
      </div>
      {match.players.map((n, pi) => {
        const isWinner = scores[n] === 1, isDraw = scores[n] === 0.5;
        const epOn = match.extraPoints?.[n] || 0;
        return (
          <div key={n} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            <button
              onClick={() => toggle(n)}
              style={{
                display: "flex", alignItems: "center", flex: 1, gap: 8, padding: "7px 8px",
                borderRadius: 5, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                border: `0.5px solid ${isWinner ? C.gBd : isDraw ? C.aBd : "#ddd"}`,
                background: isWinner ? C.gBg : isDraw ? C.aBg : "transparent",
                color: isWinner ? C.green : isDraw ? C.amber : C.text,
                fontWeight: isWinner || isDraw ? 600 : 400, fontSize: 13,
              }}
            >
              {playerOrder && (
                <span style={{ fontSize: 10, fontWeight: 700, color: pi === 0 ? C.green : C.faint, minWidth: 14 }}>
                  {pi === 0 ? "⚡" : pi + 1}
                </span>
              )}
              <span style={{ flex: 1 }}>{n}</span>
              <span style={{ fontSize: 11, color: C.faint }}>{getElo(eloDb, n, eloDefault)}</span>
              {isWinner && <span style={{ fontSize: 11 }}>Win</span>}
              {isDraw && <span style={{ fontSize: 11 }}>Draw</span>}
            </button>
            {extraPoints && (
              <button
                onClick={() => dispatch({ type: "ADD_EXTRA_POINTS", index, player: n, delta: extraPointsValue || 1 })}
                style={{ ...S.epBtn, background: epOn ? C.aBg : "transparent", border: `0.5px solid ${epOn ? C.aBd : "#ddd"}`, color: epOn ? C.amber : C.muted }}
              >
                {epOn ? "EP" : "+EP"}
              </button>
            )}
          </div>
        );
      })}
    </Card>
  );
}
function MatchLog({ state }) {
  let roundIdx = 0;
  if (!state.matchLog.length)
    return <div style={{ textAlign: "center", padding: 32, color: C.faint }}>No activity.</div>;
  const roundHeader = (label, ts) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 4px 8px", marginBottom: 4 }}>
      <h3 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{label}</h3>
      <span style={{ fontSize: 11, color: C.faint }}>{ts}</span>
    </div>
  );
  return (
    <div>
      {state.matchLog.map((ev, ei) => {
        if (ev.type === "round") {
          const round = state.history[roundIdx++];
          if (!round) return null;
          const isMulti = round.some((m) => !m.isBye && m.players.length > 2);
          if (isMulti) {
            return (
              <div key={ei} style={{ marginBottom: 16 }}>
                {roundHeader(ev.label, ev.ts)}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {round.map((m, mi) => (
                    <Card key={mi} style={{ marginBottom: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.purple, marginBottom: 6 }}>
                        Table {mi + 1} · {m.players.length}p
                      </div>
                      {m.players.map((n) => (
                        <div key={n} style={{ fontSize: 13, padding: "4px 0", display: "flex", justifyContent: "space-between", borderBottom: `0.5px solid ${C.bL}` }}>
                          <span style={{ fontWeight: 500 }}>{n}</span>
                          <span style={{ color: C.muted }}>
                            {m.scores[n] != null && m.scores[n] !== "" ? `${m.scores[n]}pt` : "—"}
                            {(m.extraPoints?.[n] || 0) > 0 && (
                              <span style={{ color: C.green, fontWeight: 500, fontSize: 11, marginLeft: 4 }}>+EP</span>
                            )}
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
              </div>
            );
          }
          return (
            <div key={ei} style={{ marginBottom: 16 }}>
              {roundHeader(ev.label, ev.ts)}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {round.map((m, mi) => {
                  if (m.isBye)
                    return (
                      <Card key={mi} style={{ marginBottom: 0, fontSize: 13 }}>
                        {m.players[0]} — <Tag variant="grey">BYE</Tag>
                      </Card>
                    );
                  const [p1, p2] = m.players;
                  const s1 = parseFloat(m.scores[p1] || 0), s2 = parseFloat(m.scores[p2] || 0);
                  const isDraw = s1 === s2 && m.result === "done";
                  const w = !isDraw ? (s1 > s2 ? p1 : p2) : null;
                  const l = !isDraw ? (s1 > s2 ? p2 : p1) : null;
                  const winnerDelta = w && m.eloDeltas?.[w];
                  return (
                    <Card key={mi} style={{ marginBottom: 0 }}>
                      <div style={{ fontSize: 13, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        <span style={{ fontWeight: 500, color: isDraw ? C.text : C.green }}>{w || p1}</span>
                        <span style={{ color: C.muted }}>{l || p2}</span>
                        {winnerDelta != null && (
                          <span style={{ fontSize: 11, fontWeight: 500, color: winnerDelta > 0 ? C.green : winnerDelta < 0 ? C.red : C.muted }}>
                            {winnerDelta > 0 ? "+" : ""}{winnerDelta}
                          </span>
                        )}
                        {isDraw && <span style={{ color: C.amber, fontWeight: 500, fontSize: 11 }}>Draw</span>}
                        {m.players.some(n => (m.extraPoints?.[n] || 0) > 0) && (
                          <span style={{ color: C.green, fontWeight: 500, fontSize: 11 }}>
                            EP: {m.players.filter(n => (m.extraPoints?.[n] || 0) > 0).join(", ")}
                          </span>
                        )}
                        {m.rematch && <Tag variant="amber">re</Tag>}
                        {m.forfeit && <Tag variant="amber">forfeit</Tag>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        }
        const icons = { start: "🏁", abandon: "⚑", "draft-end": "📋", "tournament-timeout": "⏰" },
          bg = { start: C.gBg, abandon: C.aBg, "draft-end": C.bBg, "tournament-timeout": C.rBg },
          colors = { start: C.green, abandon: C.amber, "draft-end": C.blue, "tournament-timeout": C.red };
        return (
          <div key={ei} style={{ background: bg[ev.type] || C.subtle, borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: colors[ev.type] || C.text }}>
                {icons[ev.type] || "•"} {ev.label}
              </span>
              <span style={{ fontSize: 11, color: C.faint }}>{ev.ts}</span>
            </div>
            {ev.tables && (
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ev.tables.map((tbl, ti) => (
                  <div key={ti} style={{ fontSize: 11, color: C.text }}>
                    <span style={{ fontWeight: 600, color: C.blue }}>T{ti + 1}: </span>
                    {tbl.map((p) => p.name).join(", ")}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MatchesTab({ state, dispatch, config, eloLoadedCols }) {
  const cfg = config.features,
    subTabs = [
      cfg.draft && !state.draftEnded && { id: "draft", label: "Draft" },
      { id: "pairings", label: "Pairings" },
      { id: "standings", label: "Standings" },
      { id: "log", label: "Log" },
      { id: "session", label: "Session" },
    ].filter(Boolean);
  const isRR = state.phase === "roundrobin" && cfg.rrRounds > 0,
    scoringMode = SCORING_MODES.find(m => m.value === cfg.scoring) || SCORING_MODES[1],
    rl = isRR
      ? `Round Robin — R${state.currentRound}/${cfg.rrRounds}`
      : `${scoringMode.label} — R${state.currentRound - (isRR ? 0 : cfg.rrRounds)}`;
  return (
    <div>
      <TabBar
        tabs={subTabs}
        active={state.matchSubTab}
        onSelect={(id) => dispatch({ type: "SET_MATCH_SUBTAB", tab: id })}
      />
      {state.matchSubTab === "draft" && (
        <DraftGroups players={state.players} eloDb={state.eloDb[cfg.eloDB || "ELO"] || {}} dispatch={dispatch} eloDefault={cfg.eloDefault} />
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
                {isRR ? "By ELO" : scoringMode.pairingSort}
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
            </div>
          </div>
          {cfg.timerMinutes > 0 && <Timer minutes={cfg.timerMinutes} key={state.currentRound} />}
          {cfg.playerOrder && state.pairings.some((m) => !m.isBye && m.players.length === 2) && (
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
            <MatchCard key={i} match={m} index={i} dispatch={dispatch} scoring={cfg.scoring} eloDb={state.eloDb[cfg.eloDB || "ELO"] || {}} eloDefault={cfg.eloDefault} extraPoints={cfg.extraPoints} extraPointsValue={cfg.extraPointsValue || 1} playerOrder={cfg.playerOrder} />
          ))}
        </div>
      )}
      {state.matchSubTab === "standings" && (
        <StandingsTab state={state} dispatch={dispatch} config={config} eloLoadedCols={eloLoadedCols} />
      )}
      {state.matchSubTab === "log" && <MatchLog state={state} />}
      {state.matchSubTab === "session" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {cfg.grandPrix && (
            <Card>
              <h3 style={S.cardTitle}>New session ＋</h3>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                Resets the round counter to 1 and generates fresh pairings, but keeps all match history. GP scoring continues across sessions — the sliding window runs over all rounds ever played.
              </div>
              <Btn
                onClick={() => {
                  if (confirm("Start a new session? Round counter resets but history is kept.")) {
                    autoSeedSave(state);
                    dispatch({ type: "NEW_GP_SESSION" });
                  }
                }}
                style={{ borderColor: C.aBd, color: C.amber, background: C.aBg, padding: "10px 20px", fontSize: 14, fontWeight: 500 }}
              >
                New session ＋
              </Btn>
            </Card>
          )}
          <Card>
            <h3 style={S.cardTitle}>End tournament</h3>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
              Finalizes the tournament. Players are sorted by score; the leader is declared the winner and everyone else is marked eliminated. The in-progress backup is cleared.
            </div>
            <Btn
              onClick={() => {
                if (confirm("End the tournament?")) {
                  autoSeedSave(state);
                  dispatch({ type: "END_TOURNAMENT" });
                }
              }}
              style={{ borderColor: C.red, color: C.red, background: C.rBg, padding: "10px 20px", fontSize: 14, fontWeight: 500 }}
            >
              End tournament
            </Btn>
          </Card>
        </div>
      )}
    </div>
  );
}
