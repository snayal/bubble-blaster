import { useState, useEffect, useRef, useCallback } from "react";

const COLS = 11;
const BR = 22;

const THEMES = [
  { name:"🌸 Fairy Forest", sky:["#c8a4e8","#e8c4f8","#b4d4f4"], ground:"#7abf7a", tree:"#5a9a5a", accent:"#ff88cc", bubbles:["#ff6ec7","#ff4499","#cc44ff","#88aaff","#ff8844","#44ffcc"] },
  { name:"🌋 Volcano Isle",  sky:["#1a0500","#3d1500","#ff4400"], ground:"#8a3000", tree:"#5a2000", accent:"#ff6600", bubbles:["#ff4400","#ff8800","#ffcc00","#ff2200","#ff6600","#ffaa33"] },
  { name:"❄️ Ice Kingdom",   sky:["#a8d8f0","#d8f0ff","#f0f8ff"], ground:"#c8e8ff", tree:"#88aacc", accent:"#44ddff", bubbles:["#ffffff","#aaddff","#88ccff","#55aaff","#cceeff","#44ddff"] },
  { name:"🌊 Deep Ocean",    sky:["#001428","#002a50","#004070"], ground:"#003060", tree:"#002040", accent:"#00aaff", bubbles:["#00d4ff","#0099cc","#00ffcc","#0066ff","#44bbff","#00ffaa"] },
  { name:"🌿 Magic Jungle",  sky:["#020d02","#051a05","#0a2a0a"], ground:"#1a4a1a", tree:"#0f3a0f", accent:"#44ff66", bubbles:["#00ff44","#44ff00","#aaff22","#00cc33","#66ff44","#ccff44"] },
  { name:"⚡ Storm Cloud",   sky:["#0a0a1a","#1a1a2a","#0f0f20"], ground:"#1a1a2a", tree:"#0a0a18", accent:"#ffe600", bubbles:["#ffe600","#ffd700","#ffffff","#aad4ff","#ffcc00","#88ccff"] },
  { name:"🔮 Crystal Cave",  sky:["#0d0020","#1a0040","#2a0060"], ground:"#1a0040", tree:"#0f0030", accent:"#cc44ff", bubbles:["#cc00ff","#9900ff","#ff00cc","#6600ff","#ff44ff","#aa44ff"] },
  { name:"☀️ Sunny Meadow",  sky:["#87ceeb","#b0e0ff","#d4f4ff"], ground:"#7abf40", tree:"#5a9f20", accent:"#ffdd00", bubbles:["#ffdd00","#ff9900","#ff6600","#ff4444","#ff88aa","#ffaa44"] },
  { name:"🌙 Moon Garden",   sky:["#05050f","#0a0a20","#050515"], ground:"#0a0a25", tree:"#050518", accent:"#aaaaff", bubbles:["#aaaaff","#8888ff","#ffffff","#ccccff","#6688ff","#88aaff"] },
  { name:"🍭 Candy World",   sky:["#ff99cc","#ffccee","#ffddff"], ground:"#ff88bb", tree:"#cc4488", accent:"#ff44aa", bubbles:["#ff44aa","#ff88cc","#ffcc44","#44ffcc","#ff6688","#cc44ff"] },
];

const LEVELS = [
  {name:"Level 1", theme:0, target:600,  time:70, rows:5, speed:13},
  {name:"Level 2", theme:1, target:1400, time:65, rows:6, speed:14},
  {name:"Level 3", theme:2, target:2800, time:60, rows:6, speed:14},
  {name:"Level 4", theme:3, target:4500, time:55, rows:7, speed:15},
  {name:"Level 5", theme:4, target:7000, time:50, rows:7, speed:15},
  {name:"Level 6", theme:5, target:10000,time:45, rows:8, speed:16},
  {name:"Level 7", theme:6, target:14000,time:40, rows:8, speed:16},
  {name:"Level 8", theme:7, target:20000,time:35, rows:9, speed:17},
  {name:"Level 9", theme:8, target:28000,time:30, rows:9, speed:18},
  {name:"Level 10",theme:9, target:40000,time:25, rows:10,speed:19},
];

const POWER_UP_TYPES = {
  bomb:    {color:"#ff0055", emoji:"💣", label:"Bomb",    desc:"Explodes neighbors"},
  rainbow: {color:"#ffffff", emoji:"🌈", label:"Rainbow", desc:"Clears most color"},
  laser:   {color:"#ff00ff", emoji:"⚡", label:"Laser",   desc:"Clears entire row"},
  freeze:  {color:"#00ffff", emoji:"❄️", label:"Freeze",  desc:"+10s time bonus!"},
  fireball:{color:"#ff6600", emoji:"🔥", label:"Fire",    desc:"Clears 3 rows!"},
  star:    {color:"#ffdd00", emoji:"⭐", label:"Star",    desc:"2x score for 10s!"},
};

const TIPS = [
  "💡 Aim for the sides to bounce bubbles into tight spots!",
  "💡 Pop floating bubbles for bonus points!",
  "💡 Use 💣 Bomb near big clusters for maximum damage!",
  "💡 🌈 Rainbow clears the most common color!",
  "💡 Build combos for massive score multipliers!",
  "💡 ⚡ Laser wipes an entire row instantly!",
  "💡 Watch the timer — speed up on low time!",
  "💡 Clear the board fast for a time bonus!",
];

const today = new Date().toDateString();
const DAILY_CHALLENGES = [
  {id:1, name:"Speed Demon",    desc:"Reach 1000 pts in 30 seconds!", target:1000, time:30, reward:"🏅 Bronze Badge"},
  {id:2, name:"Combo Master",   desc:"Get a 5x combo!",                target:5,    mode:"combo", reward:"🥈 Silver Badge"},
  {id:3, name:"Bubble Popper",  desc:"Pop 50 bubbles in one game!",    target:50,   mode:"bubbles", reward:"🥇 Gold Badge"},
  {id:4, name:"Power Player",   desc:"Use 5 power-ups in one game!",   target:5,    mode:"powerups", reward:"💎 Diamond Badge"},
  {id:5, name:"Level Chaser",   desc:"Reach Level 5!",                 target:5,    mode:"level", reward:"👑 Crown Badge"},
];
const todayChallenge = DAILY_CHALLENGES[new Date().getDay() % DAILY_CHALLENGES.length];

const LB_INIT = [
  {name:"CosmicAce",  score:38500},
  {name:"BubbleLord", score:24200},
  {name:"NeonShot",   score:18800},
  {name:"StarBlaster",score:12600},
  {name:"You",        score:0},
];

