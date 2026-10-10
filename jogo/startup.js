/* Carregamento real de imagens, seguido da montagem visual da tela. */
(() => {
  'use strict';
  const game=document.getElementById('game'),overlay=document.getElementById('startup');
  const message=document.getElementById('startup-message'),progress=document.getElementById('startup-progress');
  const percent=document.getElementById('startup-percent'),retry=document.getElementById('startup-retry');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const groups=['.brand','.chef','.reward-jar','.worktop','.board','.hud','.round-tools','.game>.controls','.spin','footer'];
  let running=false,animations=[];
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  // Several slow air currents produce continuous, non-repeating drift.
  const floating=[...overlay.querySelectorAll('.intro-sweet,.intro-spark')];
  let atmosphereFrame;
  function atmosphere(now){
    if(overlay.hidden||reduced.matches)return;
    const t=now/1000;
    floating.forEach((element,i)=>{
      const phase=i*2.399,rate=.64+i*.047;
      const x=Math.sin(t*rate+phase)*2.1+Math.sin(t*.31+phase)*.8;
      const y=Math.cos(t*(rate*.73)+phase)*1.65+Math.sin(t*.43+phase)*.7;
      const turn=Math.sin(t*.53+phase)*8+Math.cos(t*.29+phase)*3;
      const depth=1+Math.sin(t*.37+phase)*.045;
      element.style.transform=`translate(${x}cqw,${y}cqw) rotate(${turn}deg) scale(${depth})`;
    });
    atmosphereFrame=requestAnimationFrame(atmosphere);
  }

  function loadImage(url){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      const timer=setTimeout(()=>{img.onload=img.onerror=null;reject(new Error('Tempo de carregamento excedido'));},30000);
      img.onload=async()=>{try{if(img.decode)await img.decode();clearTimeout(timer);resolve();}catch(error){clearTimeout(timer);reject(error);}};
      img.onerror=()=>{clearTimeout(timer);reject(new Error('Imagem indisponível'));};
      img.src=url;
    });
  }
  async function preload(){
    const assets=new Set([...document.querySelectorAll('img')].map(img=>img.getAttribute('src')).filter(Boolean));
    for(const name of ['fundo_confeitaria_sem_cupcakes','fundo_sem_luminarias','mesa_confeitaria','bandeja_grade_fina','etiqueta_base'])assets.add(`../assets/web/painted-environment/${name}.webp`);
    for(const name of ['botao_girar_base','icone_base','chef_comemorando','chef_entusiasmado','chef_triste','chef_torcendo','chef_turbo_assustado'])assets.add(`../assets/web/painterly-final/${name}.webp`);
    assets.add('../assets/web/rewards/borboleta.webp');
    assets.add('../assets/web/rewards/etiqueta-turbo-vermelha.webp');
    let completed=0;
    const results=await Promise.allSettled([...assets].map(async (url,index)=>{
      await loadImage(url);completed++;
      const value=Math.round(completed/assets.size*100);
      progress.style.setProperty('--loaded',value+'%');progress.setAttribute('aria-valuenow',String(value));percent.textContent=value+'%';
    }));
    if(results.some(result=>result.status==='rejected'))throw new Error('Não foi possível carregar todas as artes.');
    if(document.fonts)await Promise.race([document.fonts.ready,delay(1200)]);
  }
  function animate(element,keyframes,duration,offset=0){
    const animation=element.animate(keyframes,{duration:duration*.45,delay:offset*.45,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
    animations.push(animation);return animation.finished.catch(()=>{});
  }
  async function assemble(){
    game.dataset.boot='assembling';message.textContent='A confeitaria está pronta!';
    if(reduced.matches){overlay.hidden=true;return;}
    const done=[];
    done.push(animate(overlay,[{opacity:1},{opacity:0}],450));
    done.push(animate(game.querySelector('.brand'),[{opacity:0,transform:'translateY(-12px) scale(.92)'},{opacity:1,transform:'none'}],700,160));
    done.push(animate(game.querySelector('.worktop'),[{opacity:0,transform:'translateY(60px)'},{opacity:1,transform:'none'}],850,280));
    done.push(animate(game.querySelector('.chef'),[{opacity:0,transform:'translateY(32px)'},{opacity:1,transform:'none'}],750,560));
    done.push(animate(game.querySelector('.board'),[{opacity:0,transform:'translateY(30px) scale(.94)'},{opacity:1,transform:'none'}],750,780));
    for(const [index,img] of [...document.querySelectorAll('.cell img')].entries()){
      const row=Math.floor(index/6),col=index%6;
      const gridCells=document.querySelectorAll('.cell');
      const step=gridCells[6].offsetTop-gridCells[0].offsetTop;
      done.push(animate(img,[{opacity:0,transform:`translateY(${-step*(row+1.2)}px)`},{opacity:1,transform:`translateY(${-step*(row+1)}px)`,offset:.04},{opacity:1,transform:'none'}],430,1740+col*70+(4-row)*460));
    }
    for(const [selector,offset] of [['.reward-jar',1000],['.hud',660],['.round-tools',800],['.game>.controls',960],['.spin',1120],['footer',1180]]){
      done.push(animate(game.querySelector(selector),[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],520,offset));
    }
    await Promise.all(done);overlay.hidden=true;
  }
  async function start({reload=false}={}){
    if(running||window.CandySlot?.state.phase==='spinning')return false;
    running=true;game.dataset.boot='loading';game.setAttribute('aria-busy','true');overlay.hidden=false;
    cancelAnimationFrame(atmosphereFrame);if(!reduced.matches)atmosphereFrame=requestAnimationFrame(atmosphere);
    groups.forEach(selector=>game.querySelector(selector).inert=true);
    retry.hidden=true;message.textContent='Preparando a confeitaria…';
    try{
      progress.style.setProperty('--loaded','0%');percent.textContent='0%';progress.setAttribute('aria-valuenow','0');
      await preload();
      await assemble();game.dataset.boot='ready';game.setAttribute('aria-busy','false');
      animations.forEach(animation=>animation.cancel());animations=[];
      groups.forEach(selector=>game.querySelector(selector).inert=false);
      window.dispatchEvent(new CustomEvent('candy:ready'));
      return true;
    }catch(error){
      message.textContent='Algumas artes não carregaram. Tente novamente.';retry.hidden=false;retry.focus();
      return false;
    }finally{running=false;}
  }
  retry.addEventListener('click',()=>start({reload:true}));
  start({reload:true});
})();
