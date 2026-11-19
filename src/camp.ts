export const TRAINING = {
  health:{name:'体魄',step:8,unit:'生命',cost:[12,24,40,60,85]},
  speed:{name:'步法',step:.5,unit:'步/秒',cost:[12,24,40,60,85]}
} as const;
export type TrainingId=keyof typeof TRAINING;
export type Ranks=Record<TrainingId,number>;
export interface Purse {gold:number;training:Ranks}
export const freshRanks=():Ranks=>({health:0,speed:0});
export const maxHealth=(r:Ranks)=>100+TRAINING.health.step*r.health;
export const walkSpeed=(r:Ranks)=>185+10*TRAINING.speed.step*r.speed;
export function readPurse(s:Partial<Purse>):Purse{
  const read=(v:unknown,max:number)=>{if(v===undefined)return 0;if(typeof v!=='number'||!Number.isSafeInteger(v)||v<0||v>max)throw Error('金币或营地等级无效');return v;};
  return {gold:read(s.gold,1e9),training:{health:read(s.training?.health,5),speed:read(s.training?.speed,5)}};
}
export function train(p:Purse,k:TrainingId){
  const cost=TRAINING[k].cost[p.training[k]];
  if(cost===undefined||p.gold<cost)return false;
  p.gold-=cost;p.training[k]++;return true;
}
// Keep currency rolls independent of wave spawns, healing and level-up choices.
export function coinValue(kind:string,roll:number){
  if(kind==='boss')return 25;
  if(kind==='boar'||kind==='mothQueen')return 12;
  if(kind==='brute'||kind==='crystal')return roll<.65?3:0;
  return roll<.12?1:0;
}