const W=520, H=580;

function hexPos(r,c){
  return { x: c*(BR*2-3)+(r%2===1?BR-1:0)+BR+14, y: r*(BR*1.73)+BR+8 };
}

function initGrid(lvl){
  const t=THEMES[LEVELS[lvl].theme], rows=LEVELS[lvl].rows, grid=[];
  for(let r=0;r<rows;r++){
    const row=[], cols=r%2===0?COLS:COLS-1;
    for(let c=0;c<cols;c++){
      const rnd=Math.random();
      if(rnd<0.04) row.push({color:"#ff0055",type:"bomb"});
      else if(rnd<0.07) row.push({color:"#ffffff",type:"rainbow"});
      else if(rnd<0.09) row.push({color:"#ff00ff",type:"laser"});
      else { const col=t.bubbles[Math.floor(Math.random()*t.bubbles.length)]; row.push({color:col,type:"normal"}); }
    }
    grid.push(row);
  }
  return grid;
}

function rndBubble(lvl){
  const t=THEMES[LEVELS[lvl].theme], rnd=Math.random();
  if(rnd<0.03) return {color:"#ff0055",type:"bomb"};
  if(rnd<0.06) return {color:"#ffffff",type:"rainbow"};
  if(rnd<0.08) return {color:"#ff00ff",type:"laser"};
  if(rnd<0.10) return {color:"#00ffff",type:"freeze"};
  if(rnd<0.11) return {color:"#ff6600",type:"fireball"};
  if(rnd<0.12) return {color:"#ffdd00",type:"star"};
  return {color:t.bubbles[Math.floor(Math.random()*t.bubbles.length)],type:"normal"};
}

function lighten(hex,amt){ if(!hex||hex.length<7)return"#fff"; let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return`rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`; }
function darken(hex,amt){ if(!hex||hex.length<7)return"#000"; let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return`rgb(${Math.max(0,r-amt)},${Math.max(0,g-amt)},${Math.max(0,b-amt)})`; }

