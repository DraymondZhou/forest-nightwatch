import {packRun,unpackRun} from './checkpoint';
import {ATTACK_NOTES} from './attackNotes';
import {RELICS,relicsFor,relicIds,isRelic} from './relics';
import {TRAINING,train,maxHealth,walkSpeed,type TrainingId} from './camp';
import {art} from './art';
import {JOBS,PATHS,type Job,type PathId} from './stylesOfPlay';
import {chiefName,isChief} from './combat';
import Phaser from 'phaser';
import './style.css';
import { AudioDirector } from './audio';
import { buildPanel } from './buildPanel';
import type { FrameStats } from './frameStats';
import { BattleHud } from './battleHud';
import {DIFFICULTIES,readDifficulty,type Difficulty} from './difficulty';
import { Combat } from './combat';
import { ForestScene } from './scene';
import { MASTERY_LEVEL, ABILITIES, ACHIEVEMENTS, SYNERGIES, ability, type UpgradeId } from './content';
import { SaveStore, finishRun, unlockedWeapons, xpNeeded } from './model';

const store = new SaveStore({
  getItem: key => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value)
});
const audio = new AudioDirector();
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = '<div id="world"></div><section id="hud" hidden><div id="wound" aria-hidden="true"><svg viewBox="0 0 120 72" focusable="false"><g fill="#8c333e"><path d="M120 5c-9 1-7 9-18 10l-9 0 6 4-8 3 8 2c9 1 8 7 21 4zM120 40c-8-3-12-2-17 2l-11 2 6 4-10 7 15-3c6-2 10 4 17 2z"/><ellipse cx="81" cy="23" rx="4" ry="2"/><ellipse cx="73" cy="32" rx="2" ry="1.4"/><ellipse cx="84" cy="51" rx="3" ry="1.6"/></g></svg></div><div class="vitals"><span id="health"></span><meter id="hp"></meter><meter id="xp"></meter><small id="gold"></small><small id="mastery"></small></div><b id="clock"></b><button id="pause" aria-label="暂停">Ⅱ</button><div id="skills"></div><output id="perf"></output><div id="boss"></div><div id="objective"></div><button id="dash" aria-label="闪避" title="闪避 · 空格"><span>闪避</span><small id="dash-time">就绪</small></button></section><section id="panel"></section><aside id="orientation">请旋转手机，横屏游戏</aside>';
const el = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
const panel = el('panel'), hud = el('hud');
const battleHud=new BattleHud();
let page = 'home', ready = false, assetError = false;
let lastSummary = '';
let run:Combat | undefined;
const clock = (seconds:number) => [Math.floor(seconds/60), Math.floor(seconds%60)].map(n=>String(n).padStart(2,'0')).join(':');
const action = (id:string, label:string, primary=false) => `<button data-action="${id}" class="${primary?'primary':''}">${label}</button>`;
function sheet(title:string, content:string, actions:string) {
  panel.hidden=false;
  panel.innerHTML=`<article class="sheet"><h2>${title}</h2>${content}<footer>${actions}</footer></article>`;
}
function home() {
  page='home'; run=undefined; scene.setPaused(true); scene.sim=undefined;
  audio.combat=false; audio.paused=false;
  hud.hidden=true; panel.hidden=false; app.className='cover';
  panel.innerHTML=`<div class="title"><h1>森光守夜</h1><p lang="en">Forest Nightwatch</p><nav>${ready?(store.data.checkpoint?action('restore','继续',true):action('select','开始游戏',true)):'<button disabled>游戏加载中…</button>'}${action('camp','营地训练')}${action('journal','守夜手记')}${action('settings','设置')}</nav><small>v1.17.0</small>${store.warning?`<small>${store.warning}</small>`:''}</div>`;
}
let chosenJob:Job='mage';
let banked=0,lastCheckpoint=-10;
const trialText={mage:['雷行满电击中首领','导火石','闪避使主法术冷却缩短 0.35 秒'],warden:['重斩第三刀命中首领','卸力扣','重击或反击命中，闪避冷却缩短 1 秒'],hunter:['穿杨在 20 步外射中首领','轻羽靴','闪避冷却缩短至 3.8 秒']};
function checkpoint(force=false){
  if(!run||run.ended||page==='result')return;
  if(!force && run.seconds-lastCheckpoint<5 && run.coins===banked)return;
  bankCoins();store.data.checkpoint=packRun(run,page==='upgrade'?shownOffer:undefined);
  store.write();lastCheckpoint=run.seconds;
}
function restore(){
  if(!store.data.checkpoint)return;
  try{
    const saved=unpackRun(store.data.checkpoint);
    launch(saved.game);
    if(saved.game.relicPending)chooseRelic();else if(saved.game.giftPending)chooseGift();
    else if(saved.game.pendingLevels)upgrade(saved.offer);else pause();
  }catch{sheet('本局记录无法读取','<p>可以重新开局，营地进度仍可使用。</p>',action('select','重新开局')+action('home','返回'));}
}

