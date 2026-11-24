// From the project root: node scripts/measure-waves.cjs . local normal,hard read
// Optional policies: alternate (second relic set), queue (two automatic ranks), cache (chest detour).
const fs=require('node:fs'),path=require('node:path'),{Worker,isMainThread,workerData,parentPort}=require('node:worker_threads');
const out=path.resolve(__dirname,'../work/balance');
const paths=['hazel','fern','ash','guard','breaker','sniper','volley'];
const seeds=[56,207,78,33,90,11]; const modes=['easy','normal','hard'];
const rank={hazel:['spark','spore','power','haste','ember','vigor','leaf'],fern:['spore','spark','vigor','haste','leaf','power','ember'],ash:['ember','leaf','power','haste','vigor','spark']};
function observeIncomingDamage(sim) {
  const minutes=Array.from({length:8},()=>({hits:0,hpLost:0}));
  const recent=[];
  const hurt=sim.hurt;
  sim.hurt=function(amount,x,y,kind='contact'){
    const before=this.player.hp;
    const result=hurt.call(this,amount,x,y,kind);
    const loss=before-this.player.hp;
    if(loss>0){
      const minute=minutes[Math.min(7,Math.floor(this.seconds/60))];
      minute.hits++;
      minute.hpLost+=loss;
      if(recent.length===2)recent.shift();
      recent.push({seconds:this.seconds,kind,hpLost:loss});
    }
    return result;
  };
  return {minutes,recent};
}
function play(C,pathId,seed,mode,readWarnings){
 const s=new C(pathId,seed,mode),melee=s.path.job==='warden',priority=rank[pathId]??(melee?['blade','leaf','power','haste','vigor','stride']:['bow','ember','power','haste','vigor','stride']);
 const incoming=observeIncomingDamage(s);
 let upgradeChoices=0,firstRecovery=null,cachesClaimed=0;
 // Resolve the stomp before measuring subsequent damage in the same tick.
 const resolveWarning=s.resolveWarning;
 s.resolveWarning=function(z){
   const result=resolveWarning.call(this,z);
   if(!firstRecovery && z.shape==='disk'){
     const owner=this.enemies.find(e=>e.id===z.owner && e.kind==='boss');
     if(owner?.recovery>0)firstRecovery={start:this.seconds,hp:owner.hp,duration:owner.recovery,damage:0};
   }
   return result;
 };

 const normalKind=new Set(['slime','moth','twig','spitter','beetle']),seen=new Map(),zero=()=>({touched:0,deaths:0,first:0,fast:0}),windows={3:zero(),5:zero(),7:zero()},styles={};
 let lateBuild;const actions=new Map();
 function observe(game,selectWindow,tally){const oldHit=game.hit;
  game.hit=function(e,...args){
   if(!normalKind.has(e.kind)||e.hp<=0)return oldHit.call(this,e,...args);
   let tr=tally.get(e.id);
   if(!tr){const r=selectWindow(this.seconds);tr={r,t:this.seconds,n:0,dead:false};tally.set(e.id,tr);if(r)r.touched++;}
   tr.n++;const out=oldHit.call(this,e,...args);
   if(e.hp<=0&&!tr.dead){tr.dead=true;if(tr.r){tr.r.deaths++;if(tr.n===1)tr.r.first++;if(this.seconds-tr.t<=.3000001)tr.r.fast++;}}
   return out;
  };
 }
 observe(s,t=>{for(const m of [3,5,7])if(t>=60*m-15 && t<60*m+15)return windows[m];return null;},seen);
 for(const fun of ['warn','enemyShot']){const orig=s[fun];s[fun]=function(e,...args){
   if(['boar','mothQueen','boss'].includes(e.kind)){let a=actions.get(e.id);if(!a){a={kind:e.kind,count:0,last:-1};actions.set(e.id,a);}
   if(s.ticks!==a.last){a.last=s.ticks;a.count++;} }return orig.call(this,e,...args);};}
 function lateWave(){
  if(!lateBuild)return null;
  const v=new C(pathId,seed,mode);v.level=lateBuild.level;v.build={...lateBuild.build};v.classTalent=lateBuild.talent;
  v.seconds=420;v.nextShrine=2;v.bossSpawned=true;v.miniSpawned=true;v.spawnClock=999;v.eliteClock=999;v.player.invincible=999;
  const by=Object.fromEntries([...normalKind].map(k=>[k,zero()])),combined=zero();
  // Per-species cohorts run together, in radial slots permuted by seed.
  const old=v.hit,recs=new Map();v.hit=function(e,...args){if(!recs.has(e.id))recs.set(e.id,{hits:0,start:v.seconds,dead:false});
    const q=recs.get(e.id),r=by[e.kind];if(e.hp<=0)return old.call(v,e,...args);q.hits++;
    if(q.hits===1)r.touched++;const ret=old.call(v,e,...args);
    if(e.hp<=0&&!q.dead){q.dead=true;r.deaths++;if(q.hits===1)r.first++;if(v.seconds-q.start<=.3000001)r.fast++;}return ret;};
  const kinds=[...normalKind];for(let i=0;i<25;i++){const a=i*2.399963+seed*.01,r=100+(i%4)*22;v.spawn(kinds[(i+seed)%5],v.player.x+r*Math.cos(a),v.player.y+r*Math.sin(a));}
  for(let n=0;n<60*20;n++){v.pendingLevels=0;v.giftPending=false;v.step(1/60,{x:Math.cos(n/80)*.7,y:Math.sin(n/80)*.7});if(!v.enemies.length)break;}
  for(const b of Object.values(by))for(const k of Object.keys(combined))combined[k]+=b[k];
  return {combined,by};
 }

 const records=[],active=[],original=s.spawn;const phases=[];
 s.spawn=function(kind,...args){const e=original.call(this,kind,...args);if(e&&['boar','mothQueen','boss'].includes(kind)){const rec={kind,spawn:s.seconds,maxHp:e.maxHp,level:s.level,firstHit:null,dead:null};records.push(rec);active.push({e,rec});}return e;};
 for(let tick=0;tick<30000&&!s.ended;tick++){
  if(!lateBuild&&s.seconds>=350)lateBuild={level:s.level,build:{...s.build},talent:s.classTalent};
  const phase=s.seconds*.30,boss=s.boss;
  const landmark=workerData.cache && s.cacheSite?s.cacheSite:s.shrine;
  const x=landmark?.x??((boss?.x??900)+(boss?(melee?108:150):470)*Math.cos(phase));
  const y=landmark?.y??((boss?.y??600)+(boss?(melee?108:130):300)*Math.sin(phase));
  const distance=Math.max(1,Math.hypot(x-s.player.x,y-s.player.y));
  let dx=(x-s.player.x)/distance,dy=(y-s.player.y)/distance,danger=false;
  for(const e of s.enemies){
    const ax=s.player.x-e.x,ay=s.player.y-e.y,h=Math.max(1,Math.hypot(ax,ay));
    const urgency=Math.max(0,1-(h-e.radius)/70)*(melee&&e===boss?0:1.8);
    dx+=ax*urgency/h;dy+=ay*urgency/h;danger ||= h<e.radius+17;
  }
  if(readWarnings){for(const z of s.zones){
    if(z.kind!=='warning'||z.life>.50)continue;
    const ax=s.player.x-z.x,ay=s.player.y-z.y,h=Math.hypot(ax,ay)||.01;
    let mx=ax/h,my=ay/h,safeDistance=z.radius-h;
    if(z.shape==='ring'){const inner=z.radius*.54;if(h<inner||h>z.radius)continue;
      if(h-inner<safeDistance){safeDistance=h-inner;mx=-mx;my=-my;}}
    else if(z.shape==='lane'){const ux=Math.cos(z.angle),uy=Math.sin(z.angle),along=ux*ax+uy*ay,side=-uy*ax+ux*ay;
      if(along<0||along>z.radius||Math.abs(side)>20)continue;
      safeDistance=20-Math.abs(side);mx=-uy*Math.sign(side||1);my=ux*Math.sign(side||1);}
    else if(z.shape==='cleave'&&ax*Math.cos(z.angle)+ay*Math.sin(z.angle)<h*Math.cos(.85))continue;
    if(safeDistance<0)continue;
    if(h<1&&z.shape!=='lane'){mx=1;my=0;}
    dx=3*mx;dy=3*my;danger= safeDistance+9>z.life*s.walkSpeed;break;
  }}
  const previousRerolls=s.rerolls;
  s.step(1/60,{x:dx,y:dy,dash:danger&&s.dashCooldown<=0});
  if(s.rerolls>previousRerolls)cachesClaimed++;
  for(const {e,rec} of active){
    if(e.hp<e.maxHp && rec.firstHit===null)rec.firstHit=s.seconds;
    if(e.hp<=0 && rec.dead===null)rec.dead=s.seconds;
    if(e.kind==='boss' && firstRecovery && s.seconds<firstRecovery.start+firstRecovery.duration){
      firstRecovery.damage=firstRecovery.hp-Math.max(0,e.hp);
    }
  }
  if(s.relicPending)s.takeRelic(workerData.alternate ? (s.path.job==='mage'?'stillglass':s.path.job==='warden'?'briar':'quicknock') : (s.path.job==='mage'?'waywick':s.path.job==='warden'?'whetstone':'longfeather'));
  if(s.giftPending)s.takeGift(s.player.hp<s.player.maxHp*.7?'spring':'flame');
  while(s.pendingLevels){
    const options=s.levelOptions(['spark','spore','leaf','ember']);
    const pick=options.includes('mastery')?'mastery':priority.find(id=>options.includes(id))??options[0];
    s.resolveLevel(pick);upgradeChoices++;
    if(workerData.queue){
      if(pick && pick!=='mastery')s.queueUpgrade(pick);
      s.settleQueued();
    }
  }
  if(tick%3600===0)phases.push({minute:tick/3600,kills:s.kills,level:s.level,hp:s.player.hp});
 }
 for(const {e,rec} of active){rec.remaining=Math.max(0,e.hp)/e.maxHp;rec.attacks=actions.get(e.id)?.count??0;}
 return {seed,mode,pathId,won:s.won,seconds:s.seconds,level:s.level,kills:s.kills,bosses:records,phases,windows,wave:lateWave(),
   upgradeChoices,firstRecovery,cachesClaimed,shrinesLit:s.shrinesLit,damageByMinute:incoming.minutes,fatalSequence:s.fatal?incoming.recent:null};
}
function median(arr){let a=arr.sort((x,y)=>x-y);if(!a.length)return '-';return ((a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2).toFixed(1);}
function lines(label,rows){const bosses=rows.flatMap(r=>r.bosses),enc=b=>{const reached=bosses.filter(b);const dead=reached.filter(r=>r.dead!==null);return [dead.length+'/'+reached.length,median(dead.map(r=>r.dead-r.spawn)),median(dead.map(r=>r.dead-r.firstHit))].join(' ');};return [label,rows.filter(r=>r.won).length+'/'+rows.length,enc(b=>b.kind!=='boss'),enc(b=>b.kind==='boss')].join(' | ');}
async function main(){const root=path.resolve(process.argv[2]||'.'),tag=process.argv[3]||'local';fs.mkdirSync(out,{recursive:true});if(!/^[\w.-]+$/.test(tag||''))throw Error('tag required');
 // A previously generated bundle runs the same observer against the exact old rules.
 const prebuilt=fs.statSync(root).isFile();
 const file=prebuilt?root:path.join(out,'fast-'+tag+'.bundle.cjs');
 if(!prebuilt)require('esbuild').buildSync({entryPoints:[path.join(root,'src/combat.ts')],platform:'node',format:'cjs',bundle:true,outfile:file});
 const {Combat}=require(file),hp={};for(const m of modes){hp[m]={};for(const sec of [0,60,180,360]){const s=new Combat('hazel',56,m);s.seconds=sec;hp[m][sec]=Object.fromEntries(['slime','twig','brute','boar','mothQueen','boss'].map(k=>[k,Math.round(s.spawn(k).maxHp)]));}}
 const selected=process.argv[4]?process.argv[4].split(','):modes;
 const flags=process.argv.slice(6);
 const policy={readWarnings:process.argv[5]==='read',alternate:flags.includes('alternate'),queue:flags.includes('queue'),cache:flags.includes('cache')};
 const rows=(await Promise.all(selected.map(mode=>new Promise((res,rej)=>{
   const w=new Worker(__filename,{workerData:{mode,file,...policy}});
   w.once('message',res);w.once('error',rej);w.once('exit',c=>{if(c)rej(Error('worker '+c));});
 })))).flat();
 const result={tag,seeds,policy,hp,rows};fs.writeFileSync(path.join(out,'chief-'+tag+'.json'),JSON.stringify(result));const report=['group | wins | mini kills/encounters median spawn-to-death / first-hit-to-death (s) | final kills/encounters median spawn-to-death / first-hit-to-death (s)',...selected.map(m=>lines(m,rows.filter(r=>r.mode===m))),...paths.map(p=>lines('hard '+p,rows.filter(r=>r.mode==='hard'&&r.pathId===p)))].join('\n');fs.writeFileSync(path.join(out,'chief-'+tag+'.txt'),report);console.log(report);
 for(const mode of selected){
   const group=rows.filter(r=>r.mode===mode);
   const recoveries=group.flatMap(r=>r.firstRecovery?[r.firstRecovery]:[]);
   const pairs=new Map();
   for(const row of group){
     const tail=row.fatalSequence;
     if(tail?.length===2 && tail[1].seconds-tail[0].seconds<=3){
       const key=tail.map(hit=>hit.kind).join(' -> ');
       pairs.set(key,(pairs.get(key)??0)+1);
     }
   }
   const damageByMinute=Array.from({length:8},(_,i)=>{
     const observed=group.reduce((sum,r)=>sum+Math.max(0,Math.min(60,r.seconds-i*60)),0);
     const hpLost=group.reduce((sum,r)=>sum+r.damageByMinute[i].hpLost,0);
     return {minute:i+1,runs:group.filter(r=>r.seconds>i*60).length,observedSeconds:Math.round(observed),
       hpLostPer60Seconds:observed?Number((60*hpLost/observed).toFixed(1)):null};
   });
   const diagnostics={mode,damageByMinute,upgradeChoicesInWins:median(group.filter(r=>r.won).map(r=>r.upgradeChoices)),
     firstStompWindowsWithDamage:recoveries.filter(r=>r.damage>0).length,firstStompsObserved:recoveries.length,
     fatalPairsWithin3Seconds:Object.fromEntries([...pairs].sort((a,b)=>b[1]-a[1]))};
   fs.appendFileSync(path.join(out,'chief-'+tag+'.txt'),'\n'+JSON.stringify(diagnostics));
   console.log(diagnostics);
   for(const m of [3,5,7]){let t=0,f=0,fast=0;for(const r of group){const w=r.windows[m];t+=w.touched;f+=w.first;fast+=w.fast;}console.log(mode,m+'m',{touched:t,oneHit:f,within300ms:fast});}
 }}
if(isMainThread)main().catch(e=>{console.error(e);process.exitCode=1});else{const {Combat}=require(workerData.file);parentPort.postMessage(paths.flatMap(p=>seeds.map(seed=>play(Combat,p,seed,workerData.mode,workerData.readWarnings))));}
