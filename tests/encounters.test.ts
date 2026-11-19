import {describe,it,expect} from 'vitest';
import {Combat} from '../src/combat';
const idle={x:0,y:0};
function arena(seed=8){const s=new Combat('volley',seed);s.build={};return s;}
function ticks(s:Combat,n:number){for(let i=0;i<n;i++)s.step(1/60,idle);}
describe('forest encounters',()=>{
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
  it('fires sap globules, crystal fans, moth dust and radial tree seeds',()=>{
    for(const [kind,missile,count] of [['spitter','sap',1],['crystal','shard',3],['mothQueen','dust',5],['boss','seed',8]] as const){
      const s=arena(),p=s.player,e=s.spawn(kind,p.x-190,p.y)!;e.clock=0;e.pattern=1;ticks(s,1);
      expect(s.shots.filter(h=>h.missile===missile)).toHaveLength(count);
    }
  });
});
