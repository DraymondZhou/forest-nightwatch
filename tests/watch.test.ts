import {describe,it,expect} from 'vitest';
import {Combat, RITUAL_TIME} from '../src/combat';

const idle={x:0,y:0},dt=1/60;
function practice(){
  const sim=new Combat('hazel',974);
  sim.build={};
  return sim;
}

describe('wounds and leaf step',()=>{
  it('emits the source of a real hit once through the recovery window',()=>{
    const sim=practice(),p=sim.player, start=p.hp;
    sim.spawn('beetle',p.x+5,p.y);
    sim.step(dt,idle);
    const wound=sim.effects.find(e=>e.kind==='wound')!;
    expect(wound.tx).toBeGreaterThan(p.x);
    expect(p.hp).toBeLessThan(start);
    const hp=p.hp;
    sim.step(dt,idle);
    expect(p.hp).toBe(hp);expect(sim.effects.some(e=>e.kind==='wound')).toBe(false);
  });
  it('locks the dash direction, awards one near miss, and rejects a second use on cooldown',()=>{
    const sim=practice(),p=sim.player,start=p.x;
    sim.spawn('beetle',p.x+16,p.y);
    sim.step(dt,{x:1,y:0,dash:true});
    expect(p.hp).toBe(p.maxHp);expect(sim.dodges).toBe(1);
    expect(sim.effects.some(e=>e.kind==='evade')).toBe(true);
    const cooldown=sim.dashCooldown;
    for(let i=0;i<8;i++)sim.step(dt,{x:-1,y:0,dash:true});
    expect(sim.dodges).toBe(1);expect(p.x).toBeGreaterThan(start+60);
    expect(sim.dashCooldown).toBeLessThan(cooldown);
  });
  it('evades incoming projectiles and uses their velocity for the side of a later wound',()=>{
    const sim=practice(),p=sim.player;
    const arrow=()=>({id:101,x:p.x+4,y:p.y,vx:-150,vy:0,life:1,radius:8,damage:8,weapon:'enemy' as const,pierce:1,hit:new Set<number>()});
    sim.shots.push(arrow());sim.step(dt,{x:1,y:0,dash:true});
    expect(sim.dodges).toBe(1);expect(p.hp).toBe(100);
    for(let i=0;i<18;i++)sim.step(dt,idle);
    sim.shots.push(arrow());sim.step(dt,idle);
    expect(p.hp).toBe(92);expect(sim.effects.find(e=>e.kind==='wound')!.tx).toBeGreaterThan(p.x);
  });
});

describe('optional watch lamps',()=>{
  function atLamp(){
    const sim=practice();sim.seconds=89.999;sim.step(dt,idle);
    const lamp=sim.shrine!;
    sim.player.x=lamp.x;sim.player.y=lamp.y;
    return sim;
  }
  it('retains charge on leaving, pauses the clock for a gift and grants it once',()=>{
    const sim=atLamp(),lamp=sim.shrine!;
    sim.step(.05,idle);sim.player.x+=90;sim.step(.05,idle);
    expect(lamp.charge).toBeCloseTo(.05);
    sim.player.x=lamp.x;lamp.charge=RITUAL_TIME-.01;sim.step(dt,idle);
    expect(sim.shrinesLit).toBe(1);expect(sim.giftPending).toBe(true);
    const clock=sim.seconds;sim.step(.05,{x:1,y:0,dash:true});expect(sim.seconds).toBe(clock);
    sim.player.hp=34;sim.takeGift('spring');sim.takeGift('spring');expect(sim.player.hp).toBe(64);
  });
  it('expires an ignored lamp and ends its damage blessing on simulation time',()=>{
    const sim=atLamp();sim.seconds=sim.shrine!.expires;sim.step(dt,idle);expect(sim.shrine).toBeUndefined();
    sim.seconds=225;sim.step(dt,idle);
    sim.player.x=sim.shrine!.x;sim.player.y=sim.shrine!.y;sim.shrine!.charge=RITUAL_TIME;
    sim.step(dt,idle);sim.takeGift('flame');expect(sim.power).toBeCloseTo(1.3);
    sim.flameTime=.01;sim.step(dt,idle);expect(sim.power).toBe(1);
  });
  it('resolves a lethal hit ahead of a nearly completed lamp',()=>{
    const sim=atLamp();sim.shrine!.charge=RITUAL_TIME-.001;sim.player.hp=1;
    sim.spawn('beetle',sim.player.x,sim.player.y);sim.step(dt,idle);
    expect(sim.ended).toBe(true);expect(sim.giftPending).toBe(false);
  });
});

describe('elemental identities',()=>{
  it('converts unused lightning jumps to a smaller solitary-target hit',()=>{
    const sim=practice();sim.build={spark:1};
    const target=sim.spawn('brute',sim.player.x+60,sim.player.y)!;
    sim.step(dt,idle);
    expect(target.maxHp-target.hp).toBeCloseTo(18+2*1.5);
  });
  it('crystallizes an already chilled enemy on the second wave',()=>{
    const sim=practice();sim.build={frost:1};
    const target=sim.spawn('brute',sim.player.x+65,sim.player.y)!;
    target.speed=0;
    sim.step(dt,idle);expect(target.slow).toBeGreaterThan(0);expect(target.frozen).toBe(0);
    for(let f=0;f<130;f++)sim.step(dt,idle);
    expect(target.frozen).toBeGreaterThan(0);
  });
});
