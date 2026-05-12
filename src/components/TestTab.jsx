// Inject dummy players (marked test:true in ELO db)
// Test tab — inject players, auto-select, reset
// Auto-select random winners, advance rounds, full reset
function TestTab({state,dispatch}){const[tc,setTc]=useState(8),[ts2,setTs]=useState("");
// All buttons dispatch SET_TAB back to 'test' to stay on this tab
return <div><Card style={{borderColor:"#fcc"}}><h3 style={{color:C.red,marginBottom:4}}>🧪 Test mode</h3>
<div style={{fontSize:12,color:C.muted,marginBottom:16}}>Populate with dummy players for quick testing. ELO from test runs persists unless you reset.</div>
<div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}><input type="range" min="2" max="36" value={tc} onChange={e=>setTc(parseInt(e.target.value))} style={{flex:1}}/><span style={{fontSize:18,fontWeight:500,minWidth:28,textAlign:"right"}}>{tc}</span></div>
<div style={{display:"flex",flexDirection:"column",gap:6}}>
<Btn onClick={()=>{dispatch({type:"INJECT_TEST_PLAYERS",count:tc});dispatch({type:"START_TOURNAMENT"});dispatch({type:"SET_TAB",tab:"test"});setTs("✓ Injected + started")}} style={{width:"100%",borderColor:C.red,color:C.red}}>Insert players + start</Btn>
<Btn onClick={()=>{dispatch({type:"AUTO_SELECT_WINNERS"});setTs("✓ Auto-selected")}} style={{width:"100%",borderColor:C.red,color:C.red}}>Auto select winners</Btn>
<Btn onClick={()=>{dispatch({type:"NEXT_ROUND"});dispatch({type:"SET_TAB",tab:"test"})}} style={{width:"100%"}}>Next round ↗</Btn>
<Btn onClick={()=>{if(confirm("Full reset? Clears everything including ELO.")){dispatch({type:"FULL_RESET"});dispatch({type:"SET_TAB",tab:"test"})}}} style={{width:"100%",borderColor:C.red,color:C.red}}>Full reset</Btn></div>
{ts2&&<div style={{fontSize:13,color:C.green,marginTop:8}}>{ts2}</div>}</Card></div>}

