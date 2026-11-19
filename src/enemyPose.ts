import type { Enemy, EnemyKind } from './combat';

const species:Record<EnemyKind,number>={slime:0,moth:1,twig:2,spitter:3,beetle:4,brute:5,crystal:6,boss:7,boar:0,mothQueen:1};
export const ATTACK_POSE_TIME=.23;
const gaitRate:Record<EnemyKind,number>={slime:1.5,moth:3.7,twig:2.6,spitter:1.3,beetle:2.2,brute:1.25,crystal:2.6,boss:.85,boar:1.48,mothQueen:2.1};
const isCaster=(kind:EnemyKind)=>kind==='spitter'||kind==='crystal'||kind==='boss';

export function enemyRestFrame(kind:EnemyKind){return species[kind]*24+23;}
export function enemyPoseFrame(e:Enemy,distance:number){
  const first=species[e.kind]*24;
  if(e.charge)return first+17;
  if(e.preparing)return first+12+Math.min(3,Math.max(0,Math.floor((1-e.preparing/(e.windupTime??1))*4)));
  if(e.flash>0)return first+20+Math.min(2,Math.floor((1-e.flash/.08)*3));
  if(e.attackPose>0)return first+16+Math.min(3,Math.floor((1-e.attackPose/ATTACK_POSE_TIME)*4));
  let windup=0;
  if(isCaster(e.kind) && e.clock>=0 && e.clock<.55)windup=1-e.clock/.55;
  else if(!isCaster(e.kind) && distance>e.radius+15 && distance<e.radius+35)
    windup=1-(distance-e.radius-15)/20;
  if(windup>0)return first+12+Math.min(3,Math.floor(windup*4));
  if(e.kind==='spitter' && distance<280)return enemyRestFrame(e.kind);
  return first+Math.floor((e.gait*gaitRate[e.kind]*12+e.id*5)%12);
}
