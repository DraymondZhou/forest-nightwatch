import {it,expect} from 'vitest';
import {Combat} from '../src/combat';
import {packRun,unpackRun} from '../src/checkpoint';
import {newSave,SaveStore} from '../src/model';

it('preserves projectiles, their previous hits, upgrade choices and random streams',()=>{
  const g=new Combat('sniper',27,'hard');g.spawn('brute',1030,600);
  for(let i=0;i<12;i++)g.step(1/60,{x:1,y:0});
  expect(g.shots.length).toBeGreaterThan(0);g.shots[0].hit.add(17);
  g.pendingLevels=1;g.coins=8;const offer=g.levelOptions(['ember','comet']);
  const raw=packRun(g,offer),loaded=unpackRun(raw);
  expect(loaded.offer).toEqual(offer);expect(loaded.game.shots[0].hit.has(17)).toBe(true);
  expect(packRun(loaded.game,loaded.offer)).toBe(raw);
  for(const sim of [g,loaded.game]){
    sim.resolveLevel(offer[0]);for(let i=0;i<360;i++)sim.step(1/60,{x:1,y:0});
  }
  expect(packRun(loaded.game)).toBe(packRun(g));
});

it('preserves a broken original and rejects stale writes from another tab',()=>{
  const map=new Map([['forest-nightwatch-v1','{']]);
  const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v)}};
  const a=new SaveStore(storage);expect(a.write()).toBe(false);expect(storage.getItem(a.key)).toBe('{');
  a.import(JSON.stringify(newSave()));expect(storage.getItem(a.key+'-backup')).toBe('{');
  const b=new SaveStore(storage);a.data.gold=24;expect(a.write()).toBe(true);
  expect(b.write()).toBe(false);expect(new SaveStore(storage).data.gold).toBe(24);
});

it('keeps the sixth level manual and spends at most two queued ranks',()=>{
  const g=new Combat('hazel',6);g.queueUpgrade('spark');g.level=6;g.pendingLevels=1;
  g.settleQueued();expect(g.pendingLevels).toBe(1);g.resolveLevel('power');
  g.level=8;g.pendingLevels=2;g.settleQueued();expect(g.build.spark).toBe(3);expect(g.queued).toBeUndefined();
});
