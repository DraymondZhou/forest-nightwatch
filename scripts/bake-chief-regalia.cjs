/* Additional carved plates, wing fans and growth rings are attached in the
   local space of the original joints so they follow the gait and strike. */
const {boar,moth,pose,group,rotate,p,lines}=require('./bake-mini-bosses.cjs');
const path=require('node:path'), sharp=require('sharp');
const art=path.join(__dirname,'../public/art');
const g=(x,y,s,shape)=>group('translate('+x+' '+y+') scale('+s+')',shape);
const berry=(x,y,r,c)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+c+'" stroke="#263632" stroke-width=".65"/>';
function spur(x,y,s,a){
  return g(x,y,s,rotate(a,0,0,p('M-3 2Q-2 -5 -9 -11L-10 -16L-6 -12L-7 -22L-5 -24L-3 -15L1 -9L2 -19L5 -25L6 -24L5 -16L8 -19L13 -20L7 -15L4 -7L3 1Z','#916548',1.4)+lines('M1 0L1 -7L-4 -15 M4 -12L6 -17','#d7ad76',.9)));
}
function plate(x,y,a,broken){
 const base=broken?'#746a55':'#87917a';
 return g(x,y,1,rotate(a,0,0,p('M-10 -3Q-5 -8 4 -7L10 -4L9 1L5 5L-1 10L-4 6L-6 7L-7 2Z',base,1.35)+p('M-7 -3Q-3 -6 4 -5L7 -3L3 -3L0 0L-5 1Z','#bcc19a')+lines('M-3 2L-1 6L5 0 M-4 -1L-3 0','#495647',1.2)+(broken?lines('M2 -7L-1 -3L3 0L-1 4','#f1a665',1.65):'')));
}
function boarMantle(v,wounded){
 const {prep,release,recoil,step,lift}=v;
 const thorns=spur(37,46,.64,-29)+spur(46,43,.64,-14)+spur(54,41,.68,-6)+(wounded?spur(64,38,1,14)+spur(28,50,.55,-36):'');
 const shields=plate(34,55,-26,wounded)+plate(45,51,-18,wounded)+plate(56,48,-9,wounded)+plate(63,56,0,wounded)+(wounded?'':plate(48,61,-18,false));
 const briar=lines('M22 62Q31 56 43 61T67 52M28 65Q35 61 43 63','#404936',2.5)+lines('M24 61Q32 57 42 60T64 54','#c2ac75',.8)+p('M31 59L28 54L35 58M43 61L48 57L46 62M57 59L62 59L60 55','#65563f',.6);
 const jaw=p('M95 74Q107 75 116 58Q119 68 112 76Q107 83 96 80Z','#dfc79a',1.45)+lines('M98 78Q108 78 114 67','#967b59',1);
 const blooms=wounded?g(41,49,.84,p('M0 1Q-8 -1 -10 -8Q-5 -10 1 -6Q-2 -13 1 -17Q8 -13 7 -5Q13 -11 18 -9Q16 -1 7 2Z','#a8563b',1.4)+lines('M-8 -8Q-3 -9 1 -5M2 -15L5 -10M11 -5L16 -8','#efc489',1.4)):'';
 const scar=wounded?lines('M88 55L91 57L89 61L94 64 M41 57L46 64L43 67L50 71','#e29965',1.8):'';
 return group('translate('+(-4*prep+3*release-3*recoil)+' '+(1.5*Math.abs(step)+3*prep-2*release)+')',rotate(2*lift+2*prep-4*recoil,56,72,thorns+shields+briar+blooms+rotate(prep*18-release*8-recoil*11,80,55,jaw+scar)));
}
function mothRegalia(v,wounded){
 const {step,lift,prep,release,recoil}=v,spread=.86+.12*step-.28*prep+.14*release-.14*recoil,tilt=6*step+20*prep-10*release+16*recoil;
 // Folds of a second silk fan extend independently below the main marked wings.
 function fan(side){
  const tail=p(wounded?'M60 68Q45 76 43 86L44 93L40 92L38 100L34 99L27 109L38 104L38 109Q55 100 58 82L64 75Z':'M60 68Q47 75 44 85Q41 97 27 106Q40 107 45 100Q44 108 37 115Q53 110 57 91L64 74Z',wounded?'#a77079':'#978c9f',1.25)+lines('M57 76Q53 96 38 104M50 85L44 92','#ead6aa',1.2);
  const fan=p('M53 55Q43 41 18 29L22 35L17 32L21 39L26 42L27 38L31 44L38 46L37 42L45 49Z',wounded?'#cb998e':'#e0c8a1',.9)+lines('M22 31Q38 39 51 53M22 53Q28 46 37 48M27 69L32 72L38 72','#67576b',1.2)+(wounded?p('M14 42L23 45L30 49L27 45L33 46L27 43L17 39ZM21 62L28 64L35 63L31 66L37 67L29 67L25 66Z','#433d50')+berry(39,55,2.1,'#f5aa7f'):'');
  return group('translate(64 0) scale('+(side*spread)+' 1) translate(-64 0)',rotate(tilt*.52,63,65,tail+(wounded?p('M55 73Q44 71 41 80Q47 88 53 79Z','#efcda0',1.1)+p('M50 74Q44 76 44 81Q48 83 50 74Z','#645266'):''))+rotate(tilt,63,63,fan));
 }
 const mask=p('M57 49L61 46L64 48L68 45L71 48L69 56L65 56L64 61L61 56L58 54Z','#c4b49c',1.4)+p('M57 49L62 51L61 54L58 53ZM66 51L71 48L69 53L66 54Z','#53465d')+lines('M59 51L61 52 M67 52L69 51',wounded?'#ffba78':'#f9e7ae',1.2);
 const bib=p('M56 61L61 64L64 61L67 64L72 61L69 69L65 71L64 78L61 71L58 69Z','#c19e65',1.15)+berry(64,67,2.4,wounded?'#fdab83':'#f2e7c5');
 return group('translate(0 '+(2*lift-2*prep+3*release)+')',fan(1)+fan(-1)+mask+bib);
}
function treeRelics(v,wounded){
 const {step,prep,release,recoil}=v;
 const crown=spur(41,35,.83,-25)+spur(47,30,.84,-17)+spur(83,30,.94,19)+spur(91,38,.64,30);
 const moss=p('M25 49Q30 41 39 40L38 44L49 39L45 44L52 40L49 49L43 54L43 48L37 52L36 62L33 67L34 54L29 59L30 51Z','#69876a',.95)+lines('M34 45L39 43M35 51L34 56 M40 46L43 43','#bbbd83',1);
 const shroom=(x,y,s)=>g(x,y,s,p('M-6 2Q-8 -1 -5 -4Q-1 -8 4 -6Q9 -4 8 -1Q4 3 -6 2Z','#a85d42',1.1)+lines('M-5 0Q1 2 7 -2','#edd09c',1.4));
 const core=p('M59 76L64 72L70 76L69 84L65 91L59 85Z','#483d2f',1.2)+p('M61 78L65 75L67 78L66 85L64 87L62 83Z',wounded?'#ffbd76':'#d7be82')+lines('M65 77L64 82L65 84','#846744',.8);
 const burst=wounded?g(86,42,1,spur(0,0,1.12,10)+spur(2,2,.85,49)+spur(-7,1,.8,-20)+lines('M1 1L3 -6L4 -14 M-7 2L-7 -3','#eeac67',1.35)):'';
 const ring=wounded?lines('M65 72L68 68L66 65L71 62 M59 77L53 74L54 69L50 66M69 81L74 76L77 78L81 73','#e68555',1.75)+spur(66,31,.90,-10):'';
 const bell=(x,y,side)=>g(x,y,1,rotate(step*5+side*prep*13-release*12,0,0,lines('M0 0Q2 7 1 12','#63513d',1.5)+p('M-4 13L0 10L4 12L6 17L4 18L4 24L0 27L-4 25L-5 19L-7 18Z','#4a5140',1.25)+p('M-3 17L0 15L3 16L3 22L0 24L-3 22Z',wounded?'#ffbc73':'#d9c382')+lines('M0 16L0 23','#82664d',1)));
 return group('translate('+(-recoil*.9)+' '+(step*.7+prep*1.9-release*2)+')',crown+moss+burst+shroom(38,38,.8)+shroom(44,33,.65)+shroom(85,44,.65)+bell(28,60,-1)+bell(95,57,1)+core+ring);
}
function svg(s){return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">'+s+'</svg>');}
async function bake(){
 const frames=[];const existing=path.join(art,'enemy-poses.png');
 for(let bank=0;bank<6;bank++)for(let i=0;i<24;i++){
  const kind=bank%3,wounded=bank>=3,v=pose(i);let tile;
  if(kind<2){const body=kind===0?boar(i):moth(i),details=kind===0?boarMantle(v,wounded):mothRegalia(v,wounded);
    tile=await sharp(svg(group('translate(4 4) scale(.9375)',body+details))).png().toBuffer();}
  else {let src=sharp(existing).extract({left:i%12*128,top:(14+Math.floor(i/12))*128,width:128,height:128});
    if(wounded)src=src.modulate({brightness:.83,saturation:.8,hue:343});
    // Strip foliage from the crown's right side, revealing the bare fork beneath it.
    const layers=wounded?[{input:svg(p('M77 0H128V57L107 54L105 49L97 52L92 47L90 51L85 46L81 49L82 41L77 43L80 35L76 33L79 26Z','#fff')),blend:'dest-out'}]:[];
    tile=await src.composite([...layers,{input:svg(treeRelics(v,wounded))}]).png().toBuffer();}
  frames.push({input:tile,left:i%12*128,top:(bank*2+Math.floor(i/12))*128});
 }
 await sharp({create:{width:1536,height:1536,channels:4,background:'#0000'}}).composite(frames).png({palette:true,colours:220,effort:9,dither:0}).toFile(path.join(art,'mini-bosses.png'));
}
bake().catch(e=>{console.error(e);process.exitCode=1;});
