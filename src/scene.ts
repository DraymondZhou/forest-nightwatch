import Phaser from 'phaser';
import {Combat,WORLD,type EnemyKind,type Effect} from './combat';

import {WitchRig} from './rig';
import type {AudioDirector} from './audio';

const FRAME:Record<EnemyKind,number>={slime:0,moth:1,twig:2,spitter:3,beetle:4,brute:5,crystal:6,boss:7};
const TINT:Record<string,number>={spark:0xa0ecdf,spore:0xc4d599,leaf:0xe2d79b,ember:0xf2b17a,frost:0xb8d9ef,comet:0xd2b0e5,enemy:0xf29483};
type VisualEffect=Effect&{life:number;max:number};
export interface SceneHooks {tick:(sim:Combat,fps:number,slow:number)=>void;upgrade:()=>void;end:()=>void;pause:()=>void;ready:()=>void;error:(message:string)=>void;audio:AudioDirector;lowQuality:()=>boolean}
export class ForestScene extends Phaser.Scene {
  sim?:Combat;running=false;private hooks:SceneHooks;
  private worldInk!:Phaser.GameObjects.Graphics;private fxInk!:Phaser.GameObjects.Graphics;
  private rig?:WitchRig;private sprites=new Map<number,Phaser.GameObjects.Image>();private spritePool:Phaser.GameObjects.Image[]=[];
  private texts:Phaser.GameObjects.Text[]=[];private textCursor=0;private effects:VisualEffect[]=[];
  private keys?:Record<string,Phaser.Input.Keyboard.Key>;private accumulator=0;private uiClock=0;private slowFrames=0;
  private stick?:{id:number;x:number;y:number};private movement={x:0,y:0};private stickInk!:Phaser.GameObjects.Graphics;
  constructor(hooks:SceneHooks){super('forest');this.hooks=hooks;}
  preload(){
    this.load.image('arena','art/arena.webp');this.load.image('enemies','art/enemies-atlas-clean.png');
    for(const name of ['head','body','left-upper','left-forearm','right-upper','right-forearm','left-leg','right-leg'])this.load.image(`hero-${name}`,`art/hero-${name}.png`);
    this.load.on('loaderror',()=>this.hooks.error('部分美术资源加载失败，请检查网络后重新加载。'));
  }
  create(){
    const texture=this.textures.get('enemies'),source=texture.getSourceImage();
    const w=source.width,h=source.height;
    for(let i=0;i<8;i++){const x=Math.round((i%4)*w/4),y=Math.round(Math.floor(i/4)*h/2);texture.add(i,0,x,y,Math.round((i%4+1)*w/4)-x,Math.round((Math.floor(i/4)+1)*h/2)-y);}
    this.add.image(0,0,'arena').setOrigin(0).setDisplaySize(WORLD.width,WORLD.height).setDepth(-20);
    this.worldInk=this.add.graphics().setDepth(-1);this.fxInk=this.add.graphics().setDepth(5000);this.stickInk=this.add.graphics().setScrollFactor(0).setDepth(10000);
    for(let i=0;i<28;i++)this.texts.push(this.add.text(0,0,'',{fontFamily:'Georgia, serif',fontSize:'17px',color:'#f4dfb4',stroke:'#15332d',strokeThickness:3}).setDepth(6000).setVisible(false));
    this.cameras.main.setBounds(0,0,WORLD.width,WORLD.height);
    this.keys=this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.keyboard?.on('keydown-ESC',()=>{if(this.running)this.hooks.pause()});
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(!this.running||p.x>this.scale.width*.48)return;this.stick={id:p.id,x:p.x,y:p.y};});
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(!this.stick||p.id!==this.stick.id)return;const dx=p.x-this.stick.x,dy=p.y-this.stick.y;const size=65;this.movement={x:dx/Math.max(size,Math.hypot(dx,dy)),y:dy/Math.max(size,Math.hypot(dx,dy))};});
    const reset=()=>{this.stick=undefined;this.movement={x:0,y:0};this.stickInk.clear()};
    this.input.on('pointerup',reset);this.input.on('pointerupoutside',reset);this.game.canvas.addEventListener('pointercancel',reset);
    this.events.once('shutdown',()=>this.game.canvas.removeEventListener('pointercancel',reset));
    this.hooks.ready();
  }
  begin(sim:Combat){
    this.sim=sim;this.accumulator=0;this.uiClock=0;this.slowFrames=0;this.effects=[];
    this.sprites.forEach(s=>{s.setVisible(false);this.spritePool.push(s)});this.sprites.clear();this.texts.forEach(t=>t.setVisible(false));
    this.rig?.destroy();this.rig=new WitchRig(this);this.running=true;
    this.cameras.main.startFollow(this.rig.root,true,.12,.12);this.cameras.main.setZoom(1);
    this.hooks.tick(sim,60,0);
  }
  setPaused(paused:boolean){this.running=!paused;this.movement={x:0,y:0};this.stick=undefined;this.stickInk?.clear();this.accumulator=0;this.input?.keyboard?.resetKeys();}
  update(_time:number,delta:number){
    if(!this.sim||!this.rig)return;
    const dt=Math.min(delta/1000,.1);if(delta>25)this.slowFrames++;
    if(this.running){
      const k=this.keys;const input={x:this.movement.x+(k?.D.isDown||k?.RIGHT.isDown?1:0)-(k?.A.isDown||k?.LEFT.isDown?1:0),y:this.movement.y+(k?.S.isDown||k?.DOWN.isDown?1:0)-(k?.W.isDown||k?.UP.isDown?1:0)};
      this.accumulator=Math.min(this.accumulator+dt,.1);
      while(this.accumulator>=1/60&&this.running){
        this.sim.step(1/60,input);this.accumulator-=1/60;this.captureEffects();
        if(this.sim.ended){this.running=false;this.hooks.end();break;}
        if(this.sim.pendingLevels>0){this.running=false;this.hooks.upgrade();break;}
      }
      this.rig.update(dt,this.sim.player.moving,this.sim.player.angle,this.sim.player.invincible>0,this.sim.seconds);
    }
    this.rig.root.setPosition(this.sim.player.x,this.sim.player.y).setDepth(this.sim.player.y);
    this.drawWorld();this.drawEffects(this.running?dt:0);this.drawStick();
    this.uiClock+=dt;if(this.uiClock>.12){this.uiClock=0;this.hooks.tick(this.sim,this.game.loop.actualFps,this.slowFrames);}
  }
  private captureEffects(){
    for(const effect of this.sim!.effects){
      if(effect.kind==='hit'){
        if(!this.hooks.lowQuality()){const t=this.texts[this.textCursor++%this.texts.length];this.tweens.killTweensOf(t);t.setPosition(effect.x,effect.y-24).setText(effect.text??'').setVisible(true).setAlpha(1).setColor(effect.color===0xf19a8a?'#f8a799':'#f0ddb6');this.tweens.add({targets:t,y:t.y-25,alpha:0,duration:500,onComplete:()=>t.setVisible(false)});}
        this.hooks.audio.play(effect.color===0xf19a8a?'hurt':'hit');
      }else if(effect.kind==='heal')this.hooks.audio.play('heal');
      if(effect.kind!=='hit'&&this.effects.length<100){const life=effect.kind==='chain'?.18:.5;this.effects.push({...effect,life,max:life});}
    }
  }
  private drawWorld(){
    const sim=this.sim!,g=this.worldInk;g.clear();
    for(const z of sim.zones){
      if(z.kind==='warning'){g.fillStyle(0xd66d61,.1+.12*Math.sin(z.timer*15)**2);g.fillCircle(z.x,z.y,z.radius);g.lineStyle(3,0xf3a087,.85);g.strokeCircle(z.x,z.y,z.radius);g.lineStyle(2,0xf3a087,.5);g.strokeCircle(z.x,z.y,z.radius*Math.min(1,z.timer/1.3));}
      else{g.fillStyle(z.kind==='spore'?0xa1b97b:0xde9d60,.13);g.fillCircle(z.x,z.y,z.radius);g.lineStyle(1,z.kind==='spore'?0xb7cf94:0xf2b17a,.32);g.strokeCircle(z.x,z.y,z.radius);for(let i=0;i<5;i++){const a=i/5*Math.PI*2+z.id;const x=z.x+Math.cos(a)*z.radius*.6,y=z.y+Math.sin(a)*z.radius*.6;g.fillStyle(0xc6d59c,.7);g.fillEllipse(x,y,12,7);g.lineStyle(2,0xc6d59c,.5);g.lineBetween(x,y,x,y+6);}}
    }
    for(const drop of sim.drops){g.fillStyle(drop.kind==='heal'?0xe6a5a0:0xe6cf8c,.95);if(drop.kind==='heal'){g.fillRoundedRect(drop.x-5,drop.y-7,10,14,3);g.fillRect(drop.x-7,drop.y-4,14,8);}else g.fillTriangle(drop.x,drop.y-5,drop.x-4,drop.y+3,drop.x+4,drop.y+3);}
    const living=new Set<number>();
    for(const enemy of sim.enemies){
      living.add(enemy.id);let sprite=this.sprites.get(enemy.id);
      if(!sprite){sprite=this.spritePool.pop()??this.add.image(0,0,'enemies');sprite.setTexture('enemies',FRAME[enemy.kind]).setVisible(true);this.sprites.set(enemy.id,sprite);}
      const size=enemy.radius*3.5;const bob=Math.sin(sim.seconds*(enemy.kind==='moth'?12:7)+enemy.id)*2;
      sprite.setPosition(enemy.x,enemy.y-10+bob).setDisplaySize(size,size).setDepth(enemy.y).setFlipX(enemy.x>sim.player.x);
      if(enemy.flash>0)sprite.setTintFill(0xffe8bf);else if(enemy.slow>0)sprite.setTint(0xa9d4f0);else sprite.clearTint();
      g.fillStyle(0x102e29,.35);g.fillEllipse(enemy.x,enemy.y+enemy.radius*.6,enemy.radius*1.7,enemy.radius*.65);
      if(enemy.kind==='boss'||enemy.kind==='brute'||enemy.kind==='crystal'){g.lineStyle(2,0xe59c7d,.65);g.strokeCircle(enemy.x,enemy.y,enemy.radius+5);}
      if(enemy.spore>0){g.fillStyle(0xd4e59c,.8);g.fillCircle(enemy.x+10,enemy.y-18,3);}
    }
    for(const [id,sprite]of this.sprites)if(!living.has(id)){sprite.setVisible(false);this.spritePool.push(sprite);this.sprites.delete(id);}
    for(const shot of sim.shots){g.fillStyle(TINT[shot.weapon],.95);g.fillCircle(shot.x,shot.y,shot.radius);g.lineStyle(2,TINT[shot.weapon],.35);g.lineBetween(shot.x,shot.y,shot.x-shot.vx*.035,shot.y-shot.vy*.035);if(shot.weapon==='enemy'){g.lineStyle(2,0x431e23,.9);g.strokeCircle(shot.x,shot.y,shot.radius);}}
    const p=sim.player;g.fillStyle(0x0b2926,.5);g.fillEllipse(p.x,p.y+21,35,13);g.lineStyle(1,0xe9d295,.24);g.strokeCircle(p.x,p.y,25);
    if(sim.build.leaf){const count=2+sim.build.leaf,r=(80+sim.build.leaf*7)*sim.reach;g.lineStyle(1,0xe4d998,.16);g.strokeCircle(p.x,p.y,r);for(let i=0;i<count;i++){const a=sim.seconds*2.6+i/count*Math.PI*2;const x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;g.fillStyle(0xe4d998);g.fillEllipse(x,y,16,7);}}
  }
  private drawEffects(dt:number){const g=this.fxInk;g.clear();for(const e of this.effects){e.life-=dt;const alpha=e.life/e.max;g.lineStyle(e.kind==='chain'?3:2,e.color??0xc8dcac,alpha*.8);if(e.kind==='chain'){const mx=(e.x+e.tx!)/2+12;g.beginPath();g.moveTo(e.x,e.y);g.lineTo(mx,(e.y+e.ty!)/2-10);g.lineTo(mx-15,(e.y+e.ty!)/2+10);g.lineTo(e.tx!,e.ty!);g.strokePath();}else{g.strokeCircle(e.x,e.y,(e.radius??40)*(1-alpha*.65));}}this.effects=this.effects.filter(e=>e.life>0);}
  private drawStick(){const g=this.stickInk;g.clear();if(!this.running)return;const x=this.stick?.x??110,y=this.stick?.y??this.scale.height-115;g.lineStyle(2,0xd9e6d1,.2);g.strokeCircle(x,y,58);g.fillStyle(0xd9e6d1,this.stick?.12:.035);g.fillCircle(x,y,56);g.fillStyle(0xe3eadb,this.stick?.3:.09);g.fillCircle(x+this.movement.x*42,y+this.movement.y*42,23);}
}
