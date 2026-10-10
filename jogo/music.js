/* Original procedural demo tune: no recording, samples or third-party melody. */
(() => {
  let context,master,analyser,timer,frame,next=0,step=0,enabled=false,requestVersion=0,turboMode=false;
  const tempo=108;
  const voices=new Set(),effects=new Set(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const tune=[72,76,79,76,74,77,81,79,76,79,84,83,81,77,74,71,72,79,76,74,77,81,79,77,76,72,74,79,77,74,71,72];
  const roots=[48,53,57,55],freq=n=>440*2**((n-69)/12);
  function note(n,time,duration,volume,type='sine'){
    const osc=context.createOscillator(),gain=context.createGain();osc.type=type;osc.frequency.value=freq(n);
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.012);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(gain);gain.connect(master);voices.add(osc);osc.onended=()=>{voices.delete(osc);osc.disconnect();gain.disconnect();};osc.start(time);osc.stop(time+duration+.03);
  }
  function schedule(){
    while(next<context.currentTime+.16){
      const root=roots[Math.floor(step/8)%4];
      const beat=60/tempo/2;
      note(tune[step%32],next,turboMode?.23:.42,turboMode?.085:.1,'triangle');
      if(turboMode){
        // Driving bass and offbeat upper arpeggio retain the confectionery melody.
        note(root+(step%4===2?7:0),next,.17,.105,'triangle');
        note(root+[12,16,19,24][step%4],next+beat*.5,.11,.035,'triangle');
        if(step%2===0){note(36,next,.09,.14);note(root+19,next,.1,.025);}
        if(step%4===1){note(root+16,next,.16,.03);note(root+19,next,.17,.025);}
      }else{
        if(step%2===0)note(root+(step%4===2?7:0),next,.45,.13);
        if(step%4===1){note(root+16,next,.3,.04);note(root+19,next,.35,.035);}
        if(step%8===6)note(tune[step%32]+12,next,.22,.035);
      }
      // Keep the same tempo in both modes.
      next+=60/tempo/2;step++;
    }
  }
  const levels=[.28,.28,.28,.28];
  let lastMeter=0;
  function meter(){
    if(!document.querySelector('#sound .sound-bars'))return;
    if(!enabled)return;
    const now=performance.now(),dt=Math.min(100,now-lastMeter||16);lastMeter=now;
    const data=new Uint8Array(analyser.frequencyBinCount);analyser.getByteFrequencyData(data);
    const ranges=[[90,290],[290,600],[600,1000],[1000,2500]];
    document.querySelectorAll('#sound .sound-bars i').forEach((bar,i)=>{
      const [lo,hi]=ranges[i];let peak=0;
      for(let n=Math.floor(lo/context.sampleRate*analyser.fftSize);n<=Math.ceil(hi/context.sampleRate*analyser.fftSize);n++)peak=Math.max(peak,data[n]||0);
      const target=Math.max(.22,peak/255);
      levels[i]+=(target-levels[i])*(1-Math.exp(-dt/(target>levels[i]?170:380)));
      bar.style.transform=`scaleY(${reduced.matches?.6:levels[i]})`;
    });frame=requestAnimationFrame(meter);
  }
  function ensureContext(){
    if(!context){context=new (window.AudioContext||window.webkitAudioContext)();master=context.createGain();master.gain.value=.32;analyser=context.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=.8;master.connect(analyser);analyser.connect(context.destination);}
  }
  async function unlockEffects(){
    try{ensureContext();await context.resume();}catch(_){}
  }
  async function setEnabled(value){
    if(value&&enabled&&context?.state==='running'&&timer)return;
    const request=++requestVersion;
    enabled=value;
    if(!value){clearInterval(timer);cancelAnimationFrame(frame);for(const osc of voices){try{osc.stop();}catch(_){}}document.querySelectorAll('#sound .sound-bars i').forEach(bar=>bar.style.removeProperty('transform'));return;}
    try{
      ensureContext();
      await context.resume();if(!enabled||request!==requestVersion)return;
      clearInterval(timer);cancelAnimationFrame(frame);next=context.currentTime+.04;step=0;schedule();timer=setInterval(schedule,60);meter();
    }catch(_){if(request===requestVersion)enabled=false;}
  }
  let lastCoinSound=-1,impactNoise;
  function impactPartial(frequency,time,decay,amplitude){
    const source=context.createOscillator(),envelope=context.createGain();
    source.type='sine';source.frequency.setValueAtTime(frequency,time);
    source.frequency.exponentialRampToValueAtTime(frequency*.986,time+.035);
    envelope.gain.setValueAtTime(0,time);
    envelope.gain.linearRampToValueAtTime(amplitude,time+.001);
    envelope.gain.exponentialRampToValueAtTime(.00001,time+decay);
    source.connect(envelope);envelope.connect(context.destination);effects.add(source);
    source.onended=()=>{effects.delete(source);source.disconnect();envelope.disconnect();};
    source.start(time);source.stop(time+decay+.015);
  }
  function contactTick(time,amplitude){
    if(!impactNoise){
      impactNoise=context.createBuffer(1,Math.ceil(context.sampleRate*.024),context.sampleRate);
      const samples=impactNoise.getChannelData(0);
      for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*Math.exp(-i/(context.sampleRate*.003));
    }
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
    source.buffer=impactNoise;filter.type='highpass';filter.frequency.value=1700;gain.gain.value=amplitude;
    source.connect(filter);filter.connect(gain);gain.connect(context.destination);effects.add(source);
    source.onended=()=>{effects.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start(time);
  }
  async function coinDrop(){
    if(!context)return;
    if(context.state!=='running'){try{await context.resume();}catch(_){return;}}
    if(context.state!=='running')return;
    const time=context.currentTime;
    if(time-lastCoinSound<.075)return;
    lastCoinSound=time;
    // Briefly make room in the music for the glass impact.
    master.gain.cancelScheduledValues(time);
    master.gain.setValueAtTime(master.gain.value,time);
    master.gain.linearRampToValueAtTime(.11,time+.025);
    master.gain.setValueAtTime(.11,time+.22);
    master.gain.linearRampToValueAtTime(.32,time+.5);
    const pitch=.96+Math.random()*.08;
    // Non-harmonic metal modes plus the lower, hollow glass body.
    const impacts=[[0,1],[.047+Math.random()*.018,.43],[.125+Math.random()*.03,.22],[.235+Math.random()*.035,.1]];
    for(const [offset,strength] of impacts){
      const at=time+offset;
      contactTick(at,.16*strength);
      for(const [hz,decay,level] of [[2860,.11,.035],[4730,.075,.019],[6910,.045,.008]])
        impactPartial(hz*pitch,at,decay,level*strength*1.8);
      for(const [hz,decay,level] of [[1180,.3,.024],[2095,.21,.015],[3520,.15,.009]])
        impactPartial(hz*(.995+Math.random()*.01),at+.003,decay,level*strength*1.8);
    }
  }
  function candyBurst(count=1){
    if(!context||context.state!=='running')return;
    const now=context.currentTime,volume=.07+Math.min(count,8)*.006;
    const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*.22),context.sampleRate);
    const samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*Math.exp(-i/(context.sampleRate*.045));
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
    source.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(4200,now);filter.frequency.exponentialRampToValueAtTime(650,now+.18);gain.gain.value=volume;
    source.connect(filter);filter.connect(gain);gain.connect(context.destination);effects.add(source);
    source.onended=()=>{effects.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start(now);
    impactPartial(240,now,.12,.07);contactTick(now+.025,.035);contactTick(now+.07,.018);
  }
  window.CandyMusic={setEnabled,setTurbo(value){turboMode=Boolean(value);},coinDrop,unlockEffects,candyBurst};
  window.addEventListener('pagehide',()=>{setEnabled(false);for(const source of effects){try{source.stop();}catch(_){}}});
})();
