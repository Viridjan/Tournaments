// ═══════════════════════════════════════════════════════
// Tournament configs — each tournament is just a settings object

// Each tournament is defined by its features object.
const T={
"drunken-draft":{id:"drunken-draft",name:"Drunken Draft",icon:"🍺",desc:"Classic lifepoints elimination",features:{scoring:"lifepoints",startScore:4,winPoints:3,drawPoints:1,lossPoints:0,cumulativeDrawPenalty:true,pairing:"1v1",rrRounds:2,timerMinutes:20,draft:true,elo:true,eloKMax:50,firstPlayer:true,grandPrix:false,gpBestOfLast:3,gpDropWorst:1,prizes:true,timeout:true,timeoutTime:"23:00",spinner:false,rules:true,matchMin:2,matchMax:2}},
"vintage-draft":{id:"vintage-draft",name:"Vintage Draft",icon:"🪷",desc:"Swiss scoring, no elimination",features:{scoring:"swiss",startScore:0,winPoints:3,drawPoints:1,lossPoints:0,cumulativeDrawPenalty:false,pairing:"1v1",rrRounds:0,timerMinutes:50,draft:true,elo:true,eloKMax:50,firstPlayer:true,grandPrix:false,gpBestOfLast:3,gpDropWorst:1,prizes:true,timeout:true,timeoutTime:"23:00",spinner:false,rules:true,matchMin:2,matchMax:2}},
"risk-grand-prix":{id:"risk-grand-prix",name:"Risk Grand Prix",icon:"🪖",desc:"Multi-player points, best of 3",features:{scoring:"points",startScore:0,winPoints:3,drawPoints:1,lossPoints:0,cumulativeDrawPenalty:false,pairing:"multi",rrRounds:0,timerMinutes:120,draft:false,elo:true,eloKMax:50,firstPlayer:false,grandPrix:true,gpBestOfLast:3,gpDropWorst:1,prizes:true,timeout:false,timeoutTime:"",spinner:false,rules:false,matchMin:3,matchMax:4}},
};

const ED=1000,EM=50,ES=500,EK="tournament_elo_db_v2",SK="tournament_sheets_url_v1",BK="tournament_local_backup";
const DU="https://script.google.com/macros/s/AKfycbw-G8HSUp8bTX1vfXzTVhSo_fPazHz1Mb09QVM9nLwmCUAOgTN03uJso-gLZiqhpRI_/exec";

