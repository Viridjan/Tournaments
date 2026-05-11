// Matches tab — pairing cards, match log, timer, draft sub-tabs
function PC({match,index,dispatch}){if(match.p2==="BYE")return <Card style={{background:C.bg,borderStyle:"dashed",padding:"10px 14px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontSize:13,fontWeight:500}}>{match.p1}</div><Tag variant="grey">BYE</Tag></div></Card>;
const r=match.result,bs=(sel,t)=>({flex:1,display:"flex",flexDirection:"column",padding:"6px 8px",borderRadius:5,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:500,lineHeight:1.3,
border:`0.5px solid ${sel?(t==="d"?C.aBd:C.gBd):"#ddd"}`,background:sel?(t==="d"?C.aBg:C.gBg):"transparent",color:sel?(t==="d"?C.amber:C.green):C.muted,
textAlign:t==="r"?"right":t==="d"?"center":"left",alignItems:t==="r"?"flex-end":t==="d"?"center":"flex-start"});
return <Card style={{padding:"10px 14px"}}><div style={{display:"grid",gridTemplateColumns:"2fr 1fr 2fr",gap:4,alignItems:"stretch"}}>
<button style={bs(r==="p1win","l")} onClick={()=>dispatch({type:"SET_RESULT",index,result:"p1win"})}><span>{match.p1}{match.rematch&&<> <Tag variant="amber">re</Tag></>}</span></button>
<button style={bs(r==="draw","d")} onClick={()=>dispatch({type:"SET_RESULT",index,result:"draw"})}>draw</button>
<button style={bs(r==="p2win","r")} onClick={()=>dispatch({type:"SET_RESULT",index,result:"p2win"})}><span>{match.p2}</span></button></div></Card>}
function MC({match,index,dispatch,eloDb}){return <Card style={{padding:"10px 14px"}}><div style={{fontSize:11,fontWeight:500,color:C.purple,marginBottom:8}}>Match {index+1} · {match.players.length}p</div>
{match.players.map(n=><div key={n} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`0.5px solid ${C.bL}`}}>
<span style={{flex:1,fontSize:13,fontWeight:500}}>{n}</span><span style={{fontSize:11,color:C.faint}}>{gE(eloDb,n)}</span>
<input type="text" inputMode="numeric" placeholder="—" value={match.scores[n]??""} onChange={e=>dispatch({type:"SET_MULTI_SCORE",matchIndex:index,playerName:n,value:e.target.value})} style={{...S.input,width:56,textAlign:"center",fontSize:13,padding:"4px 6px"}}/></div>)}</Card>}
function ML({state}){let ri=0;if(!state.matchLog.length)return <div style={{textAlign:"center",padding:32,color:C.faint}}>No activity.</div>;
return <div>{state.matchLog.map((ev,ei)=>{if(ev.type==="round"){const rd=state.history[ri++];if(!rd)return null;
return <Card key={ei} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><h3 style={{fontSize:15,fontWeight:500}}>{ev.label}</h3><span style={{fontSize:11,color:C.faint}}>{ev.ts}</span></div>
{rd.map((m,mi)=>{if(m.p2==="BYE")return <div key={mi} style={{fontSize:13,padding:"4px 0",borderBottom:`0.5px solid ${C.bL}`}}>{m.p1} — <Tag variant="grey">BYE</Tag></div>;
if(m.type==="multi")return m.players.map(n=><div key={n} style={{fontSize:13,padding:"4px 0",display:"flex",justifyContent:"space-between",borderBottom:`0.5px solid ${C.bL}`}}>
<span style={{fontWeight:500}}>{n}</span><span style={{color:C.muted}}>{m.scores[n]}pt {m.eloDeltas?.[n]!=null&&<span style={{color:m.eloDeltas[n]>0?C.green:m.eloDeltas[n]<0?C.red:C.muted,fontWeight:500,fontSize:11}}>{m.eloDeltas[n]>0?"+":""}{m.eloDeltas[n]}</span>}</span></div>);
const w=m.result==="p1win"?m.p1:m.result==="p2win"?m.p2:null,l=m.result==="p1win"?m.p2:m.result==="p2win"?m.p1:null,d=m.result==="p1win"?m.eloDelta1:m.result==="p2win"?m.eloDelta2:null;
return <div key={mi} style={{fontSize:13,padding:"4px 0",display:"flex",gap:12,borderBottom:`0.5px solid ${C.bL}`,alignItems:"center"}}>
<span style={{fontWeight:500,color:m.result==="draw"?C.text:C.green}}>{w||m.p1}</span><span style={{color:"#555"}}>{l||m.p2}</span>
{d!=null&&<span style={{fontSize:11,fontWeight:500,color:d>0?C.green:d<0?C.red:C.muted}}>{d>0?"+":""}{d}</span>}
{m.result==="draw"&&<span style={{color:C.amber,fontWeight:500,fontSize:11}}>Draw</span>}
{m.rematch&&<Tag variant="amber">re</Tag>}{m.forfeit&&<Tag variant="amber">forfeit</Tag>}</div>})}</Card>}
const ic={start:"🏁",abandon:"⚑","draft-end":"📋","tournament-timeout":"⏰"},bg={start:C.gBg,abandon:C.aBg,"draft-end":C.bBg,"tournament-timeout":C.rBg},co={start:C.green,abandon:C.amber,"draft-end":C.blue,"tournament-timeout":C.red};
return <div key={ei} style={{background:bg[ev.type]||C.subtle,borderRadius:8,padding:"8px 12px",marginBottom:12,display:"flex",justifyContent:"space-between"}}>
<span style={{fontSize:13,fontWeight:500,color:co[ev.type]||C.text}}>{ic[ev.type]||"•"} {ev.label}</span><span style={{fontSize:11,color:C.faint}}>{ev.ts}</span></div>})}</div>}

