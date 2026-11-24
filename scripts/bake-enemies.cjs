// Run with Node and sharp installed to rebake the checked-in atlas.
const sharp=require('sharp');
const path=require('node:path');
const skeletons=require('./enemy-skeletons.cjs');
const art=path.join(__dirname,'../public/art');
const brokenBeetle=process.argv.includes('--broken-beetle');
const cell=128,columns=12,frames=24,rows=brokenBeetle?2:skeletons.length*2;
const meshSteps=40,grid=meshSteps+1;
const output=Buffer.alloc(cell*columns*cell*rows*4);

function bindMesh(bones){
  const vertices=[];
  for(let j=0;j<grid;j++)for(let i=0;i<grid;i++){
    const x=i*100/meshSteps,y=j*100/meshSteps;
    const weights=bones.map(b=>{
      const dx=b.tipX-b.x,dy=b.tipY-b.y;
      const t=Math.max(0,Math.min(1,((x-b.x)*dx+(y-b.y)*dy)/(dx*dx+dy*dy)));
      const d2=(x-b.x-t*dx)**2+(y-b.y-t*dy)**2;
      return Math.exp(-d2/(.58*b.radius*b.radius));
    });
    const sum=weights.reduce((a,b)=>a+b,0);
    vertices.push({x,y,weights:weights.map(w=>w/sum)});
  }
  return vertices;
}
function rotations(bones,frame){
  const world=new Map();
  return bones.map(b=>{
    let degrees=0;
    if(frame<12)degrees=b.gait*Math.sin(frame*Math.PI/6+b.phase);
    else if(frame<16)degrees=b.prepare*(frame-11)/4;
    else if(frame<20)degrees=b.strike*[.7,1,.64,.27][frame-16];
    else if(frame<23)degrees=b.hurt*[1,.64,.28][frame-20];
    const parent=world.get(b.parent);
    const angle=(parent?.angle||0)+degrees*Math.PI/180;
    const cx=parent?parent.c*b.x-parent.s*b.y+parent.dx:b.x;
    const cy=parent?parent.s*b.x+parent.c*b.y+parent.dy:b.y;
    const c=Math.cos(angle),s=Math.sin(angle);
    const result={angle,c,s,dx:cx-c*b.x+s*b.y,dy:cy-s*b.x-c*b.y};
    world.set(b.name,result);
    return result;
  });
}
function poseMesh(mesh,transforms){
  return mesh.map(v=>{
    let x=0,y=0;
    for(let i=0;i<transforms.length;i++){
      const m=transforms[i],w=v.weights[i];
      x+=w*(m.c*v.x-m.s*v.y+m.dx);
      y+=w*(m.s*v.x+m.c*v.y+m.dy);
    }
    // Leave enough transparent space for extended wings, roots and fists.
    return {u:v.x/100,v:v.y/100,x:(x+8)*cell/116,y:(y+8)*cell/116};
  });
}
function triangle(a,b,c,tile,tileSize,left,top){
  const ex=b.x-a.x,ey=b.y-a.y,fx=c.x-a.x,fy=c.y-a.y,det=ex*fy-ey*fx;
  if(Math.abs(det)<.0001)return;
  for(let y=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y)));y<Math.min(cell,Math.ceil(Math.max(a.y,b.y,c.y)));y++){
    for(let x=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x)));x<Math.min(cell,Math.ceil(Math.max(a.x,b.x,c.x)));x++){
      const dx=x+.5-a.x,dy=y+.5-a.y;
      const w=(dx*fy-dy*fx)/det,h=(ex*dy-ey*dx)/det;
      if(w<-.00001||h<-.00001||w+h>1.00001)continue;
      const u=Math.min(tileSize-1,Math.max(0,(a.u+w*(b.u-a.u)+h*(c.u-a.u))*tileSize-.5));
      const v=Math.min(tileSize-1,Math.max(0,(a.v+w*(b.v-a.v)+h*(c.v-a.v))*tileSize-.5));
      const base=((top+y)*cell*columns+left+x)*4;
      const ix=Math.floor(u),iy=Math.floor(v),sx=u-ix,sy=v-iy;
      let alpha=0,r=0,g=0,blue=0;
      for(let j=0;j<2;j++)for(let i=0;i<2;i++){
        const src=(Math.min(tileSize-1,iy+j)*tileSize+Math.min(tileSize-1,ix+i))*4;
        const weight=(i?sx:1-sx)*(j?sy:1-sy)*tile[src+3];
        alpha+=weight;r+=weight*tile[src];g+=weight*tile[src+1];blue+=weight*tile[src+2];
      }
      if(alpha<.5)continue;
      output[base]=Math.round(r/alpha);output[base+1]=Math.round(g/alpha);output[base+2]=Math.round(blue/alpha);output[base+3]=Math.round(alpha);
    }
  }
}
async function bake(){
  const poses=brokenBeetle?[[4,skeletons[4]]]:skeletons.entries();
  for(const [index,bones] of poses){
    const size=256;
    const source=sharp(path.join(art,'woodcut-enemies.png')).extract({left:(index%4)*size,top:Math.floor(index/4)*size,width:size,height:size});
    let tile;
    if(brokenBeetle){
      const tilePng=await source.png().toBuffer();
      const mask=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><path d="m124 8 45 9 4 24-12-2 2 13-13-6-9 13-4-17-13 5 3-17Z"/></svg>');
      tile=await sharp(tilePng).composite([{input:mask,blend:'dest-out'},{input:path.join(__dirname,'beetle-fracture.svg')}]).ensureAlpha().raw().toBuffer();
    }else tile=await source.ensureAlpha().raw().toBuffer();
    const mesh=bindMesh(bones);
    for(let frame=0;frame<frames;frame++){
      const vertices=poseMesh(mesh,rotations(bones,frame));
      const left=(frame%columns)*cell,top=((brokenBeetle?0:index*2)+Math.floor(frame/columns))*cell;
      for(let j=0;j<meshSteps;j++)for(let i=0;i<meshSteps;i++){
        const p=j*grid+i;
        triangle(vertices[p],vertices[p+1],vertices[p+grid],tile,size,left,top);
        triangle(vertices[p+1],vertices[p+grid+1],vertices[p+grid],tile,size,left,top);
      }
    }
  }
  const target=brokenBeetle?'beetle-broken.png':'enemy-poses.png';
  await sharp(output,{raw:{width:cell*columns,height:cell*rows,channels:4}}).png({palette:true,colours:160,effort:9,dither:0}).toFile(path.join(art,target));
}
bake().catch(e=>{console.error(e);process.exitCode=1});
