import {describe,it,expect} from 'vitest';
import {Combat,type EnemyKind} from '../src/combat';
import {type Difficulty,readDifficulty} from '../src/difficulty';
import {newSave,parseSave,type Build} from '../src/model';

function arena(seconds:number,build:Build,difficulty:Difficulty='normal'){
  const sim=new Combat('hazel',14,difficulty);
  sim.build={};
  sim.step(1/60,{x:0,y:0});
  sim.enemies=[];sim.seconds=seconds;sim.bossSpawned=true;sim.build=build;
  return sim;
}
function target(sim:Combat,kind:EnemyKind,offset:number){
  const enemy=sim.spawn(kind,sim.player.x+offset,sim.player.y)!;
  enemy.speed=0;return enemy;
}
describe('difficulty and weapon growth',()=>{
  it('defaults legacy saves to standard and remembers the chosen mode',()=>{
    const save=newSave();
    const {difficulty,...legacy}=save.settings;
    expect(difficulty).toBe('normal');
    expect(parseSave({...save,settings:legacy}).settings.difficulty).toBe('normal');
    expect(readDifficulty('unknown')).toBe('normal');
    save.settings.difficulty='hard';expect(parseSave(save).settings.difficulty).toBe('hard');
  });
  it('stages pressure after the opening with distinct late health budgets across modes',()=>{
    const modes=['easy','normal','hard'] as const;
    const late=modes.map(d=>target(arena(250,{},d),'beetle',100));
    expect(late[0].hp).toBeLessThan(late[1].hp);expect(late[1].hp).toBeLessThan(late[2].hp);
    expect(late[0].attack).toBeLessThan(late[1].attack);expect(late[1].attack).toBeLessThan(late[2].attack);
    const early=modes.map(d=>arena(10,{},d).spawn('beetle',100,100)!);
    expect(early[1].attack).toBe(early[2].attack);
    expect(early[1].speed).toBe(early[2].speed);
  });
  it('increases each later wave without refilling an injured enemy; both mini-bosses outlast the elite of their wave',()=>{
    for(const mode of ['easy','normal','hard'] as const){
      const s=arena(0,{},mode),wounded=target(s,'beetle',100);wounded.hp=10;
      for(const kind of ['moth','slime','twig','spitter','beetle','brute','crystal','boar','mothQueen','boss'] as const){
        const values=[0,60,120,180,240,300,360,420].map(t=>{s.seconds=t;return target(s,kind,200).maxHp;});
        expect(values.every((hp,i)=>i===0||hp>values[i-1])).toBe(true);
      }
      s.seconds=180;expect(Math.min(target(s,'boar',100).maxHp,target(s,'mothQueen',100).maxHp)).toBeGreaterThan(target(s,'brute',100).maxHp);
      expect(wounded.hp).toBe(10);
    }
  });
  for(const [seconds,level,power,expected] of [[0,1,0,[1,2,4]],[180,3,2,[1,2,5]],[360,5,4,[1,2,6]]] as const){
    it('keeps distinct single-target breakpoints at '+seconds+' seconds',()=>{
      const hits=(['moth','slime','beetle'] as const).map(kind=>{
        const sim=arena(seconds,{spark:level,power});
        const e=target(sim,kind,100);
        sim.step(1/60,{x:0,y:0});
        const damage=sim.damageByWeapon.spark!;
        return Math.ceil(e.maxHp/damage);
      });
      expect(hits).toEqual(expected);
    });
  }
  it('lets a ranked arc clear light targets while an armored neighbor survives the chain',()=>{
    const sim=arena(360,{spark:5,power:4,haste:4});
    const moth=target(sim,'moth',90),beetle=target(sim,'beetle',120);
    sim.step(1/60,{x:0,y:0});
    expect(moth.hp).toBeLessThanOrEqual(0);expect(beetle.hp).toBeLessThan(beetle.maxHp);
    expect(beetle.maxHp-beetle.hp).toBeCloseTo(15*1.94*1.4*.48);
    expect(sim.attackInterval('spark')).toBeCloseTo(.76);
  });
  it('reduces fire splash towards the edge and keeps full burn on the direct target',()=>{
    const sim=arena(180,{});
    const direct=target(sim,'beetle',110),near=target(sim,'beetle',134),far=target(sim,'beetle',164);
    sim.shots.push({id:5000,weapon:'ember',x:direct.x,y:direct.y,vx:0,vy:0,life:1,radius:1,damage:40,pierce:1,hit:new Set()});
    sim.step(1/60,{x:0,y:0});
    expect(direct.maxHp-direct.hp).toBeCloseTo(40);
    expect(near.maxHp-near.hp).toBeGreaterThan(far.maxHp-far.hp);
    expect(far.hp).toBeLessThan(far.maxHp);
    expect([direct.burn,near.burn,far.burn]).toEqual([3,1.5,1.5]);
  });
});
