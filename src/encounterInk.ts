import type Phaser from 'phaser';

type Ink = Phaser.GameObjects.Graphics;
export type MissileKind = 'sap'|'shard'|'seed'|'dust';
export type WarningKind = 'disk'|'ring'|'lane'|'cleave';

const outline=0x29362c;
const danger=0xe79967;
const edge=0xffdea2;

// Local contours are shared by every instance of a projectile.
function contour(g:Ink,points:readonly number[],color:number,alpha=1){
  g.fillStyle(color,alpha);
  g.beginPath();g.moveTo(points[0],points[1]);
  for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);
  g.closePath();g.fillPath();
}

const sap=[-11,-2,-5,-1,-2,-5,3,-6,7,-3,8,1,6,5,0,6,-4,2];
const shard=[-9,-1,-5,-4,0,-5,12,-1,2,4,-3,5];
const seed=[-8,-3,-4,-6,1,-6,7,-2,9,1,4,5,-1,6,-6,3];
const arrowHead=[4,-.8,5,-3.5,13,0,5,3.5,6,1];

export function drawEnemyMissile(g:Ink,x:number,y:number,angle:number,kind:MissileKind){
  g.save();g.translateCanvas(x,y);g.rotateCanvas(angle);
  switch(kind){
    case 'sap':
      contour(g,sap,0x615530);
      g.fillStyle(0xb9cb65);g.fillEllipse(1,-.5,11,8,9);
      g.fillStyle(0xfbe8a0);g.fillEllipse(3,-2.5,4,2.2,7);
      g.fillStyle(0xa1b65e);g.fillCircle(-12,2,2);g.fillCircle(-17,-1,1);
      break;
    case 'shard':
      contour(g,shard,0x9b77a4);
      g.fillStyle(0xf2cdef);g.fillTriangle(-5,-3,0,-5,12,-1);
      g.fillStyle(0xd9a9cc);g.fillTriangle(-5,-3,12,-1,-3,1);
      g.fillStyle(0xc5a3c1,.85);g.fillTriangle(-11,-1,-7,-3,-8,0);
      break;
    case 'seed':
      // Ribbed acorn husk, with the stem marking the trailing end.
      g.lineStyle(2.2,0xcbb18a);g.lineBetween(-11,-4,-5,-1);
      contour(g,seed,0xe3a66a);
      g.fillStyle(0x886344);g.fillEllipse(-4,0,6.8,10,9);
      g.lineStyle(1.2,0xffdb93);g.lineBetween(-1,-3,5,-1);
      g.lineStyle(1,0x9d6442);g.lineBetween(0,3,5,2);
      break;
    case 'dust':
      g.fillStyle(0xc789b6,.34);g.fillEllipse(-4,0,19,11,10);
      g.fillStyle(0xe4aacd);g.fillCircle(-3,-2,3);g.fillCircle(3,1,3.7);
      g.fillCircle(-9,3,1.8);g.fillCircle(-13,-2,1.2);
      g.fillStyle(0xffdeb9);g.fillCircle(4,0,1.6);
      break;
  }
  g.restore();
}

export function drawArrow(g:Ink,x:number,y:number,angle:number){
  g.save();g.translateCanvas(x,y);g.rotateCanvas(angle);
  g.lineStyle(2.8,outline);g.lineBetween(-12,0,9,0);
  g.lineStyle(1.3,0xe0c184);g.lineBetween(-12,-.4,9,-.4);
  g.fillStyle(0x9bb58d);g.fillTriangle(-13,-3.6,-11,0,-6,0);
  g.fillStyle(0xc3c99c);g.fillTriangle(-13,3.6,-11,0,-6,0);
  contour(g,arrowHead,0xe3e4bd);
  g.restore();
}

export function drawWarning(g:Ink,x:number,y:number,r:number,kind:WarningKind,angle:number,progress:number){
  if(r<=0)return;
  const t=Math.min(1,Math.max(0,progress));
  const wash=.13+.14*t, rim=.69+.28*t;
  g.save();g.translateCanvas(x,y);g.rotateCanvas(angle);
  g.fillStyle(danger,wash);g.lineStyle(1.8,edge,rim);
  switch(kind){
    case 'disk':
      g.fillCircle(0,0,r);g.strokeCircle(0,0,r);
      g.lineStyle(2.8,danger,.7);g.strokeCircle(0,0,Math.max(1,t*r));
      break;
    case 'ring': {
      const inner=r*.54,band=r-inner;
      g.lineStyle(band,danger,wash);g.strokeCircle(0,0,inner+band*.5);
      g.lineStyle(1.8,edge,rim);g.strokeCircle(0,0,r);g.strokeCircle(0,0,inner);
      g.lineStyle(2.6,danger,.8);g.strokeCircle(0,0,inner+t*band);
      break;
    }
    case 'lane': {
      const half=18;
      g.fillRect(0,-half,r,2*half);g.strokeRect(0,-half,r,2*half);
      g.lineStyle(2,danger,.94);
      const head=Math.max(6,r*t);
      g.beginPath();g.moveTo(head-6,-7);g.lineTo(head,0);g.lineTo(head-6,7);g.strokePath();
      break;
    }
    case 'cleave':
      g.beginPath();g.moveTo(0,0);g.arc(0,0,r,-.85,.85,false);g.closePath();g.fillPath();g.strokePath();
      g.lineStyle(2.5,danger,.76);
      g.beginPath();g.arc(0,0,Math.max(1,r*t),-.85,.85,false);g.strokePath();
      break;
  }
  g.restore();
}

