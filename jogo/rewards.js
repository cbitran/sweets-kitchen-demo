/* Animação demonstrativa: quantidade visual não equivale a prêmio financeiro. */
(() => {
  const game=document.getElementById('game'),jar=document.getElementById('reward-jar');
  const pile=document.getElementById('jar-coins'),flights=document.getElementById('coin-flights');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const coinSource='../assets/rewards/moeda-chef.png';
  let lastPhase='',count=0,generation=0,jarRock;
  const trailStops=new Set();
  function speedTrail(coin,animation,token){
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
    svg.setAttribute('class','coin-speed-trail');svg.setAttribute('aria-hidden','true');
    const paths=Array.from({length:3},()=>{const path=document.createElementNS(ns,'path');svg.append(path);return path;});
    flights.prepend(svg);
    let request,stopped=false;const points=[];
    function stop(){if(stopped)return;stopped=true;cancelAnimationFrame(request);svg.remove();trailStops.delete(stop);}
    trailStops.add(stop);
    function draw(now){
      if(stopped||token!==generation||!coin.isConnected){stop();return;}
      const progress=animation.effect.getComputedTiming().progress;
      if(progress!=null&&progress>=.58&&progress<.94){
        const style=getComputedStyle(coin),x=parseFloat(style.left),y=parseFloat(style.top);
        points.push({x,y,time:now});while(points.length&&now-points[0].time>125)points.shift();
        const first=points[0],distance=Math.hypot(x-first.x,y-first.y);
        svg.style.opacity=String(Math.min(.8,distance/38)*Math.min(1,(.94-progress)/.045));
        paths.forEach((path,i)=>{
          const tail=points.slice(Math.floor(points.length*i*.19));
          path.setAttribute('d',tail.map((point,j)=>(j?'L':'M')+point.x.toFixed(1)+' '+point.y.toFixed(1)).join(' '));
        });
      }else{svg.style.opacity='0';points.length=0;}
      request=requestAnimationFrame(draw);
    }
    request=requestAnimationFrame(draw);
    animation.finished.catch(()=>{}).finally(stop);
  }
  function arrival(speed=1){
    if(reduced.matches||jarRock?.playState==='running')return;
    jarRock=jar.animate([
      {transform:'rotate(0)'},{transform:'rotate(-3deg)',offset:.2},
      {transform:'rotate(2.2deg)',offset:.45},{transform:'rotate(-1deg)',offset:.7},
      {transform:'rotate(0)'}
    ],{duration:650*speed,easing:'ease-in-out'});
    const flight={round:state.round};
    window.dispatchEvent(new CustomEvent('candy:coin-flight-start',{detail:flight}));
    const base=game.getBoundingClientRect(),target=jar.getBoundingClientRect();
    for(let i=0;i<5;i++){
      const star=document.createElement('i');star.className='win-star jar-arrival-star';
      star.style.left=`${target.left-base.left+target.width*.5}px`;
      star.style.top=`${target.top-base.top+target.height*.15}px`;
      flights.append(star);
      const dx=(i-2)*target.width*.24,dy=-target.height*(.25+(2-Math.abs(i-2))*.12);
      const animation=star.animate([
        {transform:'translate(-50%,-50%) scale(0)',opacity:0},
        {offset:.3,transform:`translate(calc(-50% + ${dx*.6}px),calc(-50% + ${dy*.6}px)) scale(1) rotate(20deg)`,opacity:1},
        {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.15) rotate(95deg)`,opacity:0}
      ],{duration:720*speed,easing:'ease-out',fill:'both'});
      animation.finished.catch(()=>{}).finally(()=>star.remove());
    }
  }
  function deposit(speed=1){
    window.CandyMusic?.coinDrop();
    arrival(speed);
    if(count>=28)return;
    const coin=new Image();coin.src=coinSource;coin.alt='';
    // Irregular overlapping heap: broad base, narrower crown, varied perspective.
    const level=Math.floor(count/7),spread=70-level*9;
    const x=50+(Math.random()-.5)*spread;
    coin.style.width=`${22+Math.random()*9}%`;
    coin.style.left=`${Math.max(2,Math.min(72,x-13))}%`;
    coin.style.bottom=`${level*13+Math.random()*9}%`;
    coin.style.transform=`rotate(${Math.random()*150-75}deg) scaleY(${.45+Math.random()*.5})`;
    coin.style.zIndex=String(count+1);
    pile.append(coin);count++;
  }
  function clearFlights(){
    generation++;
    for(const stop of [...trailStops])stop();
    jarRock?.cancel();
    flights.getAnimations({subtree:true}).forEach(a=>a.cancel());
    flights.replaceChildren();
  }
  window.addEventListener('candy:reset',()=>{clearFlights();pile.replaceChildren();count=0;});
  window.addEventListener('candy:state',event=>{
    const state=event.detail;
    if(state.phase===lastPhase)return;
    lastPhase=state.phase;
    if(state.phase==='idle'){clearFlights();return;}
    if(state.phase==='spinning')clearFlights();
    if(state.phase!=='highlight'||!state.highlighted.length)return;
    const indices=state.highlighted.slice(0,8),token=generation;
    const reportArrival=()=>window.dispatchEvent(new CustomEvent('candy:coins-arrived',{detail:{round:state.round}}));
    let remaining=indices.length;
    if(reduced.matches){indices.forEach(()=>deposit());reportArrival();return;}
    const flight={round:state.round};
    window.dispatchEvent(new CustomEvent('candy:coin-flight-start',{detail:flight}));
    const base=game.getBoundingClientRect(),target=jar.getBoundingClientRect();
    const endX=target.left-base.left+target.width*.5,endY=target.top-base.top+target.height*.18;
    indices.forEach((index,order)=>{
      const source=document.getElementById('grid').children[index].getBoundingClientRect();
      const x=source.left-base.left+source.width/2,y=source.top-base.top+source.height/2;
      const coin=new Image();coin.src=coinSource;coin.alt='';coin.className='flying-coin';flights.append(coin);
      // Celebration has its own readable pace, including in Turbo.
      const speed=1,hero=order===0;
      coin.style.zIndex=hero?'2':'1';
      const stageX=base.width*.5,stageY=base.height*.44;
      const groupX=stageX+(order-3)*base.width*.028;
      const frame=(offset,px,py,scale,turn,opacity=1)=>({offset,left:`${px}px`,top:`${py}px`,transform:`translate(-50%,-50%) scale(${scale}) rotateY(${turn}deg)`,opacity});
      const animation=coin.animate([
        frame(0,x,y,.3,0,0),
        frame(.18,hero?stageX:groupX,stageY+(hero?0:base.width*.08),hero?2.8:.85,0),
        frame(.32,hero?stageX:groupX,stageY,hero?2.8:.85,180),
        frame(.46,hero?stageX:groupX,stageY,hero?2.8:.85,360),
        frame(.58,groupX,stageY-base.width*.025,.85,360),
        frame(.77,groupX+(endX-groupX)*.65,endY-base.width*.09,.58,540),
        frame(.91,endX,endY,.35,720),
        frame(1,endX,endY+target.height*.52,.24,720,0)
      ],{duration:3400,delay:200+order*75,easing:'ease-in-out',fill:'both'});
      speedTrail(coin,animation,token);
      if(order===0){
        // Follow the actual flight clock; release the pose just before the jar.
        const approach=()=>{
          if(token!==generation||animation.playState==='idle')return;
          if((animation.currentTime||0)>=200+3400*.82){
            window.dispatchEvent(new CustomEvent('candy:coin-flight-approach',{detail:flight}));
          }else requestAnimationFrame(approach);
        };
        requestAnimationFrame(approach);
      }
      animation.finished.then(()=>{if(token===generation){deposit(speed);if(--remaining===0)reportArrival();}}).catch(()=>{}).finally(()=>coin.remove());
    });
  });
})();
