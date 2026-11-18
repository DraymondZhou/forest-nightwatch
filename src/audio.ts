export class AudioDirector {
  private ctx?:AudioContext; private master?:GainNode;private timer?:ReturnType<typeof setInterval>;private step=0;private lastHit=0;
  music=.3;sound=.5;paused=true;combat=false;
  async start(){
    this.ctx??=new AudioContext();await this.ctx.resume();
    if(!this.master){this.master=this.ctx.createGain();this.master.gain.value=.5;this.master.connect(this.ctx.destination);}
    this.paused=false;
    if(!this.timer)this.timer=setInterval(()=>this.tick(),360);
  }
  private tone(freq:number,duration:number,volume:number,type:OscillatorType='sine',slide?:number){
    if(!this.ctx||!this.master||this.ctx.state!=='running'||this.paused)return;
    const now=this.ctx.currentTime,osc=this.ctx.createOscillator(),gain=this.ctx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,now);if(slide)osc.frequency.exponentialRampToValueAtTime(slide,now+duration);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain);gain.connect(this.master);osc.start(now);osc.stop(now+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect()};
  }
  private tick(){if(this.paused||this.music<=0)return;const melody=this.combat?[0,7,12,10,7,3,5,7,0,7,15,12,10,7,5,3]:[0,7,12,7,3,10,15,10,5,12,17,12,3,10,7,3];const note=melody[this.step%melody.length];this.tone(174.61*2**(note/12),.85,this.music*.09,'sine');if(this.step%4===0)this.tone(87.3,.95,this.music*.08,'triangle');this.step++;}
  play(kind:'hit'|'hurt'|'level'|'click'|'win'|'lose'|'heal'){
    if(kind==='hit'){if(performance.now()-this.lastHit<110)return;this.lastHit=performance.now();this.tone(340,.075,this.sound*.06,'triangle',140);}
    else if(kind==='hurt')this.tone(140,.18,this.sound*.17,'triangle',65);
    else if(kind==='level'||kind==='win'){[0,4,7,12].forEach((n,i)=>setTimeout(()=>this.tone(392*2**(n/12),.38,this.sound*.11),i*75));}
    else if(kind==='lose')this.tone(180,.7,this.sound*.13,'triangle',70);
    else if(kind==='heal')this.tone(600,.16,this.sound*.07,'sine',900);
    else this.tone(480,.06,this.sound*.08,'sine');
  }
}
