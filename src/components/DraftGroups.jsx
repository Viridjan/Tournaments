// Snake-draft table seating
// Draft groups — snake-draft seating by ELO
// Sorts players by ELO, distributes across tables using
function DraftGroups({players,eloDb,dispatch}){const n=players.length;if(n<2)return <div style={{textAlign:"center",padding:32,color:C.faint}}>Add at least 2 players.</div>;
const ng=Math.max(1,Math.floor(n/5)),so=[...players].sort((a,b)=>gE(eloDb,b.name)-gE(eloDb,a.name)),g=Array.from({length:ng},()=>[]);
so.forEach((p,i)=>{const r=Math.floor(i/ng);g[r%2===0?i%ng:ng-1-i%ng].push(p)});const gc=["#185fa5","#0f6e56","#a32d2d","#854f0b","#534ab7","#3b6d11"];
return <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:15,fontWeight:500}}>{ng} table{ng>1?"s":""} · {n} players</span>
<Btn onClick={()=>dispatch({type:"LOG_EVENT",eventType:"draft-end",label:"Draft ended"})} style={{fontSize:12}}>Draft ended ↗</Btn></div>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",gap:10}}>{g.map((gr,gi)=>{const co=gc[gi%gc.length],elos=gr.map(p=>gE(eloDb,p.name)),avg=Math.round(elos.reduce((a,v)=>a+v,0)/elos.length);
return <Card key={gi} style={{borderLeft:`3px solid ${co}`,padding:"14px 16px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontWeight:500,color:co,fontSize:15}}>Table {gi+1}</span><span style={{fontSize:12,color:C.muted}}>{gr.length}p · avg {avg}</span></div>
{gr.sort((a,b)=>gE(eloDb,b.name)-gE(eloDb,a.name)).map(p=><div key={p.name} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13,borderBottom:`0.5px solid ${C.bL}`}}><span>{p.name}</span><span style={{color:C.muted,fontSize:11}}>{gE(eloDb,p.name)}</span></div>)}</Card>})}</div></div>}

