// Google Sheets integration — Database card in Advanced tab
// Sheets sync — pull/push ELO, validate, copy script
// Pull: fetches ELO entries (preserves test flag)
function SheetsSync({ state, dispatch }) {
  const [status, setStatus] = useState("");
  const url = state.sheetsUrl;
  const pull = async () => {
    if (!url) {
      setStatus("⚠ No URL");
      return;
    }
    setStatus("Pulling…");
    try {
      const r = await fetch(url + "?action=load");
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      if (d?.entries) {
        const db = {};
        d.entries.forEach((e) => {
          if (e?.name)
            db[e.name.toLowerCase()] = { elo: parseInt(e.elo) || ED, name: e.name, test: !!e.test };
        });
        dispatch({ type: "SET_ELO_DB", db });
        setStatus(`✓ Pulled ${Object.keys(db).length}`);
      }
    } catch (e) {
      setStatus("✗ " + e.message);
    }
  };
  const push = async () => {
    if (!url) {
      setStatus("⚠ No URL");
      return;
    }
    setStatus("Pushing…");
    try {
      const ent = Object.values(state.eloDb)
        .filter((v) => v?.name)
        .map((v) => ({ name: v.name, elo: v.elo, test: !!v.test }));
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "save", test: false, entries: ent }),
      });
      setStatus(`Verifying…`);
      await new Promise((r) => setTimeout(r, 1500));
      const vr = await fetch(url + "?action=load");
      const vd = await vr.json();
      const remote = vd?.entries?.length || 0;
      if (remote >= ent.length) {
        setStatus(`✓ Pushed & verified (${remote} entries)`);
      } else {
        setStatus(`⚠ Pushed ${ent.length} but Sheet has ${remote} — check manually`);
      }
    } catch (e) {
      setStatus("✗ " + e.message);
    }
  };
  const validate = async () => {
    if (!url) {
      setStatus("⚠ No URL");
      return;
    }
    setStatus("Validating…");
    const results = [];
    try {
      const r = await fetch(url + "?action=load");
      const d = await r.json();
      results.push(d?.entries ? "✓ ELO" : "✗ ELO — missing or wrong format");
    } catch {
      results.push("✗ ELO — unreachable");
    }
    try {
      const r = await fetch(url + "?action=seed_list");
      const d = await r.json();
      results.push(d?.seeds ? "✓ Seeds" : "✗ Seeds — missing or wrong format");
    } catch {
      results.push("✗ Seeds — unreachable");
    }
    try {
      const r = await fetch(url + "?action=rules&tournament=_validate_");
      const d = await r.json();
      results.push(d?.rows ? "✓ Rules" : "✗ Rules — missing or wrong format");
    } catch {
      results.push("✗ Rules — unreachable");
    }
    const ok = results.every((r) => r.startsWith("✓"));
    setStatus(ok ? `✓ All tabs valid — ${results.join(" · ")}` : results.join("\n"));
  };
  const copyScript = () => {
    const s = APPS_SCRIPT;
    navigator.clipboard
      .writeText(s)
      .then(() => setStatus("✓ Script copied to clipboard"))
      .catch(() => {
        const ta = document.createElement("textarea");
        ta.value = s;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setStatus("✓ Script copied");
      });
  };
  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>Database</h3>
      <label
        style={{ fontSize: 13, color: "#444", fontWeight: 500, marginBottom: 6, display: "block" }}
      >
        Google Sheet URL
      </label>
      <input
        type="text"
        value={url || ""}
        placeholder="Apps Script URL"
        onChange={(e) => dispatch({ type: "SET_SHEETS_URL", url: e.target.value.trim() })}
        style={{ ...S.input, fontSize: 12, padding: "5px 8px", marginBottom: 6 }}
      />
      <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
        <Btn onClick={pull} style={{ flex: 1, fontSize: 12 }}>
          ⬇ Pull
        </Btn>
        <Btn onClick={push} style={{ flex: 1, fontSize: 12 }}>
          ⬆ Push
        </Btn>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <Btn
          onClick={validate}
          style={{ flex: 1, fontSize: 12, borderColor: C.blue, color: C.blue }}
        >
          🔍 Validate Sheet
        </Btn>
        <Btn
          onClick={copyScript}
          style={{ flex: 1, fontSize: 12, borderColor: C.purple, color: C.purple }}
        >
          📋 Copy Script
        </Btn>
      </div>
      <div
        style={{
          fontSize: 11,
          color: C.muted,
          minHeight: 14,
          marginTop: 6,
          whiteSpace: "pre-wrap",
        }}
      >
        {status}
      </div>
    </Card>
  );
}
