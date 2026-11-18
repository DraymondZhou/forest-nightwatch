import type Phaser from 'phaser';

type Ink = Phaser.GameObjects.Graphics;
interface Bend { u:number; offset:number; width:number }

export function shapeLightning(seed:number,distance:number){
  let state=seed|0;
  const noise=()=>{state=(Math.imul(state,1664525)+1013904223)|0;return (state>>>0)/4294967296;};
  const count=Math.max(3,Math.min(9,Math.round(distance/24)));
  const bends:Bend[]=[{u:0,offset:0,width:0}];
  const spread=Math.min(22,distance*.14);
  let hand=noise()<.5?-1:1;
  for(let i=1;i<count;i++){
    const u=(i+(noise()-.5)*.65)/count;
    const offset=hand*(.25+.75*noise())*spread*Math.sin(Math.PI*u);
    bends.push({u,offset,width:.6+noise()*.95});
    if(noise()<.82)hand=-hand;
  }
  bends.push({u:1,offset:0,width:0});
  return {bends,hand,angle:noise()*Math.PI*2};
}
type Arc=ReturnType<typeof shapeLightning>;

// Each facet shares an edge with its neighbour. The lopsided silhouette leaves
// points of varying thickness when the white flash has already disappeared.
export function drawLightning(g:Ink,arc:Arc,x:number,y:number,tx:number,ty:number,age:number,charged:boolean,low:boolean){
  const end=charged?.155:.125;
  if(age<=0 || age>=end)return;
  const dx=tx-x,dy=ty-y,length=Math.hypot(dx,dy);
  if(length<1)return;
  const travel=Math.min(1,age/.036);
  const tail=Math.max(0,(age-.066)/(end-.066));
  const width=(charged?3.65:2.2)*(1-tail*.54);
  const color=charged?0xe8a35b:0x98c8a8,light=charged?0xffedb9:0xe8eed1;
  g.save();g.translateCanvas(x,y);g.rotateCanvas(Math.atan2(dy,dx));
  for(let i=1;i<arc.bends.length;i++){
    const a=arc.bends[i-1],b=arc.bends[i];
    if(a.u>=travel)break;
    const shown=Math.min(1,(travel-a.u)/(b.u-a.u));
    const cut=tail*(i%2?.70:.32);
    if(shown<=cut)continue;
    const spanX=(b.u-a.u)*length,spanY=b.offset-a.offset;
    const ax=a.u*length+spanX*cut,ay=a.offset+spanY*cut;
    const bx=a.u*length+spanX*shown,by=a.offset+spanY*shown;
    const wa=a.width*width*(1-cut),wb=b.width*width*shown;
    g.fillStyle(color,1-tail*.76);
    g.fillTriangle(ax,ay-wa*.3,ax,ay+wa,bx,by-wb*.3);
    g.fillTriangle(ax,ay+wa,bx,by+wb,bx,by-wb*.3);
    if(age<.064 && (i%2===1 || charged)){
      g.fillStyle(light,.94);
      g.fillTriangle(ax,ay+wa*.52,bx,by-wb*.24,bx,by+wb*.55);
    }
    if(!low && i%3===2 && shown===1 && tail<.65){
      const fork=Math.min(20,length*.14)*(charged?1.24:.86),side=i%2?arc.hand:-arc.hand;
      const mx=bx+fork*.42,my=by+fork*.42*side;
      g.fillStyle(color,.85*(1-tail));
      g.fillTriangle(bx,by,mx-2,my,mx+1.4,my);
      g.fillTriangle(mx-2,my,mx+1.4,my,bx+fork*.24,by+fork*side);
    }
  }
  g.restore();
}

// The atlas starts with a flash and ends on separated flecks. Use elapsed time
// so that frame selection also holds at 30 Hz and on high-refresh displays.
export function stormImpactFrame(age:number,charged:boolean){
  const elapsed=age-.036;
  const frame=Math.floor(elapsed/(charged?.034:.026));
  return frame>=0 && frame<6?frame+(charged?6:0):-1;
}
