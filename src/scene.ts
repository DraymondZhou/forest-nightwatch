import {drawShieldWave,drawMelee,drawWarning,drawArrow,drawEnemyMissile} from './encounterInk';
import Phaser from 'phaser';
import {drawLightning,shapeLightning,stormImpactFrame} from './lightning';
import {FrameStats} from './frameStats';
import hurtFaces from './hurt-faces.json';
import {InkMarks,MARK} from './marks';
import {Combat,CRYSTAL_SPREAD,enemyBodyY,LAMP_LURE_RADIUS,RITUAL_TIME,type Effect,type Shot} from './combat';

import turnAtlas from './traveler-turns.json';
import travelerAtlas from './traveler-atlas.json';
import ancientTreeAtlas from './ancient-tree.json';
import { enemyPoseFrame, enemyRestFrame } from './enemyPose';
import { EnemyHealth, HEALTH_FONT } from './enemyHealth';
import { PickupSprites } from './pickups';
import { Woodland } from './terrain';
import { art } from './art';
import {WitchRig} from './rig';
import {MartialRig} from './martialRig';
import type {AudioDirector} from './audio';

const enemyTexture=(kind:string)=>kind==='boss'?'ancient-tree':kind==='boar'||kind==='mothQueen'?'mini-bosses':'enemies';
function sheetFrame(texture:string,pose:number){
  const phase=Math.floor(pose/72),local=pose%24;
  if(texture==='ancient-tree')return phase*24+local;
  if(texture==='mini-bosses')return phase*48+pose%72;
  if(texture==='beetle-broken')return local;
  return pose;
}
const SINGLE_SHOT=[0] as const;
const TINT:Record<string,number>={spark:0xa0ecdf,spore:0xc4d599,leaf:0xe2d79b,ember:0xf2b17a,frost:0xb8d9ef,comet:0xd2b0e5,enemy:0xf29483};
type VisualEffect=Effect&{life:number;max:number;fromWand?:boolean;blade?:ReturnType<MartialRig['bladeLine']>;arc?:ReturnType<typeof shapeLightning>};
export interface SceneHooks {tick:(sim:Combat,stats:FrameStats)=>void;health:(sim:Combat)=>void;showFps:()=>boolean;upgrade:()=>void;gift:()=>void;relic:()=>void;wound:(dx:number,dy:number,low:boolean)=>void;end:()=>void;pause:()=>void;ready:()=>void;error:(message:string)=>void;audio:AudioDirector;lowQuality:()=>boolean;showEnemyHealth:()=>boolean;showEnemyHealthNumbers:()=>boolean}
export class ForestScene extends Phaser.Scene {
  sim?:Combat;running=false;private hooks:SceneHooks;
  private woods!:Woodland;private warningInk!:Phaser.GameObjects.Graphics;private worldInk!:Phaser.GameObjects.Graphics;private fxInk!:Phaser.GameObjects.Graphics;
  private rig?:WitchRig|MartialRig;private sprites=new Map<number,Phaser.GameObjects.Image>();private spritePool:Phaser.GameObjects.Image[]=[];
  private jobField!:InkMarks;private jobHits!:InkMarks;private fieldMarks!:InkMarks;private hitMarks!:InkMarks;private stormMarks!:InkMarks;private dashQueued=false;
  private health!:EnemyHealth;
  private pickups!: PickupSprites;
  private cacheMarker!: Phaser.GameObjects.Image;
  private readonly visibleEnemies = new Set<number>();
  private readonly remains: {sprite:Phaser.GameObjects.Image; x:number; y:number; dx:number; dy:number; age:number; size:number}[] = [];
  private remainCursor = 0;
  private lastGather = -1;
  private stickState = '';
  private readonly touchControl=matchMedia('(pointer: coarse)');
  private woundText!:Phaser.GameObjects.BitmapText;
  private texts:Phaser.GameObjects.Text[]=[];private textCursor=0;private effects:VisualEffect[]=[];
  private keys?:Record<string,Phaser.Input.Keyboard.Key>;private accumulator=0;private previousX=0;private previousY=0;private uiClock=0;private readonly frameStats=new FrameStats();
  private stick?:{id:number;x:number;y:number};private movement={x:0,y:0};private stickInk!:Phaser.GameObjects.Graphics;
  constructor(hooks:SceneHooks){super('forest');this.hooks=hooks;}
  preload(){
    this.load.spritesheet('hunter-motion',art('hunter-motion.png'),{frameWidth:128,frameHeight:128});
    this.load.atlas('hurt-faces',art('hurt-faces.png'),hurtFaces);
    this.load.spritesheet('mini-bosses',art('mini-bosses.png'),{frameWidth:128,frameHeight:128});
    this.load.atlas('ancient-tree',art('ancient-tree.webp'),ancientTreeAtlas);
    this.load.spritesheet('profession-marks',art('profession-marks.png'),{frameWidth:128,frameHeight:128});
    this.load.spritesheet('field',art('field-marks.png'),{frameWidth:96,frameHeight:96});
    this.load.spritesheet('storm-impact',art('storm-impact.png'),{frameWidth:64,frameHeight:64});
    this.load.image('coin',art('coin.png'));
    this.load.image('thorn-cache',art('thorn-cache.png'));
    this.load.image('fern-hollow',art('fern-hollow.png'));
    this.load.spritesheet('beetle-broken',art('beetle-broken.png'),{frameWidth:128,frameHeight:128});
    this.load.spritesheet('pickups',art('pickups.png'),{frameWidth:64,frameHeight:64});
    this.load.image('ground',art('woodcut-ground.webp'));this.load.image('props',art('woodcut-props.png'));this.load.spritesheet('enemies',art('enemy-poses.png'),{frameWidth:128,frameHeight:128});
    this.load.spritesheet('grip',art('grip-parts.png'),{frameWidth:128,frameHeight:128});
    this.load.spritesheet('mage-regalia',art('mage-regalia.png'),{frameWidth:128,frameHeight:128});
    this.load.atlas('turns',art('traveler-turns.png'),turnAtlas);
    this.load.atlas('traveler',art('traveler.png'),travelerAtlas);
    this.load.on('loaderror',()=>this.hooks.error('部分美术资源加载失败，请检查网络后重新加载。'));
  }
  create(){
    const props=this.textures.get('props'), sheet=props.getSourceImage();
    for(let i=0;i<4;i++)props.add(i,0,i*sheet.width/4,0,sheet.width/4,sheet.height);
    this.jobField=new InkMarks(this,2,280,'profession-marks');this.jobHits=new InkMarks(this,5002,64,'profession-marks');
    this.fieldMarks=new InkMarks(this,1,360);this.hitMarks=new InkMarks(this,5001,64);
    this.stormMarks=new InkMarks(this,5001,32,'storm-impact');
    this.health=new EnemyHealth(this);
    this.woundText=this.add.bitmapText(0,0,HEALTH_FONT,'',14).setTint(0xffa59c).setDepth(6000).setVisible(false);
    this.woods=new Woodland(this);this.pickups=new PickupSprites(this);
    this.cacheMarker=this.add.image(0,0,'thorn-cache').setOrigin(.5,.85).setDisplaySize(85,77).setDepth(3).setVisible(false);
    // Keep incoming shots and attack silhouettes legible through allied lightning and impacts.
    this.warningInk=this.add.graphics().setDepth(5003);this.worldInk=this.add.graphics().setDepth(-1);this.fxInk=this.add.graphics().setDepth(5000);this.stickInk=this.add.graphics().setScrollFactor(0).setDepth(10000);
    for(let i=0;i<28;i++)this.texts.push(this.add.text(0,0,'',{fontFamily:'Georgia, serif',fontSize:'17px',color:'#f4dfb4',stroke:'#15332d',strokeThickness:3}).setDepth(6000).setVisible(false));

    this.keys=this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.keyboard?.on('keydown-SPACE',(e:KeyboardEvent)=>{if(!e.repeat)this.requestDash();});
    this.input.keyboard?.on('keydown-ESC',()=>{if(this.running)this.hooks.pause()});
    this.input.addPointer(1);
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(!this.running||this.stick||p.x>this.scale.width*.48)return;this.stick={id:p.id,x:p.x,y:p.y};});
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(!this.stick||p.id!==this.stick.id)return;const dx=p.x-this.stick.x,dy=p.y-this.stick.y;const size=65;this.movement={x:dx/Math.max(size,Math.hypot(dx,dy)),y:dy/Math.max(size,Math.hypot(dx,dy))};});
    const reset=()=>{this.stickState='';this.stick=undefined;this.movement={x:0,y:0};this.stickInk.clear()};
    const release=(p:Phaser.Input.Pointer)=>{if(p.id===this.stick?.id)reset();};
    this.input.on('pointerup',release);this.input.on('pointerupoutside',release);this.game.canvas.addEventListener('pointercancel',reset);
    this.events.once('shutdown',()=>this.game.canvas.removeEventListener('pointercancel',reset));
    const resize=(size:Phaser.Structs.Size,_base:Phaser.Structs.Size,_display:Phaser.Structs.Size,previousWidth:number,previousHeight:number)=>{
      if(size.width===previousWidth && size.height===previousHeight)return;
      const camera=this.cameras.main;
      camera.setSize(size.width,size.height);
      this.woods.resize(size.width,size.height);
      reset();
      if(this.sim){
        const {x,y}=this.sim.player;
        camera.centerOn(x,y);
        this.woods.follow(x,y,this.sim.seed);
        this.drawStick();
      }
    };
    this.scale.on(Phaser.Scale.Events.RESIZE,resize);
    this.events.once('shutdown',()=>this.scale.off(Phaser.Scale.Events.RESIZE,resize));
    // Orientation events can arrive before layout settles. Re-read the actual
    // container even while combat is paused and the game loop is catching up.
    const viewport=new ResizeObserver(([entry])=>{
      const {width,height}=entry.contentRect;
      const display=this.scale.displaySize;
      if(width<=0 || height<=0 || (width===display.width && height===display.height))return;
      this.scale.getParentBounds();
      this.scale.refresh();
    });
    viewport.observe(this.game.canvas.parentElement!);
    this.events.once('shutdown',()=>viewport.disconnect());
    const sampleRender=()=>{
      if(this.running && this.hooks.showFps())this.frameStats.record(performance.now());
    };
    this.game.events.on(Phaser.Core.Events.POST_RENDER,sampleRender);
    this.events.once('shutdown',()=>this.game.events.off(Phaser.Core.Events.POST_RENDER,sampleRender));
    this.hooks.ready();
  }
  requestDash(){if(this.running && this.sim && this.sim.dashCooldown<=0)this.dashQueued=true;}
  begin(sim:Combat){
    this.dashQueued=false;
    for(const r of this.remains){r.age=1;r.sprite.setVisible(false);}
    this.tweens.killTweensOf(this.woundText);this.woundText.setVisible(false);
    this.fxInk.clear();this.worldInk.clear();this.warningInk.clear();this.health.begin();this.health.end();
    this.cacheMarker.setVisible(false);
    this.lastGather=-1;this.stickState='';
    this.sim=sim;this.previousX=sim.player.x;this.previousY=sim.player.y;this.accumulator=0;this.uiClock=0;this.frameStats.reset();this.effects=[];
    this.sprites.forEach(s=>{s.setVisible(false);this.spritePool.push(s)});this.sprites.clear();this.texts.forEach(t=>t.setVisible(false));
    this.rig?.destroy();this.rig=sim.path.job==='mage'?new WitchRig(this,0xffffff):new MartialRig(this,sim.path.job);this.running=true;
    this.rig.update(0,false,0,false,0);
    this.rig.root.setPosition(sim.player.x,sim.player.y).setDepth(1000);this.cameras.main.centerOn(sim.player.x,sim.player.y);
    this.cameras.main.startFollow(this.rig.root,sim.path.job!=='hunter',.12,.12);this.cameras.main.setZoom(1);
    this.hooks.tick(sim,this.frameStats);
  }
  setPaused(paused:boolean){if(this.sim){this.previousX=this.sim.player.x;this.previousY=this.sim.player.y;}this.running=!paused;this.dashQueued=false;this.frameStats.reset();this.movement={x:0,y:0};this.stick=undefined;this.stickInk?.clear();this.stickState='';this.accumulator=0;this.input?.keyboard?.resetKeys();}
  update(_time:number,delta:number){
    if(!this.sim||!this.rig||!this.running)return;
    const dt=Math.min(delta/1000,.1);
    const k=this.keys;const input={x:this.movement.x+(k?.D.isDown||k?.RIGHT.isDown?1:0)-(k?.A.isDown||k?.LEFT.isDown?1:0),y:this.movement.y+(k?.S.isDown||k?.DOWN.isDown?1:0)-(k?.W.isDown||k?.UP.isDown?1:0)};
    this.accumulator=Math.min(this.accumulator+dt,.1);
    while(this.accumulator>=1/60&&this.running){
      this.previousX=this.sim.player.x;this.previousY=this.sim.player.y;
      this.sim.step(1/60,{...input,dash:this.dashQueued});this.dashQueued=false;this.accumulator-=1/60;this.captureEffects();
      if(this.sim.ended){
        this.running=false;
        this.hooks.tick(this.sim,this.frameStats);
        if(this.sim.player.hp<=0){
          this.rig.fall();const finished=this.sim;
          this.time.delayedCall(380,()=>{if(this.sim===finished)this.hooks.end();});
        }else this.hooks.end();
        break;
      }
      if(this.sim.relicPending){this.running=false;this.hooks.relic();break;}
      if(this.sim.giftPending){this.running=false;this.hooks.gift();break;}
      if(this.sim.pendingLevels>0){this.running=false;this.hooks.upgrade();break;}
    }
    const readyPose=this.sim.path.job==='mage'?this.sim.focus>=1:this.sim.heavyReady;
    const target=this.sim.windupTarget;
    if(this.rig instanceof MartialRig){
      const facing=this.sim.combatFacingTarget;
      if(facing)this.rig.track(facing.x-this.sim.player.x,facing.y-this.sim.player.y);
    }
    if(target)this.rig.prepare(target.x-this.sim.player.x,target.y-this.sim.player.y,this.sim.windupTime);
    this.rig.update(dt,this.sim.player.moving,this.sim.player.angle,this.sim.player.invincible>0,this.sim.seconds,this.sim.dashTime,readyPose);
    // Render between the two fixed simulation samples on high-refresh displays.
    const blend=this.sim.path.job==='hunter' && this.running?Math.min(1,this.accumulator*60):1;
    const p=this.sim.player;
    this.rig.root.setPosition(this.previousX+(p.x-this.previousX)*blend,this.previousY+(p.y-this.previousY)*blend);
    this.woods.follow(this.sim.player.x,this.sim.player.y,this.sim.seed);this.drawWorld();this.drawRemains(dt);this.drawEffects(this.running?dt:0);this.drawStick();
    this.uiClock+=dt;if(this.uiClock>.12){this.uiClock=0;this.hooks.tick(this.sim,this.frameStats);}
  }
  private captureEffects(){
    for(const effect of this.sim!.effects){
      if(effect.kind==='wound'){
        const dx=effect.x-effect.tx!,dy=effect.y-effect.ty!;
        this.hooks.health(this.sim!);
        this.rig!.hurt(dx,dy);this.hooks.audio.hurt();this.hooks.wound(-dx,-dy,this.hooks.lowQuality());
      }
      if(effect.kind==='dash'||effect.kind==='evade')this.hooks.audio.play(effect.kind);
      if(effect.kind==='slash' && effect.empowered && this.rig instanceof MartialRig){
        this.rig.cleave();
        this.hooks.audio.heavySwing();
      }
      if(effect.kind==='synergy' && effect.weapon==='bow')this.hooks.audio.igniteArrow();
      if(effect.kind==='cast'){
        const job=this.sim!.path.job;
        if(job==='mage'||effect.weapon===this.sim!.path.weapon||(job==='hunter'&&(effect.weapon==='ember'||effect.weapon==='comet')))this.rig!.cast(effect.tx!-effect.x,effect.ty!-effect.y);
        if(job==='mage'&&this.effects.length<100)this.effects.push({...effect,life:.105,max:.105});
        continue;
      }
      const fromWand=effect.kind==='chain' && effect.x===this.sim!.player.x && effect.y===this.sim!.player.y;
      if(effect.kind==='chain'){
        if(this.effects.length<100){
          const delay=(effect.hop??0)*.018,life=.26+delay;
          const arc=shapeLightning(effect.arcSeed??0,Math.hypot(effect.tx!-effect.x,effect.ty!-effect.y));
          this.effects.push({...effect,life,max:life,fromWand,arc,y:effect.y-10,ty:effect.ty!-10});
        }
        continue;
      }
      if(effect.kind==='defeat'){this.showDefeat(effect);continue;}
      if(effect.kind==='shellBreak')this.hooks.audio.impact(true,'blade');
      if(effect.kind==='gather'){
        if(this.sim!.seconds-this.lastGather<.12)continue;
        this.lastGather=this.sim!.seconds;this.hooks.audio.gather();
      }
      if(effect.kind==='strike'){
        this.hooks.audio.impact((effect.radius??0)>18,effect.weapon,effect.empowered);
        if(effect.weapon==='spark')continue; // Each chain hop paints its own timed impact.
      }
      if(effect.kind==='wound'){
        if(!this.hooks.lowQuality()){
          const t=this.woundText;this.tweens.killTweensOf(t);
          t.setText(effect.text??'').setPosition(effect.x,effect.y-24).setVisible(true).setAlpha(1);
          this.tweens.add({targets:t,y:t.y-25,alpha:0,duration:500,onComplete:()=>t.setVisible(false)});
        }
      }else if(effect.kind==='hit'||effect.kind==='evade'){
        if(!this.hooks.lowQuality()){const t=this.texts[this.textCursor++%this.texts.length];this.tweens.killTweensOf(t);t.setPosition(effect.x,effect.y-24).setText(effect.kind==='evade'?'险避':effect.text??'').setVisible(true).setAlpha(1).setColor(effect.kind==='evade'?'#bde7ca':'#f0ddb6');this.tweens.add({targets:t,y:t.y-25,alpha:0,duration:500,onComplete:()=>t.setVisible(false)});}

      }else if(effect.kind==='heal')this.hooks.audio.play('heal');
      if(effect.kind!=='hit'&&effect.kind!=='wound'&&this.effects.length<100){const life=effect.kind==='dash'?.25:effect.kind==='evade'?.32:effect.kind==='slash'||effect.kind==='impactZone'?.18:effect.kind==='strike'?.18:effect.kind==='gather'?.22:.5;this.effects.push({...effect,life,max:life,fromWand});}
    }
  }
  private showDefeat(effect: Effect) {
    if(!effect.enemyKind)return;
    const budget = this.hooks.lowQuality() ? 6 : 16;
    const index = this.remainCursor++ % budget;
    const r = this.remains[index] ?? (this.remains[index] = {
      sprite:this.add.image(0,0,'enemies'),x:0,y:0,dx:0,dy:0,age:0,size:0
    });
    const angle=effect.tx??0;
    r.x=effect.x;r.y=effect.y-10;r.age=0;r.size=(effect.radius??17)*3.5*1.16;
    r.dx=Math.cos(angle)*15;r.dy=Math.sin(angle)*10;
    const broken=effect.enemyKind==='beetle' && 'shellBroken' in effect && effect.shellBroken===true;
    const texture=broken?'beetle-broken':enemyTexture(effect.enemyKind);
    const chief=texture==='mini-bosses'||texture==='ancient-tree';
    const frame=sheetFrame(texture,enemyRestFrame(effect.enemyKind)+(chief?72:0));
    r.sprite.setTexture(texture,frame).setFlipX(effect.x>this.sim!.player.x)
      .setDepth(998).setVisible(true);
  }
  private drawRemains(dt:number) {
    for(const r of this.remains){
      if(!r.sprite.visible)continue;
      const t=Math.min(1,(r.age+=dt)/.19);
      if(t>=1){r.sprite.setVisible(false);continue;}
      const ease=t*(2-t);
      r.sprite.setPosition(r.x+r.dx*ease,r.y+r.dy*ease-4*Math.sin(Math.PI*t))
        .setDisplaySize(r.size*(1+.10*ease),r.size*(1-.22*ease))
        .setRotation(r.dx*.012*ease).setAlpha(1-ease);
      if(t<.24)r.sprite.setTint(0xffdaa2);else r.sprite.clearTint();
    }
  }
  refreshEnemyHealth(){if(this.sim&&!this.running)this.drawWorld();}
  private shotPosition(shot:Shot,angle:number,tail:number,x=shot.x,y=shot.y,impact=false){
    const enemy=shot.weapon==='enemy';
    const height=enemy?-10:-18;
    const age=(enemy?5:shot.lance?.78:2)-shot.life;
    if(!shot.releaseOffset){
      const live=age<.11;
      let attachment={x:0,y:height};
      const rig=this.rig!;
      if(!enemy && !shot.lance){
        if(rig instanceof MartialRig && this.sim?.path.job==='hunter')attachment=rig.bowSocket(shot.vx,shot.vy,live);
        else if(live && rig instanceof WitchRig){
          const tip=rig.wandTip();attachment={x:tip.x-rig.root.x,y:tip.y-rig.root.y};
        }
      }
      if(live && !enemy && !shot.lance){
        attachment.x+=rig.root.x-(shot.x-shot.vx*age);
        attachment.y+=rig.root.y-(shot.y-shot.vy*age);
      }
      shot.releaseOffset=attachment;
    }
    const socket=shot.releaseOffset;
    const ux=Math.cos(angle),uy=Math.sin(angle);
    // Keep the transverse component for the entire flight. Only the along-track
    // lead from the attachment to the projectile centre settles as it travels.
    const along=socket.x*ux+(socket.y-height)*uy;
    const travel=Math.hypot(shot.vx,shot.vy)*age;
    if(impact){
      const distance=(x-shot.x)*ux+(y-shot.y)*uy;
      x=shot.x+distance*ux;y=shot.y+distance*uy;
    }
    const lead=impact?0:(along+tail)*Math.max(0,1-travel/160);
    return this.flightPoint.set(x+socket.x+(lead-along)*ux,y+socket.y+(lead-along)*uy);
  }
  private flightPoint=new Phaser.Math.Vector2();
  private drawWorld(){
    const showHealth=this.hooks.showEnemyHealth(),showNumbers=showHealth && this.hooks.showEnemyHealthNumbers();this.health.begin();
    const sim=this.sim!,g=this.worldInk;g.clear();this.warningInk.clear();this.fieldMarks.begin();this.jobField.begin();
    const view=this.cameras.main.worldView;
    const visible=(x:number,y:number,margin:number)=>x>=view.left-margin && x<=view.right+margin && y>=view.top-margin && y<=view.bottom+margin;
    const cache=sim.cacheSite;
    const lampGlow=sim.lampGlow;
    if(lampGlow && lampGlow.until>sim.seconds && visible(lampGlow.x,lampGlow.y,80)){
      const fade=Math.min(1,lampGlow.until-sim.seconds);
      g.fillStyle(0xe6be74,.08*fade);g.fillEllipse(lampGlow.x,lampGlow.y,116,64);
      g.fillStyle(0xffdc87,.13*fade);g.fillEllipse(lampGlow.x,lampGlow.y-8,54,39);
      this.fieldMarks.paint(MARK.lamp,lampGlow.x,lampGlow.y-18,64);
      for(let i=0;i<5;i++){
        const phase=(sim.seconds*.65+i*.21)%1;
        const x=lampGlow.x+Math.sin(i*2.4+phase*3)*13;
        g.fillStyle(0xffe7a1,Math.sin(Math.PI*phase)*fade);g.fillCircle(x,lampGlow.y-26-phase*28,1.6);
      }
    }
    if(cache && visible(cache.x,cache.y,78)){
      this.cacheMarker.setVisible(true).setPosition(cache.x,cache.y);
      g.fillStyle(0xb89860,.09);g.fillCircle(cache.x,cache.y,52);
      g.lineStyle(1,0xe0bb7b,.8);g.strokeCircle(cache.x,cache.y,52);
      if(cache.charge>0){
        const progress=Math.min(1,cache.charge/RITUAL_TIME);
        g.lineStyle(3,0xf2d89e,.95);g.beginPath();g.arc(cache.x,cache.y,52,-Math.PI/2,-Math.PI/2+2*Math.PI*progress);g.strokePath();
      }
    }else this.cacheMarker.setVisible(false);
    if(sim.shrine){
      const lamp=sim.shrine;
      g.fillStyle(0xa9bc72,.13);g.fillCircle(lamp.x,lamp.y,52);
      g.lineStyle(1,0xd3cb92,.6);g.strokeCircle(lamp.x,lamp.y,52);
      if(lamp.charge>0){g.lineStyle(3,0xf4d889,.95);g.beginPath();g.arc(lamp.x,lamp.y,52,-Math.PI/2,-Math.PI/2+2*Math.PI*lamp.charge/RITUAL_TIME);g.strokePath();}
      this.fieldMarks.paint(MARK.lamp,lamp.x,lamp.y-18,64);
    }
    for(const z of sim.zones){
      if(!visible(z.x,z.y,z.radius))continue;
      if(z.kind==='warning'){drawWarning(this.warningInk,z.x,z.y,z.radius,z.shape??'disk',z.angle??0,z.timer/(z.duration??1.3));}
      else{
        if(z.kind==='spore' && sim.pathId==='fern' && sim.masteryActive && !z.bloomed){
          const size=Math.min(1,z.timer);
          g.lineStyle(2,0xbadb98,.65);g.beginPath();g.arc(z.x,z.y,z.radius,-Math.PI/2,-Math.PI/2+size*Math.PI*2);g.strokePath();
          this.fieldMarks.paint(MARK.leaf,z.x,z.y,15+9*size,0,.85);
        }
        g.fillStyle(z.kind==='spore'?0xa1b97b:0xde9d60,.13);g.fillCircle(z.x,z.y,z.radius);g.lineStyle(1,z.kind==='spore'?0xb7cf94:0xf2b17a,.32);g.strokeCircle(z.x,z.y,z.radius);for(let i=0;i<5;i++){const a=i/5*Math.PI*2+z.id;const x=z.x+Math.cos(a)*z.radius*.6,y=z.y+Math.sin(a)*z.radius*.6;this.fieldMarks.paint(z.kind==='ember'?MARK.ember:MARK.spore,x,y,16+(i%2)*4,.14*Math.sin(sim.seconds*2+i),.86);}}
    }
    this.pickups.draw(sim,view);
    const living=this.visibleEnemies;living.clear();
    for(const enemy of sim.enemies){
      if(!visible(enemy.x,enemy.y,enemy.radius*2+20))continue;
      living.add(enemy.id);let sprite=this.sprites.get(enemy.id);
      if(!sprite){
        sprite=this.spritePool.pop()??this.add.image(0,0,'enemies');
        const baseTexture=enemyTexture(enemy.kind);
        sprite.setTexture(baseTexture,sheetFrame(baseTexture,enemyRestFrame(enemy.kind))).setVisible(true);this.sprites.set(enemy.id,sprite);
      }
      const broken=enemy.kind==='beetle' && enemy.shellBroken;
      const texture=broken?'beetle-broken':enemyTexture(enemy.kind);
      if(enemy.frozen<=0 || enemy.flash>0 || sprite.texture.key!==texture){
        const distance=Math.hypot(enemy.x-sim.player.x,enemy.y-sim.player.y);
        const pose=enemyPoseFrame(enemy,distance);
        const frame=sheetFrame(texture,pose);
        if(sprite.texture.key!==texture)sprite.setTexture(texture,frame);
        else if(Number(sprite.frame.name)!==frame)sprite.setFrame(frame);
      }
      const recoil=enemy.flash/.08,weight=enemy.kind==='boss'?2:6,size=enemy.radius*3.5;
      const lured=enemy.kind==='moth' && lampGlow && lampGlow.until>sim.seconds &&
        (enemy.x-lampGlow.x)**2+(enemy.y-lampGlow.y)**2<=LAMP_LURE_RADIUS**2;
      const targetX=lured?lampGlow.x:sim.player.x;
      if(lured){
        const phase=(sim.seconds*1.2+enemy.id*.37)%1;
        const dx=lampGlow.x-enemy.x,dy=lampGlow.y-enemy.y;
        const step=phase*Math.min(.55,40/Math.max(1,Math.hypot(dx,dy)));
        g.fillStyle(0xffdd92,.83*Math.sin(Math.PI*phase));
        g.fillCircle(enemy.x+dx*step,enemy.y-9+dy*step,1.9);
      }
      sprite.setPosition(enemy.x+Math.cos(enemy.hitAngle)*recoil*weight,enemyBodyY(enemy)+Math.sin(enemy.hitAngle)*recoil*weight)
        .setDisplaySize(size*1.16,size*1.16).setFlipX(enemy.charge || (enemy.preparing && (enemy.kind==='boar'||enemy.kind==='beetle'||enemy.kind==='twig'||enemy.kind==='brute')) ? Math.cos(enemy.charge?.angle??enemy.attackHeading??0)<0 : enemy.x>targetX);
      if(showHealth)this.health.draw(enemy,sprite.x,sprite.y-size*.46,showNumbers);
      const depth=1000+Math.floor((enemy.y-sim.player.y)/4);if(sprite.depth!==depth)sprite.setDepth(depth);
      if(enemy.flash>.055)sprite.setTint(0xffcf99);else if(enemy.slow>0)sprite.setTint(0xa9d4f0);else sprite.clearTint();
      g.fillStyle(0x102e29,.35);g.fillEllipse(enemy.x,enemy.y+enemy.radius*.6,enemy.radius*1.7,enemy.radius*.65);
      if(enemy.kind==='boss'||enemy.kind==='brute'||enemy.kind==='crystal'){g.lineStyle(2,0xe59c7d,.65);g.strokeCircle(enemy.x,enemy.y,enemy.radius+5);}
      if((enemy.kind==='spitter'||enemy.kind==='crystal') && enemy.clock<.55 && enemy.clock>0){
        const aim=Math.atan2(sim.player.y-enemy.y,sim.player.x-enemy.x),t=1-enemy.clock/.55;
        this.warningInk.lineStyle(2,0xf3a38b,.36+.48*t);
        const bodyY=enemyBodyY(enemy),reach=enemy.radius+20+28*t;
        for(const offset of enemy.kind==='crystal'?CRYSTAL_SPREAD:SINGLE_SHOT){
          const ux=Math.cos(aim+offset),uy=Math.sin(aim+offset);
          this.warningInk.lineBetween(enemy.x+ux*enemy.radius,bodyY+uy*enemy.radius,enemy.x+ux*reach,bodyY+uy*reach);
        }
      }
      if(enemy.rooted>0){
        const radius=enemy.radius*.85;
        g.lineStyle(2,0xb1cb83,.85);g.strokeEllipse(enemy.x,enemy.y+4,radius*2,radius*.66);
        this.fieldMarks.paint(MARK.leaf,enemy.x-radius*.65,enemy.y+3,14,-.65,.9);
      }
      if(enemy.frozen>0)this.fieldMarks.paint(MARK.frost,enemy.x,enemy.y+4,enemy.radius*2);
      if(enemy.spore>0){g.fillStyle(0xd4e59c,.8);g.fillCircle(enemy.x+10,enemy.y-18,3);}
    }
    for(const [id,sprite]of this.sprites)if(!living.has(id)){sprite.setVisible(false);this.spritePool.push(sprite);this.sprites.delete(id);}
    for(const shot of sim.shots){
      if(!visible(shot.x,shot.y,36))continue;
      const angle=Math.atan2(shot.vy,shot.vx);
      if(shot.weapon==='enemy'){
        const pos=this.shotPosition(shot,angle,0);
        drawEnemyMissile(this.warningInk,pos.x,pos.y,angle,shot.missile??'seed');continue;
      }
      if(sim.path.job==='hunter' && (shot.weapon==='bow'||shot.weapon==='ember'||shot.weapon==='comet')){
        const marked=shot.weapon!=='bow'||!!sim.build.ember,size=shot.weapon==='comet'?60:56;
        const pos=this.shotPosition(shot,angle,marked?size*50/128:12);
        if(marked)this.jobField.paint(shot.weapon==='comet'?1:0,pos.x,pos.y,size,angle);
        else drawArrow(g,pos.x,pos.y,angle);
        continue;
      }
      const {x:visualX,y:visualY}=this.shotPosition(shot,angle,0);
      if(shot.weapon==='bow'){drawArrow(g,visualX,visualY,angle);continue;}
      if(shot.weapon==='blade')continue;
      if(!this.hooks.lowQuality()){g.lineStyle(shot.weapon==='comet'?4:2,TINT[shot.weapon],.38);g.lineBetween(visualX,visualY,visualX-shot.vx*.055,visualY-shot.vy*.055);}
      if(shot.lance){
        const ux=Math.cos(angle),uy=Math.sin(angle);
        g.fillStyle(0xf49656,.85);
        g.fillTriangle(visualX+ux*13,visualY+uy*13,visualX-ux*37-uy*5,visualY-uy*37+ux*5,visualX-ux*22+uy*6,visualY-uy*22-ux*6);
        g.lineStyle(2,0xffde86,1);g.lineBetween(visualX-ux*42,visualY-uy*42,visualX+ux*13,visualY+uy*13);
      }
      this.fieldMarks.paint(MARK[shot.weapon],visualX,visualY,shot.weapon==='comet'?32:27,angle);
    }
    const p=sim.player;g.fillStyle(0x0b2926,.5);g.fillEllipse(p.x,p.y+21,35,13);if(sim.dashTime>0){g.lineStyle(1,0xcbe5b2,.55);g.strokeEllipse(p.x,p.y+16,39,12);}
    if(sim.build.leaf){const count=2+sim.build.leaf,r=(80+sim.build.leaf*7)*sim.reach;if(sim.path.job!=='warden'){g.lineStyle(1,0xe4d998,.16);g.strokeCircle(p.x,p.y,r);}for(let i=0;i<count;i++){const a=sim.seconds*2.6+i/count*Math.PI*2;const x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;if(sim.path.job==='warden')this.jobField.paint(2,x,y,49,a+1.1);else this.fieldMarks.paint(MARK.leaf,x,y,25,a+1.8);}}
    this.fieldMarks.end();this.jobField.end();this.health.end();
  }
  private drawEffects(dt:number){const g=this.fxInk;g.clear();this.hitMarks.begin();this.stormMarks.begin();this.jobHits.begin();for(const e of this.effects){e.life-=dt;if(e.life<=0)continue;const alpha=e.life/e.max;g.lineStyle(e.kind==='chain'?3:2,e.color??0xc8dcac,alpha*.8);if(e.kind==='cast'){
        const tip=e,r=2+alpha*3;
        if(e.fromWand!==false){
          const pos=this.rig!.wandTip();e.x=pos.x;e.y=pos.y;e.fromWand=false;
        }
        if(e.weapon==='bow'||e.weapon==='blade')continue;
        if(e.weapon==='spark'){
          this.stormMarks.paint(Math.min(5,Math.floor((1-alpha)*6)),tip.x,tip.y,18,-.7,alpha);
          continue;
        }
        if(!e.weapon)continue;
        const a=Math.atan2(e.ty!-e.y,e.tx!-e.x),dx=Math.cos(a),dy=Math.sin(a);
        this.hitMarks.paint(MARK[e.weapon],tip.x+dx*(1-alpha)*9,tip.y+dy*(1-alpha)*9,9+r*1.5,a,alpha);
        g.fillStyle(TINT[e.weapon]??0xffedbe,alpha);g.fillCircle(tip.x,tip.y,r*.34);
      }else if(e.kind==='shellBreak'){
        const age=1-alpha, spread=(e.radius??24)*(.45+age);
        for(let i=0;i<(this.hooks.lowQuality()?3:6);i++){
          const angle=i*2.4+e.x*.03, cx=e.x+Math.cos(angle)*spread, cy=e.y-10+Math.sin(angle)*spread*.5-22*Math.sin(age*Math.PI);
          const dx=Math.cos(angle+age)*6, dy=Math.sin(angle+age)*6;
          g.fillStyle(i%2?0x819583:0xe1ba85,alpha);
          g.fillTriangle(cx+dx,cy+dy,cx-dx,cy-dy,cx+dy*.7,cy-dx*.7);
        }
      }else if(e.kind==='lure'){
        const reach=15+(1-alpha)*41;
        g.lineStyle(2,0xffe7a1,alpha*.7);g.strokeEllipse(e.x,e.y,reach*2,reach);
      }else if(e.kind==='gather'){
        const reach=3+alpha*10;
        for(let i=0;i<3;i++){const a=i*2.094+.4;g.fillStyle(0xffdd8b,alpha);g.fillCircle(e.x+Math.cos(a)*reach,e.y+Math.sin(a)*reach,1+alpha*1.6);}
       }else if(e.kind==='dash'||e.kind==='evade'){
        const evade=e.kind==='evade',angle=e.tx??0;
        for(let i=0;i<(this.hooks.lowQuality()?2:5);i++){
          const a=evade?i*1.26:angle+Math.PI+(i-2)*.30;
          const distance=8+(1-alpha)*(evade?35:18)+i*2;
          this.hitMarks.paint(MARK.leaf,e.x+Math.cos(a)*distance,e.y+Math.sin(a)*distance,9+alpha*8,a+.4,alpha);
        }
      }else if(e.kind==='frost'){
        const radius=(e.radius??80)*(1-alpha*.69);
        if(this.sim!.path.job==='warden'){
          drawShieldWave(g,e.x,e.y,radius,alpha);
          for(let k=0;k<3;k++){const a=k*2.094+.9;this.jobHits.paint(3,e.x+Math.cos(a)*radius,e.y+Math.sin(a)*radius,43+alpha*13,a+Math.PI*.5,alpha);}
          continue;
        }
        g.lineStyle(2,0xbfe9e6,alpha*.7);g.strokeCircle(e.x,e.y,radius);
        for(let i=0;i<(this.hooks.lowQuality()?3:8);i++){const a=i*Math.PI/4;this.hitMarks.paint(MARK.frost,e.x+Math.cos(a)*radius,e.y+Math.sin(a)*radius,18+alpha*9,a+Math.PI/2,alpha);}
      }else if(e.kind==='strike'){
        const sim=this.sim!;
        const point=e.shot?this.shotPosition(e.shot,e.tx??0,0,e.x,e.y,true):e;
        const x=point.x,y=point.y;
        if(e.weapon==='bow' && e.empowered){
          const angle=e.tx??0,ux=Math.cos(angle),uy=Math.sin(angle);
          const reach=6+22*(1-alpha);
          g.lineStyle(2,0xefdb98,alpha).lineBetween(x+ux*reach,y+uy*reach,x+ux*(reach+10),y+uy*(reach+10));
          for(const side of [-1,1]){
            const tx=x+ux*reach-uy*side*5,ty=y+uy*reach+ux*side*5;
            g.lineStyle(1.5,0xc1d1a2,alpha).lineBetween(tx,ty,tx-ux*7-uy*side*3,ty-uy*7+ux*side*3);
          }
          continue;
        }
        if(sim.path.job==='hunter' && (e.weapon==='ember'||e.weapon==='comet')){
          this.jobHits.paint(e.weapon==='comet'?5:4,x,y,42+30*(1-alpha),e.tx??0,alpha);
          continue;
        }
        if(sim.path.job==='warden' && (e.weapon==='leaf'||e.weapon==='frost')){
          this.jobHits.paint(e.weapon==='leaf'?2:3,x,y-3,40+(1-alpha)*20,e.tx??0,alpha);
          continue;
        }
        if(e.weapon && e.weapon!=='blade' && e.weapon!=='bow' && !this.hooks.lowQuality())this.hitMarks.paint(MARK[e.weapon],x,e.shot?y:y-4,16+(1-alpha)*17,(e.tx??0)*.6,alpha);
        if(alpha>.65){
          const a=e.tx??0,dx=Math.cos(a),dy=Math.sin(a),r=(e.radius??14)*alpha;
          g.fillStyle(0xffedc5,alpha);
          g.fillTriangle(x+dx*r,y+dy*r,x-dy*3,y+dx*3,x+dy*3-dx*r*.5,y-dx*3-dy*r*.5);
        }
        const travel=(1-alpha)*(e.radius??16);
        for(let i=-1;i<=1;i++){
          const a=(e.tx??0)+i*.72;
          const dx=Math.cos(a),dy=Math.sin(a);
          g.lineBetween(x+dx*(4+travel),y+dy*(4+travel),x+dx*(8+travel+alpha*6),y+dy*(8+travel+alpha*6));
        }
       }else if(e.kind==='slash'){
        // A short blade trace begins at the wielding hand, ahead of the wider hit.
        const a=e.tx!,age=1-alpha;
        if(this.sim!.path.job==='warden' && this.rig instanceof MartialRig){
          const blade=e.blade??=this.rig.bladeLine();
          drawMelee(g,blade.x,blade.y,blade.length,blade.angle+.82,Math.min(1,age*1.45));
        }
        const reach=Phaser.Math.Linear(40,e.radius!,Math.min(1,age*2.5));
        drawMelee(g,e.x,e.y-12*(1-age),reach,a,age,e.empowered?.72:.48);
        if(e.empowered){
          drawMelee(g,e.x,e.y,e.radius!*.82,e.tx!-.12,Math.min(.99,1-alpha+.09));
          const a=e.tx!-.8+1.68*Math.min(1,(1-alpha)/.64),r=e.radius!;
          this.jobHits.paint(2,e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,16+12*alpha,a+Math.PI*.5,alpha);
        }
      }else if(e.kind==='synergy' && e.weapon==='bow'){
        const pos=e.shot?this.shotPosition(e.shot,e.tx??0,0,e.x,e.y,true):e;
        this.jobHits.paint(4,pos.x,pos.y,32+(1-alpha)*23,e.tx??0,alpha);
      }else if(e.kind==='impactZone'){
        if(e.shape==='cleave')drawMelee(g,e.x,e.y,e.radius!,e.tx??0,1-alpha);
        else {const r=e.radius!;g.lineStyle(3,0xd7ba87,alpha*.73).strokeCircle(e.x,e.y,r*(1.06-alpha*.15));if(e.shape==='ring')g.lineStyle(2,0xe9d3ab,alpha*.60).strokeCircle(e.x,e.y,r*.54);}
      }else if(e.kind==='burst' && this.sim!.path.job==='hunter'){
        const r=(e.radius??55)*(.22+(1-alpha)*.78);
        for(let k=0;k<(this.hooks.lowQuality()?3:6);k++){const a=k*2.4+e.x*.03,dx=Math.cos(a),dy=Math.sin(a);
          g.lineStyle(1.5,0xe89c67,alpha*.8);g.lineBetween(e.x+dx*r*.67,e.y+dy*r*.67,e.x+dx*r,e.y+dy*r);
          g.fillStyle(0xfcd991,alpha);g.fillCircle(e.x+dx*r,e.y+dy*r,1+alpha);}
      }else if(e.kind==='bloom'){
        const radius=e.radius??72,t=1-alpha;
        g.lineStyle(2,0xc5df96,alpha*.74);g.strokeCircle(e.x,e.y,radius*(.30+t*.70));
        for(let i=0;i<(this.hooks.lowQuality()?4:8);i++){
          const a=i*Math.PI*(this.hooks.lowQuality()?.50:.25),r=radius*(.20+t*.62);
          this.hitMarks.paint(MARK.leaf,e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,22+8*alpha,a+.6,alpha);
        }
      }else if(e.kind==='chain' && e.arc){
        const age=e.max-e.life-(e.hop??0)*.018;
        if(e.fromWand){const tip=this.rig!.wandTip();e.x=tip.x;e.y=tip.y;e.fromWand=false;}
        const charged=!!e.empowered;
        drawLightning(g,e.arc,e.x,e.y,e.tx!,e.ty!,age,charged,this.hooks.lowQuality());
        const frame=stormImpactFrame(age,charged);
        if(frame>=0)this.stormMarks.paint(frame,e.tx!,e.ty!,charged?53:33,e.arc.angle);
      }else{g.strokeCircle(e.x,e.y,(e.radius??40)*(1-alpha*.65));} }
    this.hitMarks.end();this.stormMarks.end();this.jobHits.end();this.effects=this.effects.filter(e=>e.life>0);}
  private drawStick(){const g=this.stickInk;
    const state=this.stick?[this.stick.x,this.stick.y,this.movement.x,this.movement.y].join(','):'idle';
    if(state===this.stickState)return;this.stickState=state;g.clear();if(!this.running||(!this.stick&&!this.touchControl.matches))return;const x=this.stick?.x??110,y=this.stick?.y??this.scale.height-115;g.lineStyle(2,0xd9e6d1,.2);g.strokeCircle(x,y,58);g.fillStyle(0xd9e6d1,this.stick?.12:.035);g.fillCircle(x,y,56);g.fillStyle(0xe3eadb,this.stick?.3:.09);g.fillCircle(x+this.movement.x*42,y+this.movement.y*42,23);}
}
