// Use the same recent frame intervals for both rates. Pause/menu time is excluded.
export class FrameStats {
  private readonly intervals=new Float64Array(240);
  private readonly sorted=new Float64Array(this.intervals.length);
  private next=0;
  private count=0;
  private last:number|undefined;
  private nextReading=0;
  private shortTime=0;
  private shortFrames=0;
  current=0;
  average=0;
  low=0;

  reset(){
    this.next=0;this.count=0;this.last=undefined;this.nextReading=0;
    this.shortTime=0;this.shortFrames=0;this.current=0;this.average=0;this.low=0;
  }
  record(now:number){
    const previous=this.last;
    this.last=now;
    if(previous===undefined || now<=previous)return;
    const interval=now-previous;
    this.shortTime+=interval;this.shortFrames++;
    if(this.shortTime>=500){
      this.current=1000*this.shortFrames/this.shortTime;
      this.shortTime=0;this.shortFrames=0;
    }
    this.intervals[this.next]=interval;
    this.next=(this.next+1)%this.intervals.length;
    this.count=Math.min(this.count+1,this.intervals.length);
    if(now<this.nextReading)return;
    this.nextReading=now+500;
    let sum=0;
    for(let i=0;i<this.count;i++)sum+=this.intervals[i];
    this.average=1000*this.count/sum;
    if(this.count<100)return;
    const samples=this.sorted.subarray(0,this.count);
    samples.set(this.intervals.subarray(0,this.count));samples.sort();
    const tailCount=Math.ceil(this.count*.01);
    let tail=0;
    for(let i=this.count-tailCount;i<this.count;i++)tail+=samples[i];
    this.low=1000*tailCount/tail;
  }
}
