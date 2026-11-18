import {describe,it,expect} from 'vitest';
import {Combat} from '../src/combat';
describe('battle simulation',()=>{
 it('normalizes diagonal movement and crosses the former world edges',()=>{const a=new Combat('hazel',1),b=new Combat('hazel',1);a.step(1/60,{x:1,y:0});b.step(1/60,{x:1,y:1});expect(Math.hypot(a.player.x-900,a.player.y-600)).toBeCloseTo(Math.hypot(b.player.x-900,b.player.y-600));a.player.x=-5000;a.player.y=9000;a.step(1/60,{x:-1,y:1});expect(a.player.x).toBeLessThan(-5000);expect(a.player.y).toBeGreaterThan(9000);const enemy=a.spawn('slime')!;expect(Math.hypot(enemy.x-a.player.x,enemy.y-a.player.y)).toBeLessThan(501);});
 it('keeps projectiles, pursuit and drops working in negative world space',()=>{
   const battle=new Combat('ash',15);
   battle.player.x=-20000; battle.player.y=-30000;
   const target=battle.spawn('beetle',battle.player.x+130,battle.player.y)!;
   for(let i=0;i<45;i++)battle.step(1/60,{x:0,y:0});
   expect(target.hp).toBeLessThan(target.maxHp);
   expect(target.x).toBeLessThan(-19870);
   battle.spawn('slime',10,10);
   battle.step(1/60,{x:0,y:0});
   expect(battle.enemies.every(e=>e.x<0)).toBe(true);
 });
 it('does not advance while an upgrade is pending',()=>{const b=new Combat('hazel',3);b.pendingLevels=1;b.step(1/60,{x:1,y:0});expect(b.seconds).toBe(0);b.resolveLevel('leaf');b.step(1/60,{x:0,y:0});expect(b.seconds).toBeGreaterThan(0);expect(b.build.leaf).toBe(1);});
 it('spawns a boss once and expires a run',()=>{const b=new Combat('hazel',1);b.seconds=359.99;b.step(.02,{x:0,y:0});expect(b.enemies.filter(e=>e.kind==='boss')).toHaveLength(1);b.seconds=479.99;b.step(.02,{x:0,y:0});expect(b.ended).toBe(true);expect(b.won).toBe(false);});
 it('keeps dense multi-skill combat bounded and finite',()=>{const b=new Combat('hazel',43);b.build={spark:5,spore:5,leaf:5,ember:5,haste:4,power:4};b.player.hp=b.player.maxHp=100000;for(let i=0;i<120;i++)b.spawn('slime',820+i%12*14,500+Math.floor(i/12)*14);for(let t=0;t<3600;t++){b.pendingLevels=0;b.step(1/60,{x:Math.cos(t/100),y:Math.sin(t/100)});}expect(b.kills).toBeGreaterThan(50);expect(b.shots.length).toBeLessThanOrEqual(280);expect(b.zones.length).toBeLessThanOrEqual(45);expect(Number.isFinite(b.player.hp)).toBe(true);expect(Object.values(b.damageByWeapon).every(Number.isFinite)).toBe(true);});
});
