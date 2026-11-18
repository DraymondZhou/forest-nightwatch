import Phaser from 'phaser';

/** Hierarchical cutout rig: shoulder -> upper arm -> forearm; hip -> leg.
 * Attachments use joint-local coordinates so animation never changes hit detection. */
export class WitchRig {
  root:Phaser.GameObjects.Container;
  private body:Phaser.GameObjects.Container;private head:Phaser.GameObjects.Container;
  private leftArm:Phaser.GameObjects.Container;private rightArm:Phaser.GameObjects.Container;
  private forearm:Phaser.GameObjects.Container;
  private leftLeg:Phaser.GameObjects.Container;private rightLeg:Phaser.GameObjects.Container;
  private casting=0;private clock=0;private facing=1;
  constructor(scene:Phaser.Scene, palette:number){
    this.root=scene.add.container(0,0);
    const bone=(parent:Phaser.GameObjects.Container,x:number,y:number)=>{const b=scene.add.container(x,y);parent.add(b);return b;};
    const attach=(parent:Phaser.GameObjects.Container,key:string,w:number,h:number,originY=0,originX=.5)=>{const sprite=scene.add.image(0,0,key).setDisplaySize(w,h).setOrigin(originX,originY);if(key==='hero-body'||key==='hero-head')sprite.setTint(palette);parent.add(sprite);return sprite;};
    this.leftLeg=bone(this.root,-7,5);attach(this.leftLeg,'hero-left-leg',12,23,.15);
    this.rightLeg=bone(this.root,7,5);attach(this.rightLeg,'hero-right-leg',12,23,.15);
    this.body=bone(this.root,0,-19);attach(this.body,'hero-body',34,36,.05);
    this.leftArm=bone(this.body,-14,7);attach(this.leftArm,'hero-left-upper',11,16,.2);
    const leftForearm=bone(this.leftArm,0,11);attach(leftForearm,'hero-left-forearm',10,15,.2);
    this.rightArm=bone(this.body,14,7);attach(this.rightArm,'hero-right-upper',11,16,.2);
    this.forearm=bone(this.rightArm,0,11);attach(this.forearm,'hero-right-forearm',26,21,.16,.17);
    this.head=bone(this.body,0,0);attach(this.head,'hero-head',48,43,.82);
  }
  cast(direction:number){this.facing=direction<0?-1:1;this.casting=1;}
  update(dt:number,moving:boolean,angle:number,invincible:boolean,seconds:number){
    this.casting=Math.max(0,this.casting-dt*5);this.clock+=dt*(moving?10:2.2);
    if(this.casting===0&&moving&&Math.abs(Math.cos(angle))>.15)this.facing=Math.cos(angle)<0?-1:1;
    this.root.scaleX=this.facing;this.root.alpha=invincible?.5+.5*Math.abs(Math.sin(seconds*35)):1;
    const stride=moving?Math.sin(this.clock)*.42:Math.sin(this.clock)*.025;
    this.leftLeg.rotation=stride;this.rightLeg.rotation=-stride;this.body.y=-19+(moving?Math.abs(Math.sin(this.clock))*2:Math.sin(this.clock)*.6);
    this.body.rotation=moving?Math.cos(this.clock)*.025:0;this.head.rotation=Math.sin(this.clock*.5)*.025;
    this.leftArm.rotation=-stride*.6+.08;this.rightArm.rotation=-.35+Math.sin(seconds*5)*.16;this.forearm.rotation=-.35+Math.sin(seconds*5+.5)*.12-this.casting*.75;
  }
  fall(){this.root.scene.tweens.add({targets:this.root,angle:-70,alpha:.5,duration:350});}
  destroy(){this.root.destroy(true);}
}
