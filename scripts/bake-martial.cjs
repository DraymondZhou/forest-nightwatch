/* Original cut-paper figures. Legs and arms are two-link chains; weapons share
   the wrist transform. Each of three views has six strides, four attacks, hurt
   and rest. Bake once with sharp available; the game uses one sprite per hero. */
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const dest=path.join(__dirname,'../public/art'),ink='#252b28';
const p=(d,c,w=1.4)=>'<path d="'+d+'" fill="'+c+'" stroke="'+(w?ink:'none')+'" stroke-width="'+w+'" stroke-linejoin="round"/>';
const l=(d,c,w=1)=>'<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round"/>';
const g=(t,s)=>'<g transform="'+t+'">'+s+'</g>';
const at=(x,y,s)=>g('translate('+x+' '+y+')',s);
const rot=(a,s)=>g('rotate('+a+')',s);
const mark=(x,y,r,col)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+col+'"/>';
const svg=(s,w=128,h=w)=>Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 128 128">'+s+'</svg>');
const steel='#899a91',light='#c1cbb1',iron='#4c605b',edge='#c5a469',hide='#7e5034',cloth='#783e36',moss='#59745b',hood='#6e8862',skin='#bc855e';
const bar=(a,b,shape)=>{const dx=b[0]-a[0],dy=b[1]-a[1];return at(...a,rot(Math.atan2(-dx,dy)*180/Math.PI,g('scale(1 '+Math.hypot(dx,dy)/10+')',shape)))};
const arm=(a,h,ward,far,bend)=>{const dx=h[0]-a[0],dy=h[1]-a[1],len=Math.hypot(dx,dy)||1;
 const k=Math.sqrt(Math.max(0,10.7**2-(len/2)**2)),e=[(a[0]+h[0])/2-dy/len*k*bend,(a[1]+h[1])/2+dx/len*k*bend];
 return bar(a,e,p('M-3.9 -1 Q0 -3 4 0 L3 10 0 12 -3.2 10Z',ward?(far?iron:steel):(far?'#344e42':moss))+l('M-2 3L2 4',ward?light:'#9a9d70'))+bar(e,h,p('M-3.2 0 L3 0 2.5 9 1 11 -2 10Z',ward?iron:hide)+l('M-2 4L2 3M-2 7L2 6',ward?steel:edge,.8))};
const hand=(h)=>at(...h,p('M-2.7 -2L.5 -3.2 3 -.6 2.5 2.2 0 3 -2.6 1.3Z','#aa7959',1));
function leg(x,step,side,far,ward){const a=[x,74],k=[x+(side?step*3:0),84+Math.abs(step)*1.5],f=[x+(side?step*7:step*.6),96+(side?-Math.max(0,step)*3:step*3)];
 return bar(a,k,p('M-4 -1L4 -1 3.4 10 -3 11Z',ward?(far?'#464a40':'#5e6253'):'#554b39'))+bar(k,f,p('M-3.5 -1 Q0 -2.5 3.5 0L2.8 11 -3 11Z',ward?(far?iron:steel):hide)+l('M-2 3L2 2M-2 6L2 5',ward?light:'#bd9162',.85))+at(...f,p(side?'M-3 -1L2.8 -1 4 2 7 3 7 5 -4 5Z':far?'M-3 -1L3 -1 3 5 -5 5 -5 2Z':'M-3 -1L3 -1 5 2 5 5 -3 5Z',far?'#3c3831':'#53463b'))}
