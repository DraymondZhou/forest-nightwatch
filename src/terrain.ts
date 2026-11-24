import Phaser from 'phaser';

// Coordinates, rather than discovery order, determine each patch of undergrowth.
function hash(x: number, y: number, seed: number) {
  let bits = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ seed;
  bits = Math.imul(bits ^ (bits >>> 16), 0x85ebca6b);
  return (bits ^ (bits >>> 13)) >>> 0;
}

export class Woodland {
  private readonly floor: Phaser.GameObjects.TileSprite;
  private readonly props: Phaser.GameObjects.Image[]=[];
  private columns=0;private rows=0;private activeProps=0;
  private lastX=NaN;private lastY=NaN;private lastSeed=NaN;
  constructor(private scene: Phaser.Scene) {
    this.floor = scene.add.tileSprite(0, 0, 1, 1, 'ground').setOrigin(0).setDepth(-200000);
    this.resize(scene.scale.width,scene.scale.height);
  }

  resize(width:number,height:number) {
    // The extra margin covers camera follow lag during a dash.
    this.floor.setSize(Math.ceil(width)+192,Math.ceil(height)+192);
    this.columns=Math.ceil(this.floor.width/200)+1;
    this.rows=Math.ceil(this.floor.height/200)+1;
    const count=this.columns*this.rows;
    for(let i=this.props.length;i<count;i++){
      this.props.push(this.scene.add.image(0,0,'props').setDepth(-199999).setVisible(false));
    }
    for(let i=count;i<this.activeProps;i++)this.props[i].setVisible(false);
    this.activeProps=count;this.lastX=NaN;
  }

  follow(x: number, y: number, seed: number) {
    const left = Math.floor(x-this.floor.width/2), top = Math.floor(y-this.floor.height/2);
    if(this.floor.x!==left||this.floor.y!==top)this.floor.setPosition(left, top).setTilePosition(left, top);
    const cx = Math.floor(left / 200), cy = Math.floor(top / 200);
    if(cx===this.lastX&&cy===this.lastY&&seed===this.lastSeed)return;
    this.lastX=cx;this.lastY=cy;this.lastSeed=seed;
    let index = 0;
    for (let j=cy;j<cy+this.rows;j++) {
      for (let i=cx;i<cx+this.columns;i++) {
        const h = hash(i,j,seed), prop = this.props[index++];
        const frame = h % 4;
        const size = [48,36,60,28][frame] * (.85 + ((h >>> 24) % 40) / 100);
        // Broad patches of roots lie flush with the ground and reuse the same prop pool.
        if((h>>>8)%6===0){
          const width=100+((h>>>23)%32);
          prop.setTexture('fern-hollow').setDisplaySize(width,width*110/210);
        }else prop.setTexture('props',frame).setDisplaySize(size,size);
        prop.setFlipX(!!(h & 32));
        prop.setPosition(i*200 + 32 + ((h>>>4)%136), j*200 + 32 + ((h>>>12)%136));
        prop.setVisible((h>>>20)%5 !== 0);
      }
    }
  }
}
