// Tournament type picker — 3 cards + 'coming soon' placeholder
// Landing screen — tournament type picker
// Clicking a card dispatches OPEN_TOURNAMENT
function LandingScreen({ dispatch, tournaments, onRetry }) {
  const empty = Object.keys(tournaments).length === 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Tournament Manager</h1>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 36 }}>Select a tournament type</p>
      {empty && (
        <div style={{ width: "100%", maxWidth: 420, marginBottom: 24 }}>
          <div style={{ background: "#fff3cd", border: "0.5px solid #ffc107", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#856404", marginBottom: 12 }}>
            No tournaments loaded. Check config/tournaments.json is not empty and rebuild.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn
              onClick={() => onRetry()}
              style={{ fontSize: 12, whiteSpace: "nowrap" }}
            >
              ↺ Retry
            </Btn>
          </div>
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "100%",
          maxWidth: 420,
        }}
      >
        {Object.values(tournaments).map((t) => (
          <div
            key={t.id}
            onClick={() => dispatch({ type: "OPEN_TOURNAMENT", id: t.id })}
            style={{
              background: C.card,
              border: `0.5px solid ${C.border}`,
              borderRadius: 16,
              padding: "16px 20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 16,
              transition: "box-shadow 0.15s, transform 0.15s",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "none";
            }}
          >
            <div style={{ fontSize: 32, flexShrink: 0 }}>{t.icon}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{t.desc}</div>
            </div>
          </div>
        ))}
        <div
          style={{
            background: C.card,
            border: `0.5px solid ${C.border}`,
            borderRadius: 16,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: 0.4,
          }}
        >
          <div style={{ fontSize: 32, flexShrink: 0 }}>⚔️</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Coming soon</div>
        </div>
      </div>
    </div>
  );
}
