export const DIFFICULTIES={
  easy:{label:'简单',description:'敌潮较疏，受伤较轻。',waveRate:.9,eliteInterval:62,damage:.78,speed:.98,bossHealth:.82,bossInterval:1.12},
  normal:{label:'标准',description:'开局留出成型时间，随后敌潮和精英逐渐加压。',waveRate:1.15,eliteInterval:50,damage:1.08,speed:1.05,bossHealth:.96,bossInterval:1.02},
  hard:{label:'困难',description:'后半局敌潮更密，精英更频繁，受击代价更高。',waveRate:1.29,eliteInterval:43,damage:1.26,speed:1.10,bossHealth:1.12,bossInterval:.90}
} as const;
export type Difficulty=keyof typeof DIFFICULTIES;
export function readDifficulty(value:unknown):Difficulty{
  return value==='easy'||value==='hard'?value:'normal';
}
// Leave room to find a second spell before harder modes reach full pressure.
export function rampDifficulty(target:number,seconds:number){
  const progress=Math.max(0,Math.min(1,(seconds-35)/205));
  return target<=1?target:1+(target-1)*progress;
}

// Snapshot health at spawn: later waves get tougher without refilling existing health bars.
export function enemyHealthScale(kind:string,seconds:number,difficulty:Difficulty){
  const minutes=Math.max(0,Math.min(8,seconds/60));
  const pace={easy:.75,normal:1,hard:1.04}[difficulty];
  if(kind==='boss'||kind==='boar'||kind==='mothQueen'){
    const final=kind==='boss';
    const weight=final ? .28+minutes*.045 : .60+minutes*.11;
    return DIFFICULTIES[difficulty].bossHealth*(1+pace*weight);
  }
  const slope=kind==='moth'?.20:kind==='slime'||kind==='beetle'?60/140:60/165;
  // Swarm moths stay lighter than plated ground enemies at every minute.
  return 1+minutes*slope*pace+minutes*minutes*(kind==='moth'?.009:.027)*pace;
}
