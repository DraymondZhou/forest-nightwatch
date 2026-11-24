// Four cut-paper overlays, painted at four pixels per world unit.
const path=require('node:path'),sharp=require('sharp');
const gold='#d2b77c',edge='#343d34',fold='#38594f',wool='#627d68';
const shape=(d,fill,stroke=edge,width=1)=>'<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+width+'" stroke-linejoin="round" stroke-linecap="round"/>';
const hem=(d)=>shape(d,'none',gold,.7);
const pin=shape('M2 2l1.6 -1 1.4 1.6 -1.6 2Z',gold,edge,.55);
function mantle(view){
 if(view===1)return shape('M-7 -1Q1 2 7 -2L8 1 4 4 0 6 -8 16 -11 15 -8 8 -12 10 -10 4Z',wool)+shape('M-10 6l11 -4 -5 4 -5 8 2 -8Z',fold,'none')+hem('M-10 8l3 -2M-9 14l6 -8 5 -3')+pin;
 if(view===2)return shape('M-8 -2Q0 1 8 -2L11 5 7 7 2 6 -2 13 -5 11 -4 6 -9 8 -11 5Z',fold)+shape('M-7 -1Q0 2 7 -1L8 2 2 5 -3 5 -8 4Z',wool,'none')+hem('M-8 5l5 -1 4 1 6 -3M-3 9l1 -2');
 return shape('M-8 -2Q-3 2 2 1L8 -2 10 3 5 4 2 5 -3 14 -6 13 -5 7 -9 6 -11 3Z',wool)+shape('M-8 3l8 1 -4 7 1 -6Z',fold,'none')+hem('M-9 3l4 2 5 -1M-4 12l3 -7')+pin;
}
function staff(){
 return shape('M-1.2 6L-.9 -11 -3.8 -15 -2.7 -18 -.7 -14 1 -13 3.4 -17 3.8 -15 1.3 -11 .7 6Z','#94714a',edge,.85)+shape('M-1.7 -15.2L0 -19 1.8 -16 .1 -13.6Z','#a4d3bc',edge,.65)+hem('M-.8 -10l2 -.8M-.8 -8.5l1.8 -.8M-.5 3l1 -.6');
}
async function bake(){
 const layers=[mantle(0),mantle(1),mantle(2),staff()].map((drawing,i)=>{
  const origin=i===3?-21:-10;
  const svg='<svg width="128" height="128" viewBox="-16 '+origin+' 32 32" xmlns="http://www.w3.org/2000/svg">'+drawing+'</svg>';
  return {input:Buffer.from(svg),left:128*i,top:0};
 });
 await sharp({create:{width:512,height:128,channels:4,background:'#0000'}}).composite(layers).png().toFile(path.join(__dirname,'../public/art/mage-regalia.png'));
}
if(require.main===module)bake().catch(e=>{console.error(e);process.exitCode=1});
