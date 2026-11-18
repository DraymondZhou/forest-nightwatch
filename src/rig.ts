import Phaser from 'phaser';
import { ARM_LENGTH, bendArm, facingFromVector, type Facing } from './pose';

type Bone = Phaser.GameObjects.Container;
type Image = Phaser.GameObjects.Image;

export class WitchRig {
  readonly root: Bone;
  private readonly hips: Bone;
  private readonly chest: Bone;
  private readonly head: Bone;
  private readonly face: Image;
  private readonly cloak: Image;
  private readonly backLeg: Bone;
  private readonly frontLeg: Bone;
  private readonly farBoot: Image;
  private readonly nearBoot: Image;
  private footView: Facing = 'front';
  private readonly freeArm: Bone;
  private readonly wandArm: Bone;
  private readonly wandElbow: Bone;
  private readonly wand: Bone;
  private readonly tip = new Phaser.Math.Vector2();
  private readonly joints = {shoulder:0, elbow:0};
  private phase = 0;
  private speed = 0;
  private castTime = 1;
  private walkFacing: Facing = 'front';
  private view: Facing = 'front';
  private attackFacing: Facing = 'front';
  private aim = 0;
  private hurtLeft = 0;
  private recoilX = 0;
  private recoilY = 0;
  private grimacing = false;
  private faceFrame(view:Facing){
    const side=view==='left'||view==='right';
    if(this.grimacing && view!=='back')this.face.setTexture('hurt-faces',side?'side':'front');
    else this.face.setTexture(view==='front'?'traveler':'turns',view==='front'?'head':side?'head-side':'head-back');
    this.face.setScale(28.5/this.face.height).setOrigin(side?.49:.50,view==='back'?.92:.90);
  }
  hurt(dx:number,dy:number){
    const length=Math.hypot(dx,dy)||1;
    this.recoilX=dx/length;this.recoilY=dy/length;
    this.hurtLeft=.30;this.grimacing=true;this.faceFrame(this.view);
  }

  constructor(scene: Phaser.Scene, palette: number) {
    this.root = scene.add.container();
    const joint = (parent: Bone, x: number, y: number) => {
      const node = scene.add.container(x, y);
      parent.add(node);
      return node;
    };
    const skin = (bone: Bone, name: string, height: number, x: number, y: number, tint = 0xffffff) => {
      const image = scene.add.image(0, 0, 'traveler', name).setOrigin(x, y).setTint(tint);
      image.setScale(height / image.height);
      bone.add(image);
      return image;
    };
    const gripPart = (bone: Bone, frame: number, originY: number) => {
      bone.add(scene.add.image(0,0,'grip',frame).setOrigin(.5,originY/32).setScale(.25));
    };
    this.hips = joint(this.root, 0, 2);
    this.backLeg = joint(this.hips, -5.3, 1);
    this.frontLeg = joint(this.hips, 5.1, 1.6);
    this.farBoot = skin(this.backLeg,'left-leg',24,.45,.12,0xc0b8a0);
    this.nearBoot = skin(this.frontLeg,'right-leg',24,.47,.12);

    this.chest = joint(this.hips,0,-22);
    this.freeArm = joint(this.chest,8,6);
    skin(this.freeArm,'left-upper',12,.32,.17,0xd2c6af);
    const freeElbow = joint(this.freeArm,.95,8.6);
    skin(freeElbow,'left-forearm',10.8,.48,.14,0xd2c6af);
    this.cloak = skin(this.chest,'body',32,.5,.09,palette);

    this.wandArm = joint(this.chest,-8,6.3);
    gripPart(this.wandArm,0,8);
    this.wandElbow = joint(this.wandArm,0,ARM_LENGTH);
    gripPart(this.wandElbow,1,8);
    this.wand = joint(this.wandElbow,0,ARM_LENGTH);
    // Fingers and shaft share one attachment. Both rotate about the cuff.
    gripPart(this.wand,2,18);

    this.head = joint(this.chest,-.5,1.7);
    this.face = skin(this.head,'head',28.5,.5,.90,palette);
    this.setView('front');
  }

  private setView(view: Facing) {
    this.view = view;
    const side = view === 'left' || view === 'right';
    const rear = view === 'back';
    const atlas = view === 'front' ? 'traveler' : 'turns';
    const suffix = side ? '-side' : rear ? '-back' : '';
    this.faceFrame(view);
    this.cloak.setTexture(atlas,'body'+suffix).setScale(32/this.cloak.height);

    this.cloak.setOrigin(.5,.09);
    this.chest.scaleX = view === 'left' ? -1 : 1;
    this.head.x = side ? 1.2 : -.5;
    this.wandArm.x = view === 'right' ? -4.8 : view === 'front' ? -8.3 : 8.6;
    this.freeArm.x = -this.wandArm.x;
    // Keep the anatomical right hand. On a left turn and on the back view the
    // right sleeve passes behind the coat. The near sleeve crosses its front.
    this.chest.remove(this.wandArm);
    const coatIndex = this.chest.getIndex(this.cloak);
    this.chest.addAt(this.wandArm,coatIndex + (view==='right'||view==='front' ? 1 : 0));
  }

