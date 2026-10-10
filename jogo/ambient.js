/* Small ambient accents, independent of round outcomes. */
(() => {
  const game=document.getElementById('game'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const layer=document.createElement('div');layer.className='ambient-stars';layer.setAttribute('aria-hidden','true');game.append(layer);
  const stars=[],butterflies=new Set();let timer,started=false,stopped=false,nextSide=Math.random()>.5;
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  function drift(item){
    if(reduced.matches||stopped)return;
    const x=clamp(item.x+(Math.random()-.5)*25,3,97),y=clamp(item.y+(Math.random()-.5)*12,3,32);
    const a=item.el.animate([{left:item.x+'%',top:item.y+'%',opacity:.25,transform:'scale(.65) rotate(0deg)'},{offset:.5,left:(item.x+x)/2+'%',top:((item.y+y)/2-2)+'%',opacity:.8,transform:'scale(1) rotate(35deg)'},{left:x+'%',top:y+'%',opacity:.25,transform:'scale(.65) rotate(70deg)'}],{duration:8000+Math.random()*9000,fill:'forwards',easing:'ease-in-out'});
    item.animation=a;
    a.finished.then(()=>{item.x=x;item.y=y;item.el.style.left=x+'%';item.el.style.top=y+'%';a.cancel();drift(item);}).catch(()=>{});
    if(document.hidden)a.pause();
  }
  function butterfly(){
    if(stopped)return;
    clearTimeout(timer);timer=setTimeout(butterfly,3500+Math.random()*3000);
    if(reduced.matches||document.hidden||butterflies.size>=3)return;
    const el=document.createElement('span');el.className='ambient-butterfly';el.setAttribute('aria-hidden','true');
    el.innerHTML='<span class="butterfly-body"><img class="butterfly-wing wing-left" src="../assets/rewards/borboleta.png" alt=""><img class="butterfly-wing wing-right" src="../assets/rewards/borboleta.png" alt=""><img class="butterfly-core" src="../assets/rewards/borboleta.png" alt=""></span>';
    game.append(el);
    const fromLeft=nextSide;nextSide=!nextSide;
    const direction=fromLeft?1:-1,y=9+Math.random()*17;
    const phase=Math.random()*Math.PI*2,sweep=2+Math.random()*3,ripple=.5+Math.random(),pace=.3+Math.random()*.5;
    const duration=11500+Math.random()*2500,depth=.7+Math.random()*.35;
    el.style.width=`${4.3+Math.random()*1.1}cqw`;
    el.style.setProperty('--wing-period',`${160+Math.random()*65}ms`);
    const frames=[];
    // Curve, banking, and changing distance follow the same continuous flight.
    for(let i=0;i<=40;i++){
      const t=i/40,travel=t+Math.sin(t*2*Math.PI)*.035*pace;
      const x=fromLeft?-7+114*travel:107-114*travel;
      const height=y+Math.sin(t*Math.PI*2+phase)*sweep+Math.sin(t*Math.PI*5+phase)*ripple;
      const bank=Math.cos(t*Math.PI*2+phase)*18;
      frames.push({offset:t,left:x+'%',top:height+'%',opacity:Math.min(1,t*10,(1-t)*10)*.95,
        transform:`perspective(180px) rotateZ(${direction*65+bank}deg) rotateX(${28+Math.sin(t*5)*14}deg) rotateY(${Math.sin(t*7)*20}deg) scale(${depth+Math.sin(t*Math.PI)*.18})`});
    }
    const flight=el.animate(frames,{duration,easing:'linear',fill:'both'});
    const item={el,flight};butterflies.add(item);
    flight.finished.catch(()=>{}).finally(()=>{el.remove();butterflies.delete(item);});
  }
  function start(){
    if(started)return;started=true;
    for(let i=0;i<12;i++){const el=document.createElement('i');el.className='ambient-star';el.style.width=el.style.height=(.75+Math.random()*1.2)+'cqw';layer.append(el);const item={el,x:4+Math.random()*92,y:3+Math.random()*28};stars.push(item);drift(item);}
    timer=setTimeout(butterfly,1200);
  }
  window.addEventListener('candy:ready',start);
  document.addEventListener('visibilitychange',()=>{for(const item of stars)if(item.animation)(document.hidden?item.animation.pause():item.animation.play());for(const item of butterflies){for(const a of item.el.getAnimations({subtree:true}))(document.hidden?a.pause():a.play());}});
  reduced.addEventListener('change',()=>{for(const item of stars){item.animation?.cancel();if(!reduced.matches)drift(item);}if(reduced.matches)for(const item of butterflies)item.flight.cancel();});
  window.addEventListener('pageshow',()=>{
    if(!started||!stopped)return;stopped=false;
    for(const item of stars)drift(item);
    clearTimeout(timer);timer=setTimeout(butterfly,1000);
  });
  window.addEventListener('pagehide',()=>{stopped=true;clearTimeout(timer);for(const item of stars)item.animation?.cancel();for(const item of butterflies)item.flight.cancel();});
})();
