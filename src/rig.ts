import Phaser from 'phaser';

type Bone = Phaser.GameObjects.Container;

// The paper parts have different source resolutions. Fit one dimension only.
// Every pivot below sits inside the painted joint, including the wand sleeve.
export class WitchRig {
  readonly root: Bone;
  private readonly hips: Bone;
  private readonly chest: Bone;
  private readonly head: Bone;
  private readonly backLeg: Bone;
  private readonly frontLeg: Bone;
  private readonly backArm: Bone;
  private readonly wandArm: Bone;
  private readonly wandElbow: Bone;
  private readonly wand: Bone;
  private readonly tip = new Phaser.Math.Vector2();
  private phase = 0;
  private speed = 0;
  private castTime = 1;
  private facing = 1;
  private aim = 0;

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
    };
    this.hips = joint(this.root, 0, 2);
    this.backLeg = joint(this.hips, -5.3, 1);
    this.frontLeg = joint(this.hips, 5.1, 1.6);
    skin(this.backLeg, 'left-leg', 24, .45, .12, 0xc0b8a0);
    skin(this.frontLeg, 'right-leg', 24, .47, .12);

    this.chest = joint(this.hips, 0, -22);
    this.backArm = joint(this.chest, -9.4, 6);
    skin(this.backArm, 'left-upper', 12, .32, .17, 0xd2c6af);
    const backElbow = joint(this.backArm, .95, 8.6);
    skin(backElbow, 'left-forearm', 10.8, .48, .14, 0xd2c6af);
    this.wandArm = joint(this.chest, 9.8, 6.2);
    skin(this.wandArm, 'right-upper', 11.8, .65, .17);
    this.wandElbow = joint(this.wandArm, -1.15, 8.3);
    // Hinge the shaft inside the painted grip. Pointing the staff never twists the wrist.
    const forearmHeight = 14;
    this.wand = joint(this.wandElbow, (227 / 343 - .16) * forearmHeight * 343 / 266,
      (163 / 266 - .13) * forearmHeight);
    skin(this.wand, 'wand', 23, 227 / 343, 163 / 266);
    skin(this.wandElbow, 'right-forearm', forearmHeight, .16, .13);
    // The cloak is the outer garment. Its hem and shoulders cover all four sockets.
    skin(this.chest, 'body', 32, .5, .09, palette);
    this.head = joint(this.chest, -.5, 1.7);
    skin(this.head, 'head', 28.5, .5, .90, palette);
  }

  cast(dx: number, dy = 0) {
    if (Math.abs(dx) > 2) this.facing = dx < 0 ? -1 : 1;
    this.aim = Phaser.Math.Clamp(Math.atan2(dy, Math.abs(dx)), -.65, .65);
    this.root.scaleX = this.facing;
    this.castTime = 0;
  }

  update(dt: number, moving: boolean, angle: number, invincible: boolean, seconds: number) {
    this.speed += ((moving ? 1 : 0) - this.speed) * (1 - Math.exp(-dt * 16));
    this.phase += dt * (2 + this.speed * 9);
    this.castTime += dt;
    if (this.castTime > .30 && moving && Math.abs(Math.cos(angle)) > .25)
      this.facing = Math.cos(angle) < 0 ? -1 : 1;
    this.root.scaleX = this.facing;
    this.root.alpha = invincible ? .65 + .35 * Math.abs(Math.sin(seconds * 28)) : 1;
    const step = Math.sin(this.phase) * this.speed;
    this.backLeg.rotation = -.06 + step * .16;
    this.frontLeg.rotation = .05 - step * .16;
    this.backLeg.y = 1 - Math.max(0, step) * 2.4;
    this.frontLeg.y = 1.6 + Math.min(0, step) * 2.4;
    this.hips.y = 2 - Math.abs(step) * 1.35;
    this.chest.rotation = step * .028;
    this.chest.y = -22 + Math.sin(seconds * 2.8) * .35;
    this.head.rotation = -this.chest.rotation * .65;
    this.backArm.rotation = .16 - step * .19;
    // A compact recoil, a forward snap and a longer settle, all about the elbow.
    const t = this.castTime;
    const thrust = t < .05 ? -.22 * Math.sin(t / .05 * Math.PI)
      : t < .12 ? Math.sin((t - .05) / .07 * Math.PI / 2)
      : Math.max(0, 1 - (t - .12) / .21) ** 2;
    this.wandArm.rotation = -.33 - thrust * .30 + step * .045;
    this.wandElbow.rotation = -.12 - thrust * .10;
    this.wand.rotation = thrust * (1.58 + this.aim * .75);
  }

  wandTip() {
    return this.wand.getWorldTransformMatrix().transformPoint(9.8, -10.6, this.tip);
  }

  fall() { this.root.scene.tweens.add({targets: this.root, angle: -70, alpha: .5, duration: 350}); }
  destroy() { this.root.destroy(true); }
}
