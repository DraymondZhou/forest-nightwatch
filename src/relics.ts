import type {Job} from './stylesOfPlay';
export const RELICS={
  stillglass:{job:'mage',name:'琥珀透镜',style:'守住阵地',tip:'站定 1 秒蓄能，可带着走。下次主法术增伤 25%，优先首领和精英。'},
  waywick:{job:'mage',name:'游火灯芯',style:'引敌追击',tip:'闪避后，原地留火 2 秒，每半秒灼伤敌人。'},
  briar:{job:'warden',name:'荆棘护扣',style:'切入敌群',tip:'一刀砍中 3 个以上敌人时，使其减速 1 秒。首领减速 0.3 秒。'},
  whetstone:{job:'warden',name:'独锋砥石',style:'寻找单挑',tip:'一刀只砍中 1 个敌人时，伤害提高 25%。'},
  longfeather:{job:'hunter',name:'长翎',style:'拉开距离',tip:'20 步外射箭，伤害提高 15%，多穿透 1 个敌人。'},
  quicknock:{job:'hunter',name:'鹿角箭扣',style:'闪避抢射',tip:'闪避后可立即再射一轮。'}
} as const;
export type RelicId=keyof typeof RELICS;
export const relicIds=Object.keys(RELICS) as RelicId[];
export const relicsFor=(job:Job)=>relicIds.filter(id=>RELICS[id].job===job);
export const isRelic=(id:unknown):id is RelicId=>typeof id==='string'&&Object.hasOwn(RELICS,id);
