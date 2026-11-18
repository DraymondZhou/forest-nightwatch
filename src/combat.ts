import { CHARACTERS, ABILITIES, type CharacterId, type UpgradeId, type WeaponId } from './content';
import { Random, xpNeeded, activeSynergies, type Build, type RunSummary } from './model';


export type EnemyKind='slime'|'moth'|'twig'|'spitter'|'beetle'|'brute'|'crystal'|'boss';
export interface Enemy {id:number;kind:EnemyKind;x:number;y:number;hp:number;maxHp:number;radius:number;speed:number;attack:number;phase:number;clock:number;slow:number;burn:number;burnClock:number;spore:number;proc:number;flash:number;hitAngle:number}
export interface Shot {id:number;x:number;y:number;vx:number;vy:number;life:number;radius:number;damage:number;weapon:WeaponId|'enemy';pierce:number;hit:Set<number>}
export interface Zone {id:number;x:number;y:number;radius:number;life:number;tick:number;damage:number;kind:'spore'|'ember'|'warning';timer:number}
export interface Drop {id:number;x:number;y:number;value:number;born:number;kind:'xp'|'heal'}
export interface Effect {kind:'defeat'|'gather'|'strike'|'cast'|'hit'|'chain'|'burst'|'frost'|'heal'|'level'|'synergy';x:number;y:number;enemyKind?:EnemyKind;tx?:number;ty?:number;radius?:number;color?:number;text?:string}
export interface Controls {x:number;y:number}
const distance2=(a:{x:number;y:number},b:{x:number;y:number})=>(a.x-b.x)**2+(a.y-b.y)**2;
const ENEMY_STATS:Record<EnemyKind,[number,number,number,number]>={slime:[22,48,17,9],moth:[16,86,13,7],twig:[30,105,15,10],spitter:[36,40,19,9],beetle:[74,42,24,13],brute:[440,52,38,18],crystal:[300,65,30,16],boss:[6400,34,62,21]};

