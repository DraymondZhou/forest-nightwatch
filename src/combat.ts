import type {AttackNote} from './attackNotes';
import {RELICS,type RelicId} from './relics';
import {freshRanks,maxHealth,walkSpeed,coinValue,type Ranks} from './camp';
import {PATHS,type PathId} from './stylesOfPlay';
import { MASTERY_LEVEL, ABILITIES, type UpgradeId, type WeaponId } from './content';
import { upgradePool,upgradeChoices, Random, xpNeeded, activeSynergies, type Build, type RunSummary } from './model';


import { enemyHealthScale,latePressure,DIFFICULTIES,rampDifficulty,type Difficulty } from './difficulty';
import { ATTACK_POSE_TIME } from './enemyPose';

export type EnemyKind='slime'|'moth'|'twig'|'spitter'|'beetle'|'brute'|'crystal'|'boss'|'boar'|'mothQueen';
export interface Enemy {id:number;kind:EnemyKind;x:number;y:number;hp:number;maxHp:number;radius:number;speed:number;attack:number;phase:number;clock:number;slow:number;frozen:number;rooted:number;burn:number;burnClock:number;spore:number;proc:number;flash:number;hitAngle:number;gait:number;attackPose:number; charge?:{angle:number;remaining:number}; preparing?:number; windupTime?:number; attackHeading?:number; pattern?:number; recovery?:number}
export const isChief=(kind:EnemyKind)=>kind==='boss'||kind==='boar'||kind==='mothQueen';
export const chiefName=(kind:EnemyKind)=>kind==='boar'?'棘冠山主':kind==='mothQueen'?'月绒蛾后':'古树守卫';
export interface Shot {id:number;x:number;y:number;vx:number;vy:number;life:number;radius:number;damage:number;weapon:WeaponId|'enemy';pierce:number;lance?:boolean; missile?:'sap'|'shard'|'seed'|'dust'; aimed?:boolean;hit:Set<number>}
export interface Zone {id:number;x:number;y:number;radius:number;life:number;tick:number;damage:number;kind:'spore'|'ember'|'warning';timer:number;bloomed?:boolean; shape?:'disk'|'ring'|'lane'|'cleave'; angle?:number; owner?:number; duration?:number}
export interface Drop {id:number;x:number;y:number;value:number;born:number;kind:'xp'|'heal'|'coin'}
export interface Effect {kind:'impactZone'|'slash'|'bloom'|'wound'|'dash'|'evade'|'defeat'|'gather'|'strike'|'cast'|'hit'|'chain'|'burst'|'frost'|'heal'|'level'|'synergy';x:number;y:number;enemyKind?:EnemyKind;weapon?:WeaponId;tx?:number;ty?:number;radius?:number;color?:number;text?:string;shape?:Zone['shape'];arcSeed?:number;hop?:number;empowered?:boolean}
export interface Controls {x:number;y:number;dash?:boolean}
export interface Shrine {x:number;y:number;charge:number;expires:number}
export type ShrineGift = 'spring' | 'flame';
export const RITUAL_TIME = 3.2;
const DASH_TIME = .2;
// Later ranks still unlock jumps, extra projectiles or area. Raw damage grows more slowly.
const SPELL_DAMAGE=[0,1,1.30,1.55,1.76,1.94];
const CAST_INTERVAL=[1,.93,.875,.83,.80];
const BASE_INTERVAL:Record<WeaponId,number>={spark:.95,spore:2.4,ember:1.05,frost:2.1,comet:1.2,leaf:.4,blade:.67,bow:.76};
const distance2=(a:{x:number;y:number},b:{x:number;y:number})=>(a.x-b.x)**2+(a.y-b.y)**2;
const ENEMY_STATS:Record<EnemyKind,[number,number,number,number]>={slime:[22,48,17,9],moth:[16,86,13,7],twig:[30,105,15,10],spitter:[36,40,19,9],beetle:[74,42,24,13],brute:[440,52,38,18],crystal:[300,65,30,16],boar:[820,59,37,15],mothQueen:[670,61,32,13],boss:[5100,34,62,21]};

