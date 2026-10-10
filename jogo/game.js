(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const symbols = ['cereja','pirulito','donut','macaron','cupcake','bolo','forno'];
  const names = {cereja:'Cereja',pirulito:'Pirulito',donut:'Donut',macaron:'Macaron',cupcake:'Cupcake',bolo:'Bolo',forno:'Forno especial'};
  const art = name => `../assets/web/painterly-final/${name}.webp`;
  const grid = $('grid');
  let motionSpeed = 1;
  let speechTimer, speechExit;
  function hideSpeech(){
    clearTimeout(speechTimer);speechExit?.cancel();
    const bubble=$('chef-speech');bubble.hidden=true;bubble.replaceChildren();
  }
  function showSpeech(message,autoHide=true){
    hideSpeech();
    const bubble=$('chef-speech'),text=document.createElement('span');
    text.textContent=message;bubble.append(text);bubble.hidden=false;
    if(!autoHide)return;
    speechTimer=setTimeout(()=>{
      const finish=()=>{
        hideSpeech();
      };
      if(reducedMotion.matches){finish();return;}
      const fade=bubble.animate([{opacity:1},{opacity:0}],{duration:300,fill:'forwards'});
      speechExit=fade;
      fade.finished.then(()=>{if(speechExit===fade)finish();}).catch(()=>{});
    },5000);
  }
  let turboFlipping = false;
  let turbo = false, sound = true, bet = 1, audio, engine;
  let turboReactionUntil=0, turboReactionTimer;
  let winningFlight=null;
  const activeTones=new Set();
  let accumulatedCents=0;
  let winningsGeneration=0, pendingWinnings=null;
  function clearWinningsMotion(){
    winningsGeneration++;pendingWinnings=null;
    const output=$('winnings-total');output.getAnimations({subtree:true}).forEach(a=>a.cancel());
    output.parentElement.querySelectorAll('.gain-star').forEach(star=>{star.getAnimations().forEach(a=>a.cancel());star.remove();});
  }
  function rollWinnings(total,round,waitForCoins){
    clearWinningsMotion();const token=winningsGeneration,output=$('winnings-total'),formatted=coinAmount(total);
    if(reducedMotion.matches){output.textContent=formatted;return;}
    output.replaceChildren();const animations=[];
    for(const [index,char] of [...formatted].entries()){
      if(!/\d/.test(char)){output.append(document.createTextNode(char));continue;}
      const slot=document.createElement('span'),strip=document.createElement('span');slot.className='gain-digit';strip.className='gain-strip';slot.setAttribute('aria-hidden','true');
      for(let n=0;n<=10;n++){const digit=document.createElement('span');digit.textContent=String((n+index*3)%10);strip.append(digit);}
      slot.append(strip);output.append(slot);
      animations.push(strip.animate([{transform:'translateY(0)'},{transform:'translateY(-10em)'}],{duration:330+index*17,easing:'linear',iterations:Infinity}));
    }
    pendingWinnings={round,finish(){
    if(token!==winningsGeneration)return;
    animations.forEach(animation=>animation.cancel());
    output.textContent=formatted;
    output.animate([{transform:'scale(1)'},{transform:'scale(1.19)',offset:.4},{transform:'scale(1)'}],{duration:550,easing:'ease-out'});
    for(let i=0;i<7;i++){
      const star=document.createElement('i');star.className='gain-star';output.parentElement.append(star);
      const angle=(i/7)*Math.PI*2,dx=Math.cos(angle)*45,dy=Math.sin(angle)*27;
      const animation=star.animate([{transform:'translate(-50%,-50%) scale(0)',opacity:0},{offset:.25,opacity:1,transform:`translate(calc(-50% + ${dx*.6}px),calc(-50% + ${dy*.6}px)) scale(1)`},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.15) rotate(70deg)`,opacity:0}],{duration:800,delay:i*30,fill:'both',easing:'ease-out'});
      animation.finished.catch(()=>{}).finally(()=>star.remove());
    }
    }};
    if(!waitForCoins){const pending=pendingWinnings;pendingWinnings=null;pending.finish();}
  }
  window.addEventListener('candy:coins-arrived',event=>{
    if(pendingWinnings?.round!==event.detail.round)return;
    const pending=pendingWinnings;pendingWinnings=null;pending.finish();
  });
  const creditedRounds=new Set();
  const coinAmount=cents=>(cents/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  let previousGrid = [], externalBalance = '00', pendingRemoved = [], lastPhase = '';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const winEffects = document.createElement('div');
  winEffects.className = 'win-effects';
  winEffects.setAttribute('aria-hidden','true');
  grid.parentElement.append(winEffects);
  function clearWinEffects(){
    winEffects.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
    winEffects.replaceChildren();
  }
  function burstCandy(img){
    if(reducedMotion.matches)return;
    const bounds=winEffects.getBoundingClientRect(),rect=img.getBoundingClientRect();
    // Irregular wedges retain the actual icing, pastry and painted highlights.
    const edges=[[0,0],[47,0],[100,0],[100,48],[100,100],[54,100],[0,100],[0,42]];
    for(let n=0;n<8;n++){
      const shard=new Image();shard.src=img.src;shard.alt='';shard.className='candy-shard';
      const next=edges[(n+1)%8],edge=edges[n];
      Object.assign(shard.style,{left:`${rect.left-bounds.left}px`,top:`${rect.top-bounds.top}px`,width:`${rect.width}px`,height:`${rect.height}px`,clipPath:`polygon(48% 46%,${edge[0]}% ${edge[1]}%,${next[0]}% ${next[1]}%)`});
      winEffects.append(shard);
      const angle=(-145+n*45)*Math.PI/180,reach=rect.width*(.4+Math.random()*.3);
      const vx=Math.cos(angle)*reach,vy=Math.sin(angle)*reach-rect.height*.4,turn=(n%2?1:-1)*(35+Math.random()*60);
      const frames=[{offset:0,transform:'translate(0,0) rotate(0) scale(1)',opacity:0},{offset:.14,transform:'translate(0,0) rotate(0) scale(1.1)',opacity:1}];
      for(let step=1;step<=8;step++){
        const t=step/8;
        frames.push({offset:.14+.86*t,transform:`translate(${vx*t}px,${vy*t+rect.height*1.05*t*t}px) rotate(${turn*t}deg) scale(${1.1-.5*t})`,opacity:t<.6?1:Math.max(0,(1-t)/.4)});
      }
      const animation=shard.animate(frames,{duration:820,easing:'linear',fill:'both'});
      animation.finished.catch(()=>{}).finally(()=>shard.remove());
    }
    img.animate([{transform:'scale(1.04)',opacity:1},{offset:.12,transform:'scale(.94,1.06)',opacity:1},{offset:.18,transform:'scale(1.12)',opacity:0},{transform:'scale(1.12)',opacity:0}],{duration:820,fill:'both',easing:'linear'});
  }
  function sparkleMatches(indices){
    if(reducedMotion.matches)return;
    const bounds=winEffects.getBoundingClientRect();
    const starsPerCell=Math.min(5,Math.max(1,Math.floor(48/indices.size)));
    let sequence=0;
    for(const index of indices){
      const rect=cells[index].cell.getBoundingClientRect();
      for(let starIndex=0;starIndex<starsPerCell;starIndex++){
        const star=document.createElement('i');
        star.className='win-star';
        star.style.left=`${rect.left-bounds.left+rect.width/2}px`;
        star.style.top=`${rect.top-bounds.top+rect.height/2}px`;
        const angle=(-150+starIndex*72+index*17)*Math.PI/180;
        const radius=rect.width*(.48+(starIndex%2)*.2);
        const dx=Math.cos(angle)*radius,dy=Math.sin(angle)*radius;
        winEffects.append(star);
        const animation=star.animate([
          {transform:'translate(-50%,-50%) scale(0)',opacity:0},
          {offset:.22,transform:`translate(calc(-50% + ${dx*.65}px),calc(-50% + ${dy*.65}px)) scale(1.15) rotate(30deg)`,opacity:1},
          {offset:.55,transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.9) rotate(75deg)`,opacity:1},
          {transform:`translate(calc(-50% + ${dx*1.2}px),calc(-50% + ${dy-rect.height*.35}px)) scale(.1) rotate(140deg)`,opacity:0}
        ],{duration:920*(motionSpeed),delay:(sequence++%5)*45*(motionSpeed),easing:'ease-out',fill:'both'});
        animation.finished.catch(()=>{}).finally(()=>star.remove());
      }
    }
  }
  function move(image,keyframes,duration,delay=0,easing='cubic-bezier(.2,.75,.25,1)'){
    if(reducedMotion.matches)return;
    const speed=motionSpeed;
    image.animate(keyframes,{duration:duration*speed,delay:delay*speed,easing,fill:'both'});
  }
  const cells = Array.from({length:30}, (_,index) => {
    const cell = document.createElement('div');
    cell.className = 'cell'; cell.setAttribute('role','gridcell');
    cell.style.setProperty('--column',index % 6);
    const img = document.createElement('img'); img.alt = ''; img.draggable = false;
    cell.append(img); grid.append(cell); return {cell,img};
  });
  for (const symbol of symbols) { const image = new Image(); image.src = art(`peca_${symbol}_normal`); }
  for (const symbol of symbols.slice(0,6)) {
    const row=document.createElement('tr'),head=document.createElement('th'),image=new Image(),label=document.createElement('span');
    head.scope='row';image.src=art(`peca_${symbol}_normal`);image.alt='';label.textContent=names[symbol];head.append(image,label);row.append(head);
    for(let i=0;i<6;i++){const value=document.createElement('td');value.textContent='—';value.setAttribute('aria-label','Prêmio ainda não definido');row.append(value);}
    $('payout-rows').append(row);
  }
  function controls() {
    $('game').classList.toggle('turbo-active',turbo);
    window.CandyMusic.setTurbo(turbo);
    const basePose=$('game').dataset.chefBasePose||'principal';
    const pose=winningFlight&&engine.busy?'comemorando':turbo&&performance.now()<turboReactionUntil&&!engine.busy?'turbo_assustado':basePose==='esperando'?'principal':basePose;
    $('game').dataset.chefPose=pose;
    const source=art(`chef_${['principal','turbo_assustado'].includes(pose)?'entusiasmado':pose}`);
    if($('chef').getAttribute('src')!==source)$('chef').src=source;
    $('game').style.setProperty('--motion-speed',String(engine.busy?motionSpeed:(turbo?.35:1)));
    for(const id of ['turbo'])$(id).disabled=engine.busy||turboFlipping;
    const betAmount=bet*5;
    $('bet').textContent=betAmount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    $('current-bet').textContent=`Aposta de ${betAmount} reais fictícios, multiplicador ${bet}`;
    $('minus').disabled = engine.busy || bet<=1;
    $('plus').disabled = engine.busy || bet>=4;
    $('spin').disabled = engine.busy || turboFlipping || $('game').dataset.boot!=='ready';
    $('spin').querySelector('strong').textContent = engine.busy ? 'Girando' : 'Girar';
    for (const id of ['turbo']) $(id).setAttribute('aria-pressed',String(turbo));
    $('turbo').setAttribute('aria-label',`Turbo ${turbo?'ligado':'desligado'}`);
    $('turbo-status').textContent = turbo?'Ligado':'Desligado';
    for (const id of ['sound']) $(id).setAttribute('aria-pressed',String(sound));
    $('sound').setAttribute('aria-label',`Música ${sound?'ligada':'desligada'}`);
  }
  function render(state) {
    motionSpeed=state.motionSpeed||1;
    const highlighted = new Set(state.highlighted), removed = new Set(state.removed);
    const newPhase=state.phase!==lastPhase;
    if(newPhase){
      clearWinEffects();
      if(state.phase==='highlight'&&highlighted.size){sparkleMatches(highlighted);window.CandyMusic.candyBurst(highlighted.size);}
    }
    grid.classList.toggle('has-match',state.phase==='highlight' && highlighted.size>0);
    $('match-announcement').textContent=state.phase==='highlight' && highlighted.size ? `Combinação: ${highlighted.size} doces destacados.` : '';
    if(state.phase==='disappear')pendingRemoved=[...removed];
    const fallSources=new Map();
    if(state.phase==='cascade'){
      for(let col=0;col<6;col++){
        const surviving=[];
        for(let row=0;row<5;row++)if(!pendingRemoved.includes(row*6+col))surviving.push(row);
        const incoming=5-surviving.length;
        for(let row=0;row<5;row++)fallSources.set(row*6+col,row<incoming?row-incoming:surviving[row-incoming]);
      }
    }
    grid.classList.toggle('spinning',state.phase==='spinning');
    grid.classList.toggle('cascade',state.phase==='cascade');
    for (let i=0;i<30;i++) {
      const {cell,img} = cells[i], symbol = state.grid[i];
      if(newPhase)img.getAnimations().forEach(animation=>animation.cancel());
      if (img.dataset.symbol!==symbol) { img.src=art(`peca_${symbol}_normal`); img.dataset.symbol=symbol; }
      cell.setAttribute('aria-label',`${names[symbol]}, linha ${Math.floor(i/6)+1}, coluna ${i%6+1}`);
      cell.classList.toggle('highlight',highlighted.has(i));
      cell.setAttribute('aria-selected',String(highlighted.has(i)));
      cell.classList.toggle('disappear',state.phase==='disappear' && removed.has(i));
      cell.classList.toggle('falling',state.phase==='cascade' && fallSources.get(i)!==Math.floor(i/6));
      if(newPhase){
        const row=Math.floor(i/6),col=i%6,step=grid.clientHeight/5;
        if(state.phase==='spinning')move(img,[{transform:'translateY(0)',opacity:1},{transform:`translateY(${grid.clientHeight}px)`,opacity:0}],240,col*14);
        if(state.phase==='reveal')move(img,[{transform:`translateY(${-step*(row+1.2)}px)`,opacity:0},{offset:.04,transform:`translateY(${-step*(row+1)}px)`,opacity:1},{transform:'translateY(0)',opacity:1}],430,180+col*70+(4-row)*460);
        if(state.phase==='highlight'&&highlighted.has(i))burstCandy(img);
        if(state.phase==='disappear'&&removed.has(i))img.style.opacity='0';
        else img.style.opacity='';
        if(state.phase==='cascade'){
          const source=fallSources.get(i),distance=(source-row)*step;
          const refillCount=pendingRemoved.filter(index=>index%6===col).length;
          const timing=window.CandyRoundEngine.cascadeTiming(row,col,refillCount,symbol);
          if(source<0){
            move(img,[{transform:`translateY(${-step*(row+1.2)}px)`,opacity:0},{offset:.04,transform:`translateY(${-step*(row+1)}px)`,opacity:1},{transform:'translateY(0)',opacity:1}],timing.duration,timing.delay,timing.easing);
          }else if(distance!==0)move(img,[{transform:`translateY(${distance}px)`,opacity:1},{transform:'translateY(0)',opacity:1}],timing.duration,timing.delay,timing.easing);
        }
      }
    }
    previousGrid = [...state.grid];
    lastPhase=state.phase;
    if(state.phase==='settled'||state.phase==='idle')pendingRemoved=[];
    const happy = (state.phase==='highlight' && highlighted.size>0) || (state.phase==='disappear' && removed.size>0);
    $('game').classList.toggle('celebrating',happy);
    let chefPose='principal';
    if(state.phase==='spinning'||state.phase==='reveal')chefPose='torcendo';
    if(state.phase==='cascade')chefPose='esperando';
    if(happy)chefPose='comemorando';
    if(state.phase==='result'){
      if(state.outcome==='win'||(state.mode==='demo'&&state.hasMatches))chefPose='comemorando';
      else if(state.outcome==='loss'||(state.mode==='demo'&&!state.hasMatches))chefPose='triste';
    }
    const won=state.hasMatches||state.totalWin>0||state.outcome==='win';
    if(state.phase==='highlight'&&newPhase&&highlighted.size){
      const phrases=['Essa ficou no ponto!','Uma fornada de sorrisos!','Que doce surpresa!'];
      showSpeech(phrases[(Math.max(1,state.round)-1)%phrases.length]);
    }else if(state.phase==='result'&&newPhase){
      showSpeech(won?'Vamos para mais uma fornada?':'Poxa, não foi dessa vez.');
    }else if(state.phase==='settled'&&newPhase&&!won){
      showSpeech('Vamos para mais uma fornada?');
    }else if(state.phase==='spinning'&&newPhase){
      showSpeech('Estou torcendo por você!');
    }else if(state.phase==='idle'&&newPhase){hideSpeech();}
    if(newPhase&&!creditedRounds.has(state.round)&&((state.phase==='highlight'&&highlighted.size>0&&state.totalWin>0)||state.phase==='result')){
      creditedRounds.add(state.round);
      const cents=Math.round((state.totalWin||0)*100);
      accumulatedCents+=cents;
      if(cents>0)rollWinnings(accumulatedCents,state.round,state.phase==='highlight');
      else $('winnings-total').textContent=coinAmount(accumulatedCents);
      $('winnings-last').textContent=cents>0?`+${coinAmount(cents)} nesta rodada`:'Sem ganho nesta rodada';
      $('winnings-total').setAttribute('aria-label',`${coinAmount(accumulatedCents)} moedas fictícias acumuladas`);

    }
    $('game').dataset.chefBasePose=!engine.busy?'esperando':chefPose;
    if(state.fornadaProgress!==undefined){
      $('fornada-progress').setAttribute('aria-valuenow',String(state.fornadaProgress));
      $('fornada-progress').querySelector('i').style.width=state.fornadaProgress+'%';
      $('fornada-progress').title=`Fornada: ${state.fornadaProgress}%`;
    }
    if($('multiplier').textContent!==`×${state.multiplier}`&&!reducedMotion.matches){
      $('multiplier').getAnimations().forEach(a=>a.cancel());
      $('multiplier').animate([{transform:'scale(1)'},{transform:'scale(1.12)',offset:.4},{transform:'scale(1)'}],{duration:420});
    }
    $('multiplier').textContent = `×${state.multiplier}`;
    $('multiplier').setAttribute('aria-label',`Multiplicador ${state.multiplier}`);
    $('round-label').textContent = '';
    $('game').dataset.phase=state.phase;
    $('game').querySelector('footer').textContent = state.mode==='demo' ? 'Modo demonstração · fichas sem valor real' : 'Jogo de entretenimento · fichas sem valor real';
    controls();
    window.dispatchEvent(new CustomEvent('candy:state',{detail:state}));
  }
  function attach(provider) {
    creditedRounds.clear();
    if (engine) engine.dispose();
    engine = new window.CandyRoundEngine({provider});
    engine.addEventListener('state',event=>render(event.detail));
    render(engine.state);
  }
  function chime() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      audio ||= new Audio(); audio.resume().catch(()=>{});
      const oscillator=audio.createOscillator(), gain=audio.createGain();
      oscillator.type='sine'; oscillator.frequency.setValueAtTime(523,audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(784,audio.currentTime+.12);
      gain.gain.setValueAtTime(.035,audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.2);
      oscillator.connect(gain);gain.connect(audio.destination);
      activeTones.add(oscillator);
      oscillator.onended=()=>{activeTones.delete(oscillator);oscillator.disconnect();gain.disconnect();};
      oscillator.start();oscillator.stop(audio.currentTime+.21);

    } catch (_) { /* Som opcional; a rodada continua sem áudio. */ }
  }
  function failure(error) {
    $('round-label').textContent='Não foi possível carregar a rodada. Tente novamente.';
    controls();window.dispatchEvent(new CustomEvent('candy:error',{detail:{message:error.message}}));
  }
  $('spin').addEventListener('click',async()=>{if(engine.busy || $('game').dataset.boot!=='ready')return;window.CandyMusic.unlockEffects();chime();try{await engine.spin({turbo});}catch(error){failure(error);}finally{controls();}});
  for (const [id,delta] of [['minus',-1],['plus',1]]) $(id).addEventListener('click',()=>{if(engine.busy)return;bet=Math.max(1,Math.min(4,bet+delta));controls();window.dispatchEvent(new CustomEvent('candy:bet',{detail:{bet:bet*5,multiplier:bet,baseBet:5}} ));});
  function toggleTurbo(){
    if(engine.busy)return;
    turbo=!turbo;clearTimeout(turboReactionTimer);
    turboReactionUntil=turbo?performance.now()+1800:0;
    $('game').dataset.chefBasePose='principal';controls();
    if(turbo)turboReactionTimer=setTimeout(()=>{turboReactionUntil=0;controls();},1800);
    if(turbo){
      showSpeech('Você é audacioso, hein? Gostei. Boa sorte.');
    }else hideSpeech();
  }
  for (const id of ['turbo']) $(id).addEventListener('click',toggleTurbo);
  for (const id of ['sound']) $(id).addEventListener('click',()=>{
    sound=!sound;
    window.CandyMusic.setEnabled(sound);
    controls();
  });
  $('invite-channel').addEventListener('change',()=>{
    const email=$('invite-channel').value==='email',input=$('invite-contact');
    input.value='';input.setCustomValidity('');input.type=email?'email':'tel';
    input.placeholder=email?'nome@exemplo.com':'+55 11 99999-9999';
    $('invite-contact-label').textContent=email?'E-mail do amigo':'Telefone do amigo';$('invite-status').textContent='';
  });
  $('invite-contact').addEventListener('input',()=>$('invite-contact').setCustomValidity(''));
  $('invite-form').addEventListener('submit',event=>{
    event.preventDefault();const input=$('invite-contact'),email=$('invite-channel').value==='email';
    const raw=input.value.trim(),phone=raw.replace(/[\s().-]/g,'');
    if(!email&&!/^\+?[0-9]{8,15}$/.test(phone)){input.setCustomValidity('Informe um telefone com DDD, incluindo o país se necessário.');input.reportValidity();return;}
    if(!$('invite-form').reportValidity())return;
    const message='Vamos conhecer o Sweets Kitchen? Uma confeitaria cheia de doces e surpresas!';
    const draft=email?`mailto:${encodeURIComponent(raw)}?subject=${encodeURIComponent('Um convite para o Sweets Kitchen')}&body=${encodeURIComponent(message)}`:`sms:${phone}?body=${encodeURIComponent(message)}`;
    window.location.href=draft;
    $('invite-status').textContent='Convite preparado. Conclua o envio no aplicativo que abrir.';
  });
  $('prizes-open').addEventListener('click',()=>$('prizes').showModal());
  $('menu').addEventListener('click',()=>$('settings').showModal());
  $('help-open').addEventListener('click',()=>{$('settings').close();$('help').showModal();});
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}}));
  window.addEventListener('candy:coin-flight-start',event=>{
    winningFlight=event.detail;controls();
  });
  window.addEventListener('candy:coin-flight-approach',event=>{
    if(winningFlight!==event.detail)return;
    winningFlight=null;$('game').dataset.chefBasePose='esperando';controls();
  });
  window.addEventListener('candy:state',event=>{
    if(['idle','spinning','result'].includes(event.detail.phase)){winningFlight=null;controls();}
  });
  window.addEventListener('candy:ready',controls);
  attach(window.CandyRoundProvider);
  // Start during loading; a gesture resumes audio if browser autoplay is blocked.
  window.CandyMusic.setEnabled(sound);
  const resumeOpeningMusic=event=>{
    if(sound&&!event.target.closest?.('#sound'))window.CandyMusic.setEnabled(true);
  };
  document.addEventListener('pointerdown',resumeOpeningMusic,{capture:true});
  document.addEventListener('keydown',resumeOpeningMusic,{capture:true});
  // Muting stays authoritative: gestures never change the sound preference.

  window.CandySlot = Object.freeze({
    get state(){return engine.state;},
    get bet(){return bet*5;},
    get betMultiplier(){return bet;},
    setProvider(provider){if(typeof provider!=='function')throw new TypeError('Provider deve ser uma função.');if(engine.busy)throw new Error('Aguarde a rodada terminar.');attach(provider);},
    async playResult(result,options={}){if($('game').dataset.boot!=='ready')throw new Error('Aguarde a abertura terminar.');try{return await engine.playResult(result,{turbo,...options});}catch(error){failure(error);throw error;}finally{controls();}},
    setHUD({balance,mixerLevel}={}){
      if(balance!==undefined){if(!Number.isFinite(balance)||balance<0)throw new TypeError('Saldo inválido.');externalBalance=balance;$('balance').textContent=balance.toLocaleString('pt-BR');}
      if(mixerLevel!==undefined){if(![0,25,50,75,100].includes(mixerLevel))throw new TypeError('Nível de batedeira inválido.');$('mixer').src=art(`batedeira_${mixerLevel}`);$('mixer').alt=`Batedeira ${mixerLevel}%`;$('fornada-progress').setAttribute('aria-valuenow',String(mixerLevel));$('fornada-progress').querySelector('i').style.width=mixerLevel+'%';}
    },
    reset(){clearWinningsMotion();accumulatedCents=0;creditedRounds.clear();$('winnings-total').textContent='0,00';$('winnings-last').textContent='Acumulado';engine.reset();window.dispatchEvent(new CustomEvent('candy:reset'));$('balance').textContent=externalBalance;},
    cancel(){engine.cancel();controls();}
  });
})();
