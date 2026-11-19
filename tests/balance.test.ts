import { describe, it, expect } from 'vitest';
import { Combat } from '../src/combat';
import { upgradeChoices } from '../src/model';
import type { WeaponId } from '../src/content';

describe('combat balance fixtures', () => {
  for (const weapon of ['spark','spore','leaf','ember','frost','comet'] as WeaponId[]) {
    it(weapon + ' contributes without a synergy partner', () => {
      const sim = new Combat('hazel', 42);
      sim.build = { [weapon]: 1 };
      sim.spawn('beetle', sim.player.x + 60, sim.player.y);
      for (let frame=0; frame<180; frame++) sim.step(1/60,{x:0,y:0});
      expect(sim.damageByWeapon[weapon]).toBeGreaterThan(0);
    });
  }
  it('wins through the normal boss-death path and survives repeated new sessions', () => {
    for(let i=0;i<3;i++){
      const sim=new Combat('hazel',i);
      sim.seconds=360;sim.step(1/60,{x:0,y:0});
      const guardian=sim.boss!;
      guardian.x=sim.player.x+60;guardian.y=sim.player.y;guardian.hp=10;
      for(let f=0;f<120&&!sim.ended;f++)sim.step(1/60,{x:0,y:0});
      expect(sim.summary().won).toBe(true);
    }
  });
  it('exercises complete runs with ordinary experience, choices, damage and timers', () => {
    const results=[];
    for(const seed of [12,34,56,78,90,111]){
      const sim=new Combat('hazel',seed);
      for(let f=0;f<30000&&!sim.ended;f++){
        const a=sim.seconds*.30;
        const tx=(sim.boss?.x??900)+(sim.boss?150:470)*Math.cos(a), ty=(sim.boss?.y??600)+(sim.boss?130:300)*Math.sin(a);
        const dx=tx-sim.player.x,dy=ty-sim.player.y,d=Math.max(1,Math.hypot(dx,dy));
        let moveX=dx/d,moveY=dy/d;
        for(const enemy of sim.enemies){
          const awayX=sim.player.x-enemy.x,awayY=sim.player.y-enemy.y;
          const distance=Math.max(1,Math.hypot(awayX,awayY));
          const urgency=Math.max(0,1-(distance-enemy.radius)/75)*2;
          moveX+=urgency*awayX/distance;
          moveY+=urgency*awayY/distance;
        }
        sim.step(1/60,{x:moveX,y:moveY});
        if(sim.relicPending)sim.takeRelic(sim.path.job==='mage'?'waywick':sim.path.job==='warden'?'whetstone':'longfeather');
    while(sim.pendingLevels){
          const choices=upgradeChoices(sim.build,['spark','spore','leaf','ember'],sim.rng);
          const priority=['spark','spore','ember','power','leaf','haste','reach','vigor'];
          const rank=(key:string)=>priority.includes(key)?priority.indexOf(key):20;
          sim.resolveLevel(choices.sort((a,b)=>rank(a)-rank(b))[0]);
        }
      }
      expect(sim.ended).toBe(true);expect(sim.level).toBeGreaterThan(2);
      results.push([seed,Math.floor(sim.seconds),sim.level,sim.kills,sim.won]);
    }
    expect(results.some(row=>row[4]===true)).toBe(true);
    console.info('seed, seconds, level, kills, victory', results);
  },30000);
});
