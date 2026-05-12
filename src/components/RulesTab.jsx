// Fetches rules from Google Sheet's 'Rules' tab
// Rules tab — fetches from Google Sheet, caches locally
// Filtered by tournament name. Cached in localStorage
function RulesTab({state}){const[rows,setRows]=useState(null),[status,setStatus]=useState("");const tn=T[state.tournamentId]?.name||"";
const load=async(f)=>{const ck="rules_"+tn;if(!f)try{const c=localStorage.getItem(ck);if(c){setRows(JSON.parse(c));setStatus("Cached")}}catch{}
const url=state.sheetsUrl;if(!url){setStatus("⚠ No URL");return}try{const r=await fetch(url+"?action=rules&tournament="+encodeURIComponent(tn));const d=await r.json();if(d?.rows){setRows(d.rows);try{localStorage.setItem(ck,JSON.stringify(d.rows))}catch{}setStatus("✓")}else setStatus("✗ "+(d?.error||"Error"))}catch(e){setStatus("✗ "+e.message)}};
useEffect(()=>{load(false)},[]);
return <Card><div style={{display:"flex",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}><h3 style={{margin:0}}>Rules — {tn}</h3>
<div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:11,color:C.muted}}>{status}</span><Btn onClick={()=>load(true)} style={{fontSize:11,padding:"3px 8px"}}>↻</Btn></div></div>
{!rows?<div style={{padding:16,background:"#fafaf7",borderRadius:8,color:C.muted,fontStyle:"italic",fontSize:13}}>Rules load from "Rules" tab.</div>
:rows.length===0?<div style={{padding:16,color:C.muted,fontSize:13}}>No rules for "{tn}".</div>
:<table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><tbody>{rows.map((r,i)=><tr key={i} style={{background:i%2===1?"#fafafa":""}}>
{r.map((c,j)=><td key={j} style={{padding:"6px 10px 6px 0",borderBottom:`0.5px solid ${C.bL}`,whiteSpace:"pre-wrap"}}>{c}</td>)}</tr>)}</tbody></table>}</Card>}

