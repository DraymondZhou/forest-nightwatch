import {Combat} from './combat';
import {PATHS,type PathId} from './stylesOfPlay';
import {ABILITIES,type UpgradeId} from './content';
import {readDifficulty} from './difficulty';
import {readPurse} from './camp';

type Offer=(UpgradeId|'mastery')[];
// Spatial indexes, render effects and scratch arrays are rebuilt on the next frame.
const fields=('lastHit previousHit coins player build enemies shots zones drops seconds level xp kills pendingLevels bossSpawned synergySeen damageByWeapon dashCooldown dashTime dashAngle dodges shrinesLit shrine cacheSite cacheGuarded queued trialDone kit giftPending flameTime miniSpawned counterReady swings weaponAngle weaponMotion waveHint waveHintUntil relicPending relic rerolls focus stormCharge classTalent nextShrine evadeWindow harvestTime id spawnClock eliteClock weaponClocks leafClock ticks').split(' ');

export function packRun(game:Combat,offer?:Offer){
  const state=Object.fromEntries(fields.map(key=>[key,Reflect.get(game,key)]));
  return JSON.stringify({format:1,path:game.pathId,seed:game.seed,difficulty:game.difficulty,
    training:game.training,rng:game.rng.seed,loot:game.loot.seed,state,offer},
    (_key,value)=>value instanceof Set?[...value]:value);
}

export function unpackRun(raw:string){
  const saved=JSON.parse(raw);
  if(saved?.format!==1||!Object.hasOwn(PATHS,saved.path)||!Number.isSafeInteger(saved.seed)||
    !Number.isSafeInteger(saved.rng)||!Number.isSafeInteger(saved.loot))throw Error('无效的本局记录');
  const s=saved.state;
  if(!s||!Number.isFinite(s.seconds)||s.seconds<0||s.seconds>=480||!Number.isFinite(s.player?.hp)||
    s.player.hp<=0||!Array.isArray(s.enemies)||!Array.isArray(s.shots)||!Array.isArray(s.zones)||
    !Array.isArray(s.drops)||!s.build||!Number.isSafeInteger(s.level))throw Error('战斗记录不完整');
  const game=new Combat(saved.path as PathId,saved.seed,readDifficulty(saved.difficulty),readPurse({training:saved.training}).training);
  for(const field of fields)if(Object.hasOwn(s,field))Reflect.set(game,field,s[field]);
  for(const shot of game.shots)shot.hit=new Set(shot.hit);
  game.rng.seed=saved.rng;game.loot.seed=saved.loot;
  const offer:Offer|undefined=Array.isArray(saved.offer)&&saved.offer.every((id:unknown)=>
    id==='mastery'||ABILITIES.some(a=>a.id===id))?saved.offer:undefined;
  return {game,offer};
}
