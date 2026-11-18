import {describe,expect,it} from 'vitest';
import {ARM_LENGTH, bendArm, facingFromVector} from '../src/pose';

describe('directional poses', () => {
  it('keeps a stable side or vertical silhouette around their diagonal boundary', () => {
    expect(facingFromVector(1,-1.25,'right')).toBe('right');
    expect(facingFromVector(1,-1.25,'back')).toBe('back');
    expect(facingFromVector(-1,0,'right')).toBe('left');
    expect(facingFromVector(0,1,'back')).toBe('front');
    expect(facingFromVector(0,0,'left')).toBe('left');
  });

  it('places the cuff at the grip with the same sleeve lengths on either bend', () => {
    for(const side of [-1,1]) {
      const angles={shoulder:0,elbow:0};
      bendArm(9,8,side,angles);
      const a=angles.shoulder,b=a+angles.elbow;
      expect(-ARM_LENGTH*(Math.sin(a)+Math.sin(b))).toBeCloseTo(9);
      expect( ARM_LENGTH*(Math.cos(a)+Math.cos(b))).toBeCloseTo(8);
      bendArm(50,0,side,angles);
      expect(Number.isFinite(angles.elbow)).toBe(true);
      expect(2*ARM_LENGTH*Math.cos(angles.elbow/2)).toBeLessThan(2*ARM_LENGTH);
    }
  });
});
