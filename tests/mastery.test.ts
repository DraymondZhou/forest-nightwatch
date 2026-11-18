import {describe,it,expect} from 'vitest';
import {Combat,type EnemyKind} from '../src/combat';
import type {CharacterId} from '../src/content';

const idle={x:0,y:0};
function arena(character:CharacterId,level=9){
  const s=new Combat(character,41,'hard');
  s.build={};s.step(1/60,idle);s.enemies=[];s.level=level;
  return s;
}
function target(s:Combat,kind:EnemyKind,x:number,y=0){
  const e=s.spawn(kind,s.player.x+x,s.player.y+y)!;
  e.speed=0;e.hp=e.maxHp=1000;return e;
}
describe('class specializations',()=>{
  it('offers the exclusive card on earned levels and spends exactly one choice',()=>{
    const s=arena('fern',10);s.pendingLevels=3;
    const deck=['spark','spore','ember','leaf'];
    expect(s.levelOptions(deck)).not.toContain('mastery');s.resolveLevel('mastery');
    expect(s.pendingLevels).toBe(3);s.resolveLevel('spore');
    expect(s.levelOptions(deck)).toContain('mastery');s.resolveLevel('mastery');
    expect(s.pendingLevels).toBe(1);expect(s.classTalent).toBe(true);
    s.level=12;s.pendingLevels=1;expect(s.levelOptions(deck)).not.toContain('mastery');
    expect(arena('fern',1).classTalent).toBe(false);
  });
  it('charges from actual travel, keeps the charge without a target, and targets an elite with the talent',()=>{
    const s=arena('hazel',5);
    s.step(.05,{x:1,y:0});expect(s.stormCharge).toBe(0);
    s.level=9;s.pendingLevels=1;s.resolveLevel('mastery');
    for(let i=0;i<36;i++)s.step(.05,{x:1,y:0});
    expect(s.stormCharge).toBe(1);s.enemies=[];s.step(.05,idle);expect(s.stormCharge).toBe(1);
    s.build={spark:1};
    target(s,'slime',70);const elite=target(s,'brute',275);
    s.step(1/60,idle);
    const first=s.effects.find(e=>e.kind==='chain');
    expect(first?.empowered).toBe(true);expect(first?.tx).toBe(elite.x);
    expect(s.stormCharge).toBe(0);expect(elite.hp).toBeLessThan(elite.maxHp-35);
  });
  it('only Fern can bloom a mature occupied field, once, with limited boss control',()=>{
    for(const id of ['hazel','fern','ash'] as const){
      const s=arena(id);s.classTalent=true;s.player.hp=50;
      const e=target(s,'twig',40),boss=target(s,'boss',94);
      const z={id:90,x:s.player.x+200,y:s.player.y,radius:75,timer:1.1,life:3,tick:2,damage:16,kind:'spore' as const,bloomed:false};
      s.zones.push(z);s.step(1/60,idle);expect(z.bloomed).toBe(false);
      z.x=s.player.x;s.step(1/60,idle);
      expect(z.bloomed).toBe(id==='fern');expect(e.rooted>0).toBe(id==='fern');
      expect(boss.rooted).toBe(0);expect(boss.slow>0).toBe(id==='fern');
      expect(s.player.hp).toBe(id==='fern'?53:50);
      s.step(1/60,idle);expect(s.effects.some(f=>f.kind==='bloom')).toBe(false);
    }
  });
  it('fires along the dash heading and refunds once when the lance crosses two targets',()=>{
    const s=arena('ash');s.classTalent=true;
    const line=[150,185,225,265].map(x=>target(s,'beetle',x));
    s.step(1/60,{x:1,y:0,dash:true});
    expect(s.shots.find(p=>p.lance)?.vx).toBeGreaterThan(0);
    for(let i=0;i<34;i++)s.step(1/60,idle);
    expect(line.map(e=>e.hp<e.maxHp)).toEqual([true,true,true,false]);
    expect(s.dashCooldown).toBeCloseTo(4.2-1-34/60);
    expect(s.shots.some(p=>p.lance)).toBe(false);
    for(const id of ['hazel','fern'] as const){
      const other=arena(id);other.step(1/60,{x:1,y:0,dash:true});
      expect(other.shots.some(p=>p.lance)).toBe(false);
    }
  });
});
