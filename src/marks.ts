import Phaser from 'phaser';

export const MARK = {spark:0,spore:1,leaf:2,ember:3,frost:4,comet:5,lamp:6,enemy:7} as const;

// Reuse a contiguous prefix each frame. Flight stamps sit below actors;
// reaction stamps have their own small, fixed budget above the action.
export class InkMarks {
  private images: Phaser.GameObjects.Image[]=[];
  private used=0;
  private previous=0;
  constructor(private scene:Phaser.Scene, private depth:number,private limit:number,private texture='field'){}
  begin(){this.used=0;}
  paint(frame:number,x:number,y:number,size:number,rotation=0,alpha=1){
    if(this.used>=this.limit)return;
    const i=this.used++;
    const img=this.images[i]??(this.images[i]=this.scene.add.image(0,0,this.texture,frame).setDepth(this.depth));
    if(Number(img.frame.name)!==frame)img.setFrame(frame);
    img.setPosition(x,y).setDisplaySize(size,size).setRotation(rotation).setAlpha(alpha).setVisible(true);
  }
  end(){
    for(let i=this.used;i<this.previous;i++)this.images[i].setVisible(false);
    this.previous=this.used;
  }
}
