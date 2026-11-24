/* Full-figure menu portraits. Use the in-game rest pose, not individually sized
   headshots; normalize the visible soles and crown only after all joints exist. */
const path=require('node:path'),sharp=require('sharp');
const dir=path.join(__dirname,'../public/art');
const atlas=require('../src/traveler-atlas.json').frames;
const group=(t,s)=>'<g transform="'+t+'">'+s+'</g>';
const image=(data,x,y,w,h)=>'<image x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" href="data:image/png;base64,'+data.toString('base64')+'"/>';
async function mageRest(){
  const layers=[];
  async function skin(name,cx,cy,height,ox,oy,rotation=0){
    const {x:left,y:top,w:width,h}=atlas[name].frame,w=height*width/h;
    const bytes=await sharp(path.join(dir,'traveler.png')).extract({left,top,width,height:h}).png().toBuffer();
    layers.push(group('translate('+cx+' '+cy+') rotate('+rotation+')',image(bytes,-ox*w,-oy*height,w,height)));
  }
  async function grip(frame,cx,cy,oy,rotation,yScale=1,texture='grip-parts.png'){
    const buf=await sharp(path.join(dir,texture)).extract({left:128*frame,top:0,width:128,height:128}).png().toBuffer();
    layers.push(group('translate('+cx+' '+cy+') rotate('+rotation+') scale(1 '+yScale+')',image(buf,-16,-oy,32,32)));
  }
  // Positions, attachment origins and projected sleeve lengths match WitchRig's
  // idle front view in world units. Both legs include their painted boots.
  await skin('left-leg',-5.3,3,24,.45,.12,-2);
  await skin('right-leg',5.1,3.6,24,.47,.12,2);
  await skin('left-upper',10.5,-14,12,.32,.17,-7);
  await skin('left-forearm',12.5,-5.5,10.8,.48,.14,-7);
  await skin('body',0,-20,32,.5,.09);
  await grip(0,0,-18,10,0,1,'mage-regalia.png');
  const sx=-9.5,sy=-13.7,ex=sx-3,ey=sy+7.4,wx=sx-2.6,wy=sy+12;
  const degrees=(x,y)=>Math.atan2(-x,y)*180/Math.PI;
  await grip(0,sx,sy,8,degrees(ex-sx,ey-sy),Math.hypot(ex-sx,ey-sy)/7.9);
  await grip(1,ex,ey,8,degrees(wx-ex,wy-ey),Math.hypot(wx-ex,wy-ey)/7.9);
  await grip(3,wx,wy,21,Math.atan2(-6.5,12)*180/Math.PI,Math.hypot(6.5,12)/16.75,'mage-regalia.png');
  await grip(6,wx,wy,18,0);
  await skin('head',-.5,-18.3,28.5,.5,.90);
  return sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="-40 -50 80 80">'+layers.join('')+'</svg>')).png().toBuffer();
}
async function portraits(renderMartial){
  const blank={r:0,g:0,b:0,alpha:0};
  for(const [idx,job] of ['mage','warden','hunter'].entries()){
    const source=idx===0?await mageRest():renderMartial?await renderMartial(idx===1):
      await sharp(path.join(dir,'martial-heroes.png')).extract({left:11*128,top:(idx-1)*3*128,width:128,height:128}).png().toBuffer();
    const trim=await sharp(source).trim({background:blank,threshold:1}).png().toBuffer();
    const fig=await sharp(trim).resize({height:118}).png().toBuffer({resolveWithObject:true});
    const left=Math.round((132-fig.info.width)/2);if(left<2)throw Error('Portrait spills outside safe area: '+job);
    await sharp({create:{width:132,height:132,channels:4,background:blank}}).composite([{input:fig.data,left,top:7}]).png().toFile(path.join(dir,'job-'+job+'.png'));
  }
}
module.exports=portraits;
if(require.main===module)portraits().catch(e=>{console.error(e);process.exitCode=1});
