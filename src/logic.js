// Pure functions: ELO, pairing, scoring, prizes (no DOM, no state)
function eExp(a,b){return 1/(1+Math.pow(10,(b-a)/ES))}
function gE(d,n){return d[n.toLowerCase()]?.elo??ED}
function sE(d,n,e,t){return{...d,[n.toLowerCase()]:{elo:e,name:n,test:!!t}}}
function eCalc(a,b,s,kMax){const k=kMax||EM;const e=eExp(a,b),r=k*(s-e),d=Math.round(Math.max(-k,Math.min(k,r)));return{dA:d,dB:-d}}
function findMatch(names,prev,allow){const n=names.length;if(!n)return[];if(n%2)return null;const u=new Array(n).fill(false),p=[];
function bt(){let i=u.indexOf(false);if(i===-1)return true;u[i]=true;for(let j=i+1;j<n;j++){if(u[j])continue;if(!allow&&(prev[names[i]]||new Set()).has(names[j]))continue;u[j]=true;p.push([i,j]);if(bt())return true;p.pop();u[j]=false}u[i]=false;return false}return bt()?p:null}
function getPrev(h,a){const s=new Set(a.map(p=>p.name)),m={};h.forEach(r=>r.forEach(x=>{if(x.p2==="BYE"||x.type==="multi")return;if(!s.has(x.p1)||!s.has(x.p2))return;(m[x.p1]??=new Set()).add(x.p2);(m[x.p2]??=new Set()).add(x.p1)}));return m}
function getByes(h,a){const c={};a.forEach(p=>c[p.name]=0);h.forEach(r=>r.forEach(m=>{if(m.p2==="BYE"&&c[m.p1]!==undefined)c[m.p1]++}));return c}
function gen1v1(pl,h,ph,rr,db,fp){const ac=pl.filter(p=>!p.eliminated),pr=getPrev(h,ac),bc=getByes(h,ac);
const so=[...ac].sort((a,b)=>ph==="roundrobin"?gE(db,b.name)-gE(db,a.name):((b.w/(b.w+b.d+b.l||1))-(a.w/(a.w+a.d+a.l||1)))||b.score-a.score);
let bn=null,tp=so;if(so.length%2===1){const mb=Math.min(...Object.values(bc));for(let i=so.length-1;i>=0;i--)if(bc[so[i].name]<=mb){bn=so[i].name;break}if(!bn)bn=so[so.length-1].name;tp=so.filter(p=>p.name!==bn)}
const pa=[];if(bn)pa.push({p1:bn,p2:"BYE",result:"bye",rematch:false});const ns=tp.map(p=>p.name);let m=findMatch(ns,pr,false);if(!m)m=findMatch(ns,pr,true);
if(m)for(const[i,j]of m)pa.push({p1:ns[i],p2:ns[j],result:null,rematch:(pr[ns[i]]||new Set()).has(ns[j])});
if(fp){const cm={};pl.forEach(p=>cm[p.name]=p.firstCount||0);pa.forEach(mm=>{if(mm.p2==="BYE")return;const c1=cm[mm.p1]||0,c2=cm[mm.p2]||0;if(c1>c2||(c1===c2&&Math.random()<0.5))[mm.p1,mm.p2]=[mm.p2,mm.p1];cm[mm.p1]=(cm[mm.p1]||0)+1})}return pa}
function genMulti(pl,mn,mx,db){const ac=pl.filter(p=>!p.eliminated);ac.sort((a,b)=>b.score-a.score||b.w-a.w||gE(db,a.name)-gE(db,b.name));const n=ac.length,g=[];
if(n>0&&n<mn)g.push(ac.map(p=>p.name));else{let i=0;while(i<n){const r=n-i;if(r<=mx){if(r>=mn)g.push(ac.slice(i).map(p=>p.name));else if(g.length>0)ac.slice(i).forEach(p=>g[g.length-1].push(p.name));else g.push(ac.slice(i).map(p=>p.name));break}g.push(ac.slice(i,i+mx).map(p=>p.name));i+=mx}}
return g.map(p=>({type:"multi",players:p,scores:Object.fromEntries(p.map(x=>[x,""])),result:null}))}
function gpScore(name,h,bestOf,drop){bestOf=bestOf||3;drop=drop||1;const s=[];h.forEach(r=>r.forEach(m=>{if(m.type!=="multi"||!m.players.includes(name))return;const v=parseFloat(m.scores?.[name]);if(!isNaN(v))s.push(v)}));if(!s.length)return 0;const l=s.slice(-bestOf);if(l.length<=drop)return l.reduce((a,v)=>a+v,0);const sorted=[...l].sort((a,b)=>a-b);for(let i=0;i<drop;i++)sorted.shift();return sorted.reduce((a,v)=>a+v,0)}
function rkLbl(i){if(i===0)return"Winner";const n=i+1,s=n%100,x=(s>=11&&s<=13)?"th":{1:"st",2:"nd",3:"rd"}[n%10]||"th";return`${n}${x}`}
function defRanks(){const t=[30,15,15,10,10,10,5,5],s=t.reduce((a,v)=>a+v,0),o=t.map(v=>Math.round(v/s*1000)/10);o[o.length-1]=Math.round((o[o.length-1]+(100-o.reduce((a,v)=>a+v,0)))*10)/10;return o.map((p,i)=>({label:rkLbl(i),pct:p}))}

