import Phaser from 'phaser';
import {facingFromVector,type Facing} from './pose';

const bankRow=(v:Facing)=>v==='back'?2:v==='front'?0:1;

export class MartialRig {
  readonly root:Phaser.GameObjects.Container;
  private figure:Phaser.GameObjects.Image;
  private feet:Phaser.GameObjects.Image;
  private walkFacing:Facing='front';
  private facing:Facing='front';
  private attack=1; private wound=0; private stride=0;
  private recoilX=0; private recoilY=0;
  private tip=new Phaser.Math.Vector2();
  private bank:number;

  constructor(scene:Phaser.Scene,job:'warden'|'hunter'){
    this.bank=job==='warden'?90:0;
    this.feet=scene.add.image(0,0,'hunter-motion',this.bank).setOrigin(.5,.61).setScale(.83);
    this.figure=scene.add.image(0,0,'hunter-motion',this.bank+24).setOrigin(.5,.61).setScale(.83);
    this.root=scene.add.container(0,0,[this.feet,this.figure]);
  }
  cast(dx:number,dy:number){
    if(this.attack<.14 || this.wound>.13)return;
    this.facing=facingFromVector(dx,dy,this.facing);
    this.attack=0;
  }
  hurt(dx:number,dy:number){
    const n=Math.hypot(dx,dy)||1;
    this.recoilX=dx/n;this.recoilY=dy/n;this.wound=.28;
  }
  update(dt:number,moving:boolean,angle:number,invincible:boolean,seconds:number,dash=0){
    this.attack+=dt;this.wound=Math.max(0,this.wound-dt);
    if(moving){
      this.stride+=dt*44;
      this.walkFacing=facingFromVector(Math.cos(angle),Math.sin(angle),this.walkFacing);
      if(this.attack>=.27)this.facing=this.walkFacing;
    }
    const travel=moving?this.walkFacing:this.facing;
    const gait=moving?Math.floor(this.stride)%24:0;
    const legs=this.bank+bankRow(travel)*30+gait;
    // Cast is delivered on the simulation's contact/release tick. Show contact
    // first, follow through, settle the hands, then return to the ready pose.
    let upperPose=0;
    if(this.wound>.09)upperPose=5;
    else if(this.attack<.065)upperPose=3;
    else if(this.attack<.15)upperPose=4;
    else if(this.attack<.22)upperPose=1;
    const top=this.bank+bankRow(this.facing)*30+24+upperPose;
    if(Number(this.feet.frame.name)!==legs)this.feet.setFrame(legs);
    if(Number(this.figure.frame.name)!==top)this.figure.setFrame(top);
    const recoil=(this.wound/.28)**2;
    const x=this.recoilX*4*recoil, y=this.recoilY*3*recoil;
    const bob=moving?-Math.abs(Math.sin(this.stride*Math.PI/12))*1.15:0;
    this.feet.setFlipX(travel==='left').setPosition(x,y);
    this.figure.setFlipX(this.facing==='left').setPosition(x,y+bob+Math.sin(Math.PI*dash/.2));
    this.root.alpha=invincible?.86+.14*Math.abs(Math.sin(seconds*7)):1;
    this.root.setDepth(this.wound>.025?1800:1000);
  }
  wandTip(){this.tip.set(this.root.x,this.root.y-12);return this.tip;}
  fall(){this.root.scene.tweens.add({targets:this.root,angle:-70,alpha:.5,duration:350});}
  destroy(){this.root.destroy(true);}
}
