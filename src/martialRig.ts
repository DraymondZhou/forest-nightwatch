import Phaser from 'phaser';
import bladeSockets from './blade-sockets.json';
import bowSockets from './bow-sockets.json';
import {facingFromVector,type Facing} from './pose';

const bankRow=(v:Facing)=>v==='back'?2:v==='front'?0:1;

export class MartialRig {
  readonly root:Phaser.GameObjects.Container;
  private figure:Phaser.GameObjects.Image;
  private feet:Phaser.GameObjects.Image;
  private walkFacing:Facing='front';
  private facing:Facing='front';
  private attack=1; private wound=0; private stride=0;
  private heavySwing=false;
  private windup=0;
  private recoilX=0; private recoilY=0;
  private tip=new Phaser.Math.Vector2();
  private bank:number;

  constructor(scene:Phaser.Scene,job:'warden'|'hunter'){
    this.bank=job==='warden'?90:0;
    this.feet=scene.add.image(0,0,'hunter-motion',this.bank).setOrigin(.5,.61).setScale(.83);
    this.figure=scene.add.image(0,0,'hunter-motion',this.bank+24).setOrigin(.5,.61).setScale(.83);
    this.root=scene.add.container(0,0,[this.feet,this.figure]);
  }
  prepare(dx:number,dy:number,left:number){
    if(this.wound>.09)return;
    this.windup=1-left/.16;
    this.facing=facingFromVector(dx,dy,this.facing);
  }
  cast(dx:number,dy:number){
    if(this.attack<.14 || this.wound>.13)return;
    this.facing=facingFromVector(dx,dy,this.facing);
    this.heavySwing=false;
    this.windup=0;this.attack=0;
  }
  cleave(){this.heavySwing=true;}
  hurt(dx:number,dy:number){
    const n=Math.hypot(dx,dy)||1;
    this.recoilX=dx/n;this.recoilY=dy/n;this.wound=.28;
  }
  update(dt:number,moving:boolean,angle:number,invincible:boolean,seconds:number,dash=0,heavyReady=false){
    this.attack+=dt;this.wound=Math.max(0,this.wound-dt);
    if(moving){
      this.stride+=dt*44;
      this.walkFacing=facingFromVector(Math.cos(angle),Math.sin(angle),this.walkFacing);
      if(!this.windup && this.attack>=.27)this.facing=this.walkFacing;
    }
    // The pelvis follows the aiming torso. Opposite travel plays the stride backwards.
    const braced=this.windup>0 || this.attack<.24;
    const travel=moving && !braced?this.walkFacing:this.facing;
    const axis=travel==='left'?Math.PI:travel==='right'?0:travel==='back'?-Math.PI/2:Math.PI/2;
    const gait=moving?(Math.cos(angle-axis)<0?23-Math.floor(this.stride)%24:Math.floor(this.stride)%24):0;
    const legs=this.bank+bankRow(travel)*30+gait;
    // Cast is delivered on the simulation's contact/release tick. Show contact
    // first, follow through, settle the hands, then return to the ready pose.
    let upperPose=0;
    if(this.wound>.09)upperPose=5;
    else if(this.windup>0)upperPose=this.windup>.36?2:1;
    else if(this.attack<.065)upperPose=3;
    else if(this.attack<.15)upperPose=4;

    const view=bankRow(this.facing);
    let top=this.bank+view*30+24+upperPose;
    if(this.wound<=.09 && this.bank===90){
      const heavyBank=180+view*3;
      if(this.heavySwing && this.attack<.24)top=heavyBank+(this.attack<.09?1:2);
      else if(heavyReady && this.attack>=.15)top=heavyBank;
    }
    if(Number(this.feet.frame.name)!==legs)this.feet.setFrame(legs);
    if(Number(this.figure.frame.name)!==top)this.figure.setFrame(top);
    const recoil=(this.wound/.28)**2;
    const x=this.recoilX*4*recoil, y=this.recoilY*3*recoil;
    const bob=moving?-Math.abs(Math.sin(this.stride*Math.PI/12))*1.15:0;
    this.feet.setFlipX(travel==='left').setPosition(x,y);
    this.figure.setFlipX(this.facing==='left').setPosition(x,y+bob+Math.sin(Math.PI*dash/.2));
    const brace=this.windup*.055,release=this.attack<.16?Math.sin(Math.PI*this.attack/.16)*.045:0;
    const lean=(this.bank===90?1:-1)*(release-brace);
    this.figure.setRotation(travel==='left'?-lean:travel==='right'?lean:0);
    this.windup=0;
    this.root.alpha=invincible?.86+.14*Math.abs(Math.sin(seconds*7)):1;
    this.root.setDepth(this.wound>.025?1800:1000);
  }
  bowSocket(dx:number,dy:number,live:boolean){
    const frame=Number(this.figure.frame.name),view=facingFromVector(dx,dy,this.facing);
    // A restored, already flying arrow predating sockets uses its own release view.
    const row=live?Math.floor(frame/30):bankRow(view);
    const [x,y]=bowSockets[row*6+(live?frame%30-24:3)];
    const flip=live?this.figure.flipX:view==='left';
    return this.socketOffset(x,y,flip,live);
  }
  private socketOffset(x:number,y:number,flip:boolean,live=true){
    const localX=(flip?128-x:x)-this.figure.displayOriginX,localY=y-this.figure.displayOriginY;
    const a=live?this.figure.rotation:0,c=Math.cos(a),s=Math.sin(a);
    return {x:(live?this.figure.x:0)+this.figure.scaleX*(localX*c-localY*s),
      y:(live?this.figure.y:0)+this.figure.scaleY*(localX*s+localY*c)};
  }
  bladeLine(){
    const frame=Number(this.figure.frame.name),i=frame>=180?18+frame-180:Math.floor((frame-90)/30)*6+frame%30-24;
    const [gx,gy,tx,ty]=bladeSockets[i];
    const grip=this.socketOffset(gx,gy,this.figure.flipX),tip=this.socketOffset(tx,ty,this.figure.flipX);
    return {x:this.root.x+grip.x,y:this.root.y+grip.y,length:Math.hypot(tip.x-grip.x,tip.y-grip.y),angle:Math.atan2(tip.y-grip.y,tip.x-grip.x)};
  }
  wandTip(){this.tip.set(this.root.x,this.root.y-12);return this.tip;}
  fall(){this.root.scene.tweens.add({targets:this.root,angle:-70,alpha:.5,duration:350});}
  destroy(){this.root.destroy(true);}
}
