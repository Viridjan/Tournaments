// Tournament type picker — 3 cards + 'coming soon' placeholder
// Landing screen — tournament type picker
// Clicking a card dispatches OPEN_TOURNAMENT
function LandingScreen({ dispatch, tournaments }) {
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
          width: "100%",
          maxWidth: 520,
        }}
      >
        {Object.values(tournaments || T).map((t) => (
          <div
            key={t.id}
            onClick={() => dispatch({ type: "OPEN_TOURNAMENT", id: t.id })}
            style={{
              background: C.card,
              border: `0.5px solid ${C.border}`,
              borderRadius: 16,
              padding: "24px 20px",
              cursor: "pointer",
              textAlign: "center",
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
            <div style={{ fontSize: 36, marginBottom: 10 }}>{t.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{t.desc}</div>
          </div>
        ))}
        <div
          style={{
            background: C.card,
            border: `0.5px solid ${C.border}`,
            borderRadius: 16,
            padding: "24px 20px",
            textAlign: "center",
            opacity: 0.4,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>⚔️</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Coming soon</div>
        </div>
      </div>
    </div>
  );
}
