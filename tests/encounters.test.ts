import {describe,it,expect} from 'vitest';
import {Combat} from '../src/combat';
const idle={x:0,y:0};
function arena(seed=8){const s=new Combat('volley',seed);s.build={};return s;}
function ticks(s:Combat,n:number){for(let i=0;i<n;i++)s.step(1/60,idle);}
describe('forest encounters',()=>{
  it.each([0,8])('alternates charge lanes and staggered volleys for seed %i',seed=>{
    const s=new Combat('volley',seed,'hard');s.build={};
    for(const [second,count] of [[135,3],[285,4]]){
      s.miniSpawned=true;s.enemies=[];s.zones=[];s.seconds=second-.01;
      ticks(s,1);
      if(s.waveHint.startsWith('甲虫')){
        const lanes=s.zones.filter(z=>z.shape==='lane');expect(lanes).toHaveLength(count);
        expect(new Set(lanes.map(z=>z.angle)).size).toBe(1);
        expect(lanes.every(z=>z.life>1)).toBe(true);
      }else{
        expect(s.waveHint).toContain('树脂');
        const shooters=s.enemies.filter(e=>e.kind==='spitter');
        expect(shooters).toHaveLength(count);
        expect(shooters[1].clock-shooters[0].clock).toBeCloseTo(.23);
      }
      expect(s.waveHint.startsWith('甲虫')).toBe((seed===0)===(second===135));
    }
  });
  it('skips the second formation while a miniboss is alive',()=>{
    const s=arena();s.spawn('mothQueen');s.seconds=284.99;s.miniSpawned=true;
    ticks(s,2);expect(s.waveHint).toBe('');expect(s.zones).toHaveLength(0);
  });
  it.each([[8,'boar'],[9,'mothQueen']] as const)('spawns one miniboss for seed %i and keeps its death distinct from victory',(seed,kind)=>{
    const s=arena(seed);s.seconds=179.99;ticks(s,2);expect(s.enemies.filter(e=>e.kind===kind)).toHaveLength(1);
    s.seconds=359.99;ticks(s,2);expect(s.enemies.filter(e=>e.kind===kind)).toHaveLength(1);expect(s.boss?.kind).toBe('boss');
    s.enemies.find(e=>e.kind===kind)!.hp=0;ticks(s,1);expect(s.ended).toBe(false);
  });
  it.each([false,true])('locks a charge direction so a sidestep avoids the hit: %s',(sidestep)=>{
    const s=arena(),p=s.player,e=s.spawn('beetle',p.x-80,p.y)!;e.clock=0;ticks(s,1);expect(s.zones[0]?.shape).toBe('lane');
    expect(p.hp).toBe(p.maxHp);if(sidestep)p.y+=45;ticks(s,60);expect(p.hp<p.maxHp).toBe(!sidestep);
  });
  it.each([[0,false],[90,true],[140,false]] as const)('matches moth ring damage at radius %i',(offset,hits)=>{
    const s=arena(),p=s.player,e=s.spawn('mothQueen',p.x-175,p.y)!;e.clock=0;ticks(s,1);expect(s.zones[0]?.shape).toBe('ring');
    p.y+=offset;ticks(s,68);expect(p.hp<p.maxHp).toBe(hits);
  });
  it('separates the opening stomp from the volley and gives the player a punish window',()=>{
    const s=arena(),p=s.player,e=s.spawn('boss',p.x-190,p.y)!;e.clock=0;ticks(s,1);
    expect(s.zones[0]?.shape).toBe('disk');expect(s.shots).toHaveLength(0);
    p.y+=160;ticks(s,80);expect(e.recovery).toBeGreaterThan(0);
    p.x=e.x;p.y=e.y;ticks(s,5);expect(p.hp).toBe(p.maxHp);
    ticks(s,80);expect(p.hp).toBeLessThan(p.maxHp);
  });
  it('sheds one collectible healing berry at half health even after further damage',()=>{
    const s=arena(),p=s.player,e=s.spawn('boss',p.x-250,p.y)!;e.hp=e.maxHp*.49;
    ticks(s,1);e.hp-=50;ticks(s,3);
    const berries=s.drops.filter(d=>d.kind==='heal');expect(berries).toHaveLength(1);
    p.hp=30;p.x=berries[0].x;p.y=berries[0].y;ticks(s,1);expect(p.hp).toBe(58);
  });
  it('fires sap globules, crystal fans, moth dust and radial tree seeds',()=>{
    for(const [kind,missile,count] of [['spitter','sap',1],['crystal','shard',3],['mothQueen','dust',5],['boss','seed',8]] as const){
      const s=arena(),p=s.player,e=s.spawn(kind,p.x-190,p.y)!;e.clock=0;e.pattern=1;ticks(s,1);
      expect(s.shots.filter(h=>h.missile===missile)).toHaveLength(count);
    }
  });
});