export default function BubbleBlaster() {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const G         = useRef({});
  const timerRef  = useRef(null);
  const sndRef    = useRef(null);

  const [screen,    setScreen]    = useState("menu");
  const [score,     setScore]     = useState(0);
  const [level,     setLevel]     = useState(0);
  const [timeLeft,  setTimeLeft]  = useState(70);
  const [lb,        setLb]        = useState(LB_INIT);
  const [msg,       setMsg]       = useState("");
  const [isCombo,   setIsCombo]   = useState(false);
  const [tip,       setTip]       = useState(TIPS[0]);
  const [goStats,   setGoStats]   = useState({score:0,combo:0,bubbles:0});
  const [animScore, setAnimScore] = useState(0);

  const sound = useCallback((type)=>{
    try{
      if(!sndRef.current) sndRef.current=new(window.AudioContext||window.webkitAudioContext)();
      const ctx=sndRef.current, o=ctx.createOscillator(), g=ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      if(type==="shoot"){o.frequency.setValueAtTime(400,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(900,ctx.currentTime+0.08);g.gain.setValueAtTime(0.12,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.08);o.start();o.stop(ctx.currentTime+0.08);}
      else if(type==="pop"){o.frequency.setValueAtTime(700,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(200,ctx.currentTime+0.15);g.gain.setValueAtTime(0.18,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);o.start();o.stop(ctx.currentTime+0.15);}
      else if(type==="combo"){[0,0.09,0.18,0.27].forEach((t,i)=>{const o2=ctx.createOscillator(),g2=ctx.createGain();o2.connect(g2);g2.connect(ctx.destination);o2.frequency.setValueAtTime(400+i*180,ctx.currentTime+t);g2.gain.setValueAtTime(0.15,ctx.currentTime+t);g2.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+0.1);o2.start(ctx.currentTime+t);o2.stop(ctx.currentTime+t+0.12);});}
      else if(type==="bomb"){o.type="sawtooth";o.frequency.setValueAtTime(120,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(25,ctx.currentTime+0.3);g.gain.setValueAtTime(0.25,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);o.start();o.stop(ctx.currentTime+0.3);}
      else if(type==="levelup"){[0,0.1,0.2,0.3,0.4].forEach((t,i)=>{const o2=ctx.createOscillator(),g2=ctx.createGain();o2.connect(g2);g2.connect(ctx.destination);o2.frequency.setValueAtTime(300+i*150,ctx.currentTime+t);g2.gain.setValueAtTime(0.18,ctx.currentTime+t);g2.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+0.12);o2.start(ctx.currentTime+t);o2.stop(ctx.currentTime+t+0.15);});}
    }catch(e){}
  },[]);

  function showMsg(text,combo=false){ setMsg(text); setIsCombo(combo); setTimeout(()=>setMsg(""),1100); }

  function startGame(lvlIdx=0){
    setTip(TIPS[Math.floor(Math.random()*TIPS.length)]);
    G.current={
      lvl:lvlIdx, grid:initGrid(lvlIdx),
      shooter:rndBubble(lvlIdx), next:rndBubble(lvlIdx),
      proj:null, particles:[], angle:-Math.PI/2,
      score:0, combo:0, maxCombo:0, bubblesPopped:0,
      frame:0, shakeX:0, shakeY:0, chickenBob:0,
      stars:Array.from({length:80},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+0.3,blink:Math.random()*Math.PI*2})),
    };
    setScore(0); setLevel(lvlIdx);
    setTimeLeft(LEVELS[lvlIdx].time);
    setMsg(""); setScreen("game");
  }

  // Timer
  useEffect(()=>{
    if(screen!=="game"){clearInterval(timerRef.current);return;}
    timerRef.current=setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=1){clearInterval(timerRef.current);triggerEndGame();return 0;}
        return t-1;
      });
    },1000);
    return()=>clearInterval(timerRef.current);
  },[screen,level]);

  function triggerEndGame(){
    const s=G.current.score||0, mc=G.current.maxCombo||0, bp=G.current.bubblesPopped||0;
    setGoStats({score:s,combo:mc,bubbles:bp});
    setLb(prev=>{
      const u=[...prev], yi=u.findIndex(e=>e.name==="You");
      if(yi>=0) u[yi].score=Math.max(u[yi].score,s);
      return u.sort((a,b)=>b.score-a.score);
    });
    cancelAnimationFrame(animRef.current);
    clearInterval(timerRef.current);
    setScreen("gameover");
  }

  // Animated score counter for game over
  useEffect(()=>{
    if(screen!=="gameover") return;
    let cur=0; const target=goStats.score;
    const id=setInterval(()=>{
      cur+=Math.ceil((target-cur)/8);
      if(cur>=target){cur=target;clearInterval(id);}
      setAnimScore(cur);
    },40);
    return()=>clearInterval(id);
  },[screen,goStats.score]);

  // Canvas loop
  useEffect(()=>{
    if(screen!=="game"){cancelAnimationFrame(animRef.current);return;}
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d");

    function drawBubble(x,y,bubble,r=BR){
      const{color,type}=bubble; ctx.save();
      ctx.shadowColor=color; ctx.shadowBlur=type==="normal"?10:22;
      const gr=ctx.createRadialGradient(x-r*.35,y-r*.35,r*.05,x,y,r);
      gr.addColorStop(0,lighten(color,90)); gr.addColorStop(0.4,color); gr.addColorStop(1,darken(color,60));
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=gr; ctx.fill(); ctx.shadowBlur=0;
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.strokeStyle=lighten(color,50)+"99"; ctx.lineWidth=1.5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x-r*.28,y-r*.3,r*.28,r*.18,-0.5,0,Math.PI*2); ctx.fillStyle="rgba(255,255,255,0.65)"; ctx.fill();
      ctx.beginPath(); ctx.arc(x+r*.22,y-r*.2,r*.08,0,Math.PI*2); ctx.fillStyle="rgba(255,255,255,0.4)"; ctx.fill();
      if(type!=="normal"){ ctx.shadowBlur=0; ctx.font=`${r*.9}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(type==="bomb"?"💣":type==="rainbow"?"🌈":"⚡",x,y+1); }
      ctx.restore();
    }

    function drawChicken(x,y,bob){
      const by=y+Math.sin(bob)*4; ctx.save();
      ctx.fillStyle="#f4c8d8"; ctx.beginPath(); ctx.ellipse(x,by,22,26,0,0,Math.PI*2); ctx.fill(); ctx.strokeStyle="#d4a0b8"; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle="#f4c8d8"; ctx.beginPath(); ctx.arc(x,by-28,14,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle="#ffa040"; ctx.beginPath(); ctx.moveTo(x+10,by-28); ctx.lineTo(x+18,by-25); ctx.lineTo(x+10,by-22); ctx.closePath(); ctx.fill();
      ctx.fillStyle="#333"; ctx.beginPath(); ctx.arc(x+5,by-30,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(x+6,by-31,1,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#ff4466"; [[x-4,by-42,4],[x+2,by-46,5],[x+7,by-42,4]].forEach(([cx,cy,r])=>{ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();});
      ctx.fillStyle="#e8a8c0"; ctx.beginPath(); ctx.ellipse(x-18,by+2,10,16,0.4,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    function getNeighbors(r,c){
      const odd=r%2===1, dirs=odd?[[-1,0],[-1,1],[0,-1],[0,1],[1,0],[1,1]]:[[-1,-1],[-1,0],[0,-1],[0,1],[1,-1],[1,0]];
      return dirs.map(([dr,dc])=>[r+dr,c+dc]).filter(([nr,nc])=>nr>=0&&nr<G.current.grid.length&&nc>=0&&G.current.grid[nr]&&nc<G.current.grid[nr].length);
    }

    function spawnParticles(x,y,color,n=14){
      for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2+Math.random()*.4,sp=2+Math.random()*4;G.current.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,r:4+Math.random()*6,color,alpha:1});}
      for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2,sp=5+Math.random()*3;G.current.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1,r:7+Math.random()*5,color:"#fff",alpha:0.8});}
    }

    function findMatches(row,col,color){
      const vis=new Set(),stack=[[row,col]],matched=[];
      while(stack.length){const[r,c]=stack.pop(),k=`${r},${c}`;if(vis.has(k))continue;vis.add(k);const cell=G.current.grid[r]?.[c];if(!cell)continue;if(cell.color!==color&&cell.type!=="rainbow")continue;matched.push([r,c]);getNeighbors(r,c).forEach(n=>stack.push(n));}
      return matched;
    }

    function dropFloating(){
      const conn=new Set(),q=[];
      if(G.current.grid[0]) G.current.grid[0].forEach((cell,c)=>{if(cell){q.push([0,c]);conn.add(`0,${c}`);}});
      while(q.length){const[r,c]=q.shift();getNeighbors(r,c).forEach(([nr,nc])=>{const k=`${nr},${nc}`;if(!conn.has(k)&&G.current.grid[nr]?.[nc]){conn.add(k);q.push([nr,nc]);}});}
      G.current.grid.forEach((row,r)=>row&&row.forEach((cell,c)=>{if(cell&&!conn.has(`${r},${c}`)){const pos=hexPos(r,c);spawnParticles(pos.x,pos.y,cell.color,8);G.current.grid[r][c]=null;G.current.score+=25;G.current.bubblesPopped++;setScore(G.current.score);}}));
    }

    function snapBubble(px,py,proj){
      let br=-1,bc=-1,bd=Infinity;
      for(let r=0;r<=Math.min(G.current.grid.length,LEVELS[G.current.lvl].rows+2);r++){const cols=r%2===0?COLS:COLS-1;for(let c=0;c<cols;c++){if(r<G.current.grid.length&&G.current.grid[r]?.[c])continue;const pos=hexPos(r,c),d=Math.hypot(px-pos.x,py-pos.y);if(d<bd){bd=d;br=r;bc=c;}}}
      if(br===-1)return;
      while(G.current.grid.length<=br)G.current.grid.push([]);
      G.current.grid[br][bc]={color:proj.color,type:proj.type};

      if(proj.type==="bomb"){
        sound("bomb"); G.current.shakeX=7; G.current.shakeY=5;
        getNeighbors(br,bc).forEach(([r,c])=>{if(G.current.grid[r]?.[c]){const pos=hexPos(r,c);spawnParticles(pos.x,pos.y,G.current.grid[r][c].color);G.current.grid[r][c]=null;G.current.score+=20;G.current.bubblesPopped++;}});
        G.current.grid[br][bc]=null;G.current.score+=20;dropFloating();setScore(G.current.score);showMsg("💣 KABOOM!");
      } else if(proj.type==="rainbow"){
        sound("combo"); const counts={};G.current.grid.forEach(row=>row?.forEach(cell=>{if(cell?.type==="normal")counts[cell.color]=(counts[cell.color]||0)+1;}));
        const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0];
        if(top)G.current.grid.forEach((row,r)=>row?.forEach((cell,c)=>{if(cell?.color===top){const pos=hexPos(r,c);spawnParticles(pos.x,pos.y,top,6);G.current.grid[r][c]=null;G.current.score+=15;G.current.bubblesPopped++;}}));
        G.current.grid[br][bc]=null;dropFloating();setScore(G.current.score);showMsg("🌈 Rainbow Blast!");
      } else if(proj.type==="laser"){
        sound("combo"); if(G.current.grid[br])G.current.grid[br].forEach((cell,c)=>{if(cell){const pos=hexPos(br,c);spawnParticles(pos.x,pos.y,cell.color,10);G.current.score+=18;G.current.bubblesPopped++;}});
        G.current.grid[br]=G.current.grid[br]?.map(()=>null)||[];dropFloating();setScore(G.current.score);showMsg("⚡ Laser Row!");
      } else if(proj.type==="freeze"){
        sound("combo");
        setTimeLeft(t=>Math.min(t+10, LEVELS[G.current.lvl].time+10));
        G.current.grid[br][bc]=null; spawnParticles(W/2,H/2,"#00ffff",20);
        setScore(G.current.score); showMsg("❄️ +10 Seconds!");
      } else if(proj.type==="fireball"){
        sound("bomb"); G.current.shakeX=8; G.current.shakeY=6;
        [br-1,br,br+1].forEach(row=>{
          if(G.current.grid[row]) G.current.grid[row].forEach((cell,c)=>{
            if(cell){const pos=hexPos(row,c);spawnParticles(pos.x,pos.y,cell.color,8);G.current.grid[row][c]=null;G.current.score+=15;G.current.bubblesPopped++;}
          });
        });
        dropFloating(); setScore(G.current.score); showMsg("🔥 3 Rows Cleared!");
      } else if(proj.type==="star"){
        sound("combo"); G.current.starActive=true; G.current.starTimer=10;
        G.current.grid[br][bc]=null; spawnParticles(W/2,H/2,"#ffdd00",20);
        setScore(G.current.score); showMsg("⭐ 2x Score for 10s!");
        setTimeout(()=>{G.current.starActive=false;},10000);
      } else {
        const popped=findMatches(br,bc,proj.color);
        if(popped.length>=3){
          G.current.combo++;G.current.maxCombo=Math.max(G.current.maxCombo,G.current.combo);
          const pts=popped.length*12*Math.max(1,G.current.combo);G.current.score+=pts;G.current.bubblesPopped+=popped.length;
          popped.forEach(([r,c])=>{const pos=hexPos(r,c);spawnParticles(pos.x,pos.y,G.current.grid[r][c]?.color||proj.color);G.current.grid[r][c]=null;});
          dropFloating();setScore(G.current.score);
          if(G.current.combo>=3){sound("combo");showMsg(`🔥 Combo x${G.current.combo}!`,true);}
          else{sound("pop");showMsg(`+${pts}`);}
        } else {G.current.combo=0;}
      }

      G.current.shooter=G.current.next; G.current.next=rndBubble(G.current.lvl);

      if(G.current.score>=LEVELS[G.current.lvl].target){
        sound("levelup");
        if(G.current.lvl<LEVELS.length-1){
          cancelAnimationFrame(animRef.current); clearInterval(timerRef.current);
          setScore(G.current.score); setLevel(G.current.lvl);
          setTimeout(()=>setScreen("levelup"),300);
        } else { triggerEndGame(); }
      }
    }

    function loop(){
      const g=G.current; g.frame++; g.chickenBob+=0.05;
      const theme=THEMES[LEVELS[g.lvl].theme];
      ctx.save();
      if(g.shakeX>0.3){ctx.translate((Math.random()-.5)*g.shakeX,(Math.random()-.5)*g.shakeY);g.shakeX*=0.75;g.shakeY*=0.75;}
      ctx.clearRect(-10,-10,W+20,H+20);

      // Sky
      const skyG=ctx.createLinearGradient(0,0,0,H*.7);
      skyG.addColorStop(0,theme.sky[0]);skyG.addColorStop(0.5,theme.sky[1]);skyG.addColorStop(1,theme.sky[2]);
      ctx.fillStyle=skyG;ctx.fillRect(-10,-10,W+20,H+20);

      // Stars
      g.stars?.forEach(s=>{s.blink+=0.04;const a=0.25+Math.sin(s.blink)*0.2;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(255,230,180,${a})`;ctx.fill();});

      // Clouds
      ctx.fillStyle="rgba(255,255,255,0.18)";
      [[60,40,70,25],[180,30,90,20],[340,50,80,18],[460,25,100,28]].forEach(([x,y,rw,rh])=>{ctx.beginPath();ctx.ellipse(x,y,rw,rh,0,0,Math.PI*2);ctx.fill();});

      // Ground
      const gy=H-120;
      ctx.fillStyle=theme.ground;ctx.beginPath();ctx.fillRect(0,gy,W,H-gy);
      ctx.fillStyle=theme.tree;for(let i=0;i<8;i++){ctx.beginPath();ctx.arc(30+i*70,gy,18,Math.PI,0);ctx.fill();}
      [[30,gy-60,25],[70,gy-80,30],[W-30,gy-60,25],[W-70,gy-80,30]].forEach(([x,y,r])=>{ctx.fillStyle=theme.tree;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x-r*.4,y+r*.4,r*.8,0,Math.PI*2);ctx.fill();});

      // Grid
      g.grid.forEach((row,r)=>row?.forEach((cell,c)=>{if(!cell)return;const{x,y}=hexPos(r,c);drawBubble(x,y,cell);}));

      // Aim line
      const sx=W/2,sy=H-70;
      ctx.save();
      // Main bright aim line
      ctx.shadowColor="#ffffff";ctx.shadowBlur=15;
      ctx.strokeStyle="rgba(255,255,255,0.95)";ctx.lineWidth=3;
      ctx.setLineDash([12,8]);
      ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(g.angle)*220,sy+Math.sin(g.angle)*220);ctx.stroke();
      // Colored glow underneath
      ctx.shadowColor=theme.accent;ctx.shadowBlur=20;
      ctx.strokeStyle=theme.accent;ctx.lineWidth=5;ctx.globalAlpha=0.5;
      ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(g.angle)*220,sy+Math.sin(g.angle)*220);ctx.stroke();
      // Dot at end of line
      ctx.globalAlpha=1;ctx.shadowBlur=20;
      ctx.beginPath();ctx.arc(sx+Math.cos(g.angle)*220,sy+Math.sin(g.angle)*220,6,0,Math.PI*2);
      ctx.fillStyle="#fff";ctx.fill();
      // Reflection line
      const rx=sx+Math.cos(g.angle)*220,ry=sy+Math.sin(g.angle)*220;
      if(rx<BR+10||rx>W-BR-10){
        const reflectAngle=Math.PI-g.angle;
        ctx.shadowColor="rgba(255,255,255,0.6)";ctx.shadowBlur=10;
        ctx.strokeStyle="rgba(255,255,255,0.6)";ctx.lineWidth=2;ctx.globalAlpha=0.7;
        ctx.setLineDash([8,10]);
        ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx+Math.cos(reflectAngle)*120,ry+Math.sin(reflectAngle)*120);ctx.stroke();
      }
      ctx.setLineDash([]);ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.restore();

      // Projectile
      if(g.proj){
        const p=g.proj; drawBubble(p.x,p.y,p); p.x+=p.vx; p.y+=p.vy;
        if(p.x-BR<0){p.x=BR;p.vx*=-1;} if(p.x+BR>W){p.x=W-BR;p.vx*=-1;}
        if(p.y-BR<=8){snapBubble(p.x,p.y,p);g.proj=null;}
        else{let sn=false;for(let r=0;r<g.grid.length&&!sn;r++)for(let c=0;c<(g.grid[r]?.length||0)&&!sn;c++){if(!g.grid[r][c])continue;const pos=hexPos(r,c);if(Math.hypot(p.x-pos.x,p.y-pos.y)<BR*1.88){snapBubble(p.x,p.y,p);g.proj=null;sn=true;}}}
      }

      // Particles
      g.particles=g.particles.filter(p=>p.alpha>0.03);
      g.particles.forEach(p=>{ctx.save();ctx.globalAlpha=p.alpha;ctx.shadowColor=p.color;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill();ctx.restore();p.x+=p.vx;p.y+=p.vy;p.vy+=0.22;p.alpha-=0.028;p.r*=0.96;});

      // Base platform
      const baseG=ctx.createRadialGradient(sx,sy+5,5,sx,sy+5,38);
      baseG.addColorStop(0,"#ffd700");baseG.addColorStop(1,"#aa7700");
      ctx.fillStyle=baseG;ctx.beginPath();ctx.ellipse(sx,sy+10,40,18,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="#886600";ctx.lineWidth=2;ctx.stroke();
      ctx.font="12px serif";ctx.textAlign="center";
      ["⭐","⭐","⭐"].forEach((s,i)=>ctx.fillText(s,sx-16+i*16,sy+14));

      drawBubble(sx,sy,g.shooter,BR+3);
      drawChicken(W-52,H-100,g.chickenBob);

      // Next bubble box
      ctx.fillStyle="rgba(0,0,0,0.38)";ctx.strokeStyle="rgba(255,255,255,0.28)";ctx.lineWidth=1.5;
      ctx.beginPath();ctx.roundRect(10,H-90,58,60,12);ctx.fill();ctx.stroke();
      ctx.font="bold 10px 'Fredoka One',cursive";ctx.fillStyle="rgba(255,255,255,0.7)";ctx.textAlign="center";ctx.fillText("NEXT",39,H-77);
      drawBubble(39,H-52,g.next,BR-5);

      ctx.restore();
      animRef.current=requestAnimationFrame(loop);
    }

    animRef.current=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(animRef.current);
  },[screen]);

  // Input
  useEffect(()=>{
    if(screen!=="game")return;
    const canvas=canvasRef.current; if(!canvas)return;
    function getAngle(e){ const rect=canvas.getBoundingClientRect(),scX=W/rect.width,scY=H/rect.height; return Math.atan2((e.clientY-rect.top)*scY-(H-70),(e.clientX-rect.left)*scX-W/2); }
    function onMove(e){ const a=getAngle(e); if(a>-Math.PI+0.15&&a<-0.15)G.current.angle=a; }
    function onClick(e){ if(G.current.proj)return; const a=getAngle(e); if(a>-Math.PI+0.15&&a<-0.15){G.current.angle=a;sound("shoot");const sp=LEVELS[G.current.lvl]?.speed||13;G.current.proj={x:W/2,y:H-70,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,color:G.current.shooter.color,type:G.current.shooter.type};} }
    canvas.addEventListener("mousemove",onMove); canvas.addEventListener("click",onClick);
    canvas.addEventListener("touchmove",e=>{e.preventDefault();onMove(e.touches[0]);},{passive:false});
    canvas.addEventListener("touchend",e=>{e.preventDefault();onClick(e.changedTouches[0]);},{passive:false});
    return()=>{canvas.removeEventListener("mousemove",onMove);canvas.removeEventListener("click",onClick);};
  },[screen,sound]);

  const lvlData=LEVELS[level]||LEVELS[0];
  const progress=Math.min(100,(score/lvlData.target)*100);
  const lbRank=lb.findIndex(e=>e.name==="You")+1;
  const rankEmoji=["🥇","🥈","🥉","4️⃣","5️⃣"][lbRank-1]||"🎮";
  const confettiColors=["#ff4d8f","#ffe44d","#44ffcc","#66aaff","#ff8844","#cc44ff","#44ff88"];

  const S = {
    wrap:{ fontFamily:"'Fredoka One',cursive", userSelect:"none", position:"relative", width:"100%", maxWidth:520, margin:"0 auto" },
    canvas:{ display:"block", width:"100%", borderRadius:20, cursor:"crosshair" },
    overlay:{ position:"absolute", inset:0, borderRadius:20, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:0 },
    pill:{ background:"rgba(0,0,0,0.48)", borderRadius:30, padding:"5px 14px", border:"1.5px solid rgba(255,255,255,0.22)" },
    btn:(bg,shadow)=>({ fontFamily:"'Fredoka One',cursive", fontSize:18, padding:"13px 26px", border:"none", borderRadius:50, cursor:"pointer", background:bg, boxShadow:`0 6px 20px ${shadow}`, color:"#fff", transition:"transform 0.1s" }),
  };

  return (
    <div style={S.wrap}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@700;900&display=swap');
        @keyframes combopop{0%{opacity:1;transform:translateX(-50%) scale(0.5)}40%{opacity:1;transform:translateX(-50%) scale(1.25)}70%{opacity:1;transform:translateX(-50%) scale(1)}100%{opacity:0;transform:translateX(-50%) translateY(-50px)}}
        @keyframes explode{0%{transform:scale(0) rotate(-20deg);opacity:0}60%{transform:scale(1.35) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
        @keyframes slidein{from{opacity:0;transform:translateY(-18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes falldown{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(600px) rotate(720deg);opacity:0}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        .go-btn:hover{transform:translateY(-3px) scale(1.05)!important}
        .go-btn:active{transform:scale(0.96)!important}
        .menu-btn:hover{transform:translateY(-3px) scale(1.06)!important}
        .menu-btn:active{transform:scale(0.95)!important}
      `}</style>

      {/* GAME CANVAS + HUD wrapper */}
      {screen==="game" && (
        <div style={{display:"flex",flexDirection:"column",width:"100%"}}>
          {/* TOP HUD - sits ABOVE canvas */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"rgba(0,0,0,0.6)",borderRadius:"16px 16px 0 0",border:"1px solid rgba(255,255,255,0.1)",borderBottom:"none",width:"100%"}}>
            <div style={S.pill}><div style={{fontSize:10,color:"rgba(255,255,255,0.55)"}}>SCORE</div><div style={{fontSize:20,color:"#ffe44d",textShadow:"0 2px 8px #ff8800"}}>{score.toLocaleString()}</div></div>
            <div style={{textAlign:"center",flex:1,margin:"0 10px"}}>
              <div style={{fontSize:12,color:"#adf",fontFamily:"'Fredoka One',cursive"}}>{lvlData.name}</div>
              <div style={{marginTop:4,height:8,background:"rgba(255,255,255,0.12)",borderRadius:8,overflow:"hidden",border:"1px solid rgba(255,255,255,0.15)"}}>
                <div style={{width:`${progress}%`,height:"100%",background:"linear-gradient(90deg,#ff6ec7,#ffe44d,#44ffcc)",borderRadius:8,transition:"width 0.4s"}}/>
              </div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:2}}>{score.toLocaleString()} / {lvlData.target.toLocaleString()}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={S.pill}><div style={{fontSize:10,color:"rgba(255,255,255,0.55)"}}>TIME</div><div style={{fontSize:20,color:timeLeft<=10?"#ff4444":"#fff",animation:timeLeft<=10?"pulse 0.5s infinite":""}}>{timeLeft}s</div></div>
              <button onClick={triggerEndGame} style={{...S.btn("rgba(255,255,255,0.08)","none"),fontSize:11,padding:"4px 10px",color:"#aaa",border:"1px solid rgba(255,255,255,0.12)"}}>Quit</button>
            </div>
          </div>
          {/* CANVAS */}
          <div style={{position:"relative"}}>
            <canvas ref={canvasRef} width={W} height={H} style={{...S.canvas,borderRadius:"0 0 16px 16px",display:"block"}} />
            {msg && <div style={{position:"absolute",left:"50%",top:"10%",fontSize:isCombo?34:22,color:isCombo?"#ffe44d":"#fff",textShadow:isCombo?"0 0 20px #ff8800":"0 0 12px #fff",whiteSpace:"nowrap",animation:"combopop 1.1s ease forwards",pointerEvents:"none",transform:"translateX(-50%)"}}>{msg}</div>}
          </div>
        </div>
      )}
      {screen!=="game" && <canvas ref={canvasRef} width={W} height={H} style={{...S.canvas,display:"none"}} />}

      {/* MENU SCREEN */}
      {screen==="menu" && (
        <div style={{borderRadius:20,overflow:"hidden",background:"linear-gradient(160deg,#1a0830,#2d1050,#0a1028)",minHeight:520,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"36px 24px",gap:0,position:"relative"}}>
          <div style={{position:"absolute",inset:0,overflow:"hidden"}}>
            {Array.from({length:30}).map((_,i)=>(
              <div key={i} style={{position:"absolute",width:4+Math.random()*6,height:4+Math.random()*6,borderRadius:"50%",background:confettiColors[i%confettiColors.length],left:`${Math.random()*100}%`,top:`${Math.random()*100}%`,opacity:0.4+Math.random()*0.4,animation:`pulse ${1.5+Math.random()*2}s ${Math.random()*2}s infinite`}}/>
            ))}
          </div>
          <div style={{position:"relative",zIndex:2,display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
            <div style={{fontSize:72,animation:"float 2s ease-in-out infinite"}}>🫧</div>
            <div style={{fontSize:52,color:"#fff",textShadow:"0 4px 0 #6600aa, 0 0 40px #cc44ffaa",letterSpacing:3,animation:"slidein 0.5s ease both"}}>Bubble</div>
            <div style={{fontSize:52,color:"#ffe44d",textShadow:"0 4px 0 #aa6600, 0 0 30px #ffaa00aa",letterSpacing:4,marginTop:-18,animation:"slidein 0.5s 0.1s ease both"}}>Blast!</div>
            <div style={{fontSize:14,color:"rgba(255,255,255,0.6)",fontFamily:"'Nunito',sans-serif",fontWeight:700,textAlign:"center",maxWidth:300,animation:"slidein 0.5s 0.2s ease both"}}>Match 3+ bubbles · Power-ups · 10 magical worlds!</div>
            <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:8,alignItems:"center",animation:"slidein 0.5s 0.3s ease both"}}>
              <button className="menu-btn" onClick={()=>startGame(0)} style={{...S.btn("linear-gradient(135deg,#ff4d8f,#ff1a6e)","#ff4d8f55"),fontSize:22,padding:"14px 48px",transition:"transform 0.1s"}}>🚀 Play Now!</button>
              <div style={{display:"flex",gap:12}}>
                <button className="menu-btn" onClick={()=>setScreen("leaderboard")} style={{...S.btn("linear-gradient(135deg,#ffe44d,#ffaa00)","#ffaa0055"),color:"#5a3000",fontSize:17,transition:"transform 0.1s"}}>🏆 Scores</button>
                <button className="menu-btn" onClick={()=>setScreen("howtoplay")} style={{...S.btn("linear-gradient(135deg,#66aaff,#3355ff)","#3355ff55"),fontSize:17,transition:"transform 0.1s"}}>❓ How to Play</button>
              <button className="menu-btn" onClick={()=>setScreen("daily")} style={{...S.btn("linear-gradient(135deg,#ff8844,#ff4400)","#ff440055"),fontSize:17,transition:"transform 0.1s"}}>🎯 Daily Challenge</button>
              </div>
            </div>
            <div style={{marginTop:12,fontSize:12,color:"rgba(255,255,255,0.3)",fontFamily:"'Nunito',sans-serif",fontWeight:700}}>10 Levels · 3 Power-ups · Infinite Fun 🎮</div>
          </div>
        </div>
      )}

      {/* HOW TO PLAY */}
      {screen==="howtoplay" && (
        <div style={{borderRadius:20,background:"linear-gradient(160deg,#0a0020,#1a0040,#0a0828)",minHeight:520,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",gap:16}}>
          <div style={{fontSize:38,color:"#ffe44d",textShadow:"0 3px 0 #aa6600"}}>❓ How to Play</div>
          {[["🖱️ Aim & Shoot","Move mouse to aim, click to fire!"],["🎯 Match Bubbles","Pop 3+ same color bubbles"],["🔥 Build Combos","Chain pops = score multiplier!"],["💣 Bomb","Explodes all nearby bubbles"],["🌈 Rainbow","Clears most common color"],["⚡ Laser","Wipes entire row instantly"],["❄️ Freeze","Adds +10 seconds!"],["🔥 Fireball","Clears 3 rows at once!"],["⭐ Star","2x score for 10 seconds!"],].map(([icon,desc])=>(
            <div key={icon} style={{display:"flex",alignItems:"center",gap:14,background:"rgba(255,255,255,0.07)",borderRadius:16,padding:"12px 20px",width:"100%",maxWidth:360,border:"1px solid rgba(255,255,255,0.12)"}}>
              <div style={{fontSize:28}}>{icon}</div>
              <div style={{fontSize:16,color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{desc}</div>
            </div>
          ))}
          <button className="menu-btn" onClick={()=>setScreen("menu")} style={{...S.btn("linear-gradient(135deg,#ff4d8f,#ff1a6e)","#ff4d8f55"),marginTop:8,transition:"transform 0.1s"}}>🚀 Let's Play!</button>
        </div>
      )}

      {/* LEVEL UP */}
      {screen==="levelup" && (
        <div style={{borderRadius:20,background:"linear-gradient(160deg,#001a00,#003300,#001a10)",minHeight:520,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",gap:14,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0}}>
            {Array.from({length:24}).map((_,i)=>(
              <div key={i} style={{position:"absolute",width:6+Math.random()*8,height:6+Math.random()*8,borderRadius:"50%",background:confettiColors[i%confettiColors.length],left:`${Math.random()*100}%`,top:"-20px",animation:`falldown ${2+Math.random()*2}s ${Math.random()*1.5}s linear both`}}/>
            ))}
          </div>
          <div style={{position:"relative",zIndex:2,display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
            <div style={{fontSize:72,animation:"explode 0.6s both"}}>🎉</div>
            <div style={{fontSize:46,color:"#ffe44d",textShadow:"0 4px 0 #aa6600",animation:"slidein 0.4s 0.2s both"}}>Level Up!</div>
            <div style={{fontSize:18,color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:700,animation:"slidein 0.4s 0.3s both"}}>Score: <span style={{color:"#ffe44d"}}>{score.toLocaleString()}</span></div>
            <div style={{background:"rgba(255,255,255,0.1)",borderRadius:16,padding:"14px 28px",border:"1.5px solid rgba(255,255,255,0.2)",animation:"slidein 0.4s 0.4s both",textAlign:"center"}}>
              <div style={{fontSize:14,color:"rgba(255,255,255,0.5)",fontFamily:"'Nunito',sans-serif",fontWeight:700,marginBottom:4}}>NEXT WORLD</div>
              <div style={{fontSize:22,color:"#adf"}}>{THEMES[LEVELS[Math.min(level+1,LEVELS.length-1)].theme].name}</div>
            </div>
            <div style={{fontSize:14,color:"rgba(255,255,255,0.5)",fontFamily:"'Nunito',sans-serif",fontWeight:700,animation:"slidein 0.4s 0.5s both"}}>{TIPS[Math.floor(Math.random()*TIPS.length)]}</div>
            <button className="menu-btn" onClick={()=>startGame(level+1)} style={{...S.btn("linear-gradient(135deg,#44ffaa,#00cc77)","#44ffaa55"),color:"#1a4a2a",fontSize:20,animation:"slidein 0.4s 0.6s both",transition:"transform 0.1s"}}>▶ Next Level!</button>
          </div>
        </div>
      )}

      {/* GAME OVER */}
      {screen==="gameover" && (
        <div style={{borderRadius:20,background:"linear-gradient(160deg,#1a0030,#2d0050,#0a0a40)",minHeight:520,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 22px",gap:0,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0}}>
            {Array.from({length:22}).map((_,i)=>(
              <div key={i} style={{position:"absolute",width:5+Math.random()*8,height:5+Math.random()*8,borderRadius:"50%",background:confettiColors[i%confettiColors.length],left:`${Math.random()*100}%`,top:"-20px",opacity:0.85,animation:`falldown ${2+Math.random()*2.5}s ${Math.random()*1.5}s linear both`}}/>
            ))}
          </div>
          <div style={{position:"relative",zIndex:2,display:"flex",flexDirection:"column",alignItems:"center",gap:0,width:"100%"}}>
            <div style={{fontSize:68,animation:"explode 0.6s both",lineHeight:1,marginBottom:4}}>💥</div>
            <div style={{fontSize:48,color:"#fff",textShadow:"0 4px 0 #900, 0 0 40px #ff4444aa",animation:"slidein 0.4s 0.2s both",marginBottom:4}}>Game Over!</div>
            <div style={{fontSize:14,color:"rgba(255,255,255,0.45)",fontFamily:"'Nunito',sans-serif",fontWeight:700,letterSpacing:1,marginBottom:18,animation:"slidein 0.4s 0.3s both"}}>{LEVELS[level].name.toUpperCase()} · {THEMES[LEVELS[level].theme].name}</div>
            <div style={{width:"60%",height:1.5,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)",marginBottom:18}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,width:"100%",marginBottom:18,animation:"slidein 0.4s 0.4s both"}}>
              {[["SCORE",animScore.toLocaleString()],["BEST COMBO",`x${goStats.combo} 🔥`],["BUBBLES",goStats.bubbles]].map(([label,val])=>(
                <div key={label} style={{background:"rgba(255,255,255,0.08)",border:"1.5px solid rgba(255,255,255,0.14)",borderRadius:18,padding:"12px 6px",textAlign:"center"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",fontFamily:"'Nunito',sans-serif",fontWeight:700,letterSpacing:1,marginBottom:4}}>{label}</div>
                  <div style={{fontSize:22,color:"#ffe44d",textShadow:"0 2px 10px #ff8800aa"}}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{width:"100%",background:"rgba(255,220,80,0.1)",border:"1.5px solid rgba(255,220,80,0.28)",borderRadius:18,padding:"12px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,animation:"slidein 0.4s 0.5s both"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{fontSize:28}}>{rankEmoji}</div>
                <div><div style={{fontSize:12,color:"rgba(255,255,255,0.5)",fontFamily:"'Nunito',sans-serif",fontWeight:700}}>YOUR RANK</div><div style={{fontSize:18,color:"#ffe44d"}}>#{lbRank} on Leaderboard</div></div>
              </div>
              <div style={{fontSize:26,color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{goStats.score.toLocaleString()}</div>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginBottom:14,animation:"slidein 0.4s 0.6s both"}}>
              <button className="go-btn" onClick={()=>startGame(0)} style={{...S.btn("linear-gradient(135deg,#ff4d8f,#ff1a6e)","#ff4d8f55"),transition:"transform 0.1s"}}>🔄 Retry</button>
              <button className="go-btn" onClick={()=>setScreen("leaderboard")} style={{...S.btn("linear-gradient(135deg,#ffe44d,#ffaa00)","#ffaa0055"),color:"#5a3000",transition:"transform 0.1s"}}>🏆 Scores</button>
              <button className="go-btn" onClick={()=>setScreen("menu")} style={{...S.btn("linear-gradient(135deg,#66aaff,#3355ff)","#3355ff55"),transition:"transform 0.1s"}}>🏠 Menu</button>
            </div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.3)",fontFamily:"'Nunito',sans-serif",fontWeight:700,textAlign:"center",animation:"slidein 0.4s 0.8s both"}}>{tip}</div>
          </div>
        </div>
      )}

      {/* DAILY CHALLENGE */}
      {screen==="daily" && (
        <div style={{borderRadius:20,background:"linear-gradient(160deg,#1a0800,#3a1500,#1a0a00)",minHeight:520,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",gap:14}}>
          <div style={{fontSize:48,animation:"float 2s ease-in-out infinite"}}>🎯</div>
          <div style={{fontSize:36,color:"#ff8844",textShadow:"0 3px 0 #aa4400",marginBottom:4}}>Daily Challenge</div>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.5)",fontFamily:"'Nunito',sans-serif",fontWeight:700,marginBottom:8}}>{today}</div>
          <div style={{width:"100%",maxWidth:360,background:"rgba(255,136,68,0.12)",border:"2px solid rgba(255,136,68,0.4)",borderRadius:20,padding:"20px 24px",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:8}}>{todayChallenge.id===1?"⚡":todayChallenge.id===2?"🔥":todayChallenge.id===3?"🫧":todayChallenge.id===4?"💥":"🏆"}</div>
            <div style={{fontSize:24,color:"#ff8844",fontFamily:"'Fredoka One',cursive",marginBottom:6}}>{todayChallenge.name}</div>
            <div style={{fontSize:15,color:"rgba(255,255,255,0.8)",fontFamily:"'Nunito',sans-serif",fontWeight:700,marginBottom:16}}>{todayChallenge.desc}</div>
            <div style={{fontSize:13,color:"#ffdd00",fontFamily:"'Nunito',sans-serif",fontWeight:700}}>Reward: {todayChallenge.reward}</div>
          </div>
          <div style={{width:"100%",maxWidth:360}}>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",fontFamily:"'Nunito',sans-serif",fontWeight:700,marginBottom:10,textAlign:"center"}}>MORE CHALLENGES</div>
            {DAILY_CHALLENGES.map((ch,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",background:"rgba(255,255,255,0.06)",borderRadius:12,marginBottom:8,border:`1px solid ${ch.id===todayChallenge.id?"rgba(255,136,68,0.5)":"rgba(255,255,255,0.1)"}`}}>
                <div style={{fontSize:20}}>{["⚡","🔥","🫧","💥","🏆"][i]}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,color:ch.id===todayChallenge.id?"#ff8844":"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{ch.name}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{ch.reward}</div>
                </div>
                <div style={{fontSize:11,color:ch.id===todayChallenge.id?"#ff8844":"rgba(255,255,255,0.3)",fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{ch.id===todayChallenge.id?"TODAY":"SOON"}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:12}}>
            <button className="menu-btn" onClick={()=>startGame(0)} style={{...S.btn("linear-gradient(135deg,#ff8844,#ff4400)","#ff440055"),transition:"transform 0.1s"}}>🚀 Accept!</button>
            <button className="menu-btn" onClick={()=>setScreen("menu")} style={{...S.btn("linear-gradient(135deg,#66aaff,#3355ff)","#3355ff55"),transition:"transform 0.1s"}}>🏠 Menu</button>
          </div>
        </div>
      )}

      {/* LEADERBOARD */}
      {screen==="leaderboard" && (
        <div style={{borderRadius:20,background:"linear-gradient(160deg,#0a0820,#1a1040,#080818)",minHeight:520,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",gap:12}}>
          <div style={{fontSize:38,color:"#ffe44d",textShadow:"0 3px 0 #aa6600",marginBottom:6}}>🏆 Top Scores</div>
          {lb.map((e,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",maxWidth:360,padding:"12px 20px",background:e.name==="You"?"rgba(255,220,80,0.14)":"rgba(255,255,255,0.06)",border:`1.5px solid ${e.name==="You"?"rgba(255,220,80,0.35)":"rgba(255,255,255,0.1)"}`,borderRadius:16}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:24}}>{"🥇🥈🥉"[i]||`${i+1}.`}</span>
                <span style={{fontSize:18,color:e.name==="You"?"#ffe44d":"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{e.name}</span>
              </div>
              <span style={{fontSize:22,color:"#44ffcc",fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{e.score.toLocaleString()}</span>
            </div>
          ))}
          <div style={{display:"flex",gap:12,marginTop:8}}>
            <button className="menu-btn" onClick={()=>startGame(0)} style={{...S.btn("linear-gradient(135deg,#ff4d8f,#ff1a6e)","#ff4d8f55"),transition:"transform 0.1s"}}>🚀 Play</button>
            <button className="menu-btn" onClick={()=>setScreen("menu")} style={{...S.btn("linear-gradient(135deg,#66aaff,#3355ff)","#3355ff55"),transition:"transform 0.1s"}}>🏠 Menu</button>
          </div>
        </div>
      )}
    </div>
  );
}