function calcAlloc(pl,pr,rk,ec,prizePct,prizePctUp,ruPct,ruPctUp){const tp=ec*pl.length;if(!tp||!rk.length||!pr.length)return null;
const ppct=prizePct||50;const rawAc=pl.length*ppct/100;const ac=prizePctUp?Math.ceil(rawAc):Math.floor(rawAc);if(ac<1)return null;
const rupct=ruPct||50;const rawRu=ac*rupct/100;const ruCount=ruPctUp?Math.ceil(rawRu):Math.floor(rawRu);
const ar=rk.slice(0,ac),inv=pr.map(p=>({...p}));
const gbr={};const avoidMap={};inv.forEach(p=>{
const gList=String(p.guaranteed||"").split(",").map(s=>parseInt(s.trim())).filter(n=>n>0&&n<=ar.length);
gList.forEach(g=>{if(p.maxQty>0){(gbr[g-1]??=[]).push({name:p.name,value:p.value,qty:1,total:p.value});p.maxQty--}});
const aList=String(p.avoid||"").split(",").map(s=>parseInt(s.trim())).filter(n=>n>0);
aList.forEach(a=>{(avoidMap[a-1]??=new Set()).add(p.name)})});
function fbc(tgt,rd,avoided){const av=inv.filter(p=>p.maxQty>0&&p.value>0&&!(avoided&&avoided.has(p.name))),mu=av.map(p=>Math.max(0,Math.min((p.maxQtyPerPlayer||1)<=1?1:p.maxQty,Math.ceil(tgt/p.value)+1)));let best=null;
function con(c,v){if(rd?v<=tgt:v>=tgt)if(!best||(rd?v>best.value:v<best.value))best={combo:c.slice(),value:v}}
function dfs(i,c,v){if(i>=av.length){con(c,v);return}for(let q=0;q<=mu[i];q++){c.push({prize:av[i],qty:q});dfs(i+1,c,v+q*av[i].value);c.pop();if(!rd&&v+q*av[i].value>tgt+(best?best.value-tgt:Infinity))break}}dfs(0,[],0);return best}
let gt=0;const al=ar.map((r,ri)=>{const rd=ri>=ruCount;const tgt=tp*r.pct/100;const ch=(gbr[ri]||[]).map(g=>({...g}));let f=ch.reduce((s,c)=>s+c.total,0);const rem=tgt-f;
if(rem>0.001){const res=fbc(rem,rd,avoidMap[ri]);if(res)res.combo.forEach(({prize,qty})=>{if(qty>0){const ip=inv.find(x=>x.name===prize.name),ex=ch.find(c=>c.name===prize.name);if(ex){ex.qty+=qty;ex.total+=qty*prize.value}else ch.push({name:prize.name,value:prize.value,qty,total:qty*prize.value});ip.maxQty-=qty;f+=qty*prize.value}})}
if(!ch.length){const c=inv.filter(p=>p.maxQty>0&&p.value>0).sort((a,b)=>a.value-b.value)[0];if(c){ch.push({name:c.name,value:c.value,qty:1,total:c.value});c.maxQty--}}
const av=ch.reduce((s,c)=>s+c.total,0);gt+=av;return{rank:r.label,target:tgt,chosen:ch,actualValue:av}});
const tk=inv.find(p=>p.name==="Token"&&p.value>0)||inv.filter(p=>p.value>0).sort((a,b)=>a.value-b.value)[0];
if(tk)for(let h=0;h<al.length-1;h++)for(let l=h+1;l<al.length;l++)while(al[h].actualValue<al[l].actualValue&&tk.maxQty>0){const ex=al[h].chosen.find(c=>c.name===tk.name);if(ex){ex.qty++;ex.total+=tk.value}else al[h].chosen.push({name:tk.name,value:tk.value,qty:1,total:tk.value});al[h].actualValue+=tk.value;gt+=tk.value;tk.maxQty--}
return{allocs:al,totalPool:tp,grandTotal:gt}}