export class Combat {
  readonly rng:Random; readonly character; readonly seed:number;
  player={x:900,y:600,hp:100,maxHp:100,invincible:0,angle:0,moving:false};
  build:Build={}; enemies:Enemy[]=[];shots:Shot[]=[];zones:Zone[]=[];drops:Drop[]=[];effects:Effect[]=[];
  seconds=0;level=1;xp=0;kills=0;pendingLevels=0;ended=false;won=false;bossSpawned=false;synergySeen=false;
  damageByWeapon:Partial<Record<WeaponId,number>>={};
  private id=1;private spawnClock=0;private eliteClock=50;private weaponClocks:Partial<Record<WeaponId,number>>={};
  private gridHeads = new Int16Array(32 * 32);
  private nextEnemy: number[] = [];
  private shotCandidates: Enemy[] = [];
  private leafClock=0;private ticks=0;
  constructor(characterId:CharacterId,seed:number) {
    this.character=CHARACTERS.find(c=>c.id===characterId)!;this.seed=seed;this.rng=new Random(seed);
    this.gridHeads.fill(-1);
    this.player.hp=this.player.maxHp=this.character.hp;this.build[this.character.weapon]=1;
  }
  get pickupRadius(){return (98+(this.build.reach??0)*12)*(this.character.id==='hazel'?1.2:1);}
  get boss() {return this.enemies.find(e=>e.kind==='boss');}
  get power() {return 1+(this.build.power??0)*0.12;}
  get reach() {return 1+(this.build.reach??0)*0.1;}
  get haste() {return 1-(this.build.haste??0)*0.07;}
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
  spawn(kind:EnemyKind,x?:number,y?:number) {
    if(this.enemies.length>=150&&kind!=='boss')return;
    const angle=this.rng.between(0,Math.PI*2);const radius=this.seconds<15?this.rng.between(120,220):this.rng.between(330,500);
    const [baseHp,speed,size,attack]=ENEMY_STATS[kind];const scale=kind==='boss'?1:1+this.seconds/165;
    const enemy:Enemy={id:this.nextId(),kind,x:x??this.player.x+Math.cos(angle)*radius,y:y??this.player.y+Math.sin(angle)*radius,hp:baseHp*scale,maxHp:baseHp*scale,radius:size,speed,attack,phase:0,clock:this.rng.between(1,3),slow:0,burn:0,burnClock:0,spore:0,proc:0,flash:0,hitAngle:0};
    this.enemies.push(enemy);return enemy;
  }
  private effect(effect:Effect){if(this.effects.length<100)this.effects.push(effect);}
  private hurt(amount:number) {
    if(this.player.invincible>0||this.ended)return;
    this.player.hp=Math.max(0,this.player.hp-amount);this.player.invincible=0.8+(this.build.stride??0)*0.06;
    this.effect({kind:'hit',x:this.player.x,y:this.player.y,color:0xf19a8a,text:`−${Math.round(amount)}`});
    if(this.player.hp<=0)this.ended=true;
  }
  private hit(e:Enemy,damage:number,weapon:WeaponId,secondary=false,fromAngle?:number) {
    if(e.hp<=0)return;
    const applied=Math.min(e.hp,damage);e.hp-=damage;e.flash=0.08;
    this.damageByWeapon[weapon]=(this.damageByWeapon[weapon]??0)+applied;
    const angle = fromAngle ?? Math.atan2(e.y-this.player.y,e.x-this.player.x);
    e.hitAngle = angle;
    if (e.hp <= 0) this.effect({kind:'defeat', x:e.x, y:e.y, tx:angle, radius:e.radius, enemyKind:e.kind});
    if (!secondary && weapon !== 'spore') {
      this.effect({kind:'strike',x:e.x,y:e.y,tx:angle,
        radius:e.hp<=0?24:14,color:weapon==='ember'?0xffbb76:weapon==='spark'?0xb7e4d4:0xe5cb93});
    }
    if(this.ticks%4===0||damage>35)this.effect({kind:'hit',x:e.x,y:e.y,text:String(Math.round(damage)),color:0xf4db9c});
    // Secondary hits cannot trigger other procs: bounded work, no recursive feedback loops.
    if(!secondary&&e.proc<=0){
      if(weapon==='spark'&&e.spore>0&&this.build.spore){
        e.spore=0;e.proc=1.2;this.effect({kind:'synergy',x:e.x,y:e.y,radius:65,color:0xb5e9ae});
        for(const n of this.nearby(e.x,e.y,65))this.hit(n,12*this.power,'spark',true);
      }else if(weapon==='leaf'&&e.burn>0&&this.build.ember){
        e.burn=Math.min(5,e.burn+0.7);e.proc=1;this.effect({kind:'burst',x:e.x,y:e.y,radius:42,color:0xf0b77a});
        for(const n of this.nearby(e.x,e.y,42))this.hit(n,10*this.power,'leaf',true);
      }else if(weapon==='comet'&&e.slow>0&&this.build.frost){
        e.proc=1;this.effect({kind:'burst',x:e.x,y:e.y,radius:60,color:0xb0dbf4});
        for(const n of this.nearby(e.x,e.y,60))this.hit(n,16*this.power,'comet',true);
      }
    }
  }
  private fire(weapon:WeaponId,target:Enemy,damage:number,speed:number,pierce:number,angleOffset=0) {
    if(this.shots.length>=280)return;
    const angle=Math.atan2(target.y-this.player.y,target.x-this.player.x)+angleOffset;
    this.shots.push({id:this.nextId(),x:this.player.x,y:this.player.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:2,radius:weapon==='comet'?10:7,damage,weapon,pierce,hit:new Set()});
  }
  private cast(weapon:WeaponId,level:number) {
    const target=this.nearest(this.player.x,this.player.y,weapon==='comet'?480:weapon==='ember'?350:240);if(!target)return;
    this.effect({kind:'cast',x:this.player.x,y:this.player.y,tx:target.x,ty:target.y});
    const scale=(1+(level-1)*0.34)*this.power;
    if(weapon==='spark'){
      let current=target;let previous:{x:number;y:number}=this.player;const visited=new Set<number>();
      for(let i=0;i<3+Math.floor(level/2);i++){
        visited.add(current.id);this.hit(current,(i===0?27:17)*scale,'spark',false,Math.atan2(current.y-previous.y,current.x-previous.x));this.effect({kind:'chain',x:previous.x,y:previous.y,tx:current.x,ty:current.y,color:0x9cebe0});
        previous=current;const next=this.nearby(current.x,current.y,145*this.reach).filter(e=>!visited.has(e.id)).sort((a,b)=>distance2(a,current)-distance2(b,current))[0];if(!next)break;current=next;
      }
    }else if(weapon==='spore'){
      this.zones.push({id:this.nextId(),x:target.x,y:target.y,radius:(75+level*6)*this.reach,life:3.8*(this.character.id==='fern'?1.25:1),tick:0,damage:8*scale,kind:'spore',timer:0});
    }else if(weapon==='ember'){
      this.fire('ember',target,30*scale*(this.character.id==='ash'?1.15:1),390,1);
      if(level>=4)this.fire('ember',target,18*scale,390,1,0.22);
    }else if(weapon==='frost'){
      const radius=(140+level*12)*this.reach;
      for(const e of this.nearby(this.player.x,this.player.y,radius)){this.hit(e,20*scale,'frost');e.slow=e.kind==='boss'?1.3:2.8;}
      this.effect({kind:'frost',x:this.player.x,y:this.player.y,radius,color:0xb4d6ef});
    }else if(weapon==='comet'){
      this.fire('comet',target,40*scale,560,4+level);
      if(level>=3)this.fire('comet',target,24*scale,560,3,0.12);
    }
  }
  private enemyShot(e:Enemy,angle:number,speed=145){if(this.shots.length>=280)return;this.shots.push({id:this.nextId(),x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:5,radius:8,damage:e.attack,weapon:'enemy',pierce:1,hit:new Set()});}
  step(dt:number,control:Controls) {
    if(this.ended||this.pendingLevels>0)return;
    dt=Math.min(dt,0.05);this.seconds+=dt;this.ticks++;this.effects.length=0;
    const p=this.player;p.invincible=Math.max(0,p.invincible-dt);
    const length=Math.hypot(control.x,control.y);p.moving=length>0.05;
    if(p.moving){const norm=Math.max(1,length);const speed=this.character.speed*(1+(this.build.stride??0)*0.08);p.x+=control.x/norm*speed*dt;p.y+=control.y/norm*speed*dt;p.angle=Math.atan2(control.y,control.x);}
    if(this.seconds>=480){this.ended=true;return;}
    if(this.seconds>=360&&!this.bossSpawned){this.bossSpawned=true;this.spawn('boss');this.effect({kind:'level',x:p.x,y:p.y,text:'古树守卫苏醒了'});}
    this.spawnClock-=dt;this.eliteClock-=dt;
    if(this.spawnClock<=0){this.spawnClock=Math.max(0.22,0.85-this.seconds/580)*(this.bossSpawned?1.8:1);const pool:EnemyKind[]=this.seconds<40?['slime','moth']:this.seconds<100?['slime','moth','twig']:['slime','moth','twig','spitter','beetle'];this.spawn(this.rng.pick(pool));}
    if(this.eliteClock<=0&&this.seconds<350){this.spawn(this.rng.next()>.5?'brute':'crystal');this.eliteClock=55;}
    for(const e of this.enemies){
      if(e.hp<=0)continue;e.clock-=dt;e.slow=Math.max(0,e.slow-dt);e.proc=Math.max(0,e.proc-dt);e.flash=Math.max(0,e.flash-dt);e.spore=Math.max(0,e.spore-dt);
      if(e.burn>0){e.burn-=dt;e.burnClock-=dt;if(e.burnClock<=0){e.burnClock=0.5;this.hit(e,5*this.power*(1+(this.build.ember??1)*0.2),'ember',true);}}
      if (e.kind==='boss' && distance2(e,p)>1150**2) {
        // Preserve health and phase when the runner leaves the encounter behind.
        const ahead=p.angle;
        e.x=p.x+Math.cos(ahead)*640;
        e.y=p.y+Math.sin(ahead)*640;
      }
      const dx=p.x-e.x,dy=p.y-e.y,dist=Math.hypot(dx,dy)||1;let speed=e.speed*(e.slow>0?(e.kind==='boss'?0.8:0.52):1);
      if(e.kind==='twig'&&e.clock<0.6)speed*=1.8;
      if(e.kind==='spitter'&&dist<280)speed=0;
      if(e.kind==='boss'&&e.hp<e.maxHp*.5){speed*=1.5;e.phase=1;}
      e.x+=dx/dist*speed*dt;e.y+=dy/dist*speed*dt;
      if(dist<e.radius+15)this.hurt(e.attack);
      if(e.clock<=0){
        e.clock=e.kind==='boss'?(e.phase?2.8:4):e.kind==='twig'?3.5:3;
        if(e.kind==='spitter'||e.kind==='crystal')this.enemyShot(e,Math.atan2(dy,dx));
        if(e.kind==='boss'){
          const count=e.phase?12:8;for(let i=0;i<count;i++)this.enemyShot(e,i/count*Math.PI*2+this.seconds*.16,120);
          this.zones.push({id:this.nextId(),x:p.x,y:p.y,radius:e.phase?105:85,life:1.3,tick:0,damage:25,kind:'warning',timer:0});
        }
      }
    }
    this.rebuildGrid();
    for(const [id,value] of Object.entries(this.build)){
      const weapon=id as WeaponId;if(!['spark','spore','ember','frost','comet'].includes(id))continue;
      this.weaponClocks[weapon]=(this.weaponClocks[weapon]??0)-dt;
      if(this.weaponClocks[weapon]!<=0){this.weaponClocks[weapon]=({spark:0.95,spore:2.4,ember:1.05,frost:2.1,comet:1.2,leaf:1}[weapon])*this.haste;this.cast(weapon,value!);}
    }
    this.leafClock-=dt;
    if(this.build.leaf&&this.leafClock<=0){this.leafClock=0.4*this.haste;const r=(80+this.build.leaf*7)*this.reach;for(const e of this.nearby(p.x,p.y,r))this.hit(e,10*(1+this.build.leaf*.4)*this.power,'leaf');}
    for(const z of this.zones){z.life-=dt;z.timer+=dt;z.tick-=dt;
      if(z.kind==='warning'){if(z.life<=0){if(distance2(p,z)<(z.radius+12)**2)this.hurt(z.damage);this.effect({kind:'burst',x:z.x,y:z.y,radius:z.radius,color:0xe77e70});}continue;}
      if(z.tick<=0){z.tick=0.5;for(const e of this.nearby(z.x,z.y,z.radius)){this.hit(e,z.damage,z.kind,true);if(z.kind==='spore')e.spore=2;else e.burn=2;}}
    }
    this.zones=this.zones.filter(z=>z.life>0).slice(-45);
    for(const shot of this.shots){
      shot.life-=dt;shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;
      if(shot.weapon==='enemy'){if(distance2(shot,p)<(shot.radius+13)**2){this.hurt(shot.damage);shot.life=0;}continue;}
      for(const e of this.nearby(shot.x,shot.y,shot.radius,this.shotCandidates,62)){
        if(e.hp<=0||shot.hit.has(e.id))continue;
        shot.hit.add(e.id);this.hit(e,shot.damage,shot.weapon,false,Math.atan2(shot.vy,shot.vx));shot.pierce--;
        if(shot.weapon==='ember'){
          e.burn=3;const radius=(55+(this.build.ember??1)*5)*this.reach;
          for(const n of this.nearby(e.x,e.y,radius))if(n.id!==e.id){this.hit(n,shot.damage*.65,'ember',true);n.burn=3;}
          this.effect({kind:'burst',x:e.x,y:e.y,radius,color:0xf4b172});
        }
        if(shot.pierce<=0){shot.life=0;break;}
      }
    }
    this.shots=this.shots.filter(s=>s.life>0);
    for(const e of this.enemies)if(e.hp<=0){
      this.kills++;const elite=['boss','brute','crystal'].includes(e.kind);const value=elite?24:3;
      // Merge overflow XP rather than dropping rewards when a player circles the arena.
      if(this.drops.length<300)this.drops.push({id:this.nextId(),x:e.x,y:e.y,born:this.seconds,value,kind:'xp'});else {const existing=this.drops.find(d=>d.kind==='xp');if(existing)existing.value+=value;}
      if(this.drops.length<320&&(elite||this.rng.next()<0.025))this.drops.push({id:this.nextId(),x:e.x+12,y:e.y,born:this.seconds,value:elite?22:12,kind:'heal'});
      if(e.kind==='boss'){this.won=true;this.ended=true;}
    }
    this.enemies=this.enemies.filter(e=>e.hp>0 && (e.kind==='boss' || distance2(e,p)<1400**2));
    const pickup = this.pickupRadius;
    let gathered = false;
    this.drops=this.drops.filter(d=>{
      const squared = distance2(d,p);
      if(squared>1600**2)return false;
      if(squared>=pickup*pickup)return true;
      const dist=Math.sqrt(squared);
      const travel=Math.min(320*dt,dist)/Math.max(1,dist);
      d.x+=(p.x-d.x)*travel;d.y+=(p.y-d.y)*travel;
      if(dist>22)return true;
      if(d.kind==='heal'){p.hp=Math.min(p.maxHp,p.hp+d.value);this.effect({kind:'heal',x:p.x,y:p.y,text:`+${d.value}`});}
      else {this.xp+=d.value*(1+(this.build.fortune??0)*.1);gathered=true;}
      return false;
    });
    if(gathered)this.effect({kind:'gather',x:p.x,y:p.y+6,color:0xf4cf78,radius:15});
    while(this.xp>=xpNeeded(this.level)){this.xp-=xpNeeded(this.level);this.level++;this.pendingLevels++;p.hp=Math.min(p.maxHp,p.hp+2+(this.build.fortune??0)*2);}
  }
  resolveLevel(id?:UpgradeId){if(this.pendingLevels<=0)return;if(id)this.addUpgrade(id);else this.player.hp=Math.min(this.player.maxHp,this.player.hp+20);this.pendingLevels--;}
  summary():RunSummary{return{character:this.character.id,seconds:this.seconds,kills:this.kills,won:this.won,level:this.level,synergy:this.synergySeen,seed:this.seed};}
}
