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
  private readonly upperSleeve: Image;
  private readonly lowerSleeve: Image;
  private readonly sideGrip: Image;
  private readonly shaft: Image;
  private readonly fingers: Image;
  private readonly lens: Phaser.GameObjects.Graphics;
  private shaftProjection=1;
  private aimX=0;
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

  constructor(scene: Phaser.Scene, palette: number,private carriesStaff=true) {
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
      const image=scene.add.image(0,0,'grip',frame).setOrigin(.5,originY/32).setScale(.25);
      bone.add(image);return image;
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
    this.upperSleeve=gripPart(this.wandArm,0,8);
    this.wandElbow = joint(this.wandArm,0,ARM_LENGTH);
    this.lowerSleeve=gripPart(this.wandElbow,1,8);
    this.wand = joint(this.wandElbow,0,ARM_LENGTH);
    // Fingers and shaft share one attachment. Both rotate about the cuff.
    this.sideGrip=gripPart(this.wand,2,18);
    this.shaft=gripPart(this.wand,5,18);
    this.fingers=gripPart(this.wand,6,18);
    this.lens=scene.add.graphics().setVisible(false);
    this.lens.lineStyle(1.25,0x664932).strokeEllipse(0,0,9,11);
    this.lens.fillStyle(0xa26a3b,1).fillEllipse(0,0,7,9);
    this.lens.fillStyle(0xf3ca78,1).fillTriangle(-2,2,0,-4,3,0);
    this.lens.lineStyle(1,0xffe2a1).lineBetween(-5,0,-7,1).lineBetween(4,-3,6,-5);
    this.wand.add(this.lens);

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
    this.wandArm.x = view === 'right' ? -4.8 : view === 'front' ? -9.5 : 8.6;
    this.freeArm.x = side ? -this.wandArm.x : rear ? -10.5 : 10.5;
    if(rear)this.wandArm.x=10;
    this.sideGrip.visible=side && this.carriesStaff;
    this.shaft.visible=!side && this.carriesStaff;this.fingers.visible=!side || !this.carriesStaff;
    this.shaftProjection=1;
    this.upperSleeve.scaleY=this.lowerSleeve.scaleY=.25;
    this.wandElbow.y=this.wand.y=ARM_LENGTH;
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
    this.aimX=dx/(Math.hypot(dx,dy)||1);
    this.castTime = 0;
  }

  update(dt: number, moving: boolean, angle: number, invincible: boolean, seconds: number, dashTime=0,focused=false) {
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
    this.turnFeet(moving ? this.walkFacing : look);

    const step = Math.sin(this.phase)*this.speed;
    const sideStep = this.walkFacing==='left' ? -1 : 1;
    this.root.alpha = invincible ? .84+.16*Math.abs(Math.sin(seconds*7)) : 1;
    const axialFeet=this.footView==='front'||this.footView==='back';
    const depthStep=axialFeet?(this.footView==='front'?step:-step):0;
    const passing=axialFeet?Math.cos(this.phase)*this.speed:0;
    this.backLeg.y=1+depthStep*3.1-Math.max(0,passing)*2.6;
    this.frontLeg.y=1.6-depthStep*3.1-Math.max(0,-passing)*2.6;
    if(!axialFeet){
      this.backLeg.y-=Math.max(0,step)*2.4;this.frontLeg.y+=Math.min(0,step)*2.4;
    }
    this.backLeg.scaleY=1-.10*Math.max(0,passing);
    this.frontLeg.scaleY=1-.10*Math.max(0,-passing);
    const swing=axialFeet?.025:.16;
    const dashSwing=axialFeet?.04:.28;
    this.backLeg.rotation=-.035+sideStep*(step*swing+lunge*dashSwing);
    this.frontLeg.rotation=.035-sideStep*(step*swing+lunge*dashSwing);
    this.hips.x=this.recoilX*recoil*4+depthStep*.85;
    this.hips.y=2-Math.abs(step)*(axialFeet?.8:1.35)+this.recoilY*recoil*2+lunge*2.4;
    this.chest.rotation=step*(axialFeet?.017:.035)+this.recoilX*recoil*.19+lunge*.15*Math.cos(angle);
    this.chest.y = -22+Math.sin(seconds*2.8)*.35;
    this.head.rotation = -this.chest.rotation*.45-this.recoilX*recoil*.11;
    this.head.y=1.7+recoil*2+lunge*.7;
    this.freeArm.rotation = (this.freeArm.x>0 ? -.12 : .12) - step*.14;
    this.lens.visible=focused && this.carriesStaff;
    if(focused){
      this.head.rotation-=.055;
      this.freeArm.rotation+=(this.freeArm.x>0?-.16:.16);
    }

    const t = this.castTime;
    // The spell is already live on cast. Hold the pointing pose through its
    // first flash, then bring the wrist back to rest with a small overshoot.
    const stroke=t<.045?1:t<.21?Math.cos((t-.045)/.165*Math.PI*.5)**2
      :t<.29?-.065*Math.sin((t-.21)/.08*Math.PI):0;
    // Keep a folded elbow and the grip close to the chest. The wrist leads a
    // short arc; the tip supplies most of the visible travel.
    const front = this.view==='front', rear = this.view==='back', far = this.view==='left';
    this.freeArm.y=6+((front||rear)?step*1.45:0);
    if(front||rear){
      this.verticalCast(front,stroke,step,recoil,lunge);
      this.lens.setPosition(.4,-16.75*this.shaftProjection);
      return;
    }
    const dx = (far ? 7.5 : 8.2) + stroke*2.8;
    const dy = 8.5 - stroke*2.8 + step*.45;
    bendArm(dx-recoil*2.7,dy-recoil*3-lunge*1.8,1,this.joints);
    this.wandArm.rotation = this.joints.shoulder;
    this.wandElbow.rotation = this.joints.elbow;
    const rest = .96;
    const attack = Math.PI/2 + Phaser.Math.Clamp(this.aim,-.8,.8);
    this.wand.rotation = rest + (attack-rest)*stroke - this.joints.shoulder-this.joints.elbow;
    this.lens.setPosition(.4,-16.75);
  }

  private verticalCast(front:boolean,stroke:number,step:number,recoil:number,lunge:number){
    // Place the projected elbow and wrist, then fit just the sleeve art between
    // them. Scaling the parent bones would also squash the palm and the staff.
    this.chest.y+=stroke*(front?1.7:-1.4);
    this.head.y+=stroke*(front?.7:-.3);
    this.freeArm.rotation+=stroke*(front?.12:-.09);
    const elbowX=front?-3.0+stroke*.65:3+stroke;
    const elbowY=7.4-stroke*(front?.7:3.6);
    const wristX=(front?-2.6:3.6)+this.aimX*stroke*3;
    const wristY=(front?12:12.4)+stroke*(front?2.4:-12)-recoil*2-lunge+step*.9;
    const lowerX=wristX-elbowX,lowerY=wristY-elbowY;
    const upperAngle=Math.atan2(-elbowX,elbowY);
    const lowerAngle=Math.atan2(-lowerX,lowerY);
    this.wandArm.rotation=upperAngle;
    this.wandElbow.rotation=lowerAngle-upperAngle;
    this.wandElbow.y=Math.hypot(elbowX,elbowY);
    this.wand.y=Math.hypot(lowerX,lowerY);
    this.upperSleeve.scaleY=.25*this.wandElbow.y/ARM_LENGTH;
    this.lowerSleeve.scaleY=.25*this.wand.y/ARM_LENGTH;

    // A staff aimed at the viewer reads shorter. Its projected vector crosses
    // the horizontal only at the grip; the knuckles stay aligned to the cuff.
    const restX=front?-6.5:6.7,restY=-12;
    const tipX=restX+((front?-1.2:1.2)+this.aimX*7-restX)*stroke;
    const tipY=restY+((front?8:-11)-restY)*stroke;
    this.shaftProjection=Math.hypot(tipX,tipY)/16.75;
    this.shaft.scaleY=.25*this.shaftProjection;
    this.wand.rotation=Math.atan2(tipX,-tipY)-lowerAngle;
    this.fingers.rotation=-this.wand.rotation;
  }

  wandTip() { return this.wand.getWorldTransformMatrix().transformPoint(.4,-16.75*this.shaftProjection,this.tip); }
  fall() { this.root.scene.tweens.add({targets:this.root,angle:-70,alpha:.5,duration:350}); }
  destroy() { this.root.destroy(true); }
}
