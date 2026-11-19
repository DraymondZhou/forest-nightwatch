import { describe,it,expect } from 'vitest';
import { Combat, type EnemyKind } from '../src/combat';
import { ATTACK_POSE_TIME,enemyPoseFrame,enemyRestFrame } from '../src/enemyPose';

describe('enemy animation and combat timing',()=>{
  it('keeps every species in its own atlas range and prioritizes a hit',()=>{
    const game=new Combat('hazel',17);
    const kinds:EnemyKind[]=['slime','moth','twig','spitter','beetle','brute','crystal'];
    kinds.forEach((kind,index)=>{
      const e=game.spawn(kind,0,0)!;
      e.gait=.5;
      expect(enemyPoseFrame(e,400)).toBeGreaterThanOrEqual(index*24);
      expect(enemyPoseFrame(e,400)).toBeLessThan(index*24+12);
      e.attackPose=ATTACK_POSE_TIME;
      expect(enemyPoseFrame(e,400)).toBe(index*24+16);
      e.flash=.08;
      expect(enemyPoseFrame(e,400)).toBe(index*24+20);
      expect(enemyRestFrame(kind)).toBe(index*24+23);
    });
  });
  it('switches the chief to its wounded artwork without restarting its attack',()=>{
    const game=new Combat('hazel',17);
    (['boar','mothQueen','boss'] as const).forEach((kind,index)=>{
      const e=game.spawn(kind,0,0)!;e.attackPose=ATTACK_POSE_TIME;
      expect(enemyPoseFrame(e,400)).toBe(index*24+16);
      e.hp=e.maxHp/2;
      expect(enemyPoseFrame(e,400)).toBe(index*24+16+72);
    });
  });
  it('holds a stationary spitter, winds up, and releases on the projectile tick',()=>{
    const game=new Combat('hazel',17),p=game.player;
    game.build={};
    const e=game.spawn('spitter',p.x+195,p.y)!;
    e.clock=1;expect(enemyPoseFrame(e,195)).toBe(enemyRestFrame('spitter'));
    e.clock=.01;expect(enemyPoseFrame(e,195)).toBe(3*24+15);
    game.step(1/60,{x:0,y:0,dash:false});
    expect(game.shots.some(s=>s.weapon==='enemy')).toBe(true);
    expect(enemyPoseFrame(e,195)).toBe(3*24+16);
    e.frozen=1;
    const before=[e.attackPose,e.gait,e.clock];
    game.step(1/60,{x:0,y:0,dash:false});
    expect([e.attackPose,e.gait,e.clock]).toEqual(before);
  });
});
