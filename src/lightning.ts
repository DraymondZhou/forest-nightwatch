import type Phaser from 'phaser';

type Ink=Phaser.GameObjects.Graphics;
interface Bend { u:number; offset:number }

// Normalized along the bolt so the first few frames can follow the casting hand.
export function shapeLightning(seed:number,distance:number){
  let state=seed|0;
  const noise=()=>{state=(Math.imul(state,1664525)+1013904223)|0;return (state>>>0)/4294967296;};
  const count=Math.max(4,Math.min(12,Math.round(distance/18)));
  const bends:Bend[]=[{u:0,offset:0}];
  for(let i=1;i<count;i++){
    const u=(i+(noise()-.5)*.62)/count;
    const taper=Math.sin(Math.PI*u);
    bends.push({u,offset:(noise()-.5)*Math.min(distance*.27,38)*taper});
  }
  bends.push({u:1,offset:0});
  return {bends,hand:noise()<.5?-1:1,angle:noise()*Math.PI};
}
type Arc=ReturnType<typeof shapeLightning>;

function stroke(g:Ink,bends:Bend[],length:number,progress:number){
  g.beginPath();g.moveTo(0,0);
  for(let i=1;i<bends.length;i++){
    const b=bends[i];
    if(b.u>progress){
      const a=bends[i-1],t=(progress-a.u)/(b.u-a.u);
      g.lineTo(progress*length,a.offset+(b.offset-a.offset)*t);break;
    }
    g.lineTo(b.u*length,b.offset);
  }
  g.strokePath();
}

export function drawLightning(g:Ink,arc:Arc,x:number,y:number,tx:number,ty:number,age:number,charged:boolean,low:boolean){
  if(age<=0)return;
  const dx=tx-x,dy=ty-y,length=Math.hypot(dx,dy);
  if(length<1)return;
  const travel=Math.min(1,age/.045),fade=Math.min(1,Math.max(0,(.26-age)/.18));
  const color=charged?0xffc774:0x82ded8,light=charged?0xffedac:0xd7fff0;
  g.save();g.translateCanvas(x,y);g.rotateCanvas(Math.atan2(dy,dx));
  if(!low){
    g.lineStyle(charged?13:9,color,.15*fade);stroke(g,arc.bends,length,travel);
    g.lineStyle(charged?6:4,color,.80*fade);stroke(g,arc.bends,length,travel);
    // Fine filaments and ink flecks break up the silhouette as the channel discharges.
    const tail=Math.min(1,age/.14);
    if(charged && travel>.55){
      const mid=arc.bends[Math.floor(arc.bends.length/2)];
      const spread=Math.min(15,length*.09)*arc.hand;
      g.lineStyle(1,0xffdfa0,.66*fade);g.beginPath();g.moveTo(length*.12,0);
      g.lineTo(length*.30,spread);g.lineTo(length*.35,spread*.58);
      g.lineTo(mid.u*length,mid.offset);g.strokePath();
    }
    for(let i=1;i<arc.bends.length-1;i+=2){
      const b=arc.bends[i];if(b.u>travel)break;
      const side=i%4===1?1:-1,fx=b.u*length+tail*4,fy=b.offset+side*(3+tail*9);
      g.fillStyle(light,fade*.83);g.fillTriangle(fx-1.5,fy+1,fx+2.3,fy-2,fx+.7,fy+1.4);
    }
    for(let i=2;i<arc.bends.length-1;i+=3){
      const bend=arc.bends[i];
      if(travel<bend.u)break;
      const side=arc.hand*((i%2)?1:-1),bx=bend.u*length,by=bend.offset;
      const span=Math.min(30,length*.19)*(charged?1.15:1);
      g.lineStyle(1.35,color,.86*fade);
      g.beginPath();g.moveTo(bx,by);g.lineTo(bx+span*.39,by+span*.43*side);
      g.lineTo(bx+span*.34,by+span*.64*side);g.lineTo(bx+span,by+span*.93*side);g.strokePath();
    }
  }
  g.lineStyle(charged?2.8:1.9,light,fade);stroke(g,arc.bends,length,travel);
  if(travel===1){
    const impact=Math.min(1,(age-.045)/.18),r=(charged?20:13)*(1+impact*.5);
    if(!low){
      g.lineStyle(1.4,color,.72*fade);
      g.beginPath();g.arc(length,0,r*(.38+impact*.60),arc.angle+.4,arc.angle+4.1);g.strokePath();
    }
    g.fillStyle(light,fade);g.fillCircle(length,0,Math.max(1,4*(1-impact)));
    for(let i=0;i<(low?3:6);i++){
      const angle=arc.angle+i*2.40,ux=Math.cos(angle),uy=Math.sin(angle);
      const start=r*(.16+.50*impact),end=r*(i%2?.72:1);
      const bx=length+ux*start,by=uy*start,w=1.8*(1-impact)+.5;
      g.fillTriangle(bx-uy*w,by+ux*w,length+ux*end,uy*end,bx+uy*w,by-ux*w);
    }
  }
  g.restore();
}
