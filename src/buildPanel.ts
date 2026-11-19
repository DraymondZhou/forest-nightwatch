import {JOBS} from './stylesOfPlay';
import type { Combat } from './combat';
import { MASTERY_LEVEL, ABILITIES, ability, type Ability, type WeaponId } from './content';
import { activeSynergies, xpNeeded } from './model';

const decimal = (n:number, digits=1) => String(Number(n.toFixed(digits)));
const multiplier = (n:number) => '×' + decimal(n,3);

function abilityEntry(run:Combat, a:Ability) {
  const level=run.build[a.id]!;
  let record='';
  if(a.kind==='weapon'){
    const weapon=a.id as WeaponId;
    record='<p class="weapon-record">作用间隔 '+decimal(run.attackInterval(weapon),3)+' 秒　·　本局伤害 '+Math.round(run.damageByWeapon[weapon]??0)+'</p>';
  }
  return `<details class="chosen-ability"><summary>
    <span class="ability-ink" style="--ink:${a.color}" aria-hidden="true">${a.icon}</span>
    <strong>${a.name}</strong><small aria-label="等级 ${level}，上限 ${a.max}">Lv.${level} / ${a.max}</small>
    </summary><p>${a.description}</p>${record}</details>`;
}

export function buildPanel(run:Combat,time:string) {
  const owned=ABILITIES.filter(a=>(run.build[a.id]??0)>0);
  const group=(kind:Ability['kind'])=>owned.filter(a=>a.kind===kind).map(a=>abilityEntry(run,a)).join('');
  const stats=[
    ['生命',Math.ceil(run.player.hp)+' / '+run.player.maxHp],
    ['升级经验',decimal(run.xp)+' / '+xpNeeded(run.level)],
    ['攻击伤害倍率',multiplier(run.power)],
    ['攻击间隔倍率',multiplier(run.haste)],
    ['作用范围倍率',multiplier(run.reach)],
    ['步行速度',decimal(run.walkSpeed/10,2)+' 步/秒'],
    ['拾取半径',decimal(run.pickupRadius/10,2)+' 步'],
    ['经验获取倍率',multiplier(run.xpMultiplier)]
  ];
  const links=activeSynergies(run.build).map(s=>`<div class="build-link"><b>${s.name}</b>
    <small>${ability(s.a).name} ＋ ${ability(s.b).name}</small><p>${s.description}</p></div>`).join('');
  const gifts=run.flameTime>0?`<p class="flame-note">借火　伤害 +30% · 剩余 ${Math.ceil(run.flameTime)} 秒</p>`:'';
  return `<div class="run-readout"><strong>${run.character.name} · ${JOBS[run.path.job].name} · ${run.path.name}</strong><span>${run.rules.label}难度</span><span>等级 ${run.level}</span>
    <span>击败 ${run.kills}</span><time>${time}</time></div>
    <div class="build-scroll" tabindex="0" role="region" aria-label="本局构筑详情"><div class="build-columns">
      <section><h3>已选技能</h3>${group('weapon')}
      <h3>被动天赋</h3>${group('passive')||'<p class="build-empty">尚未选择被动天赋</p>'}
      </section>
      <section><h3>当前数值</h3><dl class="stat-list">${stats.map(([name,value])=>`<div><dt>${name}</dt><dd>${value}</dd></div>`).join('')}</dl>
      ${gifts}<p class="character-trait">${run.character.description.split('\n')[0]}</p><h3>${run.path.mastery.name} · ${run.masteryActive?'专精已生效':MASTERY_LEVEL+' 级开启'}</h3><p>${run.path.mastery.details}</p>${run.classTalent?`<p><b>${run.path.talent.name}</b> · ${run.path.talent.description}</p>`:''}<h3>已激活联动</h3>${links||'<p class="build-empty">暂无联动</p>'}</section>
    </div></div>`;
}
