import Phaser from 'phaser';
import {facingFromVector,type Facing} from './pose';

export class MartialRig {
  readonly root:Phaser.GameObjects.Container;
  private figure:Phaser.GameObjects.Image;
  private feet?:Phaser.GameObjects.Image;
  private walkFacing:Facing='front';
  private facing:Facing='front';
  private attack=1; private wound=0; private stride=0;
  private recoilX=0; private recoilY=0;
  private tip=new Phaser.Math.Vector2();
  private bank:number;
  constructor(scene:Phaser.Scene,job:'warden'|'hunter'){
    this.bank=job==='warden'?0:36;
    this.figure=scene.add.image(0,0,'martial-heroes',this.bank+11).setOrigin(.5,.61).setScale(.83);
    if(job==='hunter'){
      this.feet=scene.add.image(0,0,'hunter-motion',0).setOrigin(.5,.61).setScale(.83);
      this.figure.setTexture('hunter-motion',24);
    }
    this.root=scene.add.container(0,0,this.feet?[this.feet,this.figure]:[this.figure]);
  }
  cast(dx:number,dy:number){
    if(this.attack<.14 || this.wound>.13)return;
    this.facing=facingFromVector(dx,dy,this.facing);this.attack=0;
  }
  hurt(dx:number,dy:number){
    const n=Math.hypot(dx,dy)||1;this.recoilX=dx/n;this.recoilY=dy/n;this.wound=.28;
  }
  update(dt:number,moving:boolean,angle:number,invincible:boolean,seconds:number,dash=0){
    this.attack+=dt;this.wound=Math.max(0,this.wound-dt);
    if(moving){this.stride+=dt*11;if(this.attack>=.30)this.facing=facingFromVector(Math.cos(angle),Math.sin(angle),this.facing);}
    if(this.feet){
      if(moving)this.walkFacing=facingFromVector(Math.cos(angle),Math.sin(angle),this.walkFacing);
      const row=(v:Facing)=>v==='back'?2:v==='front'?0:1;
      const phase=moving?Math.floor(this.stride*4)%24:0;
      // Feet track travel even when the upper body aims behind the player.
      const legs=row(moving?this.walkFacing:this.facing)*30+phase;
      const top=row(this.facing)*30+24+(this.wound>.09?5:this.attack<.30?1+Math.min(3,Math.floor(this.attack/.075)):0);
      const kick=(this.wound/.28)**2,dx=this.recoilX*4*kick,dy=this.recoilY*3*kick;
      if(Number(this.feet.frame.name)!==legs)this.feet.setFrame(legs);
      if(Number(this.figure.frame.name)!==top)this.figure.setFrame(top);
      this.feet.setFlipX((moving?this.walkFacing:this.facing)==='left').setPosition(dx,dy);
      const bob=moving?-Math.abs(Math.sin(this.stride*Math.PI/3))*1.15:0;
      this.figure.setFlipX(this.facing==='left').setPosition(dx,dy+bob);
      this.root.alpha=invincible?.86+.14*Math.abs(Math.sin(seconds*7)):1;
      this.root.setDepth(this.wound>.025?1800:1000);
      return;
    }
    const direction=this.facing==='back'?2:this.facing==='front'?0:1;
    const pose=this.wound>.09?10:this.attack<.30?6+Math.min(3,Math.floor(this.attack/.075)):moving?Math.floor(this.stride)%6:11;
    const f=this.bank+direction*12+pose;
    if(Number(this.figure.frame.name)!==f)this.figure.setFrame(f);
    const recoil=(this.wound/.28)**2;
    this.figure.setFlipX(this.facing==='left').setPosition(this.recoilX*4*recoil,this.recoilY*3*recoil+Math.sin(Math.PI*dash/.2)*1.4);
    this.root.alpha=invincible?.86+.14*Math.abs(Math.sin(seconds*7)):1;
    this.root.setDepth(this.wound>.025?1800:1000);
  }
  wandTip(){this.tip.set(this.root.x,this.root.y-12);return this.tip;}
  fall(){this.root.scene.tweens.add({targets:this.root,angle:-70,alpha:.5,duration:350});}
  destroy(){this.root.destroy(true);}
}
