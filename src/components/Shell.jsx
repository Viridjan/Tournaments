// Shell — layout, tab bar, banners, timeout, auto-push ELO, backup
const ELAPSED_POLL_MS  = 10_000; // how often the elapsed-time display updates
const TIMEOUT_POLL_MS  = 30_000; // how often to check the tournament timeout wall-clock
const STATUS_CLEAR_MS  =  5_000; // how long a successful sync status message stays visible
const STATUS_ERROR_MS  =  8_000; // how long an error sync status message stays visible
function Shell({ state, dispatch, eloLoadedCols, eloColOptions }) {
  const rawConfig = state.tournaments?.[state.tournamentId];
  if (!rawConfig) return null;
  const config = { ...rawConfig, features: { ...state.globalSettings, ...rawConfig.features, ...state.featureOverrides } };
  const cfg = config.features,
    activePlayers = state.players.filter((p) => !p.eliminated),
    go = state.tournamentStarted && isGameOver(cfg.scoring, activePlayers);
  const [el, setEl] = useState("");
  const [timedOut, setTimedOut] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  useEffect(() => {
    if (!state.startedAt || !state.tournamentStarted) return;
    const updateElapsed = () => {
      const elapsed = Date.now() - state.startedAt,
        minutes = Math.floor(elapsed / 60000);
      setEl(`${Math.floor(minutes / 60)}h ${minutes % 60}m`);
    };
    updateElapsed();
    const i = setInterval(updateElapsed, ELAPSED_POLL_MS);
    return () => clearInterval(i);
  }, [state.startedAt, state.tournamentStarted]);
  // timeoutFired ref prevents the timeout from triggering more than once per session,
  // even if the effect re-runs due to state changes after the timeout is reached.
  const timeoutFired = useRef(false);
  useEffect(() => {
    if (!state.tournamentStarted || !cfg.timeout || !cfg.timeoutTime || timedOut) return;
    const check = () => {
      if (timeoutFired.current) return;
      // cfg.timeoutTime is a wall-clock "HH:MM" string — compare against today's date.
      const [h, m] = (cfg.timeoutTime || "").split(":").map(Number);
      if (isNaN(h) || isNaN(m)) return;
      const now = new Date(),
        target = new Date(now);
      target.setHours(h, m, 0, 0);
      // If the tournament started after the target time, skip (timeout is for "before" a cutoff).
      if (state.startedAt) {
        const started = new Date(state.startedAt);
        if (started >= target) return;
      }
      if (now >= target) {
        setTimedOut(true);
        timeoutFired.current = true;
        dispatch({
          type: "LOG_EVENT",
          eventType: "tournament-timeout",
          label: `Timeout reached — ${cfg.timeoutTime}`,
        });
      }
    };
    check();
    const i = setInterval(check, TIMEOUT_POLL_MS);
    return () => clearInterval(i);
  }, [state.tournamentStarted, cfg.timeout, cfg.timeoutTime, timedOut, dispatch, state.startedAt]);
  // Local backup: write the current tournament state to localStorage on every relevant change.
  // Intentionally duplicates the buildSnap() structure inline rather than calling buildSnap()
  // because this backup runs synchronously on every render and must stay lightweight.
  // buildSnap() is used for remote seed saves which are async and less frequent.
  useEffect(() => {
    if (!state.players.length) return;
    saveLS(LS_BACKUP + "_" + state.tournamentId, {
      state: {
        players: state.players,
        currentRound: state.currentRound,
        phase: state.phase,
        pairings: state.pairings,
        history: state.history,
        matchLog: state.matchLog,
        startedAt: state.startedAt,
        draftEnded: state.draftEnded,
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
    try { localStorage.setItem(LS_BACKUP_LAST, state.tournamentId); } catch {}
  }, [state.players, state.pairings, state.currentRound, state.tournamentStarted, state.history, state.matchLog, state.draftEnded]);
  // Auto-push ELO to Google Sheets after each completed round.
  // lastPushedRound tracks history.length at last push so this only fires once per new round,
  // not on every state change that happens to re-render Shell.
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
    const eloEntries = Object.values(state.eloDb)
      .flatMap((sheet) => Object.values(sheet || {}))
      .filter((v) => v?.name)
      .map((v) => ({ name: v.name, elo: v.elo, test: !!v.test }));
    fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "save", test: false, entries: eloEntries }),
    })
      .then(() => {
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus(""), STATUS_CLEAR_MS);
      })
      .catch(() => {
        setSyncStatus("error");
        setTimeout(() => setSyncStatus(""), STATUS_ERROR_MS);
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
    cfg.rules && { id: "rules", label: "Rules" },
    { id: "players", label: "Players" },
    { id: "matches", label: "Matches", disabled: !state.tournamentStarted },
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
        🏆 Over{activePlayers[0] ? ` — ${activePlayers[0].name} wins!` : "."}
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
          🟢 R{state.currentRound} · {state.phase === "roundrobin" ? "RR" : "Swiss"} · {activePlayers.length}p
          · {cfg.scoring}
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
      <span>⏰ Tournament timeout — {cfg.timeoutTime} has passed</span>
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
      {state.activeTab === "rules" && cfg.rules && <RulesTab state={state} />}
      {state.activeTab === "players" && (
        <PlayersTab state={state} dispatch={dispatch} config={config} eloLoadedCols={eloLoadedCols} />
      )}
      {state.activeTab === "matches" && (
        <MatchesTab state={state} dispatch={dispatch} config={config} eloLoadedCols={eloLoadedCols} />
      )}
      {state.activeTab === "settings" && (
        <SettingsTab state={state} dispatch={dispatch} config={config} />
      )}
      {state.activeTab === "advanced" && state.advancedSetup && (
        <AdvancedTab state={state} dispatch={dispatch} config={config} eloColOptions={eloColOptions} />
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
