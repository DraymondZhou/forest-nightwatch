// Original trunk and leaf plates, drawn at the same joint positions as the
// guardian's existing thorns, bells and growth-ring core.
const {p,lines,rotate,group}=require('./bake-mini-bosses.cjs');

function rootLeg(step,angle,worn){
  const bark=worn?'#7b6449':'#936b40';
  return rotate(angle,55,81,group('translate(0 '+step+')',
    p('M53 77Q48 82 47 92L45 100Q42 107 34 110Q40 112 47 107L43 116Q47 116 54 109L58 116 63 118Q62 112 59 107L65 110Q65 107 60 100L58 90 61 83Z',bark,1.9)+
    p('M52 83Q49 88 48 97L51 94 48 106 54 98 54 106 59 112 56 102 59 104 56 94 57 89Z','#c7985d')+
    lines('M50 89l-2 8m7-6-2 9m-7 6-5 4m13-7 3 7','#76563e',1)+
    p('M51 74Q48 75 45 80L41 92 48 89 51 85 55 90 61 97 60 85 57 78Z',worn?'#859371':'#9ea762',1.5)+
    lines('M48 85l5-6 3 5','#bdb883',.95)));
}
function limb(angle,clench,worn){
  return rotate(angle,34,57,
    p('M35 54Q29 54 25 61L20 71 16 79 20 80Q16 86 15 94Q14 103 18 108L23 110Q20 105 21 99L26 92 30 95 30 101Q36 96 34 89L31 86 34 75 40 64Z',worn?'#7e6549':'#ab7742',2)+
    p('M29 62Q24 66 22 75L25 73 20 82 25 80 22 87 29 82 29 76 35 67Z','#ce9b5b')+
    rotate(clench,24,86,
      p('M21 84Q16 88 15 94Q13 103 18 109L22 111Q19 103 22 98L26 92 31 93 31 99 34 95 33 88 29 85 26 87Z','#b98248',1.45)+
      lines('M18 95q-2 6 0 9m9-15 3 2','#edb169',1.05))+
    p('M34 54Q30 57 28 61L23 64 25 65 20 69 23 69 20 76 27 72 30 67 30 73 35 69 34 75 40 70 40 61Z',worn?'#838b62':'#9da361',1.4)+
    lines('M23 71l7-6m3-4 2-2m-5 18-4 4','#c2bd80',.95));
}
const reflected=shape=>group('translate(128 0) scale(-1 1)',shape);
function crown(worn){
  const color=worn?'#888d5c':'#a4aa67', light=worn?'#a8ab70':'#bbc185';
  const back=p('M20 56Q17 52 22 47Q21 43 28 41Q28 35 36 36Q40 30 46 33Q49 29 55 32Q58 37 55 40Q47 43 43 51L39 50 35 59 34 53 29 55 28 63 25 57 22 58Z',color,1.65);
  const lower=p('M39 53Q37 48 43 45Q48 39 54 43Q62 43 61 50L57 55 54 53 53 60 51 62 51 55 47 56 45 64 43 57 40 60Z',color,1.55)+
    lines('M41 50q3-3 6-3m4-2 4 1m-16-7 4-1',light,1);
  const main=p('M27 39Q25 35 29 31Q28 26 35 25Q39 19 44 22Q47 16 54 18Q56 13 63 15Q69 10 74 16Q82 13 85 19Q90 18 92 25Q98 23 101 28Q107 27 108 33Q115 37 109 42Q104 45 99 41L96 44 90 40Q84 44 80 39Q73 42 70 37L64 44 62 40Q56 46 52 41Q47 46 43 41Q37 44 35 40L31 42Z',color,2);
  const torn=p('M28 39Q25 35 29 31Q29 26 35 25Q38 20 44 22Q48 16 53 18Q56 13 62 16Q67 11 74 15L78 19 74 23 80 24 75 29 80 31 72 32 74 35 66 35 65 40 62 38Q57 44 52 40Q46 46 42 40Q37 44 35 39L31 41Z',color,2);
  const veins=lines('M34 34q1-4 5-5m7-4q1-3 5-3m7-2 4-1m-8 16q1-3 5-4m6-7q4-3 8-2',light,1.2)+
    lines('M42 37q1-3 5-5m8 5 3-2m5-9 3-2','#687548',1.25);
  const right=worn?p('M80 44 88 36 94 38 92 42 99 40 95 46 100 46 94 50 88 48 85 52Z','#828d60',1.35):reflected(back+lower);
  return back+lower+right+(worn?torn:main)+veins;
}
module.exports=function treeBody(v,worn){
  const {step,prep,release,recoil}=v;
  const legs=rootLeg(-step*1.7,step*8-prep*3,worn)+reflected(rootLeg(step*1.7,-step*8-prep*3,worn));
  const arms=limb(step*4+prep*21-release*14+recoil*7,prep*9-release*4,worn)+reflected(limb(-step*4+prep*21-release*14+recoil*7,prep*9-release*4,worn));
  const trunk=p('M36 58 47 46 51 45 48 35 51 28 54 36 57 40 59 30 60 24 64 31 63 41 67 43 71 34 78 29 75 39 80 38 76 48 86 45 91 53 86 64 78 71 75 80 70 88 65 86 61 98 57 86 53 90 50 82 44 79 42 69 36 69Z',worn?'#866746':'#aa7846',2)+
    p('M45 59 52 51 55 51 52 44 59 49 62 44 61 37 65 44 65 50 72 46 74 43 73 51 78 50 75 56 70 60 68 70 62 80 56 72 52 64Z','#d39a54')+
    p('M50 54Q54 53 60 60L61 64 57 65 52 61ZM67 62Q70 55 78 53L75 59 70 64Z','#293d35',1.1)+
    p('m53 56 4 2 2 3-4-2Zm17 4 3-3 3-1-2 3Z',worn?'#ffd18b':'#f6d88f')+
    p('m57 68 5 3 3-1 7-5-3 7-6 6-5-5Z','#4c4835')+
    lines('M49 68l3 5m2-3 2 7m11-19 1-5m5 16 5-6m-18 3 2 1 3-3m-8 14 3 5m8-13-2 6','#715139',1)+
    lines('M55 50l4 3m7-2 2-3m11 12 3-3m-30 18 3 3','#e3b77a',1);
  return legs+group('translate('+(-1.3*recoil)+' '+(step*.75+prep*2-release*2)+')',arms+trunk+rotate(-step*.65+prep*2-release,64,49,crown(worn)));
};