function helmet(side,back,hurt){return p('M-12 2 Q-14 -13 -2 -16 Q8 -18 13 -7L16 -3 12 0 11 8 7 12 1 8 -8 12 -11 7Z',iron)+p('M-13 -3 Q-12 -14 -2 -17 Q8 -17 12 -8L14 -4 3 -3 -5 0Z',steel)+l('M-9 -7Q-5 -14 1 -14M-5 -2L5 -5 11 -5M-10 -4l3 -1M6 -12l2 2',light,1.6)+
 (back?p('M-10 1 Q-2 -2 10 0L8 9 0 12 -8 8Z','#59675c')+l('M-8 2Q0 0 8 2M-6 6Q0 4 6 6',steel):
 p(side?'M1 -1 L12 -4 14 -1 11 1 10 6 5 8 1 6Z':'M-8 -1 L8 -3 9 0 7 7 2 10 -5 7Z',skin,1)+p(side?'M-11 -2L5 -5 14 -5 15 -3 6 -1 5 5 1 7 -1 0 -9 3Z':'M-13 -2L0 -5 14 -5 13 -2 3 0 2 5 -1 6 -3 0 -12 2Z',steel)+l(side?'M8 0L11 -1':hurt?'M-6 2l2 1M4 2l2 -1':'M-7 1l3 0M4 1l3 -1',ink,1.4))+
 p('M-8 -13Q-7 -21 -14 -22Q-5 -23 -1 -17L0 -14Z',cloth)+l('M-2 -15Q2 -12 3 -6','#d8c399',1.7)+mark(-8,1,1.3,edge)}
function hoodHead(side,back,hurt){return p('M-14 10 Q-8 4 -11 -3L-16 -12 -5 -15Q6 -19 12 -8L16 -3 10 -1 8 8 3 12 -3 10 -8 13Z',hood)+p('M-15 -11L-4 -13 -7 -3 -4 6 -9 10 -7 1Z','#455e49',0)+p('M-9 -8Q-15 -10 -18 -15Q-10 -16 -6 -10Z','#ceb480',.9)+l('M-15 -14l7 5','#65553a',.8)+(back?l('M4 -11Q-2 -6 -1 4L-5 8','#a3aa79',1.4):p(side?'M2 -6L11 -7 12 -2 15 1 11 2 10 5 5 7 1 3Z':'M-6 -4L4 -7 9 -3 8 3 4 8 -2 7 -7 2Z',skin,1)+l(side?'M8 -3l3 -.6':hurt?'M-4 0l2 1M4 -1l2 -1':'M-5 -1l3 .4M4 -2l2 .1',ink,1.5)+p('M-9 2Q-2 8 9 3L6 10 -1 12 -8 8Z','#4c6550'))+l('M-11 -10Q-4 -13 2 -13M-8 -7l3 -3','#a4b289',1.2)}
const sword=rot(0,p('M-2 0L-2.8 -24 0 -35 3 -24 2 0Z',light)+p('M0 -33L2.5 -23 1.8 -1 -.5 -1Z',steel,0)+p('M-6 0L-4 -2 5 -2 7 0 2 1 1 7 -1 7 -2 1Z',edge)+mark(0,6,1.5,edge));
const shield=p('M-11 -11 Q-4 -14 0 -16Q5 -13 11 -12L10 1Q8 9 0 15Q-7 10 -10 3Z',edge)+p('M-8.5 -9.7L0 -13 8.5 -10 7.5 1Q6 7 0 11.5Q-7 6 -8 0Z','#425e59')+l('M0 8L0 -8M0 1L-4 -4M0 -2L4 -6',edge,1.6)+mark(-8,-9,1.1,light)+mark(8,-9,1.1,light);
function body(ward,side,back){if(ward)return p('M-12 -2L9 -2 13 7 10 16 14 30 4 27 -2 31 -12 28 -16 30 -10 14Z',cloth)+p('M-12 0 Q0 -6 12 0L13 7 9 18 2 20 -9 16 -12 9Z',steel)+p('M-10 5Q0 11 11 3L8 14 2 17 -8 14Z',iron,0)+l('M-10 3Q-2 8 9 2M-7 11L-2 13M-6 23L-8 26',light,1.3)+p('M-10 16Q0 19 10 15L11 19 0 22 -11 20Z',hide)+l('M-10 22l2 1M-11 24l2 1M8 23l2 1M9 25l2 1','#af7357',.8)+at(side?3:0,18,p('M-2 -1.5L2 -1.5 2 1.5 -2 1.5Z',edge,.7))+(!back?p('M-14 -1Q-9 -7 -3 -2L-4 4 -14 7 -17 4Z',steel)+l('M-14 1l7 -1',light):p('M-9 -4L8 -3 12 18 8 26 2 24 -7 27 -13 22Z',cloth)+l('M-8 0l-2 18M5 1l4 18','#ab6450'));
 return p('M-8 -1L8 -3 9 8 7 16 11 27 4 26 1 29 -8 25 -12 28 -7 11Z','#716445')+p('M-11 -2Q-1 -7 9 -2L12 7 7 8 9 12 2 11 -3 16 -7 12 -13 14 -11 9 -15 10Z',moss)+l('M-9 0l-3 7M-6 3l-2 5M3 3l4 3M1 7l2 1M0 8l2 2M-3 7l-2 4M8 5l1 2','#9ea782',1.25)+p('M-9 16L8 12 9 15 -8 20Z',hide)+p('M4 15L9 14 11 19 9 22 3 21Z','#9a7951')+(back?'':l('M-6 16L6 -1','#ae8c60',2.3))}
