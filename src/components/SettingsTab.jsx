// Tournament info (read-only metrics) + feature flags (read-only dots)
// Settings — tournament info, feature flags, mode checkboxes, seeds
// Three opt-in checkboxes that enable extra tabs:
function SettingsTab({state,dispatch,config}){const f=config.features;
const Ft=({label,on})=> <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`0.5px solid ${C.bL}`}}><span style={{width:8,height:8,borderRadius:"50%",background:on?C.accent:"#ddd"}}/><span style={{flex:1,fontSize:13}}>{label}</span><span style={{fontSize:11,color:on?C.green:C.faint}}>{on?"ON":"OFF"}</span></div>;
const Chk=({label,checked,onChange,desc})=> <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 0",borderBottom:`0.5px solid ${C.bL}`,cursor:"pointer"}} onClick={()=>onChange(!checked)}>
<input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} onClick={e=>e.stopPropagation()} style={{width:16,height:16,accentColor:C.accent,cursor:"pointer",margin:"1px 0 0 0",flexShrink:0}}/>
<div><div style={{fontSize:13,fontWeight:500}}>{label}</div>{desc&&<div style={{fontSize:11,color:C.muted,marginTop:2}}>{desc}</div>}</div></div>;
return <div><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><Card style={{flex:1,minWidth:260}}><h3 style={{fontSize:15,fontWeight:500,marginBottom:12}}>Tournament info</h3>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
<div style={S.metric}><div style={{fontSize:11,color:C.muted}}>Scoring</div><div style={{fontSize:14,fontWeight:500}}>{f.scoring}</div></div>
<div style={S.metric}><div style={{fontSize:11,color:C.muted}}>Timer</div><div style={{fontSize:14,fontWeight:500}}>{f.timerMinutes}m</div></div>
<div style={S.metric}><div style={{fontSize:11,color:C.muted}}>Timeout</div><div style={{fontSize:14,fontWeight:500,color:f.timeout?C.green:C.faint}}>{f.timeout&&f.timeoutTime?f.timeoutTime:"OFF"}</div></div>
{f.pairing==="multi"&&<><div style={S.metric}><div style={{fontSize:11,color:C.muted}}>Min</div><div style={{fontSize:14,fontWeight:500}}>{f.matchMin}</div></div>
<div style={S.metric}><div style={{fontSize:11,color:C.muted}}>Max</div><div style={{fontSize:14,fontWeight:500}}>{f.matchMax}</div></div></>}</div>
<h3 style={{fontSize:14,fontWeight:500,marginBottom:8}}>Feature flags</h3>
<Ft label="Draft" on={f.draft}/><Ft label="ELO" on={f.elo}/><Ft label="First player" on={f.firstPlayer}/><Ft label="Grand Prix" on={f.grandPrix}/>
<Ft label="Prizes" on={f.prizes}/><Ft label="Timeout" on={f.timeout}/></Card>
<Card style={{flex:1,minWidth:260}}><h3 style={{fontSize:15,fontWeight:500,marginBottom:8}}>Options</h3>
<Chk label="Test mode" checked={state.testMode} onChange={v=>dispatch({type:"SET_TEST_MODE",value:v})} desc="Enables a Test tab for injecting players and quick actions"/>
<Chk label="Experimental features" checked={state.experimental} onChange={v=>dispatch({type:"SET_EXPERIMENTAL",value:v})} desc="Enables Spinner tab and feature flag overrides"/>
<Chk label="Advanced setup" checked={state.advancedSetup} onChange={v=>dispatch({type:"SET_ADVANCED",value:v})} desc="Enables Advanced tab for prizes, payouts, Sheets sync"/>
<div style={{marginTop:12}}><SeedsManager state={state} dispatch={dispatch}/></div>
</Card></div></div>}

