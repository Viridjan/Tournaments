// Weighted random wheel (experimental feature)
// Spinner — weighted random wheel (experimental)
// Canvas-rendered with cubic ease-out animation
function SpinnerTab({state,dispatch}){const cr=useRef(null),[angle,setAngle]=useState(0),[spinning,setSpinning]=useState(false),[result,setResult]=useState("");
const opts=state.spinnerOptions,total=opts.reduce((s,o)=>s+(o.weight||1),0),cols=["#8b5cf6","#a78bfa","#c4b5fd","#7c3aed","#ddd6fe","#6d28d9","#ede9fe"];
const draw=useCallback(a=>{const cv=cr.current;if(!cv)return;const ctx=cv.getContext("2d"),cx=100,cy=100,r=98;ctx.clearRect(0,0,200,200);ctx.save();ctx.translate(cx,cy);ctx.rotate((a*Math.PI)/180);
let start=-Math.PI/2;(opts.length?opts:[{name:"(none)",weight:1}]).forEach((o,i)=>{const sl=(2*Math.PI)*((o.weight||1)/total);ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r,start,start+sl);ctx.closePath();ctx.fillStyle=cols[i%cols.length];ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();
ctx.save();ctx.rotate(start+sl/2+Math.PI/2);ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font=`bold ${Math.min(16,Math.max(9,110/opts.length))}px system-ui`;ctx.fillText(String(i+1),0,-(r*0.65));ctx.restore();start+=sl});ctx.restore();ctx.beginPath();ctx.arc(cx,cy,14,0,2*Math.PI);ctx.fillStyle="#fff";ctx.fill()},[opts,total]);
useEffect(()=>{draw(angle)},[angle,draw]);
const spin=()=>{if(spinning||!opts.length)return;setSpinning(true);setResult("");let rand=Math.random()*total,wi=0;for(let i=0;i<opts.length;i++){rand-=(opts[i].weight||1);if(rand<=0){wi=i;break}}
let cum=0;const ss=opts.map(o=>{const s=cum;cum+=(o.weight||1)/total*360;return s}),se=opts.map((o,i)=>ss[i]+(o.weight||1)/total*360);
const stop=ss[wi]+Math.random()*(se[wi]-ss[wi]),ta=(360-stop+360)%360,extra=5+Math.floor(Math.random()*5),td=extra*360+ta-((angle%360+360)%360),dur=3000+Math.random()*1000,sa=angle,st2=performance.now(),ease=t=>1-Math.pow(1-t,3);
const frame=n=>{const t=Math.min((n-st2)/dur,1);setAngle(sa+td*ease(t));if(t<1)requestAnimationFrame(frame);else{setResult("🎲 "+opts[wi].name);setSpinning(false)}};requestAnimationFrame(frame)};
return <div><Card><h3 style={{color:C.purple,marginBottom:4}}>🎲 Mode Spinner</h3><p style={{fontSize:13,color:C.muted,marginBottom:24}}>Spin to randomly pick a game mode.</p>
<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}><div style={{position:"relative",width:200,height:200}}><div style={{position:"absolute",top:-14,left:"50%",transform:"translateX(-50%)",fontSize:22,zIndex:2}}>▼</div>
<canvas ref={cr} width={200} height={200} style={{borderRadius:"50%",display:"block"}}/></div>
<Btn onClick={spin} disabled={spinning} style={{fontSize:15,padding:"10px 32px",borderColor:C.purple,color:C.purple,fontWeight:500}}>Spin!</Btn>
<div style={{fontSize:18,fontWeight:600,color:C.purple,minHeight:28,textAlign:"center"}}>{result}</div></div></Card>
<Card><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><h3 style={{margin:0}}>Options</h3>
<Btn onClick={()=>{const n=prompt("New mode name:");if(n?.trim())dispatch({type:"ADD_SPINNER_OPTION",option:{name:n.trim(),weight:20}})}} style={{fontSize:12,padding:"4px 10px",borderColor:C.purple,color:C.purple}}>+ Add</Btn></div>
<table style={{width:"100%",fontSize:13,borderCollapse:"collapse"}}><thead><tr><th style={{fontSize:11,color:C.muted,fontWeight:500,textAlign:"center",padding:"4px 6px",borderBottom:`0.5px solid ${C.border}`,width:28}}>#</th>
<th style={{fontSize:11,color:C.muted,fontWeight:500,textAlign:"left",padding:"4px 6px",borderBottom:`0.5px solid ${C.border}`}}>Mode</th>
<th style={{fontSize:11,color:C.muted,fontWeight:500,textAlign:"center",padding:"4px 6px",borderBottom:`0.5px solid ${C.border}`,width:52}}>Wt</th>
<th style={{fontSize:11,color:C.muted,fontWeight:500,textAlign:"right",padding:"4px 6px",borderBottom:`0.5px solid ${C.border}`,width:48}}>%</th>
<th style={{borderBottom:`0.5px solid ${C.border}`,width:32}}></th></tr></thead>
<tbody>{opts.map((o,i)=><tr key={i}><td style={{textAlign:"center",fontWeight:600,color:C.purple,padding:"5px 6px",borderBottom:`0.5px solid ${C.bL}`}}>{i+1}</td>
<td style={{padding:"5px 6px",borderBottom:`0.5px solid ${C.bL}`}}>{o.name}</td>
<td style={{textAlign:"center",padding:"5px 6px",borderBottom:`0.5px solid ${C.bL}`}}><input type="text" value={o.weight} onChange={e=>dispatch({type:"UPDATE_SPINNER_WEIGHT",index:i,value:e.target.value})} style={{...S.input,width:38,textAlign:"center",fontSize:12,padding:"2px 4px"}}/></td>
<td style={{textAlign:"right",fontSize:11,color:C.muted,padding:"5px 6px",borderBottom:`0.5px solid ${C.bL}`}}>{total>0?(o.weight/total*100).toFixed(1):0}%</td>
<td style={{textAlign:"right",padding:"5px 6px",borderBottom:`0.5px solid ${C.bL}`}}><Btn onClick={()=>dispatch({type:"REMOVE_SPINNER_OPTION",index:i})} style={{fontSize:11,padding:"1px 6px",color:C.red}}>✕</Btn></td></tr>)}</tbody></table></Card></div>}

