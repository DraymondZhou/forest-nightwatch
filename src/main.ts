import Phaser from 'phaser';
import './style.css';
import { AudioDirector } from './audio';
import { Combat } from './combat';
import { ForestScene } from './scene';
import { ABILITIES, ACHIEVEMENTS, CHARACTERS, SYNERGIES, ability, type CharacterId, type UpgradeId } from './content';
import { SaveStore, characterUnlocked, finishRun, unlockedWeapons, upgradeChoices, xpNeeded } from './model';

const store = new SaveStore({
  getItem: key => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value)
});
const audio = new AudioDirector();
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = '<div id="world"></div><section id="hud" hidden><div class="vitals"><span id="health"></span><meter id="hp"></meter><meter id="xp"></meter></div><b id="clock"></b><button id="pause" aria-label="暂停">Ⅱ</button><div id="skills"></div><output id="perf"></output><div id="boss"></div></section><section id="panel"></section><aside id="orientation">请旋转手机，横屏守夜</aside>';
const el = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
const panel = el('panel'), hud = el('hud');
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
  panel.innerHTML=`<div class="title"><h1>森光守夜</h1><p lang="en">Forest Nightwatch</p><nav>${ready?action('select','开始守夜　→',true):'<button disabled>正在唤醒森林…</button>'}${action('journal','守夜手记')}${action('settings','设置')}</nav>${store.warning?`<small>${store.warning}</small>`:''}</div>`;
}
function select() {
  page='select';
  const cards=CHARACTERS.map(c=>{
    const open=characterUnlocked(store.data,c.id);
    return `<button class="card" data-action="play-${c.id}" ${open?'':'disabled'}><b class="rune">${ability(c.weapon).icon}</b><small>${c.title}</small><strong>${c.name}</strong><span>${open?c.description.split('\n')[0]:c.unlock}</span></button>`;
  }).join('');
  sheet('选择守夜人',`<div class="cards">${cards}</div><p>拖动左侧摇杆或按方向键移动，魔法会自动攻击。拾取金色晶石升级，六分钟后挑战古树守卫。</p>`,action('home','返回'));
}
function journal() {
  page='journal';
  const rows=ACHIEVEMENTS.map(a=>`<li><b>${store.data.achievements.includes(a.id)?'✦':'◇'}　${a.name}</b><span>${a.description} · ${a.reward}</span></li>`).join('');
  sheet('守夜手记',`<p>共守夜 ${store.data.runs} 次　·　累计击败 ${store.data.kills}　·　最长 ${clock(store.data.bestTime)}</p><ul>${rows}</ul><h3>魔法联动</h3><ul>${SYNERGIES.map(s=>`<li><b>${s.name}</b><span>${ability(s.a).name} + ${ability(s.b).name}　${s.description}</span></li>`).join('')}</ul>`,action('home','返回'));
}
function settings() {
  page='settings';const s=store.data.settings;
  sheet('设置',`<div class="options">${(['music','sound'] as const).map(k=>`<label>${k==='music'?'音乐':'音效'}<input type="range" data-key="${k}" min="0" max="1" step=".05" value="${s[k]}"></label>`).join('')}<label>精简特效<input type="checkbox" data-key="quality" ${s.quality==='low'?'checked':''}></label><label>显示帧率<input type="checkbox" data-key="showFps" ${s.showFps?'checked':''}></label></div><input id="import" type="file" accept="application/json,.json" hidden><p id="notice">${store.warning}</p>`,action('export','导出存档')+action('import','导入存档')+action(run?'pause':'home','返回',true));
  el<HTMLInputElement>('import').onchange=async e=>{
    const f=(e.target as HTMLInputElement).files?.[0];if(!f)return;
    try{if(f.size>100000)throw Error('存档过大');store.import(await f.text());syncAudio();settings();el('notice').textContent=store.warning||'存档已导入';}
    catch{el('notice').textContent='无法导入，请选择有效的守夜存档。';}
  };
}
function syncAudio(){audio.music=store.data.settings.music;audio.sound=store.data.settings.sound;}
function start(id:CharacterId) {
  if(!ready||!characterUnlocked(store.data,id))return;
  run=new Combat(id,crypto.getRandomValues(new Uint32Array(1))[0]);page='battle';app.className='';
  panel.hidden=true;hud.hidden=false;audio.combat=true;audio.paused=false;
  scene.begin(run);if(portrait.matches)pause();
}
function pause(){
  if(!run||run.ended||run.pendingLevels)return;
  page='pause';scene.setPaused(true);audio.paused=true;
  sheet('林间歇息',`<p>${clock(run.seconds)}　·　击败 ${run.kills}　·　等级 ${run.level}</p>`,action('resume','继续守夜',true)+action('settings','设置')+action('retreat','结束本局'));
}
function resume(){
  if(!run||run.ended||portrait.matches||document.hidden)return;
  page='battle';panel.hidden=true;audio.paused=false;scene.setPaused(false);
}
function upgrade(){
  if(!run)return;
  page='upgrade';scene.setPaused(true);audio.play('level');
  const choices=upgradeChoices(run.build,unlockedWeapons(store.data),run.rng);
  const cards=choices.map(id=>{
    const a=ability(id), level=run!.build[id]??0;
    const synergy=SYNERGIES.find(s=>(s.a===id&&run!.build[s.b])||(s.b===id&&run!.build[s.a]));
    return `<button class="card" data-action="take-${id}" style="--accent:${a.color}"><b class="rune">${a.icon}</b><small>${level?'等级 '+level+' → '+(level+1):'习得'+(a.kind==='weapon'?'魔法':'祝福')}</small><strong>${a.name}</strong><span>${a.description}</span>${synergy?`<em>${synergy.name}</em>`:''}</button>`;
  }).join('');
  sheet('选择一项祝福',`<div class="cards">${cards||action('take-heal','恢复 20 生命',true)}</div>`,'');
}
function end(){
  if(!run||page==='result')return;
  run.ended=true;scene.setPaused(true);audio.paused=false;audio.play(run.won?'win':'lose');
  const gained=finishRun(store.data,run.summary());store.write();page='result';
  lastSummary=`<p>守夜 ${clock(run.seconds)}　·　击败 ${run.kills}　·　等级 ${run.level}</p><p>${ABILITIES.filter(a=>run!.build[a.id]).map(a=>a.name+' '+run!.build[a.id]).join('　')}</p>${gained.map(id=>`<p>✦ ${ACHIEVEMENTS.find(a=>a.id===id)!.name}</p>`).join('')}<small>${store.warning}</small>`;
  hud.hidden=true;sheet(run.won?'黎明已至':'守夜结束',lastSummary,action('again','再守一夜',true)+action('home','返回营地'));
}
let shownSkills='';
function updateHud(s:Combat,fps:number,slow:number) {
  el('health').textContent=`${s.character.name}　${Math.ceil(s.player.hp)} / ${s.player.maxHp}　 Lv.${s.level}`;
  el<HTMLMeterElement>('hp').value=s.player.hp/s.player.maxHp;el<HTMLMeterElement>('xp').value=s.xp/xpNeeded(s.level);
  el('clock').textContent=clock(s.seconds);el('perf').textContent=store.data.settings.showFps?`${Math.round(fps)} 平均 FPS · 慢帧 ${slow}`:'';
  const skills=ABILITIES.filter(a=>s.build[a.id]).map(a=>`<i style="color:${a.color}" title="${a.name}">${a.icon} <small>${s.build[a.id]}</small></i>`).join('');
  if(skills!==shownSkills){el('skills').innerHTML=skills;shownSkills=skills;}
  const boss=s.boss;el('boss').textContent=boss?`古树守卫　${Math.ceil(100*boss.hp/boss.maxHp)}%`:'';
}
panel.onclick=e=>{
  const btn=(e.target as Element).closest<HTMLButtonElement>('button[data-action]');if(!btn||btn.disabled)return;
  const id=btn.dataset.action!;void audio.start().catch(()=>{});audio.play('click');
  if(id==='home')home();else if(id==='select'||id==='again'){home();select();}else if(id==='journal')journal();else if(id==='settings')settings();
  else if(id==='resume')resume();else if(id==='pause')pause();else if(id==='retreat')end();
  else if(id.startsWith('play-'))start(id.slice(5) as CharacterId);
  else if(id.startsWith('take-')&&run&&page==='upgrade'){run.resolveLevel(id==='take-heal'?undefined:id.slice(5) as UpgradeId);if(run.pendingLevels)upgrade();else if(portrait.matches||document.hidden)pause();else resume();}
  else if(id==='import')el('import').click();
  else if(id==='export'){const url=URL.createObjectURL(new Blob([JSON.stringify(store.data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='forest-nightwatch-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
};
panel.oninput=e=>{
  const input=e.target as HTMLInputElement;const key=input.dataset.key;
  if(key==='music'||key==='sound')store.data.settings[key]=Number(input.value);
  else if(key==='quality')store.data.settings.quality=input.checked?'low':'high';
  else if(key==='showFps')store.data.settings.showFps=input.checked;
  else return;syncAudio();store.write();
};
const portrait=matchMedia('(orientation: portrait) and (pointer: coarse)');
portrait.addEventListener('change',()=>{if(portrait.matches&&page==='battle')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.paused=true;if(page==='battle')pause();}});
el('pause').onclick=pause;
const scene=new ForestScene({audio, tick:updateHud, upgrade,end,pause, lowQuality:()=>store.data.settings.quality==='low',
  ready:()=>{if(!assetError){ready=true;home();}},
  error:message=>{assetError=true;sheet('森林载入失败',`<p>${message}</p>`,'<button id="reload">重新加载</button>');el('reload').onclick=()=>location.reload();}
});
syncAudio();home();
new Phaser.Game({type:Phaser.AUTO,parent:'world',width:960,height:540,backgroundColor:'#254539',scene:[scene],audio:{noAudio:true},fps:{target:60,limit:60},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true,powerPreference:'high-performance'},banner:false});
