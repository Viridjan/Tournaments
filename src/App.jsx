function validateConfig() {
  const errors = [];
  if (!Array.isArray(TOURNAMENTS) || TOURNAMENTS.length === 0)
    return ["config/tournaments.json is empty — add at least one tournament."];
  TOURNAMENTS.forEach((t) => {
    const id = t.id || "(no id)";
    if (!t.id)   errors.push(`Tournament missing "id"`);
    if (!t.name) errors.push(`${id}: missing "name"`);
    if (!t.features) { errors.push(`${id}: missing "features" object`); return; }
    const f = t.features;
    if (!f.scoring)
      errors.push(`${id}: missing "scoring"`);
    else if (!SCORING_PRESETS[f.scoring])
      errors.push(`${id}: unknown scoring "${f.scoring}" — valid values: ${Object.keys(SCORING_PRESETS).join(", ")}`);
    if (!f.matchMax)
      errors.push(`${id}: missing "matchMax"`);
    if (f.draft && !(Number(f.draftTableSize) > 0))
      errors.push(`${id}: draft is enabled but "draftTableSize" is missing or not a positive number`);
  });
  return errors;
}

// App root — reducer, auto-sync ELO from Sheets on mount, auto-restore backup
function App() {
  const [state, dispatch] = useReducer(reducer, init);
  const [loading, setLoading] = useState(true);
  const [configErrors, setConfigErrors] = useState([]);
  const [eloLoadedCols, setEloLoadedCols] = useState({});
  const [eloColOptions, setEloColOptions] = useState([]);
  const fetchTournaments = (url) => {
    // Validate config files before doing anything
    const errors = validateConfig();
    if (errors.length) {
      setConfigErrors(errors);
      setLoading(false);
      return;
    }
    // Tournaments and global settings are bundled from config/ at build time
    // Merge scoring mode preset into each tournament's features (preset is base, tournament overrides win)
    const merged = TOURNAMENTS.map(t => ({
      ...t,
      features: { ...SCORING_PRESETS[t.features.scoring], ...t.features },
    }));
    dispatch({ type: "SET_TOURNAMENTS", tournaments: merged });
    dispatch({ type: "SET_GLOBAL_SETTINGS", settings: GLOBAL_SETTINGS });
    setLoading(false);

    const u = url || getSheetsUrl();
    if (!u) return;

    // ELO data still comes from Sheets

    const configuredCols = [...new Set(TOURNAMENTS.map((t) => t.features?.eloDB).filter(Boolean))];
    const loadEloCols = (cols) => cols.forEach((col) => {
      fetch(u + "?action=load&col=" + encodeURIComponent(col))
        .then((r) => r.json())
        .then((ed) => {
          if (ed?.entries) {
            const db = {};
            ed.entries.forEach((e) => { if (e?.name) db[e.name.toLowerCase()] = { elo: parseInt(e.elo), name: e.name, test: !!e.test }; });
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
  };
  useEffect(() => { fetchTournaments(); }, []);
  const prevEloCol = useRef(null);
  useEffect(() => {
    const col = state.featureOverrides?.eloDB;
    if (!col || col === prevEloCol.current || state.eloDb?.[col]) return;
    prevEloCol.current = col;
    const u = getSheetsUrl();
    if (!u) return;
    fetch(u + "?action=load&col=" + encodeURIComponent(col))
      .then((r) => r.json())
      .then((ed) => {
        if (ed?.entries) {
          const db = {};
          ed.entries.forEach((e) => { if (e?.name) db[e.name.toLowerCase()] = { elo: parseInt(e.elo), name: e.name, test: !!e.test }; });
          dispatch({ type: "SET_ELO_DB", db, col });
          setEloLoadedCols((prev) => ({ ...prev, [col]: true }));
        }
      })
      .catch(() => {});
  }, [state.featureOverrides?.eloDB]);
  useEffect(() => {
    if (!state.tournamentStarted || !state.players.length) return;
    const t = setTimeout(() => autoSeedSave(state), 2000);
    return () => clearTimeout(t);
  }, [state.pairings, state.history, state.players, state.currentRound, state.phase]);
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const lastId = localStorage.getItem(LS_BACKUP_LAST);
      const raw = lastId ? localStorage.getItem(LS_BACKUP + "_" + lastId) : null;
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
          localStorage.removeItem(LS_BACKUP + "_" + lastId);
          localStorage.removeItem(LS_BACKUP_LAST);
        }
      }
    } catch {}
  }, []);
  if (loading)
    return (
      <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: C.bg, color: C.text, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 12 }}>
        <div style={{ fontSize: 32 }}>🏆</div>
        <div style={{ fontSize: 14, color: C.muted }}>Loading…</div>
      </div>
    );
  if (configErrors.length)
    return (
      <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: C.bg, color: C.text, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16, padding: 32 }}>
        <div style={{ fontSize: 28 }}>⚠️</div>
        <div style={{ fontWeight: 600, fontSize: 16 }}>Config error — fix and rebuild</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {configErrors.map((e, i) => (
            <li key={i} style={{ background: "#fff3cd", border: "0.5px solid #ffc107", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "#856404", fontFamily: "monospace" }}>{e}</li>
          ))}
        </ul>
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
      {state.screen === "landing" && <LandingScreen dispatch={dispatch} tournaments={state.tournaments} onRetry={fetchTournaments} />}
      {state.screen === "tournament" && <Shell state={state} dispatch={dispatch} eloLoadedCols={eloLoadedCols} eloColOptions={eloColOptions} />}
    </div>
  );
}
