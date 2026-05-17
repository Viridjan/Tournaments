// Top-level tournament layout. Handles:
// Shell — layout, tabs, banners, timeout, auto-push, backup
//   - Tab bar (conditional tabs gated by test/experimental/advanced checkboxes)
function Shell({ state, dispatch, eloLoadedCols }) {
  const rawConfig = state.tournaments?.[state.tournamentId];
  if (!rawConfig) return null;
  const config = { ...rawConfig, features: { ...rawConfig.features, ...state.featureOverrides } };
  const c = config.features,
    ac = state.players.filter((p) => !p.eliminated),
    go = state.tournamentStarted && c.scoring === "lifepoints" && ac.length <= 1;
  const [el, setEl] = useState("");
  const [timedOut, setTimedOut] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  useEffect(() => {
    if (!state.startedAt || !state.tournamentStarted) return;
    const u = () => {
      const ms = Date.now() - state.startedAt,
        m = Math.floor(ms / 60000);
      setEl(`${Math.floor(m / 60)}h ${m % 60}m`);
    };
    u();
    const i = setInterval(u, 10000);
    return () => clearInterval(i);
  }, [state.startedAt, state.tournamentStarted]);
  const timeoutFired = useRef(false);
  useEffect(() => {
    if (!state.tournamentStarted || !c.timeout || !c.timeoutTime || timedOut) return;
    const check = () => {
      if (timeoutFired.current) return;
      const [h, m] = (c.timeoutTime || "").split(":").map(Number);
      if (isNaN(h) || isNaN(m)) return;
      const n = new Date(),
        target = new Date(n);
      target.setHours(h, m, 0, 0);
      if (state.startedAt) {
        const started = new Date(state.startedAt);
        if (started >= target) return;
      }
      if (n >= target) {
        setTimedOut(true);
        timeoutFired.current = true;
        dispatch({
          type: "LOG_EVENT",
          eventType: "tournament-timeout",
          label: `Timeout reached — ${c.timeoutTime}`,
        });
      }
    };
    check();
    const i = setInterval(check, 30000);
    return () => clearInterval(i);
  }, [state.tournamentStarted, c.timeout, c.timeoutTime, timedOut, dispatch, state.startedAt]);
  useEffect(() => {
    if (!state.players.length) return;
    sLS(BK, {
      state: {
        players: state.players,
        currentRound: state.currentRound,
        phase: state.phase,
        pairings: state.pairings,
        history: state.history,
        matchLog: state.matchLog,
        startedAt: state.startedAt,
      },
      tournamentStarted: state.tournamentStarted,
      tournamentMode: state.tournamentId,
      prizes: state.prizes,
      ranks: state.ranks,
      entryCost: state.entryCost,
      prizePct: state.prizePct,
      prizePctRoundUp: state.prizePctRoundUp,
      roundUpPct: state.roundUpPct,
      roundUpPctRoundUp: state.roundUpPctRoundUp,
      featureOverrides: state.featureOverrides,
      savedAt: Date.now(),
    });
  }, [state.players, state.pairings, state.currentRound, state.tournamentStarted, state.history]);
  const lastPushedRound = useRef(0);
  useEffect(() => {
    if (
      !state.tournamentStarted ||
      state.history.length === 0 ||
      state.history.length <= lastPushedRound.current
    )
      return;
    lastPushedRound.current = state.history.length;
    const url = state.sheetsUrl;
    if (!url) return;
    setSyncStatus("syncing");
    const ent = Object.values(state.eloDb)
      .filter((v) => v?.name)
      .map((v) => ({ name: v.name, elo: v.elo, test: !!v.test }));
    fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "save", test: false, entries: ent }),
    })
      .then(() => {
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus(""), 5000);
      })
      .catch(() => {
        setSyncStatus("error");
        setTimeout(() => setSyncStatus(""), 8000);
      });
  }, [state.history.length]);
  useEffect(() => {
    const h = (e) => {
      if (!state.tournamentStarted) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [state.tournamentStarted]);
  const tabs = [
    c.rules && { id: "rules", label: "Rules" },
    { id: "players", label: "Players" },
    { id: "matches", label: "Matches", disabled: !state.tournamentStarted },
    { id: "standings", label: "Standings", disabled: !state.tournamentStarted },
    { id: "settings", label: "Settings" },
    state.testMode && { id: "test", label: "🧪 Test", color: C.red },
    state.experimental && { id: "spinner", label: "🎲 Spinner", color: C.purple },
    state.advancedSetup && { id: "advanced", label: "⚙ Advanced" },
  ].filter(Boolean);
  let banner = null;
  if (!state.tournamentStarted)
    banner = (
      <div
        style={{
          background: C.aBg,
          color: C.amber,
          border: `0.5px solid ${C.aBd}`,
          borderRadius: 8,
          padding: "8px 14px",
          marginBottom: 16,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        ⚠ Not started. Add players and press Start.
      </div>
    );
  else if (go)
    banner = (
      <div
        style={{
          background: C.bBg,
          color: C.blue,
          border: `0.5px solid ${C.bBd}`,
          borderRadius: 8,
          padding: "8px 14px",
          marginBottom: 16,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        🏆 Over{ac[0] ? ` — ${ac[0].name} wins!` : "."}
      </div>
    );
  else
    banner = (
      <div
        style={{
          background: C.gBg,
          color: C.green,
          border: `0.5px solid ${C.gBd}`,
          borderRadius: 8,
          padding: "8px 14px",
          marginBottom: 16,
          fontSize: 13,
          fontWeight: 500,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span>
          🟢 R{state.currentRound} · {state.phase === "roundrobin" ? "RR" : "Swiss"} · {ac.length}p
          · {c.scoring}
        </span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {syncStatus === "syncing" && (
            <span style={{ fontSize: 11, opacity: 0.7 }}>⟳ syncing…</span>
          )}
          {syncStatus === "synced" && <span style={{ fontSize: 11, opacity: 0.7 }}>☁ synced</span>}
          {syncStatus === "error" && (
            <span style={{ fontSize: 11, color: C.red, opacity: 0.9 }}>⚠ sync failed</span>
          )}
          {el && <span style={{ fontSize: 12, opacity: 0.75 }}>⏱ {el}</span>}
        </span>
      </div>
    );
  const timeoutBanner = timedOut ? (
    <div
      style={{
        background: C.rBg,
        color: C.red,
        border: `0.5px solid ${C.red}`,
        borderRadius: 8,
        padding: "8px 14px",
        marginBottom: 16,
        fontSize: 13,
        fontWeight: 600,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span>⏰ Tournament timeout — {c.timeoutTime} has passed</span>
      <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>Finish the current round</span>
    </div>
  ) : null;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>
          {config.icon} {config.name}
        </h2>
      </div>
      {banner}
      {timeoutBanner}
      <TabBar
        tabs={tabs}
        active={state.activeTab}
        onSelect={(id) => dispatch({ type: "SET_TAB", tab: id })}
      />
      {state.activeTab === "rules" && c.rules && <RulesTab state={state} />}
      {state.activeTab === "players" && (
        <PlayersTab state={state} dispatch={dispatch} config={config} eloLoadedCols={eloLoadedCols} />
      )}
      {state.activeTab === "matches" && (
        <MatchesTab state={state} dispatch={dispatch} config={config} />
      )}
      {state.activeTab === "standings" && (
        <StandingsTab state={state} dispatch={dispatch} config={config} eloLoadedCols={eloLoadedCols} />
      )}
      {state.activeTab === "settings" && (
        <SettingsTab state={state} dispatch={dispatch} config={config} />
      )}
      {state.activeTab === "advanced" && state.advancedSetup && (
        <AdvancedTab state={state} dispatch={dispatch} config={config} />
      )}
      {state.activeTab === "test" && state.testMode && (
        <TestTab state={state} dispatch={dispatch} />
      )}
      {state.activeTab === "spinner" && state.experimental && (
        <SpinnerTab state={state} dispatch={dispatch} />
      )}
    </div>
  );
}