function bankCoins(){if(run && run.coins>banked){store.data.gold+=run.coins-banked;banked=run.coins;}}
function choosePath(job:Job){
  chosenJob=job;page='path';
  const cards=Object.entries(PATHS).filter(([,p])=>p.job===job).map(([id,p])=>`<button class="card" data-action="path-${id}"><b class="rune">${ability(p.weapon).icon}</b><strong>${p.name}</strong><span>${p.tip}</span><small>六级 · ${p.mastery.name}</small></button>`).join('');
  sheet(JOBS[job].name+' · 选择流派',`<div class="cards">${cards}</div>`,action('back-job','返回职业'));
}
function select() {
  page='job';
  const cards=Object.entries(JOBS).map(([id,j])=>`<button class="card job-card" data-action="job-${id}"><img alt="" src="${art('job-'+id+'.png')}"><strong>${j.name}</strong><span>${j.tip}</span></button>`).join('');
  const difficulty=store.data.settings.difficulty;
  const modes=(Object.keys(DIFFICULTIES) as Difficulty[]).map(id=>`<label><input type="radio" name="difficulty" data-key="difficulty" value="${id}" ${id===difficulty?'checked':''}><span>${DIFFICULTIES[id].label}</span></label>`).join('');
  sheet('选择职业',`<fieldset class="difficulty"><legend>本局难度</legend>${modes}</fieldset><p id="mode-hint" aria-live="polite">${DIFFICULTIES[difficulty].description}</p><div class="cards">${cards}</div><p>方向键或左摇杆移动，空格或右侧按钮闪避。角色会自动攻击。<br>3 分钟迎战小首领。6 分钟古树出现，8 分钟前击败它。</p>`,action('home','返回'));
}
function camp(){
  page='camp';const save=store.data;
  const rows=(Object.keys(TRAINING) as TrainingId[]).map(k=>{
    const t=TRAINING[k],rank=save.training[k],cost=t.cost[rank],value=k==='health'?maxHealth(save.training):walkSpeed(save.training)/10;
    return `<div class="training-row"><div><strong>${t.name}</strong>　<small>${rank}/5</small><p>${value} ${t.unit}${cost===undefined?' · 已满级':' → '+(value+t.step)+' '+t.unit}</p></div><button data-action="train-${k}" ${cost===undefined||save.gold<cost?'disabled':''}>${cost===undefined?'已满级':cost+' 金币'}</button></div>`;
  }).join('');
  const gear=(Object.keys(trialText) as Job[]).map(j=>{
    const [goal,name,tip]=trialText[j],done=save.trials?.includes(j),owned=save.equipment?.includes(j);
    return `<div class="training-row"><div><strong>${name} · ${JOBS[j].name}</strong><p>${done?tip:goal}</p></div><button data-action="forge-${j}" ${!done||owned||save.gold<24?'disabled':''}>${owned?'已装备':done?'24 金币':'未解锁'}</button></div>`;
  }).join('');
  sheet('营地训练',`<p class="purse">持有金币　<b>${save.gold}</b></p><p>训练对所有职业永久生效。普通怪有机会掉金币，精英掉率更高，首领必掉。拾取后即存入营地。</p>${rows}<h3>职业装备</h3>${gear}<small>${store.warning}</small>`,action('home','返回'));
}
function journal() {
  page='journal';
  const bookName=(id:UpgradeId,other:UpgradeId)=>ability(id,other==='bow'?'hunter':other==='blade'?'warden':'mage').name;
  const book=relicIds.map(id=>{
    const r=RELICS[id],known=store.data.relics.includes(id);
    return `<li><img alt="" class="${known?'':'unfound'}" src="${art('relic-'+id+'.png')}"><div><b>${r.name}</b><small>${JOBS[r.job].name} · ${known?'已发现':'尚未选择'}</small><span>${r.tip}</span></div></li>`;
  }).join('');
  const rows=ACHIEVEMENTS.map(a=>`<li><b>${store.data.achievements.includes(a.id)?'✦':'◇'}　${a.name}</b><span>${a.description} · ${a.reward}</span></li>`).join('');
  sheet('守夜手记',`<p>共守夜 ${store.data.runs} 次　·　累计击败 ${store.data.kills}　·　最长 ${clock(store.data.bestTime)}</p><ul>${rows}</ul><h3>遗物手记 · ${store.data.relics.length}/6</h3><ul class="relic-book">${book}</ul><h3>技能联动</h3><ul>${SYNERGIES.map(s=>`<li><b>${s.name}</b><span>${bookName(s.a,s.b)} + ${bookName(s.b,s.a)}　${s.description}</span></li>`).join('')}</ul>`,action('home','返回'));
}
function settings() {
  page='settings';const s=store.data.settings;
  sheet('设置',`<div class="options">${(['music','sound'] as const).map(k=>`<label>${k==='music'?'音乐':'音效'}<input type="range" data-key="${k}" min="0" max="1" step=".05" value="${s[k]}"></label>`).join('')}<label>精简特效<input type="checkbox" data-key="quality" ${s.quality==='low'?'checked':''}></label><label>怪物血条<input type="checkbox" data-key="showEnemyHealth" ${s.showEnemyHealth?'checked':''}></label><label class="health-numbers">血量数字<input type="checkbox" data-key="showEnemyHealthNumbers" ${s.showEnemyHealth&&s.showEnemyHealthNumbers?'checked':''} ${s.showEnemyHealth?'':'disabled'}></label><label>显示帧率<input type="checkbox" data-key="showFps" ${s.showFps?'checked':''}></label></div><input id="import" type="file" accept="application/json,.json" hidden><p id="notice">${store.warning}</p>`,action('export','导出存档')+action('import','导入存档')+action(run&&!run.ended?'pause':'home','返回',true));
  el<HTMLInputElement>('import').onchange=async e=>{
    const f=(e.target as HTMLInputElement).files?.[0];if(!f)return;
    try{if(f.size>100000)throw Error('存档过大');if(run&&!run.ended){el('notice').textContent='请先结束本局再导入';return;}store.import(await f.text());syncAudio();scene.refreshEnemyHealth();settings();el('notice').textContent=store.warning||'存档已导入';}
    catch{el('notice').textContent='无法导入，请选择有效的守夜存档。';}
  };
}
function syncAudio(){audio.music=store.data.settings.music;audio.sound=store.data.settings.sound;}
function start(path:PathId) {
  if(!ready)return;
  const game=new Combat(path,crypto.getRandomValues(new Uint32Array(1))[0],store.data.settings.difficulty,store.data.training);
  game.kit=!!store.data.equipment?.includes(game.path.job);launch(game);checkpoint(true);
}
function launch(game:Combat){
  run=game;banked=game.coins;lastCheckpoint=game.seconds;shownOffer=[];page='battle';app.className='';
  panel.hidden=true;hud.hidden=false;audio.combat=true;audio.paused=false;
  battleHud.reset(store.data.settings.quality==='low');scene.begin(run);if(portrait.matches)pause();
}
function pause(){
  if(!run||run.ended||run.pendingLevels||run.giftPending||run.relicPending)return;
  page='pause';checkpoint(true);scene.setPaused(true);audio.paused=true;
  sheet('本局构筑',buildPanel(run,clock(run.seconds))+(run.queued?'<p>连升 · '+ability(run.queued.id,run.path.job).name+'（剩 '+run.queued.left+' 次）</p>'+action('cancel-queue','取消连升'):''),action('resume','继续',true)+action('settings','设置')+action('retreat','结束本局'));
  panel.querySelector('.sheet')!.classList.add('build-sheet');
}
function resume(){
  if(!run||run.ended||portrait.matches||document.hidden)return;
  page='battle';panel.hidden=true;audio.paused=false;scene.setPaused(false);
}
function chooseRelic(){
  if(!run?.relicPending)return;
  page='relic';checkpoint(true);scene.setPaused(true);audio.play('level');
  const cards=relicsFor(run.path.job).map(id=>{const r=RELICS[id];return `<button class="card relic-card" data-action="relic-${id}"><img src="${art('relic-'+id+'.png')}" alt=""><small>${r.style}</small><strong>${r.name}</strong><span>${r.tip}</span></button>`}).join('');
  sheet('选择首领遗物',`<p>选 1 件，本局生效。</p><div class="cards">${cards}</div>`,'');
}
function chooseGift(){
  if(!run)return;
  page='gift';checkpoint(true);scene.setPaused(true);audio.play('level');
  const heal=Math.ceil(run.player.maxHp*.30);
  sheet('林灯已亮','<p>灯光吸引飞蛾 6 秒。选择祝福。</p><div class="cards"><button class="card" data-action="gift-spring"><strong>饮泉</strong><span>立即恢复 '+heal+' 生命。当前 '+Math.ceil(run.player.hp)+' / '+run.player.maxHp+'。</span></button><button class="card" data-action="gift-flame"><strong>借火</strong><span>接下来 45 秒，造成的伤害提高 30%。</span></button></div>','');
}
function afterChoice(){
  if(!run)return;
  run.settleQueued();
  if(run.relicPending)chooseRelic();
  else if(run.giftPending)chooseGift();
  else if(run.pendingLevels)upgrade();
  else if(portrait.matches||document.hidden)pause();
  else resume();
  checkpoint(true);
}
type Offer=(UpgradeId|'mastery')[];
let shownOffer:Offer=[];
function upgrade(replacement?:Offer){
  if(!run)return;
  page='upgrade';scene.setPaused(true);audio.play('level');
  const choices=shownOffer=replacement??run.levelOptions(unlockedWeapons(store.data));
  checkpoint(true);
  const cards=choices.map(id=>{
    if(id==='mastery'){
      const c=run!.path,talent=c.talent;
      return `<button class="card" data-action="take-mastery" style="--accent:${ability(c.weapon).color}"><b class="rune">${ability(c.weapon).icon}</b><small>${c.name}专属</small><strong>${talent.name}</strong><span>${talent.description}</span></button>`;
    }
    const a=ability(id,run!.path.job), level=run!.build[id]??0;
    const synergy=SYNERGIES.find(s=>(s.a===id&&run!.build[s.b])||(s.b===id&&run!.build[s.a]));
    return `<button class="card" data-action="take-${id}" style="--accent:${a.color}"><b class="rune">${a.icon}</b><small>${level?'等级 '+level+' → '+(level+1):'习得'+(a.kind==='weapon'?'武技':'祝福')}</small><strong>${a.name}</strong><span>${a.description}</span>${synergy?`<em>${synergy.name}</em>`:''}</button>`;
  }).join('');
  const awakened=run.level-run.pendingLevels+1===MASTERY_LEVEL;
  const specialty=run.path.mastery;
  const notice=awakened?`<p class="mastery-notice">专精已开启 · <b>${specialty.name}</b>　${specialty.tip}</p>`:'';
  const again=run.canReroll(unlockedWeapons(store.data),choices)?action('reroll','换一组（剩 '+run.rerolls+' 次）'):'';
  const canQueue=choices.some(id=>id!=='mastery' && (run!.build[id]??0)<ABILITIES.find(a=>a.id===id)!.max-1);
  const queue=canQueue?'<label><input type="checkbox" id="queue-rank"> 后续连升此项（最多 2 级）</label>':'';
  sheet('选择一项祝福',`${notice}<div class="cards">${cards||action('take-heal','恢复 20 生命',true)}</div>${queue}`,again);
}
function end(){
  if(!run||page==='result')return;
  run.ended=true;scene.setPaused(true);audio.paused=false;audio.play(run.won?'win':'lose');
  bankCoins();delete store.data.checkpoint;
  if(run.trialDone && !store.data.trials?.includes(run.path.job))(store.data.trials??=[]).push(run.path.job);
  const gained=finishRun(store.data,run.summary());store.write();page='result';
  const fatal=run.fatal;
  const previous=run.previousHit;
  const combo=fatal&&previous&&run.seconds-previous.time<=3?'前一击 · '+ATTACK_NOTES[previous.kind][0]+'，相隔 '+(run.seconds-previous.time).toFixed(1)+' 秒。<br>':'';
  const recap=fatal?`<p><b>致命一击：${ATTACK_NOTES[fatal.kind][0]} · ${fatal.damage} 伤害</b><br>${combo}${ATTACK_NOTES[fatal.kind][1]}</p>`:!run.won&&run.seconds>=480?'<p>天亮前未能击败古树守卫。</p>':'';
  const leading=Object.entries(run.damageByWeapon).sort((a,b)=>b[1]-a[1])[0];
  const tactics='点亮林灯 '+run.shrinesLit+' 座　·　成功闪避 '+run.dodges+' 次'+(leading?'　·　主力技能 '+ability(leading[0] as UpgradeId,run.path.job).name:'');
  lastSummary=`${run.trialDone?'<p>职业挑战完成 · '+trialText[run.path.job][1]+'</p>':''}${recap}<p>${JOBS[run.path.job].name} · ${run.path.name}　·　${run.rules.label}　·　守夜 ${clock(run.seconds)}　·　击败 ${run.kills}　·　等级 ${run.level}</p><p>本局金币 +${run.coins}　·　营地余额 ${store.data.gold}</p><p>${tactics}</p>${run.relic?`<p>本局遗物 · ${RELICS[run.relic].name}</p>`:''}<p>${ABILITIES.filter(a=>run!.build[a.id]).map(a=>ability(a.id,run!.path.job).name+' '+run!.build[a.id]).join('　')}</p>${gained.map(id=>`<p>✦ ${ACHIEVEMENTS.find(a=>a.id===id)!.name}</p>`).join('')}<small>${store.warning}</small>`;
  hud.hidden=true;sheet(run.won?'黎明已至':'守夜结束',lastSummary,action('again','再来一局',true)+action('select','更换流派')+action('camp','营地训练')+action('home','返回主菜单'));
}
let shownSkills='',shownBosses='';
function updateHealth(s:Combat){
  el('health').textContent=`${JOBS[s.path.job].name}　${Math.ceil(s.player.hp)} / ${s.player.maxHp}　 Lv.${s.level}`;
  el<HTMLMeterElement>('hp').value=s.player.hp/s.player.maxHp;
}
function updateHud(s:Combat,stats:FrameStats) {
  checkpoint();battleHud.update(s);updateHealth(s);
  const purse='金币 '+s.coins;if(el('gold').textContent!==purse)el('gold').textContent=purse;
  const mastery=el('mastery');
  const status=!s.masteryActive?'':s.pathId==='hazel'?'游雷 · '+Math.floor(s.stormCharge*100)+'%':
    s.pathId==='ash'?(s.dashCooldown<=0?'焰枪 · 就绪':'焰枪 · 冷却'):
    s.path.job!=='mage'?(s.counterReady?'反击就绪':s.path.mastery.name):
    (s.zones.some(z=>z.kind==='spore' && z.timer>=1 && !z.bloomed)?'根阵 · 可开花':'根阵 · 育孢');
  const readout=s.relic==='stillglass'&&s.focus>=1?[status,'透镜已聚焦'].filter(Boolean).join(' · '):status;
  const hint=s.waveHint||readout;
  if(mastery.textContent!==hint)mastery.textContent=hint;
  el<HTMLMeterElement>('xp').value=s.xp/xpNeeded(s.level);
  el('clock').textContent=clock(s.seconds);el('perf').textContent=store.data.settings.showFps?`实际 ${Math.round(stats.current)||"—"} · 平均 ${Math.round(stats.average)||"—"} · 1% Low ${Math.round(stats.low)||"—"} FPS`:'';
  const relicIcon=s.relic?`<img class="hud-relic" src="${art('relic-'+s.relic+'.png')}" alt="${RELICS[s.relic].name}" title="${RELICS[s.relic].name}">`:'';
  const skills=relicIcon+ABILITIES.filter(a=>s.build[a.id]).map(a=>ability(a.id,s.path.job)).map(a=>`<i style="color:${a.color}" title="${a.name}">${a.icon} <small>${s.build[a.id]}</small></i>`).join('');
  if(skills!==shownSkills){el('skills').innerHTML=skills;shownSkills=skills;}
  const bosses=s.enemies.filter(e=>isChief(e.kind)&&e.hp>0);
  const bars=bosses.map(b=>`<label>${chiefName(b.kind)}${b.recovery?' · 收招':b.phase?' · 狂怒':''} <span>${Math.min(100,Math.ceil((b.hp/b.maxHp)*100))}%</span><meter min="0" max="${b.maxHp}" value="${b.hp}" aria-label="${chiefName(b.kind)}生命"></meter></label>`).join('');
  if(bars!==shownBosses){el('boss').innerHTML=bars;shownBosses=bars;}
}
panel.onclick=e=>{
  const btn=(e.target as Element).closest<HTMLButtonElement>('button[data-action]');if(!btn||btn.disabled)return;
  const id=btn.dataset.action!;void audio.start().catch(()=>{});audio.play('click');
  if(id==='home')home();else if(id==='restore')restore();else if(id==='again' && run){start(run.pathId);}else if(id==='select'){home();select();}else if(id==='journal')journal();else if(id==='settings')settings();
  else if(id==='resume')resume();else if(id==='pause')pause();else if(id==='retreat')end();
  else if(id==='cancel-queue'&&run&&page==='pause'){run.queued=undefined;pause();}
  else if(id==='camp')camp();
  else if(page==='camp' && id.startsWith('forge-')){
    const job=id.slice(6) as Job;
    if(store.data.trials?.includes(job) && !store.data.equipment?.includes(job) && store.data.gold>=24){
      store.data.gold-=24;(store.data.equipment??=[]).push(job);store.write();camp();
    }
  }
  else if(page==='camp' && (id==='train-health'||id==='train-speed')){if(train(store.data,id==='train-health'?'health':'speed'))store.write();camp();}
  else if(page==='job'&&id.startsWith('job-'))choosePath(id.slice(4) as Job);
  else if(page==='path'&&id==='back-job')select();
  else if(page==='path'&&id.startsWith('path-')){const path=id.slice(5) as PathId;if(PATHS[path]?.job===chosenJob)start(path);}
  else if(page==='relic'&&id.startsWith('relic-')&&run){
    const key=id.slice(6);if(isRelic(key)&&run.takeRelic(key)){
      if(!store.data.relics.includes(key)){store.data.relics.push(key);}afterChoice();
    }
  }
  else if(page==='upgrade'&&id==='reroll'&&run){const next=run.reroll(unlockedWeapons(store.data),shownOffer);if(next)upgrade(next);}
  else if((id==='gift-flame'||id==='gift-spring')&&run&&page==='gift'){run.takeGift(id==='gift-flame'?'flame':'spring');afterChoice();}
  else if(id.startsWith('take-')&&run&&page==='upgrade'){const pick=id.slice(5) as UpgradeId|'mastery'|'heal';const queue=document.querySelector<HTMLInputElement>('#queue-rank')?.checked;run.resolveLevel(pick==='heal'?undefined:pick);if(queue&&pick!=='heal'&&pick!=='mastery')run.queueUpgrade(pick);afterChoice();}
  else if(id==='import')el('import').click();
  else if(id==='export'){const url=URL.createObjectURL(new Blob([JSON.stringify({...store.data,checkpoint:undefined},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='forest-nightwatch-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
};
panel.oninput=e=>{
  const input=e.target as HTMLInputElement;const key=input.dataset.key;
  if(key==='difficulty' && page==='job'){
    const difficulty=readDifficulty(input.value);store.data.settings.difficulty=difficulty;store.write();
    el('mode-hint').textContent=DIFFICULTIES[difficulty].description;return;
  }
  if(key==='music'||key==='sound')store.data.settings[key]=Number(input.value);
  else if(key==='quality')store.data.settings.quality=input.checked?'low':'high';
  else if(key==='showEnemyHealth'){
    store.data.settings.showEnemyHealth=input.checked;
    const numbers=panel.querySelector<HTMLInputElement>('[data-key="showEnemyHealthNumbers"]')!;
    numbers.disabled=!input.checked;
    numbers.checked=input.checked && store.data.settings.showEnemyHealthNumbers;
    scene.refreshEnemyHealth();
  }else if(key==='showEnemyHealthNumbers' && store.data.settings.showEnemyHealth){
    store.data.settings.showEnemyHealthNumbers=input.checked;scene.refreshEnemyHealth();
  }
  else if(key==='showFps')store.data.settings.showFps=input.checked;
  else return;syncAudio();store.write();
};
const portrait=matchMedia('(orientation: portrait) and (pointer: coarse)');
portrait.addEventListener('change',()=>{if(portrait.matches&&page==='battle')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){checkpoint(true);audio.paused=true;if(page==='battle')pause();}});
el('pause').onclick=pause;
el('dash').onpointerdown=e=>{if(page==='battle'){e.preventDefault();scene.requestDash();}};
el('dash').onclick=e=>{if(e.detail===0 && page==='battle')scene.requestDash();};
window.addEventListener('pagehide',()=>{if(run?.ended&&page==='battle')end();else checkpoint(true);});
const scene=new ForestScene({audio,tick:updateHud,health:updateHealth,showFps:()=>store.data.settings.showFps,upgrade,end,pause,relic:chooseRelic,gift:chooseGift,wound:(x,y,low)=>battleHud.wound(x,y,low), lowQuality:()=>store.data.settings.quality==='low',showEnemyHealth:()=>store.data.settings.showEnemyHealth,showEnemyHealthNumbers:()=>store.data.settings.showEnemyHealthNumbers,
  ready:()=>{if(!assetError){ready=true;home();}},
  error:message=>{assetError=true;sheet('森林载入失败',`<p>${message}</p>`,'<button id="reload">重新加载</button>');el('reload').onclick=()=>location.reload();}
});
syncAudio();home();
// Draw on every browser animation frame. Combat uses a separate fixed simulation step.
new Phaser.Game({type:Phaser.AUTO,parent:'world',width:960,height:540,backgroundColor:'#254539',scene:[scene],audio:{noAudio:true},fps:{limit:0,smoothStep:false},scale:{mode:Phaser.Scale.EXPAND},render:{antialias:true,powerPreference:'high-performance'},banner:false});
