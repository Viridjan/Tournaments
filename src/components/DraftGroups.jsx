// Draft groups — snake-draft seating by ELO across tables
function DraftGroups({ players, eloDb, dispatch, eloDefault = 0, tableSize }) {
  const n = players.length;
  if (n < 2)
    return (
      <div style={{ textAlign: "center", padding: 32, color: C.faint }}>
        Add at least 2 players.
      </div>
    );
  const groups = draftGroups(players, eloDb, eloDefault, tableSize),
    groupCount = groups.length;
  const groupColors = ["#185fa5", "#0f6e56", "#a32d2d", "#854f0b", "#534ab7", "#3b6d11"];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>
          {groupCount} table{groupCount > 1 ? "s" : ""} · {n} players
        </span>
        <Btn
          onClick={() => {
            if (!window.confirm("End the draft and save seating to the log?")) return;
            dispatch({
              type: "DRAFT_END",
              tables: groups.map((gr) =>
                gr
                  .slice()
                  .sort((a, b) => getElo(eloDb, b.name, eloDefault) - getElo(eloDb, a.name, eloDefault))
                  .map((p) => ({ name: p.name, elo: getElo(eloDb, p.name, eloDefault) }))
              ),
            });
          }}
          style={{ fontSize: 12 }}
        >
          Draft ended ↗
        </Btn>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 10,
        }}
      >
        {groups.map((gr, groupIdx) => {
          const color = groupColors[groupIdx % groupColors.length],
            elos = gr.map((p) => getElo(eloDb, p.name, eloDefault)),
            avg = Math.round(elos.reduce((a, v) => a + v, 0) / elos.length);
          return (
            <Card key={groupIdx} style={{ borderLeft: `3px solid ${color}`, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontWeight: 500, color, fontSize: 15 }}>Table {groupIdx + 1}</span>
                <span style={{ fontSize: 12, color: C.muted }}>
                  {gr.length}p · avg {avg}
                </span>
              </div>
              {gr
                .sort((a, b) => getElo(eloDb, b.name, eloDefault) - getElo(eloDb, a.name, eloDefault))
                .map((p) => (
                  <div
                    key={p.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 0",
                      fontSize: 13,
                      borderBottom: `0.5px solid ${C.bL}`,
                    }}
                  >
                    <span>{p.name}</span>
                    <span style={{ color: C.muted, fontSize: 11 }}>{getElo(eloDb, p.name, eloDefault)}</span>
                  </div>
                ))}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
