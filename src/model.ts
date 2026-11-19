import type {Job} from './stylesOfPlay';
import {freshRanks,readPurse,type Purse} from './camp';
import { readDifficulty,type Difficulty } from './difficulty';
import { ABILITIES, SYNERGIES, type UpgradeId, type CharacterId } from './content';
export type Build = Partial<Record<UpgradeId,number>>;
export class Random {
  constructor(public seed:number) { this.seed=seed>>>0; }
  next() { let t=this.seed+=0x6D2B79F5; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }
  between(min:number,max:number) { return min+(max-min)*this.next(); }
  pick<T>(items:T[]):T { return items[Math.floor(this.next()*items.length)]; }
}
export function upgradeChoices(build:Build, unlocked:string[], rng:Random):UpgradeId[] {
  const candidates=ABILITIES.filter(a=>{
    if ((build[a.id]??0)>=a.max) return false;
    if (!build[a.id] && a.kind==='weapon' && !unlocked.includes(a.id)) return false;
    const slots=ABILITIES.filter(b=>b.kind===a.kind && (build[b.id]??0)>0).length;
    return !!build[a.id] || slots<4;
  });
  // Weighted sampling without replacement: support current builds without forcing a recipe.
  const result:UpgradeId[]=[];
  while(result.length<3 && candidates.length) {
    const weights=candidates.map(a=>build[a.id]?1.6:1);
    let roll=rng.next()*weights.reduce((a,b)=>a+b,0); let index=0;
    while(index<weights.length-1 && (roll-=weights[index])>0) index++;
    result.push(candidates.splice(index,1)[0].id);
  }
  return result;
}
export const activeSynergies=(build:Build)=>SYNERGIES.filter(s=>(build[s.a]??0)>0&&(build[s.b]??0)>0);
export const xpNeeded=(level:number)=>Math.round(9+level*3.8+level*level*0.12);
export const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
export interface RunSummary { job:Job; seconds:number; kills:number; won:boolean; level:number; synergy:boolean; seed:number }
export interface Save extends Purse {
  version:1; runs:number; kills:number; bestTime:number; wins:CharacterId[]; jobWins:Job[]; achievements:string[];
  settings:{difficulty:Difficulty;music:number;sound:number;quality:'high'|'low';showFps:boolean;showEnemyHealth:boolean;showEnemyHealthNumbers:boolean};
}
export const newSave=():Save=>({gold:0,training:freshRanks(),version:1,runs:0,kills:0,bestTime:0,wins:[],jobWins:[],achievements:[],settings:{difficulty:'normal',music:0.3,sound:0.5,quality:'high',showFps:false,showEnemyHealth:true,showEnemyHealthNumbers:false}});
export function parseSave(value:unknown):Save {
  if(!value||typeof value!=='object') throw new Error('存档格式无效');
  const s=value as Save;
  if(s.version!==1) throw new Error('不支持此存档版本');
  for(const key of ['runs','kills','bestTime'] as const) if(!Number.isFinite(s[key])||s[key]<0||s[key]>1e9) throw new Error('存档数值无效');
  if(!Array.isArray(s.wins)||!s.wins.every(id=>['hazel','fern','ash'].includes(id))) throw new Error('角色记录无效');
  if(s.jobWins!==undefined && (!Array.isArray(s.jobWins)||!s.jobWins.every(j=>['mage','warden','hunter'].includes(j))))throw Error('职业记录无效');
  if(!Array.isArray(s.achievements)||!s.achievements.every(id=>['first','survivor','hunter','synergy','dawn','master'].includes(id))) throw new Error('成就记录无效');
  if(!s.settings||!Number.isFinite(s.settings.music)||!Number.isFinite(s.settings.sound)) throw new Error('设置无效');
  return {...readPurse(s),version:1,runs:Math.floor(s.runs),kills:Math.floor(s.kills),bestTime:Math.min(480,s.bestTime),wins:[...new Set(s.wins)],jobWins:[...new Set(s.jobWins??[])],achievements:[...new Set(s.achievements)],settings:{difficulty:readDifficulty(s.settings.difficulty),music:clamp(s.settings.music,0,1),sound:clamp(s.settings.sound,0,1),quality:s.settings.quality==='low'?'low':'high',showFps:s.settings.showFps===true,showEnemyHealth:s.settings.showEnemyHealth!==false,showEnemyHealthNumbers:s.settings.showEnemyHealthNumbers===true}};
}
export function finishRun(save:Save,run:RunSummary):string[] {
  const before=new Set(save.achievements); save.runs++; save.kills+=run.kills; save.bestTime=Math.max(save.bestTime,run.seconds);
  if(run.won&&!save.jobWins.includes(run.job)) save.jobWins.push(run.job);
  const unlock=(id:string,condition:boolean)=>{if(condition&&!save.achievements.includes(id))save.achievements.push(id)};
  unlock('first',true); unlock('survivor',run.seconds>=180); unlock('hunter',save.kills>=300); unlock('synergy',run.synergy); unlock('dawn',run.won); unlock('master',save.jobWins.length===3);
  return save.achievements.filter(a=>!before.has(a));
}
export const unlockedWeapons=(save:Save)=>['spark','spore','leaf','ember',...(save.achievements.includes('hunter')?['comet']:[]),...(save.achievements.includes('synergy')?['frost']:[])];
export class SaveStore {
  readonly key='forest-nightwatch-v1'; warning=''; data:Save;
  constructor(private storage:Pick<Storage,'getItem'|'setItem'>) {
    this.data=newSave(); try {const raw=storage.getItem(this.key); if(raw) this.data=parseSave(JSON.parse(raw));} catch {this.warning='无法读取旧存档，已使用临时新档；旧数据未覆盖。请先导入备份。';}
  }
  write() {try{this.storage.setItem(this.key,JSON.stringify(this.data));this.warning='';return true;}catch{this.warning='浏览器无法保存进度，请导出存档备份。';return false;}}
  import(raw:string) {const parsed=parseSave(JSON.parse(raw)); this.data=parsed; return this.write();}
}