function MatchesTab({state,dispatch,config}){const c=config.features,st=[c.draft&&{id:"draft",label:"Draft"},{id:"pairings",label:"Pairings"},{id:"log",label:"Log"}].filter(Boolean);
const isRR=state.phase==="roundrobin"&&c.rrRounds>0,rl=isRR?`Round Robin — R${state.currentRound}/${c.rrRounds}`:`Swiss — R${state.currentRound-(isRR?0:c.rrRounds)}`;
return <div><TabBar tabs={st} active={state.matchSubTab} onSelect={id=>dispatch({type:"SET_MATCH_SUBTAB",tab:id})}/>
{state.matchSubTab==="draft"&&<DraftGroups players={state.players} eloDb={state.eloDb} dispatch={dispatch}/>}
{state.matchSubTab==="pairings"&&<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
<div><div style={{fontSize:16,fontWeight:500}}>{rl}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>{isRR?"By ELO":"By win rate"}</div></div>
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Btn onClick={()=>{const u=state.pairings.filter(m=>m.type!=="multi"&&m.p2!=="BYE"&&!m.result);if(u.length&&!confirm(`${u.length} unresolved.`))return;dispatch({type:"NEXT_ROUND"})}}>Next round ↗</Btn>
{c.grandPrix&&state.tournamentStarted&&<Btn onClick={()=>{if(confirm("New session?"))dispatch({type:"NEW_GP_SESSION"})}} style={{borderColor:"#e63946",color:"#e63946"}}>New session ＋</Btn>}
{c.scoring!=="lifepoints"&&state.tournamentStarted&&<Btn onClick={()=>{if(confirm("End?"))dispatch({type:"END_TOURNAMENT"})}} style={{borderColor:C.red,color:C.red}}>End</Btn>}</div></div>
{c.timerMinutes>0&&<Timer minutes={c.timerMinutes} key={state.currentRound}/>}
{c.firstPlayer&&state.pairings.some(m=>m.p2!=="BYE"&&m.type!=="multi")&&<div style={{display:"grid",gridTemplateColumns:"2fr 1fr 2fr",gap:4,marginBottom:6,padding:"0 14px"}}><div style={{fontSize:11,fontWeight:500,color:C.green,textAlign:"center"}}>⚡ First</div><div/><div/></div>}
{!state.pairings.length&&<div style={{textAlign:"center",padding:32,color:C.faint}}>No pairings.</div>}
{state.pairings.map((m,i)=>m.type==="multi"?<MC key={i} match={m} index={i} dispatch={dispatch} eloDb={state.eloDb}/>:<PC key={i} match={m} index={i} dispatch={dispatch}/>)}</div>}
{state.matchSubTab==="log"&&<ML state={state}/>}</div>}

