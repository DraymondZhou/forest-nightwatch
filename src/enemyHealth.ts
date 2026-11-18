import Phaser from 'phaser';
import type { Enemy } from './combat';

const FONT='enemy-hp-digits';
const DIGITS='0123456789/';
const ADVANCE=7;
const LABEL_HEIGHT=13;

interface Label {
  text:Phaser.GameObjects.BitmapText;
  hp:number;
  max:number;
  x:number;
  y:number;
  halfWidth:number;
}

export class EnemyHealth {
  private readonly bars:Phaser.GameObjects.Graphics;
  private readonly labels:Label[]=[];
  private used=0;
  private lastUsed=0;

  constructor(private readonly scene:Phaser.Scene){
    this.bars=scene.add.graphics().setDepth(5100);
    if(scene.cache.bitmapFont.has(FONT))return;
    // All enemies share eleven glyphs, including when damage changes every tick.
    const cell=14,height=24;
    const atlas=scene.textures.createCanvas(FONT,cell*DIGITS.length,height)!;
    const ctx=atlas.context;
    ctx.font='bold 18px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.strokeStyle='#192e2b';ctx.lineWidth=3;ctx.lineJoin='round';ctx.fillStyle='#fff1d2';
    for(let i=0;i<DIGITS.length;i++){
      const x=(i+.5)*cell;
      ctx.strokeText(DIGITS[i],x,height/2);ctx.fillText(DIGITS[i],x,height/2);
    }
    atlas.refresh();
    const data=Phaser.GameObjects.RetroFont.Parse(scene,{image:FONT,width:cell,height,chars:DIGITS,charsPerRow:DIGITS.length,'offset.x':0,'offset.y':0,'spacing.x':0,'spacing.y':0,lineSpacing:0});
    scene.cache.bitmapFont.add(FONT,data);
  }

  begin(){this.used=0;this.bars.clear();}
  draw(enemy:Enemy,x:number,top:number,showNumbers:boolean){
    if(enemy.hp<=0||enemy.maxHp<=0)return;
    const width=enemy.kind==='boss'?54:enemy.radius>=27?36:24;
    x=Math.round(x);const y=Math.round(top)-4,left=x-Math.floor(width/2);
    const ratio=Math.min(1,enemy.hp/enemy.maxHp);
    this.bars.fillStyle(0x142c29,.94).fillRect(left-1,y-1,width+2,5);
    this.bars.fillStyle(0x62463d,1).fillRect(left,y,width,3);
    this.bars.fillStyle(ratio<=.3?0xf1a07f:0xc2d094,1).fillRect(left,y,Math.max(1,Math.round(width*ratio)),3);

    if(!showNumbers)return;
    const hp=Math.ceil(enemy.hp),max=Math.ceil(enemy.maxHp);
    const halfWidth=(Math.floor(Math.log10(hp))+Math.floor(Math.log10(max))+3)*ADVANCE/2;
    // Keep a bar on each monster. Suppress only a number that would sit on
    // another number. Stable spawn order prevents the two labels alternating.
    for(let i=0;i<this.used;i++){
      const other=this.labels[i];
      if(Math.abs(other.y-y)<LABEL_HEIGHT+2 && Math.abs(other.x-x)<other.halfWidth+halfWidth+2)return;
    }
    const index=this.used++;
    let entry=this.labels[index];
    if(!entry){
      const text=this.scene.add.bitmapText(0,0,FONT,'',ADVANCE).setOrigin(.5,1).setDepth(5101);
      entry={text,hp:-1,max:-1,x:0,y:0,halfWidth:0};this.labels.push(entry);
    }
    if(entry.hp!==hp||entry.max!==max)entry.text.setText(hp+'/'+max);
    entry.hp=hp;entry.max=max;entry.x=x;entry.y=y;entry.halfWidth=halfWidth;
    entry.text.setPosition(x,y-2).setVisible(true);
  }
  end(){
    for(let i=this.used;i<this.lastUsed;i++)this.labels[i].text.setVisible(false);
    this.lastUsed=this.used;
  }
}
