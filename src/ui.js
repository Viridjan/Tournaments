// ═══════════════════════════════════════════════════════
// UI primitives: colors, styles, Card, Btn, Tag, TabBar, Hearts
const C = {
  bg: "#f8f8f6",
  card: "#fff",
  border: "#e2e2df",
  bL: "#f0f0ed",
  text: "#1a1a1a",
  muted: "#888",
  faint: "#aaa",
  subtle: "#f1f1ee",
  green: "#3b6d11",
  gBg: "#eaf3de",
  gBd: "#c4dca8",
  amber: "#854f0b",
  aBg: "#faeeda",
  aBd: "#f0cfa0",
  red: "#a32d2d",
  rBg: "#fcebeb",
  blue: "#185fa5",
  bBg: "#e6f1fb",
  bBd: "#b3d0f0",
  accent: "#1D9E75",
  heart: "#E24B4A",
  purple: "#8b5cf6",
};
const S = {
  card: {
    background: C.card,
    border: `0.5px solid ${C.border}`,
    borderRadius: 12,
    padding: "16px 20px",
    marginBottom: 16,
  },
  btn: {
    padding: "7px 14px",
    border: "0.5px solid #bbb",
    borderRadius: 8,
    background: "transparent",
    fontSize: 13,
    cursor: "pointer",
    color: C.text,
    fontFamily: "inherit",
  },
  input: {
    width: "100%",
    padding: "7px 10px",
    border: "0.5px solid #ccc",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  metric: { background: C.subtle, borderRadius: 8, padding: "12px 16px" },
  cardTitle: { fontSize: 15, fontWeight: 600, margin: "0 0 12px" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    padding: "8px 0 4px",
    marginTop: 4,
  },
  metricLabel: { fontSize: 11, color: C.muted },
  tableHeader: { fontSize: 11, fontWeight: 500, color: C.muted, textAlign: "left" },
  modTag: {
    fontSize: 10,
    borderRadius: 4,
    padding: "1px 5px",
    background: "#f3e8ff",
    color: C.purple,
    fontWeight: 500,
  },
  fieldRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 0",
    borderBottom: `0.5px solid ${C.bL}`,
  },
  matchLabel: { fontSize: 11, fontWeight: 500, color: C.purple, marginBottom: 8 },
};
S.inputSm = { ...S.input, width: 56, fontSize: 13, padding: "4px 6px", textAlign: "center" };
S.inputXs = { ...S.input, width: 36, fontSize: 13, padding: "4px 6px", textAlign: "center" };
S.select = { ...S.input, width: "auto", fontSize: 12, padding: "4px 8px", cursor: "pointer" };
const cardVariants = {
  default: S.card,
  compact: { ...S.card, padding: "10px 14px" },
  bye: { ...S.card, padding: "10px 14px", background: C.bg, borderStyle: "dashed" },
};
function Card({ children, style, variant = "default" }) {
  return <div style={{ ...cardVariants[variant], ...style }}>{children}</div>;
}
function Btn({ children, onClick, style, title, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ ...S.btn, opacity: disabled ? 0.4 : 1, ...style }}
      onMouseEnter={(e) => !disabled && (e.target.style.background = C.subtle)}
      onMouseLeave={(e) => (e.target.style.background = style?.background || "transparent")}
    >
      {children}
    </button>
  );
}

function Tag({ children, variant = "grey" }) {
  const m = {
    grey: [C.subtle, "#555"],
    green: [C.gBg, C.green],
    amber: [C.aBg, C.amber],
    red: [C.rBg, C.red],
  };
  const [bg, co] = m[variant] || m.grey;
  return (
    <span
      style={{
        fontSize: 10,
        borderRadius: 4,
        padding: "2px 6px",
        display: "inline-block",
        background: bg,
        color: co,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}
function TabBar({ tabs, active, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => !t.disabled && onSelect(t.id)}
          style={{
            ...S.btn,
            flex: 1,
            fontSize: 13,
            padding: "6px 4px",
            textAlign: "center",
            color: t.disabled ? "#ccc" : active === t.id ? C.text : C.muted,
            background: active === t.id ? C.subtle : "transparent",
            fontWeight: active === t.id ? 500 : 400,
            borderColor: t.color || "#bbb",
            opacity: t.disabled ? 0.4 : 1,
            cursor: t.disabled ? "default" : "pointer",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
function Hearts({ score, max }) {
  return (
    <span>
      {Array.from({ length: max }, (_, i) => {
        const v = score - i;
        return (
          <span
            key={i}
            style={{ color: v >= 1 ? C.heart : v >= 0.5 ? "#555" : "#ddd", fontSize: 13 }}
          >
            {v >= 0.5 ? "♥" : "♡"}
          </span>
        );
      })}
    </span>
  );
}
