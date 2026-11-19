/* Original layered woodcuts. Each frame is baked from local joint transforms.
   Run with sharp available to Node, as for bake-enemies.cjs. */
const sharp = require('sharp');
const path = require('node:path');
const ink = '#25302c';
const p = (d, fill, outline = 0) =>
  '<path d="'+d+'" fill="'+fill+'" stroke="'+(outline ? ink : 'none')+'" stroke-width="'+outline+'" stroke-linejoin="round"/>';
const lines = (d, color, width=1) =>
  '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round"/>';
const group = (transform, parts) => '<g transform="'+transform+'">'+parts+'</g>';
const rotate = (a,x,y,parts) => group('rotate('+a+' '+x+' '+y+')',parts);
const sine = Math.sin;
function pose(i) {
  return {step:i<12?sine(i*Math.PI/6):0, lift:i<12?sine(i*Math.PI/6+.7):0,
    prep:i>=12&&i<16?(i-11)/4:0, release:[.82,1,.62,.22][i-16]||0,
    recoil:[1,.62,.24][i-20]||0};
}
function leg(x,y,a,back,near){
  const hair=near?'#72503d':'#504539';
  const dx=back?-4:2;
  const calf=p('M -4 -1 Q -3 5 -1 8 L -2 15 L 4 15 L 6 13 L 3 11 L 3 4 L 4 -2 Z',hair,1.3)+
    p('M -2 12 L 3 12 L 7 15 L 5 17 L -3 17 Z','#36352e');
  const thigh=p('M -6 -4 Q 1 -7 6 -3 L 3 9 L -2 13 L -6 9 Z',hair,1.3);
  return group('translate('+x+' '+y+')',rotate(a,0,0,thigh+group('translate('+dx+' 8)',rotate(-a*.65,0,0,calf))));
}
function boar(i){
  const {step,lift,prep,release,recoil}=pose(i);
  const rear=leg(40,69,-step*17-18*release,true,false)+leg(77,70,step*18+16*release,false,false);
  const trunk=p('M 13 69 Q 16 53 31 46 L 42 40 L 40 36 L 49 39 L 48 31 L 56 36 L 60 28 L 66 35 L 71 29 L 74 37 L 81 34 Q 89 37 92 53 Q 95 66 83 76 L 73 83 L 66 80 L 62 84 L 52 79 Q 41 84 29 78 L 22 80 L 24 75 L 16 76 Z','#775341',2)+
    p('M 17 68 Q 26 48 40 47 L 53 37 L 51 45 L 65 35 L 59 48 L 74 40 L 69 51 L 79 47 L 72 59 L 77 56 L 71 65 L 66 61 L 58 65 L 60 57 L 50 62 L 52 54 L 43 58 L 46 51 L 31 57 Z','#aa7851')+
    p('M 20 68 Q 39 78 55 65 L 52 71 L 66 66 L 62 73 L 76 71 L 70 79 L 56 80 L 50 76 L 36 79 L 27 75 Z','#554437')+
    lines('M28 62 q4 -6 10 -8 m-6 11 12 -9 m1 1 5 -6 m7 4 6 -7 m5 7 4 -5 M29 70 l6 -3 m8 3 5 -3','#d29a60',1.15)+
    lines('M23 56 Q14 54 14 61 Q16 69 10 71 Q6 72 6 68','#514439',2.6);
  const crown=p('M 86 48 Q 76 42 72 33 L 65 32 L 59 23 L 68 29 L 71 28 L 69 18 L 72 14 L 73 24 L 78 33 L 82 36 L 78 22 L 81 15 L 83 24 L 87 31 L 89 20 L 94 14 L 92 24 L 91 33 L 96 27 L 102 25 L 94 34 L 90 40 L 93 47 Z','#bd9863',1.6)+
    lines('M86 43 Q80 37 75 28 M88 36 L90 28','#f0c780',1.2);
  const head=p('M 72 48 Q 80 42 88 46 L 96 39 L 94 49 Q 100 51 101 59 L 107 64 L 115 65 L 116 72 L 112 76 L 100 75 L 91 80 L 88 76 L 84 81 L 83 73 L 77 72 L 79 65 L 72 67 L 76 59 L 69 61 Z','#936b4c',1.8)+
    p('M 77 51 Q 72 45 71 37 Q 81 38 85 45 L 83 52 Z','#6e503e',1.6)+
    p('M74 40 L81 46 L79 48 Z','#d7a175')+
    p('M 83 54 L 90 50 L 99 53 L 103 62 L 98 59 L 90 56 L 84 59 Z','#c49a64')+
    p('M 85 60 L 91 57 L 99 60 L 93 63 L 87 63 Z','#37392e')+
    p('M 91 60 L 96 59 L 94 62 L 91 62 Z','#ffe499')+
    p('M 108 65 Q 113 62 117 65 L 118 70 L 115 73 L 108 72 Z','#59493c',1.1)+
    p('M 98 73 Q 103 72 107 63 Q 110 73 104 78 Q 101 80 97 77 Z','#eadab0',1.1)+
    lines('M88 68 l5 -2 m-6 6 4 -2 M113 67 l1 2','#4b4033',1.3);
  const legs=leg(32,71,step*18-15*release,true,true)+leg(72,74,-step*18+19*release,false,true);
  return group('translate('+(-4*prep+3*release-3*recoil)+' '+(1.5*Math.abs(step)+3*prep-2*release)+')',
    rear+rotate(2*lift+2*prep-4*recoil,56,72,trunk+legs+rotate(prep*18-release*8-recoil*11,80,55,crown+head)));
}
function mothWing(side,spread,tilt){
  const hind=p('M 63 63 Q 52 60 39 68 Q 26 77 29 88 L 35 87 L 34 92 Q 41 94 47 88 Q 46 100 34 108 Q 45 109 52 100 Q 59 94 64 75 Z','#77677d',1.8)+
    p('M59 68 Q46 70 35 84 L44 82 L41 87 Q54 84 59 73 Z','#a79a9d')+
    p('M54 78 Q47 78 44 83 Q49 83 54 78 Z','#e3bd7e');
  const fore=p('M 65 62 Q 51 40 21 23 Q 13 19 6 18 Q 9 33 14 45 L 12 47 L 19 58 L 18 61 Q 24 70 32 73 L 31 76 Q 42 83 52 75 L 64 67 Z','#756985',2)+
    p('M 9 22 Q 33 32 54 55 Q 41 44 28 41 L 23 42 L 17 38 Z','#a99aaf')+
    p('M 13 35 Q 23 44 33 46 L 44 53 Q 30 48 23 48 L 18 45 Z','#c7b2a4')+
    p('M 20 52 Q 31 60 42 58 L 52 60 L 45 65 L 30 66 L 25 62 Z','#434959')+
    p('M 24 54 Q 32 48 40 55 Q43 60 37 63 Q28 64 24 54 Z','#e6c589',1.2)+
    p('M 28 54 Q31 51 35 53 Q31 57 38 59 Q30 63 28 54 Z','#43464e')+
    p('M 24 66 L 32 71 L 40 71 L 42 73 L 34 75 L 27 71 Z','#bcaaa4')+
    lines('M13 25 Q34 35 51 51 M49 58 L60 63 M38 68 L52 66 M17 46 l3 3 M23 50 l2 2','#574e61',1);
  const layered=rotate(tilt*.52,63,65,hind)+rotate(tilt,63,63,fore);
  return group('translate(64 0) scale('+(side*spread)+' 1) translate(-64 0)',layered);
}
function moth(i){
  const {step,lift,prep,release,recoil}=pose(i);
  const open=.86+.12*step-.28*prep+.14*release-.14*recoil;
  const angle=6*step+20*prep-10*release+16*recoil;
  const abdomen=p('M 58 64 C 55 77 59 86 64 96 Q 74 80 69 64 Z','#4e5262',1.7)+
    lines('M59 73 Q63 77 69 73 M60 80 Q64 83 68 80 M62 86 Q64 88 66 86','#bd9e8e',1.4);
  const thorax=p('M 57 54 L 54 51 L 56 60 L 53 63 L 57 64 L 55 69 L 61 68 L 64 74 L 67 68 L 72 69 L 70 63 L 75 62 L 71 58 L 72 52 L 68 54 Z','#c4bcad',1.5)+
    p('M58 56 L61 58 L64 55 L68 58 L71 55 L68 63 L65 62 L63 67 L60 61 L57 62 Z','#84798b');
  const head=p('M57 51 Q56 44 62 43 Q69 42 71 49 Q71 56 64 58 Q58 56 57 51 Z','#565965',1.7)+
    p('M57 50 L62 51 L61 54 L58 53 Z M66 51 L71 50 L69 54 L67 54 Z','#ffe8a1')+
    p('M58 46 L53 37 L60 40 L63 32 L66 40 L73 36 L69 46 L64 44 Z','#d9af6b',1.3)+
    lines('M59 45 Q56 34 48 30 m4 2 -1 -5 m4 7 -1 -5 M69 45 Q72 34 80 30 m-4 2 1 -5 m-4 7 1 -5','#e8d2a4',1.3);
  return group('translate(0 '+(2*lift-2*prep+3*release)+')',mothWing(1,open,angle)+mothWing(-1,open,angle)+abdomen+thorax+head);
}
async function bake(){
  const tiles=[];
  for(const [index,draw] of [boar,moth].entries()){
    for(let i=0;i<24;i++){
      const svg='<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">'+group('translate(4 4) scale(.9375)',draw(i))+'</svg>';
      tiles.push({input:await sharp(Buffer.from(svg)).png().toBuffer(),left:i%12*128,top:(index*2+Math.floor(i/12))*128});
    }
  }
  await sharp({create:{width:1536,height:512,channels:4,background:'#0000'}}).composite(tiles)
    .png({palette:true,colours:160,effort:9,dither:0}).toFile(path.join(__dirname,'../public/art/mini-bosses.png'));
}
bake().catch(e=>{console.error(e);process.exitCode=1;});
