import { describe,it,expect } from 'vitest';
import { Random,upgradeChoices,newSave,parseSave,finishRun,SaveStore,activeSynergies,type Build } from '../src/model';
import { ABILITIES } from '../src/content';
describe('upgrade and progression rules',()=>{
  it('replays random sequences from a seed',()=>{const a=new Random(123),b=new Random(123);expect(Array.from({length:30},()=>a.next())).toEqual(Array.from({length:30},()=>b.next()));});
  it('does not offer locked, duplicate or maxed abilities',()=>{for(let seed=0;seed<200;seed++){const c=upgradeChoices({spark:5},['spark','spore','leaf','ember'],new Random(seed));expect(new Set(c).size).toBe(c.length);expect(c).not.toContain('spark');expect(c).not.toContain('comet');expect(c).not.toContain('frost');}});
  it('respects four slots and handles exhausted pools',()=>{const build:Build={spark:1,spore:1,leaf:1,ember:1,power:4,haste:4,reach:4,vigor:4};for(let i=0;i<100;i++)expect(upgradeChoices(build,ABILITIES.map(a=>a.id),new Random(i)).every(id=>['spark','spore','leaf','ember'].includes(id))).toBe(true);for(const a of ABILITIES)build[a.id]=a.max;expect(upgradeChoices(build,[],new Random(1))).toEqual([]);});
  it('unlocks by outcomes without granting permanent stat bonuses',()=>{const s=newSave();finishRun(s,{character:'hazel',seconds:370,kills:310,won:true,level:20,synergy:true,seed:1});expect(s.achievements).toEqual(['first','survivor','hunter','synergy','dawn']);expect(s.wins).toEqual(['hazel']);});
  it('recognizes independently composable synergies',()=>{expect(activeSynergies({spark:1,spore:1,ember:1,leaf:1}).length).toBe(2);});
});
describe('save boundary',()=>{
  it('rejects invalid versions, Infinity and unknown identifiers',()=>{expect(()=>parseSave({...newSave(),version:2})).toThrow();expect(()=>parseSave({...newSave(),kills:Infinity})).toThrow();expect(()=>parseSave({...newSave(),wins:['bad']})).toThrow();});
  it('keeps enemy health visible on old saves and preserves an explicit off setting',()=>{
    const old=newSave();
    const {showEnemyHealth:_,showEnemyHealthNumbers:__,...legacy}=old.settings;
    expect(parseSave({...old,settings:legacy}).settings.showEnemyHealth).toBe(true);
    expect(parseSave({...old,settings:legacy}).settings.showEnemyHealthNumbers).toBe(false);
    old.settings.showEnemyHealthNumbers=true;
    old.settings.showEnemyHealth=false;
    expect(parseSave(old).settings.showEnemyHealthNumbers).toBe(true);
    expect(parseSave(JSON.parse(JSON.stringify(old))).settings.showEnemyHealth).toBe(false);
  });
  it('round-trips and clamps volume',()=>{const s=newSave();s.settings.music=8;expect(parseSave(JSON.parse(JSON.stringify(s))).settings.music).toBe(1);});
  it('recovers from corrupt storage and reports blocked writes',()=>{const store=new SaveStore({getItem:()=>'{',setItem:()=>{throw new Error('quota')}});expect(store.data.runs).toBe(0);expect(store.warning).toBeTruthy();expect(store.write()).toBe(false);});
});
