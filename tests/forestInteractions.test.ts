import {describe,it,expect} from 'vitest';
import {Combat,type Enemy,type Zone} from '../src/combat';
import {packRun,unpackRun} from '../src/checkpoint';
import type {PathId} from '../src/stylesOfPlay';

const idle={x:0,y:0};
function arena(path:PathId){
  const game=new Combat(path,27);Object.assign(game,{spawnClock:100,eliteClock:100});
  return game;
}
describe('forest combat interactions',()=>{
  it.each(['guard','breaker','sniper','volley','hazel','fern','ash'] as const)('%s holds a ready attack until a target appears',path=>{
    const s=arena(path);s.step(1/60,idle);s.spawn('slime',s.player.x+55,s.player.y);
    s.step(1/60,idle);expect(s.effects.some(e=>e.kind==='cast')).toBe(true);
    s.step(1/60,idle);expect(s.effects.some(e=>e.kind==='cast')).toBe(false);
  });
  it('only the ancient tree stomp cracks living beetles inside the impact',()=>{
    const s=arena('hazel');s.build={};const p=s.player;
    const owner=s.spawn('boss',p.x+240,p.y)!;
    const near=s.spawn('beetle',p.x,p.y)!,far=s.spawn('beetle',p.x+170,p.y)!;
    const stomp:Zone={id:100,kind:'warning',shape:'disk',owner:owner.id,x:p.x,y:p.y,radius:80,life:.001,damage:1,timer:0,tick:0};
    s.zones.push({...stomp});s.step(1/60,idle);expect(near.shellBroken).toBe(true);
    expect(near.hp).toBeCloseTo(near.maxHp*.7);expect(far.shellBroken).toBeFalsy();
    s.zones.push({...stomp});s.step(1/60,idle);expect(near.hp).toBeCloseTo(near.maxHp*.7);
    expect(unpackRun(packRun(s)).game.enemies.find(e=>e.id===near.id)?.shellBroken).toBe(true);
  });
  it('draws nearby moths towards a lit lamp and releases them after six seconds',()=>{
    const s=arena('fern');s.build={};const p=s.player;
    s.shrine={x:p.x,y:p.y,charge:3.2,expires:40};s.step(1/60,idle);s.takeGift('spring');
    const x=p.x;p.x+=250;
    const moth=s.spawn('moth',x+90,p.y)!,twig=s.spawn('twig',x+90,p.y)!;
    const before=(e:Enemy)=>e.x-(x+90);
    s.step(.05,idle);expect(before(moth)).toBeLessThan(0);expect(before(twig)).toBeGreaterThan(0);
    s.seconds=6.2;const last=moth.x;s.step(.05,idle);expect(s.lampGlow).toBeUndefined();expect(moth.x).toBeGreaterThan(last);
  });
});
