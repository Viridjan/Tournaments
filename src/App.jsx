// Root component. On mount:
// App root — reducer, auto-sync ELO, auto-restore backup
//   1. Auto-syncs ELO database from Google Sheets (silent)
function App() {
  const [state, dispatch] = useReducer(reducer, init);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const url = gSU();
    if (!url) { setLoading(false); return; }
    Promise.all([
      fetch(url + "?action=load")
        .then((r) => r.json())
        .then((d) => {
          if (d?.entries) {
            const db = {};
            d.entries.forEach((e) => {
              if (e?.name)
                db[e.name.toLowerCase()] = {
                  elo: parseInt(e.elo) || ED,
                  name: e.name,
                  test: !!e.test,
                };
            });
            dispatch({ type: "SET_ELO_DB", db });
          }
        })
        .catch(() => {}),
      fetch(url + "?action=tournament_list")
        .then((r) => r.json())
        .then((d) => {
          if (d?.tournaments?.length) {
            dispatch({ type: "SET_TOURNAMENTS", tournaments: d.tournaments });
          }
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);
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
      {state.screen === "landing" && <LandingScreen dispatch={dispatch} tournaments={state.tournaments} />}
      {state.screen === "tournament" && <Shell state={state} dispatch={dispatch} />}
    </div>
  );
}
