import type {WeaponId} from './content';

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
    if(!this.ctx||!this.master||this.ctx.state!=='running'||this.paused||volume<=0)return;
    const now=this.ctx.currentTime,osc=this.ctx.createOscillator(),gain=this.ctx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,now);if(slide)osc.frequency.exponentialRampToValueAtTime(slide,now+duration);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain);gain.connect(this.master);osc.start(now);osc.stop(now+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect()};
  }
  private tick(){if(this.paused||this.music<=0)return;const melody=this.combat?[0,7,12,10,7,3,5,7,0,7,15,12,10,7,5,3]:[0,7,12,7,3,10,15,10,5,12,17,12,3,10,7,3];const note=melody[this.step%melody.length];this.tone(174.61*2**(note/12),.85,this.music*.09,'sine');if(this.step%4===0)this.tone(87.3,.95,this.music*.08,'triangle');this.step++;}
  gather(){
    if(this.sound>0)this.tone(810,.075,this.sound*.06,'sine',1190);
  }
  impact(heavy:boolean,weapon?:WeaponId){
    const now=performance.now();
    if(now-this.lastHit<(heavy?70:110))return;
    this.lastHit=now;
    this.tone(heavy?180:390,heavy?.105:.048,this.sound*(heavy?.16:.09),'triangle',heavy?58:130);
    if(weapon==='spark')this.tone(940,.035,this.sound*.048,'square',310);
    else if(weapon==='frost'||weapon==='comet')this.tone(1220,.105,this.sound*.085,'sine',780);
    else if(weapon==='ember')this.tone(104,.13,this.sound*.15,'triangle',46);
    else if(heavy)this.tone(800,.032,this.sound*.045,'square',240);
  }
  hurt(){
    const ctx=this.ctx;
    if(!ctx||!this.master||ctx.state!=='running'||this.paused||this.sound<=0)return;
    // A breathy voiced onset through two vocal resonances, layered over the impact.
    const now=ctx.currentTime, voice=ctx.createOscillator(), envelope=ctx.createGain();
    voice.type='sawtooth';voice.frequency.setValueAtTime(265,now);
    voice.frequency.exponentialRampToValueAtTime(153,now+.14);
    envelope.gain.setValueAtTime(.0001,now);envelope.gain.exponentialRampToValueAtTime(this.sound*.115,now+.016);
    envelope.gain.exponentialRampToValueAtTime(.0001,now+.16);
    const filters=[720,1540].map(freq=>{
      const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=2.5;
      voice.connect(f);f.connect(envelope);return f;
    });
    envelope.connect(this.master);voice.start(now);voice.stop(now+.17);
    voice.onended=()=>{voice.disconnect();envelope.disconnect();filters.forEach(f=>f.disconnect());};
    this.tone(116,.12,this.sound*.22,'triangle',48);
  }
  play(kind:'hit'|'level'|'click'|'win'|'lose'|'heal'|'dash'|'evade'){
    if(kind==='hit'){if(performance.now()-this.lastHit<110)return;this.lastHit=performance.now();this.tone(340,.075,this.sound*.06,'triangle',140);}
    else if(kind==='dash')this.tone(420,.09,this.sound*.08,'triangle',195);
    else if(kind==='evade')this.tone(590,.16,this.sound*.12,'sine',1100);
    else if(kind==='level'||kind==='win'){[0,4,7,12].forEach((n,i)=>setTimeout(()=>this.tone(392*2**(n/12),.38,this.sound*.11),i*75));}
    else if(kind==='lose')this.tone(180,.7,this.sound*.13,'triangle',70);
    else if(kind==='heal')this.tone(600,.16,this.sound*.07,'sine',900);
    else this.tone(480,.06,this.sound*.08,'sine');
  }
}
