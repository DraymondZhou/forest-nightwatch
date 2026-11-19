import {describe,it,expect} from 'vitest';
import {Combat} from '../src/combat';
import {RELICS,relicsFor,type RelicId} from '../src/relics';
import {newSave,parseSave} from '../src/model';
const idle={x:0,y:0},deck=['spark','leaf','spore','ember'];
function arena(id:RelicId){
  const job=RELICS[id].job;
  const s=new Combat(job==='mage'?'hazel':job==='hunter'?'sniper':'breaker',34);
  const build=s.build;s.build={};s.step(.01,idle);s.enemies=[];s.build=build;
  s.relicPending=true;expect(s.takeRelic(id)).toBe(true);return s;
}
describe('one binding per miniboss victory',()=>{
  it('pauses, validates class and never replaces a claimed relic',()=>{
    const s=new Combat('sniper',41);s.spawn('boar',0,0)!.hp=0;s.step(.016,idle);
    expect(s.relicPending).toBe(true);const t=s.seconds;s.step(.05,idle);expect(s.seconds).toBe(t);
    expect(s.takeRelic('waywick')).toBe(false);expect(s.takeRelic('longfeather')).toBe(true);
    expect(s.takeRelic('quicknock')).toBe(false);
    expect(relicsFor('hunter')).toEqual(['longfeather','quicknock']);
  });
  it('distinguishes standing focus from leaving fire on a dash',()=>{
    const still=arena('stillglass');for(let i=0;i<21;i++)still.step(.05,idle);
    expect(still.power).toBe(1.25);still.step(.02,{x:1,y:0});expect(still.power).toBe(1);
    const wick=arena('waywick');wick.build={};const p={...wick.player};
    const foe=wick.spawn('beetle',p.x-15,p.y)!;wick.step(.05,{x:1,y:0,dash:true});
    const z=wick.zones.find(z=>z.kind==='ember')!;expect(z.x).toBe(p.x);expect(foe.hp).toBeLessThan(foe.maxHp);
  });
  it('changes a blade strike depending on how many enemies are in its arc',()=>{
    function cut(id:RelicId,count:number){const s=arena(id);const enemies=Array.from({length:count},(_,i)=>s.spawn('brute',s.player.x+75+i,s.player.y)!);s.step(.016,idle);return enemies;}
    const single=cut('whetstone',1)[0],pack=cut('whetstone',3)[0];expect(single.maxHp-single.hp).toBeCloseTo((pack.maxHp-pack.hp)*1.25);
    expect(cut('briar',3).every(e=>e.slow===1)).toBe(true);expect(cut('briar',1)[0].slow).toBe(0);
  });
  it('rewards distance or refunds the bow interval once per successful dash',()=>{
    function shot(distance:number){const s=arena('longfeather');s.spawn('brute',s.player.x+distance,s.player.y);s.step(.016,idle);return s.shots.find(sh=>sh.weapon==='bow')!;}
    // Initial waves may include nearer targets. Start the fixed targets alone.
    const s=arena('quicknock');s.spawn('brute',s.player.x+70,s.player.y);s.step(.016,idle);
    s.step(.016,{x:1,y:0,dash:true});expect(s.shots.filter(x=>x.weapon==='bow')).toHaveLength(2);
    s.step(.016,{x:1,y:0,dash:true});expect(s.shots.filter(x=>x.weapon==='bow')).toHaveLength(2);
    const near=shot(80),far=shot(250);expect(far.pierce).toBe(near.pierce+1);expect(far.damage).toBeCloseTo(near.damage*1.15);
  });
  it('rerolls once without spending a level, and retains the mastery choice',()=>{
    const s=new Combat('hazel',77);s.level=9;s.pendingLevels=1;
    const old=s.levelOptions(deck),next=s.reroll(deck,old)!;expect(next).toContain('mastery');
    expect(next.filter(x=>x!=='mastery').every(x=>!old.includes(x))).toBe(true);
    expect(s.pendingLevels).toBe(1);expect(s.reroll(deck,next)).toBeUndefined();
    s.resolveLevel('mastery');expect(s.classTalent).toBe(true);
  });
  it('attributes lethal damage to the attack that landed rather than the nearest enemy',()=>{
    const s=new Combat('guard',3);s.build={};s.player.hp=1;
    s.shots.push({id:99,x:s.player.x,y:s.player.y,vx:0,vy:0,life:1,radius:5,weapon:'enemy',missile:'shard',damage:20,pierce:1,hit:new Set()});
    s.step(.016,idle);expect(s.fatal).toEqual({kind:'shard',damage:16});
  });
  it('keeps discovery across save import but does not equip it on the next run',()=>{
    const old=newSave();expect(parseSave({...old,relics:undefined}).relics).toEqual([]);
    expect(parseSave({...old,relics:['waywick','waywick']}).relics).toEqual(['waywick']);
    expect(()=>parseSave({...old,relics:['bad']})).toThrow();expect(new Combat('ash',1).relic).toBeUndefined();
  });
});