  private turnFeet(view: Facing) {
    if (view === this.footView) return;
    this.footView = view;
    if (view === 'front') {
      this.farBoot.setTexture('traveler','left-leg').setOrigin(.45,.12).setFlipX(false);
      this.nearBoot.setTexture('traveler','right-leg').setOrigin(.47,.12).setFlipX(false);
      this.farBoot.setScale(24/this.farBoot.height);
      this.nearBoot.setScale(24/this.nearBoot.height);
    } else {
      const frame = view === 'back' ? 4 : 3;
      this.farBoot.setTexture('grip',frame).setOrigin(.5,5/32).setScale(.25).setFlipX(view==='left');
      this.nearBoot.setTexture('grip',frame).setOrigin(.5,5/32).setScale(.25).setFlipX(view==='left');
    }
  }

  cast(dx: number, dy = 0) {
    // A volley may emit several casts within one simulation tick.
    if (this.castTime < .13 || this.hurtLeft>.16) return;
    this.attackFacing = facingFromVector(dx,dy,this.view);
    if (this.attackFacing !== this.view) this.setView(this.attackFacing);
    this.aim = Math.atan2(dy,Math.abs(dx));
    this.castTime = 0;
  }

  update(dt: number, moving: boolean, angle: number, invincible: boolean, seconds: number, dashTime=0) {
    this.speed += ((moving ? 1 : 0)-this.speed)*(1-Math.exp(-dt*16));
    this.phase += dt*(2+this.speed*9);
    this.castTime += dt;
    this.hurtLeft=Math.max(0,this.hurtLeft-dt);
    const depth=this.hurtLeft>.025?1800:1000;
    if(this.root.depth!==depth)this.root.setDepth(depth);
    if(this.grimacing && this.hurtLeft<=.06){this.grimacing=false;this.faceFrame(this.view);}
    const recoil=Math.sin(Math.min(1,(.30-this.hurtLeft)/.07)*Math.PI/2)*(this.hurtLeft/.30)**2;
    const lunge=Math.sin(Math.PI*Math.min(1,dashTime/.20));
    if (moving) this.walkFacing = facingFromVector(Math.cos(angle),Math.sin(angle),this.walkFacing);
    const look = this.castTime < .29 ? this.attackFacing : moving ? this.walkFacing : this.view;
    if (look !== this.view && this.hurtLeft<.16) this.setView(look);
    if (moving || this.castTime > .29) this.turnFeet(moving ? this.walkFacing : look);

    const step = Math.sin(this.phase)*this.speed;
    const sideStep = this.walkFacing==='left' ? -1 : 1;
    this.root.alpha = invincible ? .84+.16*Math.abs(Math.sin(seconds*7)) : 1;
    this.backLeg.rotation = -.06+step*.16*sideStep;
    this.frontLeg.rotation = .05-step*.16*sideStep;
    this.backLeg.y = 1-Math.max(0,step)*2.4;
    this.frontLeg.y = 1.6+Math.min(0,step)*2.4;
    this.hips.x=this.recoilX*recoil*4;
    this.hips.y=2-Math.abs(step)*1.35+this.recoilY*recoil*2+lunge*2.4;
    this.backLeg.rotation+=lunge*.30*sideStep;
    this.frontLeg.rotation-=lunge*.22*sideStep;
    this.chest.rotation = step*.035+this.recoilX*recoil*.19+lunge*.15*Math.cos(angle);
    this.chest.y = -22+Math.sin(seconds*2.8)*.35;
    this.head.rotation = -this.chest.rotation*.45-this.recoilX*recoil*.11;
    this.head.y=1.7+recoil*2+lunge*.7;
    this.freeArm.rotation = (this.freeArm.x>0 ? -.12 : .12) - step*.14;

    const t = this.castTime;
    const stroke = t < .05 ? -.2*Math.sin(t/.05*Math.PI)
      : t < .12 ? Math.sin((t-.05)/.07*Math.PI/2)
      : Math.max(0,1-(t-.12)/.21)**2;
    // Keep a folded elbow and the grip close to the chest. The wrist leads a
    // short arc; the tip supplies most of the visible travel.
    const front = this.view==='front', rear = this.view==='back', far = this.view==='left';
    const dx = (front ? 2.5 : rear ? 5.5 : far ? 7.5 : 8.2) + stroke*(front ? 1.5 : 2.8);
    const dy = (front ? 10 : rear ? 9 : 8.5) - stroke*2.8 + step*.45;
    bendArm(dx-recoil*2.7,dy-recoil*3-lunge*1.8,rear ? -1 : 1,this.joints);
    this.wandArm.rotation = this.joints.shoulder;
    this.wandElbow.rotation = this.joints.elbow;
    const rest = front ? -.96 : rear ? .93 : .96;
    const attack = front ? -2.30 : rear ? .28 : Math.PI/2 + Phaser.Math.Clamp(this.aim,-.8,.8);
    this.wand.rotation = rest + (attack-rest)*stroke - this.joints.shoulder-this.joints.elbow;
  }

  wandTip() { return this.wand.getWorldTransformMatrix().transformPoint(.4,-16.75,this.tip); }
  fall() { this.root.scene.tweens.add({targets:this.root,angle:-70,alpha:.5,duration:350}); }
  destroy() { this.root.destroy(true); }
}
