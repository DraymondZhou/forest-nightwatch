import {describe,it,expect} from 'vitest';
import {Combat} from '../src/combat';
import {coinValue,train} from '../src/camp';
import {newSave,parseSave} from '../src/model';
describe('permanent camp progression',()=>{
  it('adds a zero purse to legacy saves without overwriting their records',()=>{
    const {gold,training,...old}=newSave();old.runs=17;
    expect(parseSave(old)).toMatchObject({runs:17,gold:0,training:{health:0,speed:0}});
    expect(()=>parseSave({...old,training:{health:8,speed:0}})).toThrow();
  });
  it('charges exactly once per rank and inherits upgrades across jobs after reload',()=>{
    const p=newSave();p.gold=24;expect(train(p,'health')).toBe(true);expect(train(p,'health')).toBe(false);expect(train(p,'speed')).toBe(true);
    const saved=parseSave(JSON.parse(JSON.stringify(p)));
    for(const path of ['hazel','guard','volley'] as const){
      const fresh=new Combat(path,1,'normal'),trained=new Combat(path,1,'normal',saved.training);
      expect([fresh.player.maxHp,fresh.walkSpeed]).toEqual([100,185]);
      expect([trained.player.maxHp,trained.walkSpeed]).toEqual([108,190]);
    }
    p.gold=900;while(train(p,'health')){}const balance=p.gold;expect(train(p,'health')).toBe(false);expect(p.gold).toBe(balance);
  });
  it('distinguishes ordinary, elite and boss rewards at the same roll',()=>{
    expect(['slime','brute','boar','mothQueen','boss'].map(k=>coinValue(k,.4))).toEqual([0,3,12,12,25]);
    expect(coinValue('moth',.1)).toBe(1);expect(coinValue('crystal',.7)).toBe(0);
  });
  it('collects a miniboss coin pile once and banks the final reward before victory',()=>{
    const s=new Combat('hazel',7),p=s.player;s.build={};
    const e=s.spawn('boar',p.x+190,p.y)!;e.hp=0;s.step(.016,{x:0,y:0});
    const coin=s.drops.find(d=>d.kind==='coin')!;expect(coin.value).toBe(12);expect(s.coins).toBe(0);
    p.x=coin.x;p.y=coin.y;s.step(.016,{x:0,y:0});expect(s.coins).toBe(12);
    s.pendingLevels=0;s.spawn('boss',p.x+350,p.y)!.hp=0;s.step(.016,{x:0,y:0});s.step(.016,{x:0,y:0});expect(s.won).toBe(true);expect(s.coins).toBe(37);
  });
});
