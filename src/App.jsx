// Root component. On mount:
// App root — reducer, auto-sync ELO, auto-restore backup
//   1. Auto-syncs ELO database from Google Sheets (silent)
function App() {
  const [state, dispatch] = useReducer(reducer, init);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [eloLoadedCols, setEloLoadedCols] = useState({});
  const [eloColOptions, setEloColOptions] = useState([]);
  const fetchTournaments = (url) => {
    const u = url || gSU();
    if (!u) { setLoading(false); return; }
    setLoading(true);
    setFetchError(null);
    fetch(u + "?action=tournament_list")
      .then((r) => r.json())
      .then((d) => {
        if (d?.tournaments?.length) {
          dispatch({ type: "SET_TOURNAMENTS", tournaments: d.tournaments });
          const configuredCols = [...new Set(d.tournaments.map((t) => t.features?.eloDB).filter(Boolean))];
          const loadEloCols = (cols) => cols.forEach((col) => {
            fetch(u + "?action=load&col=" + encodeURIComponent(col))
              .then((r) => r.json())
              .then((ed) => {
                if (ed?.entries) {
                  const db = {};
                  ed.entries.forEach((e) => { if (e?.name) db[e.name.toLowerCase()] = { elo: parseInt(e.elo) || ED, name: e.name, test: !!e.test }; });
                  dispatch({ type: "SET_ELO_DB", db, col });
                  setEloLoadedCols((prev) => ({ ...prev, [col]: true }));
                }
              })
              .catch(() => {});
          });
          fetch(u + "?action=elo_cols")
            .then((r) => r.json())
            .then((cd) => {
              if (cd?.cols?.length) {
                setEloColOptions(cd.cols);
                const toLoad = configuredCols.length > 0 ? configuredCols : cd.cols;
                loadEloCols(toLoad);
              }
            })
            .catch(() => {
              if (configuredCols.length > 0) loadEloCols(configuredCols);
            });
        } else if (d?.error) {
          setFetchError("Script error: " + d.error);
        } else {
          setFetchError("Settings sheet is empty — add tournament rows to the sheet.");
        }
      })
      .catch((err) => setFetchError("Fetch failed: " + (err?.message || "network error")))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchTournaments(); }, []);
  const prevEloCol = useRef(null);
  useEffect(() => {
    const col = state.featureOverrides?.eloDB;
    if (!col || col === prevEloCol.current || state.eloDb?.[col]) return;
    prevEloCol.current = col;
    const u = gSU();
    if (!u) return;
    fetch(u + "?action=load&col=" + encodeURIComponent(col))
      .then((r) => r.json())
      .then((ed) => {
        if (ed?.entries) {
          const db = {};
          ed.entries.forEach((e) => { if (e?.name) db[e.name.toLowerCase()] = { elo: parseInt(e.elo) || ED, name: e.name, test: !!e.test }; });
          dispatch({ type: "SET_ELO_DB", db, col });
          setEloLoadedCols((prev) => ({ ...prev, [col]: true }));
        }
      })
      .catch(() => {});
  }, [state.featureOverrides?.eloDB]);
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(BK);
      if (!raw) return;
      const snap = JSON.parse(raw);
      if (snap?.tournamentStarted && snap?.state?.players?.length) {
        if (
          confirm(
            `Restore tournament in progress?\n${snap.state.players.length} players, round ${snap.state.currentRound}`,
          )
        ) {
          dispatch({ type: "RESTORE_SNAPSHOT", snapshot: snap });
        } else {
          localStorage.removeItem(BK);
        }
      }
    } catch {}
  }, []);
  if (loading)
    return (
      <div
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: C.bg,
          color: C.text,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 32 }}>🏆</div>
        <div style={{ fontSize: 14, color: C.muted }}>Loading…</div>
      </div>
    );
  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: C.bg,
        color: C.text,
        padding: 16,
        maxWidth: 950,
        margin: "0 auto",
        minHeight: "100vh",
      }}
    >
      {state.screen === "landing" && <LandingScreen dispatch={dispatch} tournaments={state.tournaments} onRetry={fetchTournaments} fetchError={fetchError} />}
      {state.screen === "tournament" && <Shell state={state} dispatch={dispatch} eloLoadedCols={eloLoadedCols} eloColOptions={eloColOptions} />}
    </div>
  );
}