export class Combat {
  readonly loot:Random; coins=0; readonly rng:Random; readonly seed:number;
  player={x:900,y:600,hp:100,maxHp:100,invincible:0,angle:0,moving:false};
  build:Build={}; enemies:Enemy[]=[];shots:Shot[]=[];zones:Zone[]=[];drops:Drop[]=[];effects:Effect[]=[];
  seconds=0;level=1;xp=0;kills=0;pendingLevels=0;ended=false;won=false;bossSpawned=false;synergySeen=false;
  damageByWeapon:Partial<Record<WeaponId,number>>={};
  dashCooldown=0; dashTime=0; dashAngle=0; dodges=0; shrinesLit=0;
  shrine?:Shrine; giftPending=false; flameTime=0;
  miniSpawned=false; counterReady=false; swings=0; weaponAngle=0; weaponMotion=0;
  waveHint=''; private waveHintUntil=0;
  relicPending=false;relic?:RelicId;rerolls=1;focus=0;
  takeRelic(id:RelicId){
    if(!this.relicPending||this.ended||this.relic||RELICS[id]?.job!==this.path.job)return false;
    this.relic=id;this.relicPending=false;return true;
  }
  get path(){return PATHS[this.pathId];}
  stormCharge=0;
  classTalent=false;
  get offersClassTalent(){
    const choiceLevel=this.level-this.pendingLevels+1;
    return this.pendingLevels>0 && !this.classTalent && choiceLevel>=9 && choiceLevel%3===0;
  }
  private deck(unlocked:string[]){return this.path.job==='mage'?unlocked:unlocked.filter(id=>(this.path.job==='warden'?['leaf','frost']:['ember','comet']).includes(id));}
  canReroll(unlocked:string[],old:readonly string[]){return this.pendingLevels>0 && this.rerolls>0 && upgradePool(this.build,this.deck(unlocked)).some(a=>!old.includes(a.id));}
  reroll(unlocked:string[],old:readonly (UpgradeId|'mastery')[]){
    if(!this.canReroll(unlocked,old))return;
    this.rerolls--;const fresh=this.levelOptions(unlocked,old);
    // Near an exhausted pool, keep enough previous cards to preserve the choice count.
    return [...fresh,...old.filter(id=>!fresh.includes(id))].slice(0,old.length);
  }
  levelOptions(unlocked:string[],omit:readonly string[]=[]):(UpgradeId|'mastery')[]{
    const ordinary=upgradeChoices(this.build,this.deck(unlocked),this.rng,omit);
    return this.offersClassTalent?['mastery',...ordinary.slice(0,2)]:ordinary;
  }
  get masteryActive(){return this.level>=MASTERY_LEVEL;}
  private nextShrine=0; private evadeWindow=0; private harvestTime=0;
  private id=1;private spawnClock=0;private eliteClock=50;private weaponClocks:Partial<Record<WeaponId,number>>={};
  private gridHeads = new Int16Array(32 * 32);
  private nextEnemy: number[] = [];
  private shotCandidates: Enemy[] = [];
  private leafClock=0;private ticks=0;
  constructor(readonly pathId:PathId,seed:number,readonly difficulty:Difficulty='normal',readonly training:Ranks=freshRanks()) {
    this.seed=seed;this.rng=new Random(seed);this.loot=new Random(seed^0x9e3779b9);this.training={...training};
    this.gridHeads.fill(-1);
    this.player.hp=this.player.maxHp=maxHealth(training);this.build[this.path.weapon]=1;
  }
  fatal?:{kind:AttackNote;damage:number};
  get rules(){return DIFFICULTIES[this.difficulty];}
  get pickupRadius(){return (98+(this.build.reach??0)*12)*1.2+(this.harvestTime>0?145:0);}
  get boss() {return this.enemies.find(e=>e.kind==='boss')??this.enemies.find(e=>isChief(e.kind));}
  get power() {return (1+(this.build.power??0)*0.10)*(this.flameTime>0?1.30:1)*(this.relic==='stillglass'&&this.focus>=1?1.25:1);}
  get reach() {return 1+(this.build.reach??0)*0.1;}
  get haste() {return CAST_INTERVAL[this.build.haste??0];}
  get walkSpeed(){return walkSpeed(this.training)*(1+(this.build.stride??0)*.08);}
  get xpMultiplier(){return 1+(this.build.fortune??0)*.1;}
  attackInterval(weapon:WeaponId){return BASE_INTERVAL[weapon]*this.haste;}
  private nextId(){return this.id++;}
  addUpgrade(id:UpgradeId) {
    const max=ABILITIES.find(a=>a.id===id)!.max;
    if((this.build[id]??0)>=max)return;
    this.build[id]=(this.build[id]??0)+1;
    if(id==='vigor'){this.player.maxHp+=20;this.player.hp=Math.min(this.player.maxHp,this.player.hp+20);}
    this.synergySeen ||= activeSynergies(this.build).length>0;
  }
  // Buckets wrap, world positions do not. The exact circle test rejects distant aliases.
  private rebuildGrid() {
    this.gridHeads.fill(-1);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hp <= 0) continue;
      const cell = ((Math.floor(e.y / 120) & 31) << 5) | (Math.floor(e.x / 120) & 31);
      this.nextEnemy[i] = this.gridHeads[cell];
      this.gridHeads[cell] = i;
    }
  }
  private nearby(x: number, y: number, radius: number, out: Enemy[] = [], margin = 0): Enemy[] {
    out.length = 0;
    const extent = radius + margin;
    const xmax = Math.floor((x + extent) / 120), ymax = Math.floor((y + extent) / 120);
    for (let gx = Math.floor((x - extent) / 120); gx <= xmax; gx++) {
      for (let gy = Math.floor((y - extent) / 120); gy <= ymax; gy++) {
        const cell = ((gy & 31) << 5) | (gx & 31);
        for (let i = this.gridHeads[cell]; i >= 0; i = this.nextEnemy[i]) {
          const e = this.enemies[i];
          if (e.hp > 0 && (e.x-x)**2 + (e.y-y)**2 <= (radius+e.radius)**2) out.push(e);
        }
      }
    }
    return out;
  }
  private nearest(x=this.player.x,y=this.player.y,max=270):Enemy|undefined {
    let target:Enemy|undefined;let best=max*max; for(const e of this.enemies){if(e.hp<=0)continue;const d=(e.x-x)**2+(e.y-y)**2;if(e.kind==='boss'&&d<max*max*.75)return e;if(d<best){best=d;target=e;}}return target;
  }
  spawn(kind:EnemyKind,x?:number,y?:number,random=this.rng) {
    if(this.enemies.length>=150&&!isChief(kind))return;
    const angle=random.between(0,Math.PI*2);const radius=this.seconds<15?random.between(120,220):random.between(330,500);
    const [baseHp,speed,size,attack]=ENEMY_STATS[kind];// Moths remain fragile. A late sturdy enemy should survive even an upgraded opening volley.
    const scale=enemyHealthScale(kind,this.seconds,this.difficulty);
    const enemy:Enemy={id:this.nextId(),kind,x:x??this.player.x+Math.cos(angle)*radius,y:y??this.player.y+Math.sin(angle)*radius,hp:baseHp*scale,maxHp:baseHp*scale,radius:size,speed:speed*rampDifficulty(this.rules.speed,this.seconds),attack:Math.round(attack*rampDifficulty(this.rules.damage,this.seconds)),phase:0,clock:random.between(1,3),slow:0,frozen:0,rooted:0,burn:0,burnClock:0,spore:0,proc:0,flash:0,hitAngle:0,gait:0,attackPose:0};
    this.enemies.push(enemy);return enemy;
  }
  private effect(effect:Effect){if(this.effects.length<100)this.effects.push(effect);}
  private hurt(amount:number,sourceX:number,sourceY:number,kind:AttackNote='contact') {
    if(this.evadeWindow>0 && this.player.invincible<=0 && !this.ended){
      if(this.harvestTime<=0){
        this.dodges++;this.harvestTime=.75;
        this.effect({kind:'evade',x:this.player.x,y:this.player.y,color:0xc2ecc1,radius:40});
      }
      return;
    }
    if(this.player.invincible>0||this.ended)return;
    if(this.pathId==='guard'){amount=Math.max(1,Math.round(amount*.80));if(this.masteryActive)this.counterReady=true;}
    this.player.hp=Math.max(0,this.player.hp-amount);this.player.invincible=0.8+(this.build.stride??0)*0.06;
    // Damage feedback always reaches the renderer, even during a full spell burst.
    if(this.effects.length>=100)this.effects.pop();
    this.effects.push({kind:'wound',x:this.player.x,y:this.player.y,tx:sourceX,ty:sourceY,
      color:0xf19a8a,radius:amount,text:'−'+Math.round(amount)});
    if(this.player.hp<=0){this.fatal={kind,damage:amount};this.ended=true;}
  }
  private hit(e:Enemy,damage:number,weapon:WeaponId,secondary=false,fromAngle?:number,area=false) {
    if(e.hp<=0)return;
    // A beetle's shell absorbs broad impacts. Direct spells, poison and burn still deal full damage.
    if(e.kind==='beetle' && (area||weapon==='leaf'||weapon==='frost'))damage*=.48;
    const applied=Math.min(e.hp,damage);e.hp-=damage;e.flash=0.08;
    this.damageByWeapon[weapon]=(this.damageByWeapon[weapon]??0)+applied;
    const angle = fromAngle ?? Math.atan2(e.y-this.player.y,e.x-this.player.x);
    e.hitAngle = angle;
    if (e.hp <= 0) this.effect({kind:'defeat', x:e.x, y:e.y, tx:angle, radius:e.radius, enemyKind:e.kind});
    if (!secondary && weapon !== 'spore') {
      this.effect({kind:'strike',weapon,x:e.x,y:e.y,tx:angle,
        radius:e.hp<=0?24:14,color:weapon==='ember'?0xffbb76:weapon==='spark'?0xb7e4d4:0xe5cb93});
    }
    if(this.ticks%4===0||damage>35)this.effect({kind:'hit',x:e.x,y:e.y,text:String(Math.round(damage)),color:0xf4db9c});
    // Secondary hits cannot trigger other procs: bounded work, no recursive feedback loops.
    if(!secondary&&e.proc<=0){
      if(weapon==='blade'&&this.build.leaf){
        e.proc=.70;this.hit(e,8*this.power,'leaf',true);
      }else if(weapon==='bow'&&this.build.ember){
        if(e.burn<=0)e.burnClock=.5;e.burn=Math.max(e.burn,2);e.proc=.60;
      }else if(weapon==='spark'&&e.spore>0&&this.build.spore){
        e.spore=0;e.proc=1.2;this.effect({kind:'synergy',x:e.x,y:e.y,radius:65,color:0xb5e9ae});
        for(const n of this.nearby(e.x,e.y,65))this.hit(n,12*this.power,'spark',true,undefined,true);
      }else if(weapon==='leaf'&&e.burn>0&&this.build.ember){
        e.burn=Math.min(5,e.burn+0.7);e.proc=1;this.effect({kind:'burst',x:e.x,y:e.y,radius:42,color:0xf0b77a});
        for(const n of this.nearby(e.x,e.y,42))this.hit(n,10*this.power,'leaf',true);
      }else if(weapon==='comet'&&e.slow>0&&this.build.frost){
        e.proc=1;this.effect({kind:'burst',x:e.x,y:e.y,radius:60,color:0xb0dbf4});
        for(const n of this.nearby(e.x,e.y,60))this.hit(n,16*this.power,'comet',true,undefined,true);
      }
    }
  }
  private fire(weapon:WeaponId,target:Enemy,damage:number,speed:number,pierce:number,angleOffset=0) {
    if(this.shots.length>=280)return;
    const angle=Math.atan2(target.y-this.player.y,target.x-this.player.x)+angleOffset;
    const shot:Shot={id:this.nextId(),x:this.player.x,y:this.player.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:2,radius:weapon==='comet'?10:7,damage,weapon,pierce,hit:new Set()};this.shots.push(shot);return shot;
  }
  private cast(weapon:WeaponId,level:number) {
    const charged=weapon==='spark' && this.pathId==='hazel' && this.masteryActive && this.stormCharge>=1;
    let target=this.nearest(this.player.x,this.player.y,weapon==='blade'?(110+level*7)*this.reach*(this.pathId==='breaker'&&this.masteryActive&&this.swings%3===2?1.3:1):weapon==='bow'?510:weapon==='comet'?480:weapon==='ember'?350:charged?320:240);
    if(charged && this.classTalent){
      let best=320*320;
      for(const e of this.enemies){
        if(e.hp<=0 || (!isChief(e.kind) && e.kind!=='brute' && e.kind!=='crystal'))continue;
        const d=distance2(e,this.player);
        if(d>=320*320)continue;
        if(isChief(e.kind)){target=e;break;}
        if(d<best){target=e;best=d;}
      }
    }
    if(!target)return;
    this.effect({kind:'cast',weapon,x:this.player.x,y:this.player.y,tx:target.x,ty:target.y});
    const scale=SPELL_DAMAGE[level]*this.power;
    if(weapon==='blade'||weapon==='bow'){
      const p=this.player,angle=Math.atan2(target.y-p.y,target.x-p.x);
      this.weaponAngle=angle;this.weaponMotion=1;
      if(weapon==='blade'){
        const heavy=this.pathId==='breaker' && this.masteryActive && ++this.swings%3===0;
        const counter=this.counterReady,radius=(110+level*7)*this.reach*(heavy?1.3:1);
        const half=this.pathId==='breaker'?1.22:.88;
        const targets=this.nearby(p.x,p.y,radius).filter(e=>{
          const dx=e.x-p.x,dy=e.y-p.y;
          return dx*Math.cos(angle)+dy*Math.sin(angle)>=Math.hypot(dx,dy)*Math.cos(half);
        });
        for(const e of targets){
          if(this.relic==='briar'&&targets.length>=3)e.slow=Math.max(e.slow,isChief(e.kind)?.30:1);
          const bonus=heavy&&this.classTalent&&(isChief(e.kind)||e.kind==='brute'||e.kind==='crystal')?1.4:1;
          this.hit(e,36*scale*(counter?2:heavy?1.7:1)*bonus*(this.relic==='whetstone'&&targets.length===1?1.25:1),'blade',false,angle);
        }
        if(counter&&this.classTalent)p.hp=Math.min(p.maxHp,p.hp+6);
        this.counterReady=false;this.effect({kind:'slash',x:p.x,y:p.y,tx:angle,radius});
      }else{
        const volley=this.pathId==='volley',arrows=volley?(this.masteryActive?5:3):1;
        const feather=this.relic==='longfeather'&&distance2(p,target)>200**2;
        const aimed=!volley&&this.masteryActive&&distance2(p,target)>200**2;
        for(let i=0;i<arrows;i++){
          const arrow=this.fire('bow',target,36*scale*(volley?.64:aimed?1.55:1),460,volley?1+Math.floor(level/3):3+Math.floor(level/2),(i-(arrows-1)/2)*.14);
          if(arrow){arrow.aimed=aimed;if(feather){arrow.damage*=1.15;arrow.pierce++;}}
        }
      }
    }else if(weapon==='spark'){
      if(charged)this.stormCharge=0;
      const eliteStrike=charged && this.classTalent && (isChief(target.kind)||target.kind==='brute'||target.kind==='crystal');
      const primary=18*(charged?1.65:1)*(eliteStrike?1.25:1);
      let current=target;let previous:{x:number;y:number}=this.player;const visited=new Set<number>();
      for(let i=0;i<3+Math.floor(level/2);i++){
        visited.add(current.id);this.hit(current,(i===0?primary:15)*scale,'spark',false,Math.atan2(current.y-previous.y,current.x-previous.x),i>0);this.effect({kind:'chain',x:previous.x,y:previous.y,tx:current.x,ty:current.y,color:0x9cebe0,arcSeed:this.ticks*31+current.id,hop:i,empowered:charged && i===0});
        previous=current;const next=this.nearby(current.x,current.y,145*this.reach).filter(e=>!visited.has(e.id)).sort((a,b)=>distance2(a,current)-distance2(b,current))[0];if(!next){
          // Unused jumps converge on a surviving solitary target at reduced strength.
          const unused=2+Math.floor(level/2)-i;
          if(i===0 && unused>0 && current.hp>0)this.hit(current,unused*(charged?5:1.5)*scale,'spark',true);
          break;
        }current=next;
      }
    }else if(weapon==='spore'){
      this.zones.push({id:this.nextId(),x:target.x,y:target.y,radius:(75+level*6)*this.reach,life:3.8*(this.pathId==='fern'?1.25:1),tick:0,damage:8*scale,kind:'spore',timer:0});
    }else if(weapon==='ember'){
      this.fire('ember',target,19*scale*(this.pathId==='ash'?1.15:1),390,1);
      if(level>=4)this.fire('ember',target,18*scale,390,1,0.22);
    }else if(weapon==='frost'){
      const radius=(140+level*12)*this.reach;
      for(const e of this.nearby(this.player.x,this.player.y,radius)){if(e.slow>0){e.frozen=isChief(e.kind)?.12:.45;}this.hit(e,23*scale,'frost');e.slow=isChief(e.kind)?1.3:2.8;}
      this.effect({kind:'frost',x:this.player.x,y:this.player.y,radius,color:0xb4d6ef});
    }else if(weapon==='comet'){
      this.fire('comet',target,40*scale,560,4+level);
      if(level>=3)this.fire('comet',target,24*scale,560,3,0.12);
    }
  }
  private warn(e:Enemy,shape:NonNullable<Zone['shape']>,x:number,y:number,radius:number,angle:number,duration:number){
    e.preparing=e.windupTime=duration;e.attackHeading=angle;e.attackPose=0;
    this.zones.push({id:this.nextId(),kind:'warning',owner:e.id,shape,x,y,angle,radius,duration,life:duration,tick:0,timer:0,damage:e.attack});
  }
  private resolveWarning(z:Zone){
    const owner=this.enemies.find(e=>e.id===z.owner && e.hp>0);
    if(!owner && z.owner!==undefined)return;
    const angle=z.angle??0,dx=this.player.x-z.x,dy=this.player.y-z.y,d=Math.hypot(dx,dy);
    if(owner){owner.preparing=0;owner.attackPose=ATTACK_POSE_TIME;}
    if(z.shape==='lane' && owner){owner.charge={angle,remaining:z.radius};return;}
    const inRadius=d<=z.radius;
    const hit=inRadius && (z.shape==='ring'?d>=z.radius*.54:z.shape==='cleave'?dx*Math.cos(angle)+dy*Math.sin(angle)>=d*Math.cos(.85):true);
    if(hit)this.hurt(z.damage,z.x,z.y,z.shape==='ring'?'ring':z.shape==='cleave'?'cleave':'disk');
    if(owner?.kind==='boss' && z.shape==='disk')owner.recovery=1.15;
    this.effect({kind:'impactZone',x:z.x,y:z.y,radius:z.radius,tx:angle,shape:z.shape});
  }
  private enemyShot(e:Enemy,angle:number,speed=145){if(this.shots.length>=280)return;this.shots.push({id:this.nextId(),x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:5,radius:e.kind==='crystal'?5:e.kind==='spitter'?9:7,missile:e.kind==='spitter'?'sap':e.kind==='crystal'?'shard':e.kind==='mothQueen'?'dust':'seed',damage:e.attack,weapon:'enemy',pierce:1,hit:new Set()});}
  private move(dt:number, control:Controls) {
    const p=this.player, startX=p.x,startY=p.y,length=Math.hypot(control.x,control.y);
    this.dashCooldown=Math.max(0,this.dashCooldown-dt);
    this.evadeWindow=Math.max(0,this.evadeWindow-dt);
    this.harvestTime=Math.max(0,this.harvestTime-dt);
    if(control.dash && this.dashCooldown===0){
      this.dashAngle=length>.05?Math.atan2(control.y,control.x):p.angle;
      if(this.relic==='quicknock')this.weaponClocks.bow=0;
      if(this.relic==='waywick')this.zones.push({id:this.nextId(),kind:'ember',x:p.x,y:p.y,radius:62,life:2,tick:0,timer:0,damage:7*this.power});
      this.dashTime=DASH_TIME;this.evadeWindow=.16;this.dashCooldown=4.2;
      if(this.pathId==='ash' && this.masteryActive && this.shots.length<280){
        const speed=540;
        this.shots.push({id:this.nextId(),x:p.x,y:p.y,vx:Math.cos(this.dashAngle)*speed,vy:Math.sin(this.dashAngle)*speed,
          life:.78,radius:9,damage:20*SPELL_DAMAGE[this.build.ember??1]*this.power,weapon:'ember',pierce:3,lance:true,hit:new Set()});
      }
      this.effect({kind:'dash',x:p.x,y:p.y,tx:this.dashAngle,color:0xb9d7a3});
    }
    const dashStep=Math.min(dt,this.dashTime);
    if(dashStep>0){
      p.x+=Math.cos(this.dashAngle)*530*dashStep;p.y+=Math.sin(this.dashAngle)*530*dashStep;
      this.dashTime=Math.max(0,this.dashTime-dt);p.angle=this.dashAngle;
    }
    p.moving=length>.05||dashStep>0;
    if(length>.05 && dt>dashStep){
      const travel=this.walkSpeed*(dt-dashStep)/Math.max(1,length);
      p.x+=control.x*travel;p.y+=control.y*travel;p.angle=Math.atan2(control.y,control.x);
    }
    if(this.pathId==='hazel' && this.masteryActive && this.stormCharge<1){
      this.stormCharge=Math.min(1,this.stormCharge+Math.hypot(p.x-startX,p.y-startY)/220);
    }
  }

  private startFormation(secondWave:boolean){
    const p=this.player;
    // Both formations occur each run. Use separate seed bits for order and approach.
    const charge=((this.seed>>>3)&1)===Number(secondWave);
    const angle=((this.seed>>>5)%360)*Math.PI/180+(secondWave?2.4:0);
    const ux=Math.cos(angle),uy=Math.sin(angle);
    const count=(this.difficulty==='easy'?2:3)+Number(secondWave && this.difficulty==='hard');
    const distance=charge?165:245;
    if(this.enemies.length+count>150)return;
    const formationRandom=new Random(this.seed^(secondWave?285:135));
    for(let i=0;i<count;i++){
      const offset=(i-Math.floor(count/2))*(charge?68:84);
      const e=this.spawn(charge?'beetle':'spitter',p.x+distance*ux-offset*uy,p.y+distance*uy+offset*ux,formationRandom)!;
      if(charge){
        this.warn(e,'lane',e.x,e.y,235,angle+Math.PI,1.05);
        e.clock=3;
      }else{
        e.clock=1.1+i*.23;
      }
    }
    this.waveHint=charge?'甲虫冲阵 · 横移避开':'树脂弹阵 · 绕向侧翼';
    this.waveHintUntil=this.seconds+3;
    this.spawnClock=Math.max(this.spawnClock,2);
  }

  private updateShrine(dt:number){
    if(!this.shrine && this.nextShrine<2 && this.seconds>=[90,225][this.nextShrine]){
      // Independent seed: choosing a detour never rerolls the ordinary wave or upgrade deck.
      const angle=(this.seed%360)*Math.PI/180+this.nextShrine*2.4;
      this.shrine={x:this.player.x+Math.cos(angle)*310,y:this.player.y+Math.sin(angle)*310,
        charge:0,expires:this.seconds+40};
      this.nextShrine++;
    }
    const lamp=this.shrine;
    if(!lamp)return;
    if(this.seconds>=lamp.expires){this.shrine=undefined;return;}
    // Stepping out to dodge preserves the part already kindled.
    if(distance2(lamp,this.player)<=52**2)lamp.charge+=dt;
    if(lamp.charge>=RITUAL_TIME){
      this.shrinesLit++;this.shrine=undefined;this.giftPending=true;
    }
  }
  takeGift(gift:ShrineGift){
    if(!this.giftPending || this.ended)return;
    if(gift==='spring')this.player.hp=Math.min(this.player.maxHp,this.player.hp+Math.ceil(this.player.maxHp*.30));
    else this.flameTime=45;
    this.giftPending=false;
  }

  step(dt:number,control:Controls) {
    if(this.ended||this.pendingLevels>0||this.giftPending||this.relicPending)return;
    const previousTime=this.seconds;
    dt=Math.min(dt,0.05);this.weaponMotion=Math.max(0,this.weaponMotion-dt*4.5);this.seconds+=dt;this.ticks++;this.effects.length=0;
    const p=this.player;p.invincible=Math.max(0,p.invincible-dt);
    this.flameTime=Math.max(0,this.flameTime-dt);this.move(dt,control);
    if(this.relic==='stillglass')this.focus=p.moving?0:Math.min(1,this.focus+dt);
    if(this.seconds>=480){this.ended=true;return;}
    if(this.seconds>=180 && this.seconds<360 && !this.miniSpawned){
      this.miniSpawned=true;this.spawn(this.seed%2===0?'boar':'mothQueen');
    }
    if(this.seconds>=360&&!this.bossSpawned){this.bossSpawned=true;this.spawn('boss');this.effect({kind:'level',x:p.x,y:p.y,text:'古树守卫苏醒了'});}
    this.spawnClock-=dt;this.eliteClock-=dt;
    if(previousTime<135 && this.seconds>=135)this.startFormation(false);
    if(previousTime<285 && this.seconds>=285 && !this.boss)this.startFormation(true);
    if(this.waveHint && this.seconds>=this.waveHintUntil)this.waveHint='';
    if(this.spawnClock<=0){
      const bossSpacing=this.bossSpawned?this.rules.finalWaveInterval:1;
      this.spawnClock=Math.max(.22,.85-this.seconds/580)*(1+latePressure(this.seconds)*this.rules.waveRelief)*bossSpacing/rampDifficulty(this.rules.waveRate,this.seconds);
      const pool:EnemyKind[]=this.seconds<40?['slime','moth']:this.seconds<100?['slime','moth','twig']:['slime','moth','twig','spitter','beetle'];
      this.spawn(this.rng.pick(pool));
    }
    if(this.eliteClock<=0&&this.seconds<350){this.spawn(this.rng.next()>.5?'brute':'crystal');this.eliteClock=55/rampDifficulty(55/this.rules.eliteInterval,this.seconds);}
    for(const e of this.enemies){
      if(e.hp<=0)continue;e.rooted=Math.max(0,e.rooted-dt);e.frozen=Math.max(0,e.frozen-dt);if(e.frozen===0)e.clock-=dt;e.slow=Math.max(0,e.slow-dt);e.proc=Math.max(0,e.proc-dt);e.flash=Math.max(0,e.flash-dt);e.spore=Math.max(0,e.spore-dt);
      if(e.burn>0){e.burn-=dt;e.burnClock-=dt;if(e.burnClock<=0){e.burnClock=0.5;this.hit(e,5*this.power*(1+(this.build.ember??1)*0.2),'ember',true);}}
      if (isChief(e.kind) && distance2(e,p)>1150**2) {
        // Preserve health and phase when the runner leaves the encounter behind.
        const ahead=p.angle;
        e.x=p.x+Math.cos(ahead)*640;
        e.y=p.y+Math.sin(ahead)*640;
      }
      const dx=p.x-e.x,dy=p.y-e.y,dist=Math.hypot(dx,dy)||1;let speed=(e.frozen>0||e.rooted>0?0:e.speed)*(e.slow>0?(e.kind==='boss'?0.8:0.52):1);
      if(e.charge){
        const step=Math.min(e.charge.remaining,dt*610),a=e.charge.angle;
        const forward=dx*Math.cos(a)+dy*Math.sin(a),side=Math.abs(-dx*Math.sin(a)+dy*Math.cos(a));
        if(forward>=0 && forward<=step && side<=18)this.hurt(e.attack,e.x,e.y,'charge');
        e.x+=Math.cos(a)*step;e.y+=Math.sin(a)*step;e.charge.remaining-=step;e.attackPose=.15;
        if(e.charge.remaining<=0)e.charge=undefined;
        continue;
      }
      if(e.recovery){e.recovery=Math.max(0,e.recovery-dt);speed=0;}
      if(e.preparing){e.preparing=Math.max(0,e.preparing-dt);speed=0;}
      if(e.kind==='twig'&&e.clock<0.6)speed*=1.8;
      if(e.kind==='mothQueen'&&dist<200)speed=0;
      if(e.kind==='spitter'&&dist<280)speed=0;
      if(e.kind==='boss'&&e.hp<e.maxHp*.5){
        if(e.phase===0 && this.drops.length<320){
          const angle=Math.atan2(dy,dx);
          this.drops.push({id:this.nextId(),kind:'heal',x:e.x+90*Math.cos(angle),y:e.y+90*Math.sin(angle),born:this.seconds,value:28});
        }
        speed*=1.5;e.phase=1;
      }
      if(e.frozen<=0){
        e.attackPose=Math.max(0,e.attackPose-dt);
        if(e.speed>0)e.gait+=dt*speed/e.speed;
      }
      e.x+=dx/dist*speed*dt;e.y+=dy/dist*speed*dt;
      if(!e.recovery && e.frozen<=0 && dist<e.radius+15 && e.kind!=='boar' && e.kind!=='brute' && e.kind!=='beetle' && e.kind!=='twig'){
        if(p.invincible<=0 && e.frozen<=0)e.attackPose=ATTACK_POSE_TIME;
        this.hurt(e.attack,e.x,e.y);
      }
      if(!e.recovery && e.frozen<=0 && e.clock<=0){
        e.clock=e.kind==='boss'?(e.phase?2.8:4)*this.rules.bossInterval:e.kind==='twig'?3.5:3;
        if(e.kind==='spitter'||e.kind==='crystal'||e.kind==='boss')e.attackPose=ATTACK_POSE_TIME;
        const aim=Math.atan2(dy,dx);
        if(e.kind==='spitter')this.enemyShot(e,aim,126);
        if(e.kind==='crystal')for(const offset of [-.18,0,.18])this.enemyShot(e,aim+offset,211);
        if(e.kind==='twig'||e.kind==='brute'||e.kind==='beetle'||e.kind==='boar'){
          const lane=e.kind==='boar'||e.kind==='beetle',range=e.kind==='boar'?245:e.kind==='beetle'?130:e.kind==='brute'?100:62;
          if(dist<range+25){
            e.pattern=(e.pattern??0)+1;
            if(e.kind==='boar' && e.pattern%3===0 && dist<125)this.warn(e,'disk',e.x,e.y,110,aim,.95);
            else this.warn(e,lane?'lane':'cleave',e.x,e.y,range,aim,lane ? .76 : .47);
          }
          else e.clock=.24;
        }
        if(e.kind==='mothQueen'){
          e.pattern=(e.pattern??0)+1;
          if(e.pattern%2)this.warn(e,'ring',p.x,p.y,117,0,1.1);
          else {e.attackPose=ATTACK_POSE_TIME;for(const offset of [-.5,-.25,0,.25,.5])this.enemyShot(e,aim+offset,115);}
        }
        if(e.kind==='boss'){
          // Separate the two hazards in phase one. The enraged third beat combines them.
          e.pattern=(e.pattern??0)+1;
          const beat=e.phase?(e.pattern-1)%3:(e.pattern-1)%2;
          if(beat!==0){const count=e.phase?12:8;for(let i=0;i<count;i++)this.enemyShot(e,i/count*Math.PI*2+this.seconds*.16,120);}
          if(beat!==1)this.warn(e,'disk',p.x,p.y,e.phase?115:89,0,1.3);
        }
      }
    }
    this.rebuildGrid();
    for(const [id,value] of Object.entries(this.build)){
      const weapon=id as WeaponId;if(!['spark','spore','ember','frost','comet','blade','bow'].includes(id))continue;
      this.weaponClocks[weapon]=(this.weaponClocks[weapon]??0)-dt;
      if(this.weaponClocks[weapon]!<=0){this.weaponClocks[weapon]=this.attackInterval(weapon);this.cast(weapon,value!);}
    }
    this.leafClock-=dt;
    if(this.build.leaf&&this.leafClock<=0){this.leafClock=this.attackInterval('leaf');const r=(80+this.build.leaf*7)*this.reach;for(const e of this.nearby(p.x,p.y,r))this.hit(e,14*SPELL_DAMAGE[this.build.leaf]*this.power,'leaf');}
    for(const z of this.zones){z.life-=dt;z.timer+=dt;z.tick-=dt;
      if(z.kind==='warning'){if(z.owner!==undefined&&!this.enemies.some(e=>e.id===z.owner&&e.hp>0))z.life=0;else if(z.life<=0)this.resolveWarning(z);continue;}
      if(this.pathId==='fern' && this.masteryActive && z.kind==='spore' && !z.bloomed && z.timer>=1 && distance2(p,z)<=z.radius*z.radius){
        z.bloomed=true;
        const caught=this.nearby(z.x,z.y,z.radius);
        for(const e of caught){
          this.hit(e,z.damage*1.4,'spore',true);
          if(isChief(e.kind))e.slow=Math.max(e.slow,.85);
          else e.rooted=Math.max(e.rooted,.7);
        }
        if(this.classTalent && caught.length>=2)p.hp=Math.min(p.maxHp,p.hp+3);
        this.effect({kind:'bloom',x:z.x,y:z.y,radius:z.radius});
      }
      if(z.tick<=0){z.tick=0.5;for(const e of this.nearby(z.x,z.y,z.radius)){const rootedChief=z.bloomed && isChief(e.kind);this.hit(e,z.damage*(rootedChief?1.35:1),z.kind,true);if(z.kind==='spore')e.spore=2;else e.burn=Math.max(2,e.burn);}}
    }
    this.zones=this.zones.filter(z=>z.life>0);
    // A full spell field must not erase a windup or cancel the attack it announces.
    if(this.zones.length>45){let excess=this.zones.length-45;this.zones=this.zones.filter(z=>z.kind==='warning'||excess--<=0);}
    for(const shot of this.shots){
      shot.life-=dt;shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;
      if(shot.weapon==='enemy'){if(distance2(shot,p)<(shot.radius+13)**2){this.hurt(shot.damage,shot.x-shot.vx*.12,shot.y-shot.vy*.12,shot.missile??'missile');shot.life=0;}continue;}
      for(const e of this.nearby(shot.x,shot.y,shot.radius,this.shotCandidates,62)){
        if(e.hp<=0||shot.hit.has(e.id))continue;
        const aimed=shot.aimed&&this.classTalent&&(isChief(e.kind)||e.kind==='brute'||e.kind==='crystal');
        if(shot.weapon==='bow'&&this.pathId==='volley'&&this.classTalent&&!isChief(e.kind))e.slow=Math.max(.55,e.slow);
        shot.hit.add(e.id);this.hit(e,shot.damage*(aimed?1.4:1),shot.weapon,false,Math.atan2(shot.vy,shot.vx));shot.pierce--;
        if(shot.weapon==='ember'){
          if(e.burn<=0)e.burnClock=.5;
          e.burn=3;
          if(shot.lance){
            if(this.classTalent && shot.hit.size===2)this.dashCooldown=Math.max(0,this.dashCooldown-1);
            if(shot.pierce<=0)break;
            continue;
          }
          const radius=(55+(this.build.ember??1)*5)*this.reach;
          for(const n of this.nearby(e.x,e.y,radius)){
            if(n.id===e.id)continue;
            const distance=Math.min(1,Math.sqrt(distance2(e,n))/radius);
            this.hit(n,shot.damage*(.60-.30*distance),'ember',true,undefined,true);
            if(n.burn<=0)n.burnClock=.5;
            n.burn=Math.max(n.burn,1.5);
          }
          this.effect({kind:'burst',x:e.x,y:e.y,radius,color:0xf4b172});
        }
        if(shot.pierce<=0){shot.life=0;break;}
      }
    }
    this.shots=this.shots.filter(s=>s.life>0 && s.pierce>0);
    for(const e of this.enemies)if(e.hp<=0){
      this.kills++;const elite=isChief(e.kind)||e.kind==='brute'||e.kind==='crystal';const value=elite?24:this.seconds<180?3:this.seconds<300?4:5;
      // Merge overflow XP rather than dropping rewards when a player circles the arena.
      if(this.drops.length<300)this.drops.push({id:this.nextId(),x:e.x,y:e.y,born:this.seconds,value,kind:'xp'});else {const existing=this.drops.find(d=>d.kind==='xp');if(existing)existing.value+=value;}
      if(this.drops.length<320&&(elite||this.rng.next()<0.025))this.drops.push({id:this.nextId(),x:e.x+12,y:e.y,born:this.seconds,value:elite?22:12,kind:'heal'});
      const gold=coinValue(e.kind,this.loot.next());
      if(gold){
        if(e.kind==='boss')this.coins+=gold; // No pickup frame follows a final victory.
        else {const pile=this.drops.length>=320?this.drops.find(d=>d.kind==='coin'):undefined;
          if(pile)pile.value+=gold;else this.drops.push({id:this.nextId(),kind:'coin',x:e.x-9,y:e.y,born:this.seconds,value:gold});}
      }
      if((e.kind==='boar'||e.kind==='mothQueen')&&!this.relic)this.relicPending=true;
      if(e.kind==='boss'){this.won=p.hp>0;this.ended=true;}
    }
    this.enemies=this.enemies.filter(e=>e.hp>0 && (isChief(e.kind) || distance2(e,p)<1400**2));
    if(this.ended)return;
    this.updateShrine(dt);
    const pickup = this.pickupRadius;
    let gathered = false;
    this.drops=this.drops.filter(d=>{
      const squared = distance2(d,p);
      if(squared>1600**2)return false;
      if(squared>=pickup*pickup)return true;
      const dist=Math.sqrt(squared);
      const travel=Math.min((this.harvestTime>0?620:320)*dt,dist)/Math.max(1,dist);
      d.x+=(p.x-d.x)*travel;d.y+=(p.y-d.y)*travel;
      if(dist>22)return true;
      if(d.kind==='coin'){this.coins+=d.value;gathered=true;}
      else if(d.kind==='heal'){p.hp=Math.min(p.maxHp,p.hp+d.value);this.effect({kind:'heal',x:p.x,y:p.y,text:`+${d.value}`});}
      else {this.xp+=d.value*this.xpMultiplier;gathered=true;}
      return false;
    });
    if(gathered)this.effect({kind:'gather',x:p.x,y:p.y+6,color:0xf4cf78,radius:15});
    while(this.xp>=xpNeeded(this.level)){this.xp-=xpNeeded(this.level);this.level++;this.pendingLevels++;p.hp=Math.min(p.maxHp,p.hp+2+(this.build.fortune??0)*2);}
  }
  resolveLevel(id?:UpgradeId|'mastery'){if(this.pendingLevels<=0)return;
    if(id==='mastery'){if(!this.offersClassTalent)return;this.classTalent=true;}
    else if(id)this.addUpgrade(id);else this.player.hp=Math.min(this.player.maxHp,this.player.hp+20);this.pendingLevels--;}
  summary():RunSummary{return{job:this.path.job,seconds:this.seconds,kills:this.kills,won:this.won,level:this.level,synergy:this.synergySeen,seed:this.seed};}
}
