import {describe, expect, it} from 'vitest';
import {Combat} from '../src/combat';

describe('combat feedback', () => {
  it('awards a cluster of seeds once and emits a single collection cue', () => {
    const sim = new Combat('hazel', 81);
    const {x,y} = sim.player;
    sim.drops.push(...[1,2,3].map(id => ({id, x, y, born: 0, value: 3, kind: 'xp' as const})));
    sim.step(1/60, {x:0,y:0});
    expect(sim.xp).toBe(9);
    expect(sim.effects.filter(e => e.kind === 'gather')).toHaveLength(1);
    sim.step(1/60, {x:0,y:0});
    expect(sim.xp).toBe(9);
    expect(sim.effects.some(e => e.kind === 'gather')).toBe(false);
  });

  it('retains the impact direction and the body on a lethal hit across a negative cell edge', () => {
    const sim = new Combat('ash', 12);
    sim.build = {};
    sim.player.x = -380; sim.player.y = -120;
    const e = sim.spawn('beetle', -119, -120)!;
    e.speed = 0;
    sim.shots.push({id: 410, x: -137, y: -120, vx: 60, vy: 0, life: 1, radius: 7,
      damage: 1000, weapon: 'comet', pierce: 2, hit: new Set()});
    sim.step(1/60, {x:0,y:0});
    expect(sim.effects.filter(e => e.kind === 'defeat')).toEqual([
      expect.objectContaining({enemyKind: 'beetle', tx: 0})
    ]);
    expect(sim.drops.find(d => d.kind === 'xp')?.born).toBe(sim.seconds);
    expect(sim.kills).toBe(1);
  });

  it('rejects distant enemies sharing wrapped grid coordinates', () => {
    const sim = new Combat('ash', 17);
    sim.build = {};
    const near = sim.spawn('beetle',400,600)!;
    const far = sim.spawn('beetle',400 + 32*120,600)!;
    near.speed = far.speed = 0;
    sim.shots.push({id: 420, x: 400, y: 600, vx: 0, vy: 0, life: 1, radius: 7,
      damage: 10, weapon: 'comet', pierce: 3, hit: new Set()});
    sim.step(1/60, {x:0,y:0});
    expect(near.hp).toBe(near.maxHp-10);
    expect(far.hp).toBe(far.maxHp);
  });
});
