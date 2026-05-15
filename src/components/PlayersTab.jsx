// Left card: add players with autocomplete dropdown from ELO database
//   - Dropdown shows up to 6 matches, filtered by test mode
//   - Player list with paid toggle, abandon button, remove button
// Right card: full registered players table with ELO, filter search
//   - Filters by test flag based on testMode state
function PlayersTab({ state, dispatch, config }) {
  const [input, setInput] = useState(""),
    [filter, setFilter] = useState(""),
    [acFocused, setAcFocused] = useState(false);
  const addS = useMemo(
    () => new Set(state.players.map((p) => p.name.toLowerCase())),
    [state.players],
  );
  const dbE = useMemo(
    () =>
      Object.values(state.eloDb)
        .filter(
          (e) =>
            e?.name &&
            !addS.has(e.name.toLowerCase()) &&
            (!filter || e.name.toLowerCase().includes(filter.toLowerCase())) &&
            (state.testMode ? !!e.test : !e.test),
        )
        .sort((a, b) => (b.elo || 0) - (a.elo || 0)),
    [state.eloDb, filter, state.testMode, addS],
  );
  const pc = state.players.filter((p) => p.paid).length;
  const suggestions = useMemo(() => {
    if (!input.trim() || input.length < 1) return [];
    return Object.values(state.eloDb)
      .filter(
        (e) =>
          e?.name &&
          e.name.toLowerCase().includes(input.toLowerCase()) &&
          !addS.has(e.name.toLowerCase()) &&
          (state.testMode ? !!e.test : !e.test),
      )
      .sort((a, b) => (b.elo || 0) - (a.elo || 0))
      .slice(0, 6);
  }, [input, state.eloDb, addS, state.testMode]);
  const addPlayer = (name) => {
    dispatch({ type: "ADD_PLAYER", name });
    setInput("");
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Btn
          onClick={() => {
            if (state.players.length < 2) return;
            if (
              state.tournamentStarted
                ? !confirm("Restart?")
                : !confirm(`Start with ${state.players.length}?`)
            )
              return;
            dispatch({ type: "START_TOURNAMENT" });
          }}
          disabled={state.players.length < 2}
        >
          Start tournament ↗
        </Btn>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card style={{ flex: 1, minWidth: 260 }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>Add players</h3>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={input}
              placeholder="Player name..."
              style={S.input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setAcFocused(true)}
              onBlur={() => setTimeout(() => setAcFocused(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) {
                  if (suggestions.length > 0) addPlayer(suggestions[0].name);
                  else addPlayer(input);
                }
              }}
            />
            {acFocused && suggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: C.card,
                  border: `0.5px solid ${C.border}`,
                  borderRadius: "0 0 8px 8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  zIndex: 10,
                  maxHeight: 200,
                  overflow: "auto",
                }}
              >
                {suggestions.map((s) => (
                  <div
                    key={s.name}
                    onMouseDown={() => addPlayer(s.name)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: 13,
                      borderBottom: `0.5px solid ${C.bL}`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.subtle)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                    <span style={{ fontSize: 11, color: C.faint }}>{s.elo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Btn
            onClick={() => {
              if (input.trim()) addPlayer(input);
            }}
            style={{ width: "100%", marginTop: 8 }}
          >
            + Add player
          </Btn>
          {!state.players.length ? (
            <div style={{ textAlign: "center", padding: 24, color: C.faint, fontSize: 14 }}>
              No players added
            </div>
          ) : (
            <>
              <div
                style={{
                  maxHeight: 320,
                  overflowY: "auto",
                  marginTop: 12,
                  borderTop: `0.5px solid ${C.border}`,
                }}
              >
                {state.players.map((p, i) => (
                  <div
                    key={p.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "7px 6px",
                      borderBottom: "0.5px solid #eee",
                    }}
                  >
                    <span
                      onClick={() => dispatch({ type: "TOGGLE_PAID", index: i })}
                      title={p.paid ? "Unmark" : "Mark paid"}
                      style={{
                        flex: 1,
                        fontSize: 13,
                        cursor: "pointer",
                        userSelect: "none",
                        textDecoration: p.eliminated ? "line-through" : "none",
                        color: p.eliminated ? C.faint : C.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {p.name}
                      {p.eliminated && (
                        <span style={{ fontSize: 10, color: C.amber, marginLeft: 4 }}>out</span>
                      )}
                    </span>
                    <span style={{ fontSize: 11, color: C.faint, flexShrink: 0 }}>
                      {gE(state.eloDb, p.name)}
                    </span>
                    <Btn
                      onClick={() => dispatch({ type: "TOGGLE_PAID", index: i })}
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        flexShrink: 0,
                        fontWeight: p.paid ? 500 : 400,
                        ...(p.paid
                          ? { background: C.accent, color: "#fff", borderColor: C.accent }
                          : { color: C.faint }),
                      }}
                    >
                      {p.paid ? "✓" : "paid"}
                    </Btn>
                    {state.tournamentStarted && !p.eliminated && (
                      <Btn
                        onClick={() => {
                          if (confirm(`Abandon ${p.name}?`))
                            dispatch({ type: "ABANDON_PLAYER", index: i });
                        }}
                        style={{
                          fontSize: 11,
                          padding: "2px 5px",
                          color: C.amber,
                          borderColor: C.aBd,
                          flexShrink: 0,
                        }}
                      >
                        ⚑
                      </Btn>
                    )}
                    <Btn
                      onClick={() => dispatch({ type: "REMOVE_PLAYER", index: i })}
                      style={{ fontSize: 11, padding: "2px 5px", flexShrink: 0 }}
                    >
                      ✕
                    </Btn>
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: C.faint,
                  marginTop: 8,
                }}
              >
                <span>
                  {state.players.length} player{state.players.length !== 1 ? "s" : ""}
                </span>
                <span style={{ color: pc === state.players.length ? C.green : C.amber }}>
                  {pc}/{state.players.length} paid
                </span>
              </div>
            </>
          )}
        </Card>
        <Card style={{ flex: 1, minWidth: 260 }}>
          <div
            style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, gap: 6 }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Registered</h3>
            <input
              type="text"
              value={filter}
              placeholder="Filter..."
              onChange={(e) => setFilter(e.target.value)}
              style={{ ...S.input, fontSize: 12, padding: "4px 8px", width: 110, flexShrink: 0 }}
            />
          </div>
          {!dbE.length ? (
            <div style={{ textAlign: "center", padding: 16, color: C.faint, fontSize: 12 }}>
              No ELO entries.
            </div>
          ) : (
            <>
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          fontSize: 11,
                          color: C.muted,
                          fontWeight: 500,
                          textAlign: "left",
                          padding: "4px 6px 4px 0",
                          borderBottom: `0.5px solid ${C.border}`,
                          position: "sticky",
                          top: 0,
                          background: C.card,
                        }}
                      >
                        Name
                      </th>
                      <th
                        style={{
                          fontSize: 11,
                          color: C.muted,
                          fontWeight: 500,
                          textAlign: "center",
                          padding: "4px 6px",
                          borderBottom: `0.5px solid ${C.border}`,
                          width: 60,
                          position: "sticky",
                          top: 0,
                          background: C.card,
                        }}
                      >
                        ELO
                      </th>
                      <th
                        style={{
                          borderBottom: `0.5px solid ${C.border}`,
                          width: 40,
                          position: "sticky",
                          top: 0,
                          background: C.card,
                        }}
                      ></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbE.map((e, i) => {
                      return (
                        <tr key={e.name} style={{ background: i % 2 === 1 ? "#fafafa" : "" }}>
                          <td style={{ padding: "5px 6px 5px 0", fontWeight: 500 }}>{e.name}</td>
                          <td style={{ padding: "5px 6px", textAlign: "center", color: C.muted }}>
                            {e.elo}
                          </td>
                          <td style={{ padding: "3px", textAlign: "center" }}>
                            <Btn
                              onClick={() => dispatch({ type: "ADD_PLAYER", name: e.name })}
                              style={{ fontSize: 11, padding: "1px 8px" }}
                            >
                              +
                            </Btn>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>{dbE.length} entries</div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
