import type {Job} from './stylesOfPlay';
export type WeaponId = 'spark' | 'spore' | 'leaf' | 'ember' | 'frost' | 'comet' | 'blade' | 'bow';
export type PassiveId = 'power' | 'haste' | 'reach' | 'vigor' | 'stride' | 'fortune';
export type UpgradeId = WeaponId | PassiveId;
export type CharacterId = 'hazel' | 'fern' | 'ash';
export interface Ability { id: UpgradeId; name: string; icon: string; color: string; kind: 'weapon' | 'passive'; max: number; description: string; tags: string[] }
export const ABILITIES: Ability[] = [
  { id:'spark',name:'星雷',icon:'ϟ',color:'#8be7dc',kind:'weapon',max:5,description:'连锁电弧跃向附近敌人；对单体保留集中伤害。',tags:['雷','连锁'] },
  { id:'spore',name:'月孢',icon:'♧',color:'#cfdda0',kind:'weapon',max:5,description:'在敌群落下持续孢子场，积累月孢印记。',tags:['孢子','区域'] },
  { id:'leaf',name:'风叶',icon:'❧',color:'#dce5a1',kind:'weapon',max:5,description:'环绕的风叶切割近身敌人，创造移动空间。',tags:['风','环绕'] },
  { id:'ember',name:'余烬',icon:'✦',color:'#efae74',kind:'weapon',max:5,description:'火种直击目标并灼烧 3 秒。爆炸越靠近中心伤害越高，周围敌人灼烧 1.5 秒。',tags:['火','爆发'] },
  { id:'frost',name:'霜环',icon:'❄',color:'#b6d5f5',kind:'weapon',max:5,description:'释放寒霜波减速敌人；重复命中结晶。',tags:['霜','控制'] },
  { id:'comet',name:'流星',icon:'✧',color:'#dfb8ef',kind:'weapon',max:5,description:'穿透敌群的星光，擅长远距离与首领战。',tags:['星','穿透'] },
  { id:'blade',name:'林刃',icon:'⚔',color:'#e0bc8a',kind:'weapon',max:5,description:'向最近目标挥出一刀，可同时命中扇面内多个敌人。升级增加伤害与攻击距离。',tags:['近战','扇形'] },
  { id:'bow',name:'猎弓',icon:'➶',color:'#bcd699',kind:'weapon',max:5,description:'射向远处敌人。升级提高伤害，箭可贯穿前排。',tags:['射击','贯穿'] },
  { id:'power',name:'余辉',icon:'☀',color:'#e9c988',kind:'passive',max:4,description:'每级提高 10% 攻击伤害。',tags:['伤害'] },
  { id:'haste',name:'节拍',icon:'»',color:'#9ee0d1',kind:'passive',max:4,description:'攻击间隔缩短，四级累计减少 7%、12.5%、17%、20%。',tags:['频率'] },
  { id:'reach',name:'共鸣',icon:'◎',color:'#dfc294',kind:'passive',max:4,description:'范围 +10%，基础拾取半径增加 12。',tags:['范围'] },
  { id:'vigor',name:'生息',icon:'♡',color:'#e8a3a2',kind:'passive',max:4,description:'最大生命 +20，并立即恢复 20 生命。',tags:['生存'] },
  { id:'stride',name:'轻步',icon:'⌁',color:'#adcfbb',kind:'passive',max:4,description:'移动速度 +8%，受伤无敌时间延长。',tags:['移动'] },
  { id:'fortune',name:'星露',icon:'◇',color:'#dec7ec',kind:'passive',max:4,description:'经验获取 +10%，每级恢复少量生命。',tags:['成长'] }
];
export const WEAPONS = ABILITIES.filter(a=>a.kind==='weapon');
export const MASTERY_LEVEL=6;
export const MASTERIES:Record<CharacterId,{name:string;tip:string;details:string}>={
  hazel:{name:'游雷',tip:'移动蓄电，拉开距离打出重雷。',details:'每移动 22 步充满电。满电首击伤害提高 65%，射程增至 32 步。只击中一个敌人时，剩余跳数追加伤害。'},
  fern:{name:'根阵',tip:'绕着孢子场走，把追兵引回阵里。',details:'孢子场落地 1 秒后，踏入或留在场内可令其开花一次。场中敌人受到额外伤害并定身 0.7 秒，首领改为短暂减速，并在这片花阵中多受 35% 孢子伤害。'},
  ash:{name:'焰枪',tip:'对准敌阵闪避，沿途打穿前排。',details:'发动闪避时，沿闪避方向射出一道焰枪，最多贯穿 3 个目标并点燃。焰枪伤害随余烬等级成长。'}
};
export const CLASS_TALENTS:Record<CharacterId,{name:string;description:string}>={
  hazel:{name:'引雷针',description:'满电的星雷优先锁定射程内的首领或精英，并对它的首击额外提高 25%。'},
  fern:{name:'返青',description:'一次根阵开花卷入至少两个敌人时，恢复 3 点生命。'},
  ash:{name:'回火',description:'同一支焰枪穿过第二个敌人时，闪避剩余冷却缩短 1 秒。'}
};
export const SYNERGIES = [
  {id:'cutwind',a:'blade',b:'leaf',name:'风刃',description:'林刃命中时，风叶额外割伤目标。每个目标有独立冷却。'},
  {id:'firearrow',a:'bow',b:'ember',name:'火箭',description:'箭矢击中敌人时点燃目标两秒。'},
  {id:'stormgarden',a:'spark',b:'spore',name:'雷鸣花园',description:'雷击引爆月孢印记，产生一次小范围爆发。每个敌人独立冷却。'},
  {id:'wildfire',a:'ember',b:'leaf',name:'流火回旋',description:'风叶命中灼烧目标时延长灼烧，并额外溅射一次火花。'},
  {id:'shatter',a:'frost',b:'comet',name:'碎星寒潮',description:'流星击中减速目标时产生碎晶，提升单体伤害并波及附近敌人。'}
] as const;
export const ACHIEVEMENTS = [
  {id:'first',name:'第一缕微光',description:'完成一场守夜',reward:'记录册开放'},
  {id:'survivor',name:'月林来客',description:'生存至 3 分钟',reward:'月林纪念章'},
  {id:'hunter',name:'星轨初现',description:'累计击败 300 个敌人',reward:'解锁技能：流星'},
  {id:'synergy',name:'魔法的回响',description:'在一局中组成任意一组联动',reward:'解锁技能：霜环'},
  {id:'dawn',name:'长夜将尽',description:'首次击败森林首领',reward:'黎明纪念章'},
  {id:'master',name:'守夜人',description:'三个职业各胜利一次',reward:'守夜人纪念徽章'}
] as const;
const presentation:Partial<Record<Job,Partial<Record<WeaponId,Pick<Ability,'name'|'description'|'icon'>>>>>={
  hunter:{
    ember:{name:'燃矢',icon:'➶',description:'射出燃烧的箭矢，命中时炸开火星。直击灼烧 3 秒，附近敌人灼烧 1.5 秒。'},
    comet:{name:'星镞',icon:'➴',description:'以星光箭镞贯穿一列敌人，射程比燃矢更远。'}
  },
  warden:{
    leaf:{name:'回旋刃',icon:'⟲',description:'回旋的刃锋切割近身敌人，守住剑卫周身。'},
    frost:{name:'霜锋',icon:'❄',description:'扫出一圈霜锋，使附近敌人减速，重复命中可冻结。'}
  }
};
const byJob=Object.fromEntries((['mage','hunter','warden'] as const).map(job=>[job,Object.fromEntries(ABILITIES.map(a=>[a.id,{...a,...presentation[job]?.[a.id as WeaponId]}]))])) as Record<Job,Record<UpgradeId,Ability>>;
export const ability=(id:UpgradeId,job:Job='mage')=>byJob[job][id];
