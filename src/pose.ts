export type Facing = 'front' | 'back' | 'right' | 'left';

// Let diagonal movement retain its previous view near a sector boundary.
export function facingFromVector(x: number, y: number, previous: Facing): Facing {
  if (Math.abs(x) + Math.abs(y) < .001) return previous;
  const vertical = previous === 'front' || previous === 'back';
  if (Math.abs(y) > Math.abs(x) * (vertical ? 1.12 : 1.38)) return y < 0 ? 'back' : 'front';
  return x < 0 ? 'left' : 'right';
}

export const ARM_LENGTH = 7.9;

// Both sleeve pivots are painted down the Y axis. Solve a bent elbow without
// scaling either bone, including when a target lies outside the arm's reach.
export function bendArm(x: number, y: number, outward: number, result: {shoulder:number; elbow:number}) {
  const distance = Math.min(2*ARM_LENGTH-.01, Math.max(.01, Math.hypot(x,y)));
  const bend = Math.acos(distance/(2*ARM_LENGTH)) * outward;
  result.shoulder = Math.atan2(y,x) - Math.PI/2 + bend;
  result.elbow = -2*bend;
}
