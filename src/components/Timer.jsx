// Countdown timer with start/pause/reset
// Timer — countdown with audio alarm
// Plays 6-tone audio alarm when it hits zero
function Timer({minutes}){const total=minutes*60;const[left,setLeft]=useState(total);const[running,setRunning]=useState(false);const ir=useRef(null),ar=useRef(null);
// Resets on each new round (keyed by currentRound in parent)
const alarm=useCallback(()=>{try{if(!ar.current)ar.current=new(window.AudioContext||window.webkitAudioContext)();const c=ar.current;[880,660,880,660,880,1100].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type="sine";o.frequency.value=f;const t=c.currentTime+i*0.38;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.45,t+0.05);g.gain.linearRampToValueAtTime(0,t+0.33);o.start(t);o.stop(t+0.38)})}catch{}},[]);
useEffect(()=>{if(running&&left>0)ir.current=setInterval(()=>setLeft(p=>{if(p<=1){setRunning(false);alarm();return 0}return p-1}),1000);return()=>clearInterval(ir.current)},[running,left,alarm]);
const u=left<=60,m=Math.floor(left/60),sec=left%60;
return <div style={{background:C.subtle,borderRadius:12,padding:"16px 20px",marginBottom:16,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
<div style={{fontSize:36,fontWeight:500,fontVariantNumeric:"tabular-nums",letterSpacing:3,minWidth:100,color:u?C.heart:C.text}}>{String(m).padStart(2,"0")}:{String(sec).padStart(2,"0")}</div>
<div style={{flex:1,minWidth:80,height:6,background:"#ddd",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:u?C.heart:C.accent,width:`${(left/total)*100}%`,transition:"width 0.9s linear"}}/></div>
<div style={{display:"flex",gap:6}}><Btn onClick={()=>{try{ar.current?.resume()}catch{}setRunning(!running)}} style={{minWidth:64}}>{running?"Pause":"Start"}</Btn>
<Btn onClick={()=>{setRunning(false);setLeft(total)}}>↺</Btn></div></div>}