const quiver=rot(21,p('M-3 -23L-3.5 -29 -1 -27 0 -31 1 -26 0 -22ZM1 -21L1 -27 3 -25 5 -28 4 -23 3 -21Z','#b3bc93',.7)+l('M-1 -26L-1 -15M3 -25L2 -15','#ad8054',1.2)+p('M-4 -18L4 -18 3.5 5 0 9 -3 7Z',hide)+l('M-3 -15L3 -15M-2.5 3L3 3',edge,1.5));
function figure(ward,view,frame,layer,legPhase=0){const side=view===1,back=view===2,atk=frame>=6&&frame<10,hurt=frame===10,quiet=frame===11;
 const stride=layer==='legs'?Math.sin(legPhase*Math.PI/12):frame<6?Math.sin(frame*Math.PI/3):0,t=atk?frame-6:0,bob=frame<6?-Math.abs(stride)*1.5:hurt?2:0,hip=ward?6:4.8;
 const legs=leg(64-(side?2:hip),-stride,side,true,ward)+leg(64+(side?2:hip),stride,side,false,ward);
 const shoulders=[side?-3:-9,side?5:9],core=at(0,0,body(ward,side,back)),head=at(side?1:0,-7,ward?helmet(side,back,hurt):hoodHead(side,back,hurt));
 let rear='',front='';
 const heavy=ward&&frame>=12&&frame<=14;
 if(ward){const a=[shoulders[0],2],b=[shoulders[1],2];
 const h=heavy?(side?[[-5,13],[17,5],[12,16]]:[[-13,13],[-1,3],[5,12]])[frame-12]
   :atk?(side?[[5,8],[9,-3],[15,2],[12,10]]:[[-8,8],[-14,-1],[-2,2],[3,12]])[t]:[side?6:-13,13+stride];
 const sh=[side?9:13,heavy?7:hurt?5:12-stride*.7];
 const bladeAngle=heavy?(side?[-128,85,127]:[-118,72,116])[frame-12]:atk?(side?[-28,-57,64,112]:[-40,-69,36,90])[t]:(side?24:-16);
 const contact=heavy?frame===13:atk&&t===2;
 const axial=!side && contact;
 const blade=at(...h,g('scale(1 '+(axial?.62:1)+')',rot(axial?(back?18:153):bladeAngle*(back?-1:1),sword)));
 const attack=arm(a,h,true,false,-1)+blade+hand(h);const guard=arm(b,sh,true,true,-1)+at(...sh,g('scale('+(side?.8:1)+' 1)',shield));rear=back?attack:guard;front=back?guard:attack;
 }else{const aim=atk?(side?-5:back?-72:65):22;const bh=side?(atk?[21,1]:[12,12]):(atk?[10,back?-3:8]:[11,14]);const d=atk?[3,14,-2,0][t]:0;const rad=aim*Math.PI/180,nock=[bh[0]-(7+d)*Math.cos(rad),bh[1]-(7+d)*Math.sin(rad)];const pull=atk&&t<2?nock:side?(atk?[4,2]:[1,12]):(atk?[-2,5]:[-5,14]);
 const bow=at(...bh,rot(aim,p('M-5 -22Q5 -12 1 0Q5 12 -5 22Q1 12 -1 1Q1 -12 -5 -22Z','#c69458',1.0)+l('M-5 -22L'+(-7-d)+' 0 -5 22','#e6d5a0',.9)));
 const hold=arm([shoulders[1],2],bh,false,false,-1)+bow+hand(bh);
 const draw=arm([shoulders[0],2],pull,false,true,1)+hand(pull);
 rear=back?hold:draw; front=back?draw:hold;
 if(atk&&t<2)front+=at(...nock,rot(aim,l('M-2 0L27 0','#e2c79b',1.2)+p('M28 0l-5 -2 1 4Z',light,.65)+p('M1 0l-5 -3 -1 2 3 1Z','#b4b998',.55)));}
 const carry=!ward?at(side?-9:back?-6:-12,10,rot(-42,quiver)):'';
 const collar=ward?'':at(2,0,p('M-9 -2Q-2 2 6 -3L9 0 3 5 -2 4 -7 8 -6 3Z','#445b51',.9)+l('M-6 3l5 -1 6 -3','#c5bc83',1.2)+mark(2,1,1.65,edge));
 const torso=(back?'':carry)+rear+core+collar+(back?carry:'')+front+head;
 if(layer==='legs')return legs;
 const drawLean=!ward&&atk?(side?[0,-5,3,1]:[0,-3,2,0])[t]:0;
 const lean=heavy?[-6,8,5][frame-12]*(back?-1:1):(hurt?-7:quiet?0:stride)*.8+drawLean;
 return (layer==='torso'?'':legs)+at(64+(hurt?-1:0),51+bob+(heavy?2:0),rot(lean,torso))}
