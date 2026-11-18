export type WeaponId = 'spark' | 'spore' | 'leaf' | 'ember' | 'frost' | 'comet';
export type PassiveId = 'power' | 'haste' | 'reach' | 'vigor' | 'stride' | 'fortune';
export type UpgradeId = WeaponId | PassiveId;
export type CharacterId = 'hazel' | 'fern' | 'ash';
export interface Ability { id: UpgradeId; name: string; icon: string; color: string; kind: 'weapon' | 'passive'; max: number; description: string; tags: string[] }
export const ABILITIES: Ability[] = [
  { id:'spark',name:'星雷',icon:'ϟ',color:'#8be7dc',kind:'weapon',max:5,description:'连锁电弧跃向附近敌人；对单体保留集中伤害。',tags:['雷','连锁'] },
  { id:'spore',name:'月孢',icon:'♧',color:'#cfdda0',kind:'weapon',max:5,description:'在敌群落下持续孢子场，积累月孢印记。',tags:['孢子','区域'] },
  { id:'leaf',name:'风叶',icon:'❧',color:'#dce5a1',kind:'weapon',max:5,description:'环绕的风叶切割近身敌人，创造移动空间。',tags:['风','环绕'] },
  { id:'ember',name:'余烬',icon:'✦',color:'#efae74',kind:'weapon',max:5,description:'火种飞向敌人并爆炸，留下灼烧。',tags:['火','爆发'] },
  { id:'frost',name:'霜环',icon:'❄',color:'#b6d5f5',kind:'weapon',max:5,description:'释放寒霜波减速敌人；重复命中结晶。',tags:['霜','控制'] },
  { id:'comet',name:'流星',icon:'✧',color:'#dfb8ef',kind:'weapon',max:5,description:'穿透敌群的星光，擅长远距离与首领战。',tags:['星','穿透'] },
  { id:'power',name:'余辉',icon:'☀',color:'#e9c988',kind:'passive',max:4,description:'全部直接伤害 +12%。',tags:['伤害'] },
  { id:'haste',name:'节拍',icon:'»',color:'#9ee0d1',kind:'passive',max:4,description:'施法间隔缩短，最多降低 28%。',tags:['频率'] },
  { id:'reach',name:'共鸣',icon:'◎',color:'#dfc294',kind:'passive',max:4,description:'范围 +10%，基础拾取半径增加 12。',tags:['范围'] },
  { id:'vigor',name:'生息',icon:'♡',color:'#e8a3a2',kind:'passive',max:4,description:'最大生命 +20，并立即恢复 20 生命。',tags:['生存'] },
  { id:'stride',name:'轻步',icon:'⌁',color:'#adcfbb',kind:'passive',max:4,description:'移动速度 +8%，受伤无敌时间延长。',tags:['移动'] },
  { id:'fortune',name:'星露',icon:'◇',color:'#dec7ec',kind:'passive',max:4,description:'经验获取 +10%，每级恢复少量生命。',tags:['成长'] }
];
export const WEAPONS = ABILITIES.filter(a=>a.kind==='weapon');
export const CHARACTERS: { id:CharacterId; name:string; title:string; weapon:WeaponId; hp:number; speed:number; color:number; description:string; unlock:string }[] = [
  {id:'hazel',name:'榛果',title:'提灯学徒',weapon:'spark',hp:100,speed:185,color:0xd89c60,description:'星雷开局 · 拾取范围 +20%\n带着一盏灯，守住森林的长夜。',unlock:'初始开放'},
  {id:'fern',name:'蕨',title:'月林守望',weapon:'spore',hp:120,speed:175,color:0x92b695,description:'月孢开局 · 区域持续时间 +25%\n让每一寸土地成为你的同伴。',unlock:'任意角色生存至 3 分钟'},
  {id:'ash',name:'灰烬',title:'逐星旅人',weapon:'ember',hp:85,speed:205,color:0xa3b6d5,description:'余烬开局 · 爆发伤害 +15%\n沿着余火走向黎明。',unlock:'首次击败森林首领'}
];
export const SYNERGIES = [
  {id:'stormgarden',a:'spark',b:'spore',name:'雷鸣花园',description:'雷击引爆月孢印记，产生一次小范围爆发。每个敌人独立冷却。'},
  {id:'wildfire',a:'ember',b:'leaf',name:'流火回旋',description:'风叶命中灼烧目标时延长灼烧，并额外溅射一次火花。'},
  {id:'shatter',a:'frost',b:'comet',name:'碎星寒潮',description:'流星击中减速目标时产生碎晶，提升单体伤害并波及附近敌人。'}
] as const;
export const ACHIEVEMENTS = [
  {id:'first',name:'第一缕微光',description:'完成一场守夜',reward:'记录册开放'},
  {id:'survivor',name:'月林来客',description:'生存至 3 分钟',reward:'解锁角色：蕨'},
  {id:'hunter',name:'星轨初现',description:'累计击败 300 个敌人',reward:'解锁技能：流星'},
  {id:'synergy',name:'魔法的回响',description:'在一局中组成任意一组联动',reward:'解锁技能：霜环'},
  {id:'dawn',name:'长夜将尽',description:'首次击败森林首领',reward:'解锁角色：灰烬'},
  {id:'master',name:'守夜人',description:'三个角色各胜利一次',reward:'守夜人纪念徽章'}
] as const;
export const ability = (id: UpgradeId) => ABILITIES.find(a=>a.id===id)!;
