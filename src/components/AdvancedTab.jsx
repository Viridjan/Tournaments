// Full tournament config editor — two cards side by side:
// Advanced tab — full config editor, prizes, payouts, sheets sync
// Left: Identity (id/name/icon) + Rounds & Matches (min/max, timer, RR)
function AdvancedTab({ state, dispatch, config, eloColOptions }) {
  const f = config.features;
  const sf = (k, v) => dispatch({ type: "SET_FEATURE", key: k, value: v });
  const NumF = ({ label, k, desc }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 0",
        borderBottom: `0.5px solid ${C.bL}`,
      }}
    >
      <span style={{ flex: 1, fontSize: 13 }}>
        {label}
        {desc && <span style={{ fontSize: 10, color: C.faint, marginLeft: 4 }}>{desc}</span>}
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={f[k] ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          sf(k, v === "" ? "" : isNaN(Number(v)) ? v : Number(v));
        }}
        style={{ ...S.input, width: 56, textAlign: "center", fontSize: 13, padding: "4px 6px" }}
      />
      {state.featureOverrides[k] !== undefined && (
        <span
          style={{
            fontSize: 10,
            borderRadius: 4,
            padding: "1px 5px",
            background: "#f3e8ff",
            color: C.purple,
            fontWeight: 500,
          }}
        >
          mod
        </span>
      )}
    </div>
  );
  const BoolF = ({ label, k }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 0",
        borderBottom: `0.5px solid ${C.bL}`,
        cursor: "pointer",
      }}
      onClick={() => dispatch({ type: "TOGGLE_FEATURE", key: k })}
    >
      <input
        type="checkbox"
        checked={!!f[k]}
        onChange={() => dispatch({ type: "TOGGLE_FEATURE", key: k })}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 15, height: 15, accentColor: C.accent, cursor: "pointer", margin: 0 }}
      />
      <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
      {state.featureOverrides[k] !== undefined && (
        <span
          style={{
            fontSize: 10,
            borderRadius: 4,
            padding: "1px 5px",
            background: "#f3e8ff",
            color: C.purple,
            fontWeight: 500,
          }}
        >
          mod
        </span>
      )}
    </div>
  );
  const SelF = ({ label, k, options }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 0",
        borderBottom: `0.5px solid ${C.bL}`,
      }}
    >
      <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
      <select
        value={f[k] || ""}
        onChange={(e) => sf(k, e.target.value)}
        style={{ ...S.input, width: "auto", fontSize: 12, padding: "4px 8px", cursor: "pointer" }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {state.featureOverrides[k] !== undefined && (
        <span
          style={{
            fontSize: 10,
            borderRadius: 4,
            padding: "1px 5px",
            background: "#f3e8ff",
            color: C.purple,
            fontWeight: 500,
          }}
        >
          mod
        </span>
      )}
    </div>
  );
  const isLP = f.scoring === "lifepoints";
  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card style={{ flex: 1, minWidth: 260 }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Tournament config</h3>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
            Override settings for this session. Changes marked with{" "}
            <span
              style={{
                background: "#f3e8ff",
                color: C.purple,
                padding: "0 4px",
                borderRadius: 3,
                fontWeight: 500,
              }}
            >
              mod
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 0",
              borderBottom: `0.5px solid ${C.bL}`,
            }}
          >
            <span style={{ flex: 1, fontSize: 13 }}>ID</span>
            <span style={{ fontSize: 12, color: C.faint, fontFamily: "monospace" }}>
              {config.id}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 0",
              borderBottom: `0.5px solid ${C.bL}`,
            }}
          >
            <span style={{ flex: 1, fontSize: 13 }}>Name</span>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{config.name}</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 0",
              borderBottom: `0.5px solid ${C.bL}`,
            }}
          >
            <span style={{ flex: 1, fontSize: 13 }}>Icon</span>
            <span style={{ fontSize: 18 }}>{config.icon}</span>
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              padding: "8px 0 4px",
              marginTop: 4,
            }}
          >
            Rounds & Matches
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 0",
              borderBottom: `0.5px solid ${C.bL}`,
            }}
          >
            <span style={{ flex: 1, fontSize: 13 }}>Min / Max players</span>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input
                type="text"
                inputMode="numeric"
                value={f.matchMin ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  sf("matchMin", v === "" ? "" : isNaN(Number(v)) ? v : Number(v));
                }}
                style={{
                  ...S.input,
                  width: 40,
                  textAlign: "center",
                  fontSize: 13,
                  padding: "4px 6px",
                }}
              />
              <span style={{ fontSize: 11, color: C.faint }}>/</span>
              <input
                type="text"
                inputMode="numeric"
                value={f.matchMax ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  sf("matchMax", v === "" ? "" : isNaN(Number(v)) ? v : Number(v));
                }}
                style={{
                  ...S.input,
                  width: 40,
                  textAlign: "center",
                  fontSize: 13,
                  padding: "4px 6px",
                }}
              />
            </div>
          </div>
          <NumF label="Timer (minutes)" k="timerMinutes" />
          <NumF label="Round-robin rounds" k="rrRounds" />
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              padding: "8px 0 4px",
              marginTop: 4,
            }}
          >
            Scoring
          </div>
          <SelF label="Scoring mode" k="scoring" options={["lifepoints", "swiss", "points"]} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 0",
              borderBottom: `0.5px solid ${C.bL}`,
            }}
          >
            <span style={{ flex: 1, fontSize: 13 }}>Win / Draw / Loss</span>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input
                type="text"
                inputMode="numeric"
                value={f.winPoints ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  sf("winPoints", v === "" ? "" : isNaN(Number(v)) ? v : Number(v));
                }}
                style={{
                  ...S.input,
                  width: 36,
                  textAlign: "center",
                  fontSize: 13,
                  padding: "4px 6px",
                }}
              />
              <span style={{ fontSize: 11, color: C.faint }}>/</span>
              <input
                type="text"
                inputMode="numeric"
                value={f.drawPoints ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  sf("drawPoints", v === "" ? "" : isNaN(Number(v)) ? v : Number(v));
                }}
                style={{
                  ...S.input,
                  width: 36,
                  textAlign: "center",
                  fontSize: 13,
                  padding: "4px 6px",
                }}
              />
              <span style={{ fontSize: 11, color: C.faint }}>/</span>
              <input
                type="text"
                inputMode="numeric"
                value={f.lossPoints ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  sf("lossPoints", v === "" ? "" : isNaN(Number(v)) ? v : Number(v));
                }}
                style={{
                  ...S.input,
                  width: 36,
                  textAlign: "center",
                  fontSize: 13,
                  padding: "4px 6px",
                }}
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 0",
              borderBottom: `0.5px solid ${C.bL}`,
              opacity: isLP ? 1 : 0.35,
            }}
          >
            <span style={{ flex: 1, fontSize: 13 }}>
              Start score
              {!isLP && (
                <span style={{ fontSize: 10, color: C.faint, marginLeft: 4 }}>
                  (lifepoints only)
                </span>
              )}
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={f.startScore ?? ""}
              disabled={!isLP}
              onChange={(e) => {
                const v = e.target.value;
                sf("startScore", v === "" ? "" : isNaN(Number(v)) ? v : Number(v));
              }}
              style={{
                ...S.input,
                width: 56,
                textAlign: "center",
                fontSize: 13,
                padding: "4px 6px",
                opacity: isLP ? 1 : 0.5,
              }}
            />
          </div>
          <BoolF label="Cumulative draw penalty" k="cumulativeDrawPenalty" />
        </Card>
        <Card style={{ flex: 1, minWidth: 260 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              padding: "0 0 4px",
            }}
          >
            Features
          </div>
          <BoolF label="Draft phase" k="draft" />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 0",
              borderBottom: `0.5px solid ${C.bL}`,
            }}
          >
            <input
              type="checkbox"
              checked={!!f.timeout}
              onChange={() => dispatch({ type: "TOGGLE_FEATURE", key: "timeout" })}
              style={{ width: 15, height: 15, accentColor: C.accent, cursor: "pointer", margin: 0 }}
            />
            <span style={{ flex: 1, fontSize: 13 }}>Timeout warning</span>
            <input
              type="text"
              value={f.timeoutTime || ""}
              placeholder="HH:MM"
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9:]/g, "");
                sf("timeoutTime", v);
              }}
              style={{
                ...S.input,
                width: 64,
                fontSize: 13,
                padding: "4px 6px",
                textAlign: "center",
                fontVariantNumeric: "tabular-nums",
              }}
            />
          </div>
          <BoolF label="Decide first player" k="firstPlayer" />
          <BoolF label="Prizes" k="prizes" />
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              padding: "8px 0 4px",
              marginTop: 4,
            }}
          >
            Grand Prix
          </div>
          <BoolF label="GP enabled" k="grandPrix" />
          <NumF label="GP best of last N" k="gpBestOfLast" />
          <NumF label="GP drop worst N" k="gpDropWorst" />
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              padding: "8px 0 4px",
              marginTop: 4,
            }}
          >
            ELO
          </div>
          <BoolF label="ELO tracking" k="elo" />
          <NumF label="ELO K-max" k="eloKMax" desc="max delta per match" />
          <NumF label="ELO scale" k="eloScale" desc={`sensitivity (default ${ES})`} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 0",
              borderBottom: `0.5px solid ${C.bL}`,
            }}
          >
            <span style={{ flex: 1, fontSize: 13 }}>ELO column</span>
            <select
              value={f.eloCol ?? ""}
              onChange={(e) => sf("eloCol", e.target.value)}
              style={{ ...S.input, width: "auto", fontSize: 12, padding: "4px 8px", cursor: "pointer" }}
            >
              <option value="">— select —</option>
              {(eloColOptions || []).map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
            {state.featureOverrides.eloCol !== undefined && (
              <span style={{ fontSize: 10, borderRadius: 4, padding: "1px 5px", background: "#f3e8ff", color: C.purple, fontWeight: 500 }}>
                mod
              </span>
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <SheetsSync state={state} dispatch={dispatch} config={config} />
          </div>
        </Card>
      </div>
      {f.prizes && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Card style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Ranking payouts</h3>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        fontSize: 11,
                        color: C.muted,
                        fontWeight: 500,
                        textAlign: "left",
                        padding: "4px 8px 4px 0",
                        borderBottom: `0.5px solid ${C.border}`,
                      }}
                    >
                      Rank
                    </th>
                    <th
                      style={{
                        fontSize: 11,
                        color: C.muted,
                        fontWeight: 500,
                        textAlign: "center",
                        padding: "4px 6px",
                        borderBottom: `0.5px solid ${C.border}`,
                        width: 70,
                      }}
                    >
                      %
                    </th>
                    <th
                      style={{
                        fontSize: 11,
                        color: C.muted,
                        fontWeight: 500,
                        textAlign: "center",
                        padding: "4px 6px",
                        borderBottom: `0.5px solid ${C.border}`,
                        width: 80,
                      }}
                    >
                      Payout
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {state.ranks.map((r, i) => {
                    const pool = state.entryCost * state.players.length;
                    const ppct = state.prizePct || 50;
                    const rawAc = (state.players.length * ppct) / 100;
                    const ac = state.prizePctRoundUp ? Math.ceil(rawAc) : Math.floor(rawAc);
                    const inact = state.players.length > 0 && i >= ac;
                    return (
                      <tr key={i} style={{ opacity: inact ? 0.35 : 1 }}>
                        <td
                          style={{
                            fontWeight: 500,
                            padding: "5px 8px 5px 0",
                            borderBottom: `0.5px solid ${C.bL}`,
                          }}
                        >
                          {r.label}
                        </td>
                        <td
                          style={{
                            padding: "4px 6px",
                            borderBottom: `0.5px solid ${C.bL}`,
                            textAlign: "center",
                          }}
                        >
                          <input
                            type="text"
                            value={r.pct}
                            onChange={(e) =>
                              dispatch({
                                type: "UPDATE_RANK",
                                index: i,
                                field: "pct",
                                value: parseFloat(e.target.value) || 0,
                              })
                            }
                            style={{
                              ...S.input,
                              fontSize: 13,
                              padding: "4px 6px",
                              width: 60,
                              textAlign: "center",
                            }}
                          />
                        </td>
                        <td
                          style={{
                            padding: "4px 6px",
                            borderBottom: `0.5px solid ${C.bL}`,
                            textAlign: "center",
                            fontWeight: 500,
                          }}
                        >
                          {inact ? "—" : `€${((pool * r.pct) / 100).toFixed(2)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 13 }}>Players who get prizes</span>
                  <input
                    type="text"
                    value={state.prizePct}
                    onChange={(e) =>
                      dispatch({ type: "SET_PRIZE_PCT", value: parseFloat(e.target.value) || 0 })
                    }
                    style={{
                      ...S.input,
                      width: 50,
                      textAlign: "center",
                      fontSize: 13,
                      padding: "4px 6px",
                    }}
                  />
                  <span style={{ fontSize: 12, color: C.muted }}>%</span>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      color: C.muted,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!state.prizePctRoundUp}
                      onChange={(e) =>
                        dispatch({ type: "SET_PRIZE_PCT_ROUNDUP", value: e.target.checked })
                      }
                      style={{ width: 14, height: 14, accentColor: C.accent, cursor: "pointer" }}
                    />
                    ↑
                  </label>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 13 }}>Prizes rounded up</span>
                  <input
                    type="text"
                    value={state.roundUpPct}
                    onChange={(e) =>
                      dispatch({ type: "SET_ROUNDUP_PCT", value: parseFloat(e.target.value) || 0 })
                    }
                    style={{
                      ...S.input,
                      width: 50,
                      textAlign: "center",
                      fontSize: 13,
                      padding: "4px 6px",
                    }}
                  />
                  <span style={{ fontSize: 12, color: C.muted }}>%</span>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      color: C.muted,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!state.roundUpPctRoundUp}
                      onChange={(e) =>
                        dispatch({ type: "SET_ROUNDUP_PCT_ROUNDUP", value: e.target.checked })
                      }
                      style={{ width: 14, height: 14, accentColor: C.accent, cursor: "pointer" }}
                    />
                    ↑
                  </label>
                </div>
              </div>
            </Card>
            <Card style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Prize pool</h3>
                <Btn
                  onClick={() => dispatch({ type: "ADD_PRIZE" })}
                  style={{ fontSize: 12, padding: "4px 10px" }}
                >
                  + Add
                </Btn>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: C.muted,
                  marginBottom: 10,
                  padding: "6px 8px",
                  background: C.subtle,
                  borderRadius: 6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                {[
                  ["€", "value in euros"],
                  ["Q", "total quantity available"],
                  ["L", "limit 1 per player"],
                  ["G", "guaranteed to rank(s) — e.g. 1,2"],
                  ["A", "avoid for rank(s) — e.g. 3,4"],
                ].map(([abbr, desc]) => (
                  <div key={abbr} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <span style={{ fontWeight: 700, minWidth: 14, fontFamily: "monospace" }}>{abbr}</span>
                    <span>{desc}</span>
                  </div>
                ))}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Name", "€", "Q", "L", "G", "A", ""].map((h, hi) => (
                      <th
                        key={hi}
                        style={{
                          fontSize: 11,
                          color: C.muted,
                          fontWeight: 500,
                          textAlign: hi === 0 ? "left" : "center",
                          padding: "4px",
                          borderBottom: `0.5px solid ${C.border}`,
                          width:
                            hi === 0 ? "auto" : hi === 6 ? 30 : hi === 1 ? 40 : hi >= 4 ? 42 : 32,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.prizes.map((p, i) => (
                    <tr key={i}>
                      <td style={{ padding: "4px 4px 4px 0", borderBottom: `0.5px solid ${C.bL}` }}>
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_PRIZE",
                              index: i,
                              field: "name",
                              value: e.target.value,
                            })
                          }
                          style={{ ...S.input, fontSize: 12, padding: "3px 6px" }}
                        />
                      </td>
                      <td
                        style={{
                          padding: "4px",
                          borderBottom: `0.5px solid ${C.bL}`,
                          textAlign: "center",
                        }}
                      >
                        <input
                          type="text"
                          value={p.value}
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_PRIZE",
                              index: i,
                              field: "value",
                              value: parseFloat(e.target.value) || 0,
                            })
                          }
                          style={{
                            ...S.input,
                            fontSize: 12,
                            padding: "3px",
                            width: 36,
                            textAlign: "center",
                          }}
                        />
                      </td>
                      <td
                        style={{
                          padding: "4px",
                          borderBottom: `0.5px solid ${C.bL}`,
                          textAlign: "center",
                        }}
                      >
                        <input
                          type="text"
                          value={p.maxQty}
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_PRIZE",
                              index: i,
                              field: "maxQty",
                              value: parseInt(e.target.value) || 1,
                            })
                          }
                          style={{
                            ...S.input,
                            fontSize: 12,
                            padding: "3px",
                            width: 32,
                            textAlign: "center",
                          }}
                        />
                      </td>
                      <td
                        style={{
                          padding: "4px",
                          borderBottom: `0.5px solid ${C.bL}`,
                          textAlign: "center",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={(p.maxQtyPerPlayer || 1) <= 1}
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_PRIZE",
                              index: i,
                              field: "maxQtyPerPlayer",
                              value: e.target.checked ? 1 : 99,
                            })
                          }
                          style={{
                            width: 14,
                            height: 14,
                            accentColor: C.accent,
                            cursor: "pointer",
                          }}
                        />
                      </td>
                      <td
                        style={{
                          padding: "4px",
                          borderBottom: `0.5px solid ${C.bL}`,
                          textAlign: "center",
                        }}
                      >
                        <input
                          type="text"
                          value={p.guaranteed || ""}
                          placeholder="—"
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_PRIZE",
                              index: i,
                              field: "guaranteed",
                              value: e.target.value,
                            })
                          }
                          style={{
                            ...S.input,
                            fontSize: 11,
                            padding: "3px",
                            width: 38,
                            textAlign: "center",
                          }}
                        />
                      </td>
                      <td
                        style={{
                          padding: "4px",
                          borderBottom: `0.5px solid ${C.bL}`,
                          textAlign: "center",
                        }}
                      >
                        <input
                          type="text"
                          value={p.avoid || ""}
                          placeholder="—"
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_PRIZE",
                              index: i,
                              field: "avoid",
                              value: e.target.value,
                            })
                          }
                          style={{
                            ...S.input,
                            fontSize: 11,
                            padding: "3px",
                            width: 38,
                            textAlign: "center",
                          }}
                        />
                      </td>
                      <td
                        style={{
                          padding: "2px 4px",
                          borderBottom: `0.5px solid ${C.bL}`,
                          textAlign: "center",
                        }}
                      >
                        <Btn
                          onClick={() => dispatch({ type: "REMOVE_PRIZE", index: i })}
                          style={{ fontSize: 11, padding: "1px 5px" }}
                        >
                          ✕
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
          <div
            style={{
              background: C.bg,
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                margin: 0,
                fontSize: 13,
                color: "#444",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              Prize/player
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 120 }}>
              <span style={{ fontSize: 13, color: C.muted }}>€</span>
              <input
                type="text"
                value={state.entryCost}
                onChange={(e) =>
                  dispatch({ type: "SET_ENTRY_COST", value: parseFloat(e.target.value) || 0 })
                }
                style={{ ...S.input, width: 90 }}
              />
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
              Pool: €{(state.entryCost * state.players.length).toFixed(2)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