export function drawMelee(g:Ink,x:number,y:number,r:number,angle:number,progress:number,opacity=1){
  const t=Math.min(1,Math.max(0,progress));
  if(t>=1 || r<=0)return;
  const tip=-.82+1.69*Math.min(1,t/.64);
  const tail=Math.max(-.86,tip-1.22*(1-t*t));
  g.save();g.translateCanvas(x,y);g.rotateCanvas(angle);
  let ax=r*Math.cos(tail),ay=r*Math.sin(tail),ix=ax,iy=ay;
  for(let i=1;i<=8;i++){
    const u=i/8,a=tail+(tip-tail)*u;
    const c=Math.cos(a),s=Math.sin(a),inner=r*(1-.11*Math.sin(Math.PI*u));
    const bx=r*c,by=r*s,jx=inner*c,jy=inner*s;
    g.fillStyle(i>5?0xffe9b1:0xd4a66b,opacity*(1-t*t)*(.34+.66*u));
    g.fillTriangle(ax,ay,bx,by,ix,iy);g.fillTriangle(bx,by,jx,jy,ix,iy);
    ax=bx;ay=by;ix=jx;iy=jy;
  }
  g.restore();
}

const buckler=[-6,-6,0,-9,6,-6,6,2,3,7,0,10,-4,7,-6,3];
const blade=[1,-2,17,-2,23,0,16,2,1,2];
const bow=[-3,-15,1,-12,5,-8,8,-2,8,3,4,10,-3,15,1,9,4,3,4,-2,2,-8];

// x/y is the actor's world anchor, dir is its aim in radians, swing is 0..1.
export function drawEquipment(g:Ink,x:number,y:number,dir:number,job:'warden'|'hunter',swing:number){
  const side=Math.cos(dir)<0?-1:1;
  const pose=Math.max(0,Math.min(1,swing));
  g.save();g.translateCanvas(x,y);
  if(job==='warden'){
    g.save();g.translateCanvas(-8*side,2);
    contour(g,buckler,0xc0a26e);
    g.fillStyle(0x556a50);g.fillEllipse(0,-1,9,12,8);
    g.fillStyle(0xe1c594);g.fillCircle(0,-1,1.8);g.restore();
    g.translateCanvas(8*side,2);g.rotateCanvas(dir+side*(-.82+1.6*pose));
    g.lineStyle(2.8,0x885c3b);g.lineBetween(-5,0,2,0);contour(g,blade,0xb3c6bd);
    g.fillStyle(0xe2e7cb);g.fillTriangle(1,-1.8,17,-1.8,22,0);
    g.lineStyle(2,0xe1ba79);g.lineBetween(0,-4,0,4);
  }else{
    g.translateCanvas(9*Math.cos(dir),1+6*Math.sin(dir));g.rotateCanvas(dir);
    contour(g,bow,0xca9f61);
    const pull=-3-6*pose;
    g.lineStyle(1.1,0xe1d3ad);g.beginPath();g.moveTo(-3,-15);g.lineTo(pull,0);g.lineTo(-3,15);g.strokePath();
    g.lineStyle(2.4,0x765639);g.lineBetween(6,-3,6,3);
  }
  g.restore();
}

/** Segmented steel bevels cover the radius of the shield pulse. */
export function drawShieldWave(g:Ink,x:number,y:number,r:number,alpha:number){
  g.save();g.translateCanvas(x,y);
  for(let sector=0;sector<3;sector++){
    const a=sector*2.094+.4;
    for(let i=0;i<5;i++){
      const t=a+i*.29,u=t+.29;
      const c=Math.cos(t),s=Math.sin(t),b=Math.cos(u),d=Math.sin(u);
      const inner=r-2-5*Math.sin(Math.PI*(i+1)/6);
      g.fillStyle(i<2?0xa1cbcc:0xd8e6cc,alpha*(.45+i*.09));
      g.fillTriangle(c*r,s*r,b*r,d*r,b*inner,d*inner);
      g.fillTriangle(c*r,s*r,b*inner,d*inner,c*inner,s*inner);
    }
  }
  g.restore();
}
