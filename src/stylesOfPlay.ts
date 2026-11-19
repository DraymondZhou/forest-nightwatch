import {CLASS_TALENTS,MASTERIES,type CharacterId,type WeaponId} from './content';

export type Job='mage'|'warden'|'hunter';
export type PathId=CharacterId|'guard'|'breaker'|'sniper'|'volley';
export const JOBS:Record<Job,{name:string;icon:string;tip:string}>={
  mage:{name:'法师',icon:'ϟ',tip:'以雷电、孢子或余火迎敌。'},
  warden:{name:'剑卫',icon:'⚔',tip:'接近敌群，用扇形斩击守住身前。'},
  hunter:{name:'猎手',icon:'➶',tip:'用长弓贯穿敌列，或用散射压制近敌。'}
};
interface Path {job:Job; name:string; weapon:WeaponId; tip:string; mastery:{name:string;tip:string;details:string}; talent:{name:string;description:string}}
export const PATHS:Record<PathId,Path>={
  hazel:{job:'mage',name:'雷行',weapon:'spark',tip:'连锁星雷，移动蓄电。',mastery:MASTERIES.hazel,talent:CLASS_TALENTS.hazel},
  fern:{job:'mage',name:'孢庭',weapon:'spore',tip:'铺设孢子场，把追兵引回阵中。',mastery:MASTERIES.fern,talent:CLASS_TALENTS.fern},
  ash:{job:'mage',name:'余火',weapon:'ember',tip:'火种灼烧，沿闪避方向刺出焰枪。',mastery:MASTERIES.ash,talent:CLASS_TALENTS.ash},
  guard:{job:'warden',name:'盾反',weapon:'blade',tip:'持盾减伤。受击后，下一刀反击。',mastery:{name:'格挡反击',tip:'受击后下一刀伤害翻倍。',details:'常驻减伤 20%。六级起，实际受到伤害后蓄好反击，下一刀造成两倍伤害。'},talent:{name:'回生',description:'反击命中时恢复 6 点生命，每刀最多一次。'}},
  breaker:{job:'warden',name:'重斩',weapon:'blade',tip:'以宽刃扫过身前，每三刀打出重击。',mastery:{name:'开山',tip:'第三刀同时扩大范围并增伤。',details:'挥砍弧度更宽。六级起每第三刀攻击距离增加 30%，伤害提高 70%。'},talent:{name:'断木',description:'第三刀额外对首领和精英造成 40% 伤害。'}},
  sniper:{job:'hunter',name:'穿杨',weapon:'bow',tip:'长弓贯穿敌列，拉开距离增伤。',mastery:{name:'远狙',tip:'远距离开弓提高伤害。',details:'长弓可贯穿至少三个敌人。六级起，锁定距离超过 20 步时，此箭伤害提高 55%。'},talent:{name:'破甲矢',description:'远狙命中首领和精英时额外造成 40% 伤害。'}},
  volley:{job:'hunter',name:'散射',weapon:'bow',tip:'三箭扇射，靠近大型敌人可多箭命中。',mastery:{name:'五连矢',tip:'散射增加至五支箭。',details:'每箭造成单箭伤害的 64%。六级起每轮由三箭增为五箭。'},talent:{name:'追猎',description:'散射命中普通敌人时，使其短暂减速。'}}
};
