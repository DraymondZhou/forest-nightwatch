import {describe,it,expect} from 'vitest';
import {FrameStats} from '../src/frameStats';

describe('recent gameplay frame rates',()=>{
  it('uses the slowest one percent of the same rolling window',()=>{
    const stats=new FrameStats();let now=0;stats.record(now);
    for(let i=0;i<237;i++)stats.record(now+=16);
    stats.record(now+=40);stats.record(now+=80);stats.record(now+=600);
    expect(stats.average).toBeCloseTo(240000/(237*16+40+80+600));
    expect(stats.low).toBeCloseTo(3000/(40+80+600));
    for(let i=0;i<300;i++)stats.record(now+=16);
    expect(stats.low).toBeCloseTo(62.5);
    expect(stats.average).toBeCloseTo(62.5);
  });
  it('drops the pause interval and waits for enough samples to publish a low',()=>{
    const stats=new FrameStats();stats.record(10);stats.record(30);
    expect(stats.low).toBe(0);expect(stats.average).toBe(50);
    stats.reset();stats.record(90000);expect(stats.average).toBe(0);
    stats.record(90020);expect(stats.average).toBe(50);expect(stats.low).toBe(0);
  });
});