async function bakeMotion(){
 // Keep the hunter's original frame numbers; append the sword and shield bank.
 const columns=12,layers=[];
 for(const ward of [false,true])for(let view=0;view<3;view++)for(let slot=0;slot<30;slot++){
   const index=(ward?90:0)+view*30+slot,body=slot>=24;
   layers.push({input:svg(figure(ward,view,body?[11,6,7,8,9,10][slot-24]:0,body?'torso':'legs',slot)),left:index%columns*128,top:Math.floor(index/columns)*128});
 }
 for(let view=0;view<3;view++)for(let i=0;i<3;i++){
   const index=180+view*3+i;
   layers.push({input:svg(figure(true,view,12+i,'torso')),left:index%columns*128,top:Math.floor(index/columns)*128});
 }
 await sharp({create:{width:columns*128,height:16*128,channels:4,background:'#00000000'}}).composite(layers).png({palette:true,colours:192}).toFile(path.join(dest,'hunter-motion.png'));
}
(async()=>{await bakeMotion();if(process.argv.includes('--hunter-only')||process.argv.includes('--motion-only'))return;const layers=[];for(let role=0;role<2;role++)for(let view=0;view<3;view++)for(let f=0;f<12;f++)layers.push({input:svg(figure(!role,view,f)),left:f*128,top:(role*3+view)*128});
 await sharp({create:{width:1536,height:768,channels:4,background:'#00000000'}}).composite(layers).png({palette:true,colours:192}).toFile(path.join(dest,'martial-heroes.png'));
 await require('./bake-job-portraits.cjs')(ward=>sharp(svg(figure(ward,0,11),384)).png().toBuffer());
})().catch(e=>{console.error(e);process.exitCode=1});
