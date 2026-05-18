// Save/load tournament snapshots via Google Sheets
// Seeds — save/load/delete tournament snapshots
// v3 format: single JSON blob per seed (no chunking)
function SeedsManager({ state, dispatch }) {
  const [status, setStatus] = useState(""),
    [seedId, setSeedId] = useState(""),
    [seeds, setSeeds] = useState([]);
  const url = state.sheetsUrl;
  const save = async () => {
    if (!url) {
      setStatus("⚠ No URL");
      return;
    }
    if (!state.players.length) {
      setStatus("⚠ No players");
      return;
    }
    const id = mkId();
    const snap = buildSnap(state);
    const data = JSON.stringify(snap);
    const t = state.tournaments?.[state.tournamentId];
    const label = `${t?.icon || ""} ${t?.name || ""} · ${state.players.length}p · R${state.currentRound}`;
    setStatus("Saving…");
    try {
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "seed_save", id, label, data }),
      });
      setStatus("Verifying…");
      await new Promise((r) => setTimeout(r, 1500));
      const vr = await fetch(url + "?action=seed_load&id=" + encodeURIComponent(id));
      const vd = await vr.json();
      if (vd?.ok) {
        setStatus(`✓ Saved · ${id}`);
        list();
      } else {
        setStatus(`⚠ Sent but verify failed · ${id}`);
      }
    } catch (e) {
      setStatus("✗ " + e.message);
    }
  };
  const loadById = async (id) => {
    const target = (id || seedId.trim()).toUpperCase();
    if (!url || !target) {
      setStatus("⚠ Enter ID");
      return;
    }
    setStatus("Loading…");
    try {
      const r = await fetch(url + "?action=seed_load&id=" + encodeURIComponent(target));
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      if (!d?.ok) throw new Error(d?.error || "Not found");
      let snap;
      if (d.data) {
        snap = JSON.parse(d.data);
      } else if (d.chunks) {
        snap = JSON.parse(d.chunks.join(""));
      } else throw new Error("No data");
      dispatch({ type: "RESTORE_SNAPSHOT", snapshot: snap });
      setStatus(`✓ Restored ${target}`);
    } catch (e) {
      setStatus("✗ " + e.message);
    }
  };
  const del = async (id) => {
    if (!url) return;
    setStatus("Deleting…");
    try {
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "seed_delete", id }),
      });
      await new Promise((r) => setTimeout(r, 1000));
      list();
      setStatus(`✓ Deleted ${id}`);
    } catch (e) {
      setStatus("✗ " + e.message);
    }
  };
  const list = async () => {
    if (!url) return;
    try {
      const r = await fetch(url + "?action=seed_list");
      const d = await r.json();
      setSeeds(
        (d?.seeds || []).sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || "")),
      );
    } catch {}
  };
  useEffect(() => {
    list();
  }, []);
  return (
    <Card>
      <h3 style={S.cardTitle}>Seeds</h3>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <Btn onClick={save} style={{ fontSize: 12 }}>
          💾 Save snapshot
        </Btn>
        <input
          type="text"
          value={seedId}
          placeholder="Seed ID…"
          onChange={(e) => setSeedId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadById()}
          style={{ ...S.input, fontSize: 12, padding: "5px 8px", flex: 1, minWidth: 80 }}
        />
        <Btn onClick={() => loadById()} style={{ fontSize: 12 }}>
          📂 Load
        </Btn>
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{status}</div>
      {seeds.length > 0 && (
        <div style={{ fontSize: 12 }}>
          {seeds.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                gap: 6,
                padding: "6px 0",
                borderBottom: `0.5px solid ${C.bL}`,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <code
                style={{
                  fontSize: 11,
                  background: C.subtle,
                  padding: "1px 5px",
                  borderRadius: 3,
                  flexShrink: 0,
                }}
              >
                {s.id}
              </code>
              <span style={{ flex: 1, fontSize: 12, minWidth: 80 }}>{s.label}</span>
              <span style={{ fontSize: 10, color: C.faint, flexShrink: 0 }}>
                {s.timestamp ? new Date(s.timestamp).toLocaleDateString() : ""}
              </span>
              <Btn
                onClick={() => {
                  if (confirm(`Load seed ${s.id}?`)) loadById(s.id);
                }}
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  color: C.blue,
                  borderColor: C.bBd,
                  flexShrink: 0,
                }}
              >
                Load
              </Btn>
              <Btn
                onClick={() => {
                  if (confirm(`Delete seed ${s.id}?`)) del(s.id);
                }}
                style={{ fontSize: 10, padding: "2px 6px", color: C.red, flexShrink: 0 }}
              >
                ✕
              </Btn>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
