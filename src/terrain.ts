import Phaser from 'phaser';

// Coordinates, rather than discovery order, determine each patch of undergrowth.
function hash(x: number, y: number, seed: number) {
  let bits = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ seed;
  bits = Math.imul(bits ^ (bits >>> 16), 0x85ebca6b);
  return (bits ^ (bits >>> 13)) >>> 0;
}

export class Woodland {
  private readonly floor: Phaser.GameObjects.TileSprite;
  private readonly props: Phaser.GameObjects.Image[];
  private lastX=NaN;private lastY=NaN;private lastSeed=NaN;
  constructor(scene: Phaser.Scene) {
    this.floor = scene.add.tileSprite(0, 0, 1152, 768, 'ground').setOrigin(0).setDepth(-200000);
    // 7 x 5 cells cover the landscape viewport plus a margin on every side.
    this.props = Array.from({length:35}, () => scene.add.image(0, 0, 'props').setDepth(-199999));
  }

  follow(x: number, y: number, seed: number) {
    const left = Math.floor(x - 576), top = Math.floor(y - 384);
    if(this.floor.x!==left||this.floor.y!==top)this.floor.setPosition(left, top).setTilePosition(left, top);
    const cx = Math.floor(x / 200), cy = Math.floor(y / 200);
    if(cx===this.lastX&&cy===this.lastY&&seed===this.lastSeed)return;
    this.lastX=cx;this.lastY=cy;this.lastSeed=seed;
    let index = 0;
    for (let j = cy-2; j <= cy+2; j++) {
      for (let i = cx-3; i <= cx+3; i++) {
        const h = hash(i,j,seed), prop = this.props[index++];
        const frame = h % 4;
        const size = [48,36,60,28][frame] * (.85 + ((h >>> 24) % 40) / 100);
        prop.setFrame(frame).setDisplaySize(size,size).setFlipX(!!(h & 32));
        prop.setPosition(i*200 + 32 + ((h>>>4)%136), j*200 + 32 + ((h>>>12)%136));
        prop.setVisible((h>>>20)%5 !== 0);
      }
    }
  }
}
