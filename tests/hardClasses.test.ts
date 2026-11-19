import {describe,it,expect} from 'vitest';
import {Combat} from '../src/combat';
import type {CharacterId,UpgradeId} from '../src/content';

import type {PathId} from '../src/stylesOfPlay';
const priorities:Record<CharacterId,UpgradeId[]>={
  hazel:['spark','spore','power','haste','ember','vigor','leaf'],
  fern:['spore','spark','vigor','haste','leaf','power','ember'],
  ash:['ember','leaf','power','haste','vigor','spark']
};
function play(character:CharacterId,seed:number,path:PathId=character){
  const s=new Combat(character,seed,'hard',path),melee=s.path.job==='warden',rank:UpgradeId[]=melee?['blade','leaf','power','haste','vigor','stride']:s.path.job==='hunter'?['bow','ember','power','haste','vigor','stride']:priorities[character];
  for(let tick=0;tick<30000&&!s.ended;tick++){
    const phase=s.seconds*.30,boss=s.boss;
    const x=s.shrine?.x??((boss?.x??900)+(boss?(melee?108:150):470)*Math.cos(phase));
    const y=s.shrine?.y??((boss?.y??600)+(boss?(melee?108:130):300)*Math.sin(phase));
    const distance=Math.max(1,Math.hypot(x-s.player.x,y-s.player.y));
    let dx=(x-s.player.x)/distance,dy=(y-s.player.y)/distance,danger=false;
    for(const e of s.enemies){
      const ax=s.player.x-e.x,ay=s.player.y-e.y,h=Math.max(1,Math.hypot(ax,ay));
      const urgency=Math.max(0,1-(h-e.radius)/70)*(melee && e===boss ? 0 : 1.8);
      dx+=ax*urgency/h;dy+=ay*urgency/h;danger ||= h<e.radius+17;
    }
    s.step(1/60,{x:dx,y:dy,dash:danger&&s.dashCooldown<=0});
    if(s.giftPending)s.takeGift(s.player.hp<s.player.maxHp*.7?'spring':'flame');
    while(s.pendingLevels){
      const options=s.levelOptions(['spark','spore','leaf','ember']);
      const pick=options.includes('mastery')?'mastery':rank.find(id=>options.includes(id))??options[0];
      s.resolveLevel(pick);
    }
  }
  return s.won && s.classTalent;
}
describe('hard-mode clears through natural progression',()=>{
  for(const path of ['guard','breaker','sniper','volley'] as const){
    it(path+' clears hard mode with its own weapon and talent',()=>{
      expect([56,78,90,207,33,120,66,11].some(seed=>play('hazel',seed,path))).toBe(true);
    },60000);
  }
  for(const id of ['hazel','fern','ash'] as const){
    it(id+' can defeat the boss with a class talent and the starting spell pool',()=>{
      expect([56,78,90,207].some(seed=>play(id,seed))).toBe(true);
    },30000);
  }
});
