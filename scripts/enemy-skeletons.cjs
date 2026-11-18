// Bind-pose coordinates are percentages of an original woodcut tile.
// A joint rotates around its start and inherits its parent's transform.
// Angles below are degrees for gait, anticipation, attack and hit respectively.
const bone=(name,parent,x,y,tipX,tipY,radius,gait,prepare,strike,hurt,phase=0)=>
  ({name,parent,x,y,tipX,tipY,radius,gait,prepare,strike,hurt,phase});
const trunk=(x,y,tipX,tipY,radius,gait,prepare,strike,hurt)=>
  bone('trunk',null,x,y,tipX,tipY,radius,gait,prepare,strike,hurt);
function pair(name,parent,x,y,tipX,tipY,radius,gait,prepare,strike,hurt,alternate=false){
  return [bone(name+'L',parent,x,y,tipX,tipY,radius,gait,prepare,strike,hurt),
    bone(name+'R',parent,100-x,y,100-tipX,tipY,radius,-gait,-prepare,-strike,-hurt,alternate?Math.PI:0)];
}
const golemLegs=()=>pair('foot','trunk',39,70,32,88,9,13,5,-9,-8,true);
const wings=(crystal)=>[
  ...pair('wing','trunk',43,52,crystal?14:15,crystal?30:39,14,crystal?10:17,15,-21,22),
  ...pair('tail','trunk',43,59,27,crystal?75:66,9,-9,10,-14,12)
];
module.exports=[
  [trunk(50,81,50,54,25,2,-4,8,-10),
   ...pair('rim','trunk',40,60,18,72,13,8,10,-16,13),
   bone('stem','trunk',52,42,54,30,8,-7,13,-17,17),
   ...pair('leaf','stem',54,31,34,15,11,11,10,-22,17)],
  [trunk(50,63,50,45,9,2,-7,8,-10),...wings(false),
   ...pair('antenna','trunk',47,46,36,22,5,5,8,-13,10)],
  [trunk(50,67,50,43,13,4,-11,15,-13),
   ...pair('arm','trunk',40,48,24,65,8,20,20,-27,22,true),
   ...pair('foot','trunk',44,66,39,83,7,-20,11,-21,-17,true),
   bone('sprout','trunk',52,39,59,13,12,-9,12,-20,18)],
  [trunk(50,75,50,52,15,2,-8,12,-12),
   bone('cap','trunk',50,48,50,21,24,-4,-10,17,-14),
   ...pair('capEdge','cap',42,36,16,45,12,4,-11,16,10),
   ...pair('arm','trunk',37,59,24,76,7,8,15,-27,17,true),
   ...golemLegs()],
  [trunk(50,72,50,34,18,2,-5,8,-9),
   ...pair('foreleg','trunk',29,53,10,66,6,16,16,-26,18,true),
   ...pair('midleg','trunk',30,63,16,82,6,-16,11,-21,14,true),
   ...pair('hindleg','trunk',37,72,35,89,5,15,9,-14,12,true),
   bone('head','trunk',50,63,50,76,9,3,7,-15,13)],
  [trunk(51,73,50,39,16,4,-10,16,-12),
   ...pair('shoulder','trunk',37,48,23,60,10,10,21,-25,16,true),
   bone('fistL','shoulderL',24,60,18,75,9,9,15,-24,13),
   bone('fistR','shoulderR',76,60,82,75,9,9,-15,24,-13),
   ...golemLegs()],
  [trunk(50,63,50,44,9,3,-8,12,-12),...wings(true),
   bone('crest','trunk',51,49,52,29,6,4,10,-14,10)],
  [trunk(50,76,50,43,16,3,-10,16,-12),
   bone('crown','trunk',50,45,49,23,22,-4,-8,12,13),
   ...pair('bough','trunk',36,50,20,65,9,8,23,-31,18,true),
   bone('clawL','boughL',20,65,16,82,8,8,12,-22,17),
   bone('clawR','boughR',80,65,84,82,8,8,-12,22,-17),
   ...golemLegs()]
];
