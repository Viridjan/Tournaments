// Root component. On mount:
// App root — reducer, auto-sync ELO, auto-restore backup
//   1. Auto-syncs ELO database from Google Sheets (silent)
function App(){const[state,dispatch]=useReducer(reducer,init);
useEffect(()=>{const url=gSU();if(!url)return;fetch(url+"?action=load").then(r=>r.json()).then(d=>{if(d?.entries){const db={};d.entries.forEach(e=>{if(e?.name)db[e.name.toLowerCase()]={elo:parseInt(e.elo)||ED,name:e.name,test:!!e.test}});dispatch({type:"MERGE_ELO_DB",db})}}).catch(()=>{});},[]);
const restored=useRef(false);
useEffect(()=>{if(restored.current)return;restored.current=true;try{const raw=localStorage.getItem(BK);if(!raw)return;const snap=JSON.parse(raw);if(snap?.tournamentStarted&&snap?.state?.players?.length){if(confirm(`Restore tournament in progress?\n${snap.state.players.length} players, round ${snap.state.currentRound}`)){dispatch({type:"RESTORE_SNAPSHOT",snapshot:snap})}else{localStorage.removeItem(BK)}}}catch{}},[]);
return <div style={{fontFamily:"system-ui, -apple-system, sans-serif",background:C.bg,color:C.text,padding:16,maxWidth:950,margin:"0 auto",minHeight:"100vh"}}>
{state.screen==="landing"&&<LandingScreen dispatch={dispatch}/>}
{state.screen==="tournament"&&<Shell state={state} dispatch={dispatch}/>}</div>}
