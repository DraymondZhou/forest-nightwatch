import {Combat,RITUAL_TIME} from './combat';

export class BattleHud {
  private readonly ink=document.getElementById('wound')!;
  private readonly dash=document.querySelector<HTMLButtonElement>('#dash')!;
  private readonly task=document.getElementById('objective')!;
  private readonly cooldown=document.getElementById('dash-time')!;
  private readonly reduced=matchMedia('(prefers-reduced-motion: reduce)');
  private readonly splash=this.ink.querySelector('svg')!;
  private pulse?:Animation;
  private quiet?:boolean;

  private prepare(quiet:boolean){
    this.pulse?.cancel();
    const peak=quiet?.42:.88;
    this.pulse=this.ink.animate([{opacity:peak,offset:0},{opacity:peak*.75,offset:.18},{opacity:0}],
      {duration:this.reduced.matches?260:460,easing:'ease-out'});
    this.pulse.cancel();
    this.quiet=quiet;this.ink.classList.toggle('quiet',quiet);
  }

  reset(low:boolean){this.prepare(low||this.reduced.matches);}

  wound(dx:number,dy:number,low:boolean){
    const quiet=low||this.reduced.matches;
    if(!this.pulse||quiet!==this.quiet)this.prepare(quiet);
    if(!quiet){
      const dist=Math.hypot(dx,dy);
      this.splash.style.left=(dist?50+48*dx/dist:50)+'%';
      this.splash.style.top=(dist?50+48*dy/dist:85)+'%';
      this.splash.style.transform='translate(-84%,-50%) rotate('+Math.atan2(dy,dx)+'rad)';
    }
    this.pulse!.currentTime=0;this.pulse!.play();
  }

  update(s:Combat){
    const ready=s.dashCooldown<=0;
    this.dash.setAttribute('aria-disabled',String(!ready));
    this.cooldown.textContent=ready?'就绪':s.dashCooldown.toFixed(1)+'s';
    this.dash.style.setProperty('--charge',(360*(1-s.dashCooldown/4.2)).toFixed(0)+'deg');
    const shrine=s.shrine;
    if(shrine){
      const x=shrine.x-s.player.x,y=shrine.y-s.player.y,distance=Math.hypot(x,y);
      const arrow=['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8];
      this.task.textContent=distance<=52
        ? '正在点灯　'+Math.min(100,Math.floor(100*shrine.charge/RITUAL_TIME))+'%'
        : arrow+' 林灯　'+Math.round(distance/10)+' 步　·　'+Math.ceil(shrine.expires-s.seconds)+'s';
    }else if(s.flameTime>0)this.task.textContent='借火　'+Math.ceil(s.flameTime)+'s';
    else if(s.seconds<6)this.task.textContent='拾取金色种荚升级　·　六分钟迎战古树';
    else this.task.textContent='';
  }
}
