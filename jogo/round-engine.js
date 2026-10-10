/**
 * CandyRoundEngine — presentation controller, not a game rules engine.
 * Classic browser script; public API: window.CandyRoundEngine.
 *
 * new CandyRoundEngine({ provider })
 * provider: async ({ round, signal }) => result
 * result JSON contract:
 * {
 *   grid: [30 symbol strings, row-major, 6 columns x 5 rows],
 *   steps: [{ matched: [unique indices 0..29], grid: [30 symbols after cascade] }],
 *   multiplier?: integer 1..5,
 *   remainingSpins?: nonnegative integer,
 *   totalWin?: nonnegative finite number
 * }
 * Symbols: cereja, pirulito, donut, macaron, cupcake, bolo, forno.
 * Every step.grid is authoritative, supplied by the rules provider. This script
 * neither detects combinations nor computes payouts, charges, bonus triggers,
 * refill rules, or progression. Optional totals are relayed unchanged.
 *
 * Without a provider, a deterministic VISUAL DEMO cycles through four-piece,
 * no-highlight, three-piece/two-cascade and six-piece/three-cascade scenes. Its column collapse only
 * illustrates movement. Demo meter and multiplier follow scripted values; they have no financial effect.
 * Inject the future rules tool through provider, or feed its result with
 * await engine.playResult(result, { turbo: false }). External data uses mode
 * "external"; fallback data uses mode "demo". No imports or dependencies.
 *
 * Events: "state" (CustomEvent.detail = a defensive state snapshot).
 * Phases: idle, spinning, reveal, highlight, disappear, cascade, result, settled.
 * spin/playResult resolve true on completion, false if busy/cancelled/disposed;
 * invalid results/provider failures reject after restoring an idle display.
 */
(function (global) {
  'use strict';

  const SYMBOLS = Object.freeze([
    'cereja', 'pirulito', 'donut', 'macaron', 'cupcake', 'bolo', 'forno'
  ]);
  const SYMBOL_SET = new Set(SYMBOLS);
  const INITIAL_GRID = Array.from({ length: 30 }, (_, i) => SYMBOLS[(i * 3 + Math.floor(i / 6)) % 7]);

  function abortError() {
    return new DOMException('Round cancelled', 'AbortError');
  }

  function delay(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) { reject(abortError()); return; }
      const onAbort = () => { clearTimeout(timer); reject(abortError()); };
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  function checkGrid(grid, label) {
    if (!Array.isArray(grid) || grid.length !== 30 ||
        Array.from(grid).some(symbol => !SYMBOL_SET.has(symbol))) {
      throw new TypeError(label + ' must contain exactly 30 supported symbol strings');
    }
    return grid.slice();
  }

  function abortableResult(getResult, context) {
    const { signal } = context;
    return new Promise((resolve, reject) => {
      if (signal.aborted) { reject(abortError()); return; }
      const onAbort = () => reject(abortError());
      signal.addEventListener('abort', onAbort, { once: true });
      Promise.resolve().then(() => {
        if (signal.aborted) throw abortError();
        return getResult(context);
      }).then(resolve, reject).finally(() => {
        signal.removeEventListener('abort', onAbort);
      });
    });
  }

  function normalizeResult(result) {
    if (!result || typeof result !== 'object') throw new TypeError('Result must be an object');
    const grid = checkGrid(result.grid, 'result.grid');
    if (!Array.isArray(result.steps)) throw new TypeError('result.steps must be an array');
    const steps = Array.from(result.steps, (step, i) => {
      if (!step || !Array.isArray(step.matched)) throw new TypeError('steps[' + i + '].matched must be an array');
      const matched = Array.from(step.matched);
      if (matched.some(index => !Number.isInteger(index) || index < 0 || index > 29) ||
          new Set(matched).size !== matched.length) {
        throw new TypeError('Matched indices must be unique integers between 0 and 29');
      }
      const normalizedStep={ matched, grid: checkGrid(step.grid, 'steps[' + i + '].grid') };
      if(step.multiplier!==undefined){
        if(!Number.isInteger(step.multiplier)||step.multiplier<1||step.multiplier>5)throw new TypeError('step.multiplier must be 1..5');
        normalizedStep.multiplier=step.multiplier;
      }
      if(step.fornadaProgress!==undefined){
        if(!Number.isFinite(step.fornadaProgress)||step.fornadaProgress<0||step.fornadaProgress>100)throw new TypeError('step.fornadaProgress must be 0..100');
        normalizedStep.fornadaProgress=step.fornadaProgress;
      }
      return normalizedStep;
    });
    const multiplier = result.multiplier === undefined ? 1 : result.multiplier;
    if (!Number.isInteger(multiplier) || multiplier < 1 || multiplier > 5) {
      throw new TypeError('multiplier must be an integer between 1 and 5');
    }
    const normalized = { grid, steps, multiplier };
    if(result.fornadaProgress!==undefined){
      if(!Number.isFinite(result.fornadaProgress)||result.fornadaProgress<0||result.fornadaProgress>100)throw new TypeError('fornadaProgress must be 0..100');
      normalized.fornadaProgress=result.fornadaProgress;
    }
    if(result.outcome!==undefined){
      if(!['win','loss','neutral'].includes(result.outcome))throw new TypeError('outcome must be win, loss or neutral');
      normalized.outcome=result.outcome;
    }
    if (result.remainingSpins !== undefined) {
      if (!Number.isInteger(result.remainingSpins) || result.remainingSpins < 0) {
        throw new TypeError('remainingSpins must be a nonnegative integer');
      }
      normalized.remainingSpins = result.remainingSpins;
    }
    if (result.totalWin !== undefined) {
      if (typeof result.totalWin !== 'number' || !Number.isFinite(result.totalWin) || result.totalWin < 0) {
        throw new TypeError('totalWin must be a nonnegative finite number');
      }
      normalized.totalWin = result.totalWin;
    }
    return normalized;
  }

  // Only the fallback demo performs an illustrative collapse. Real providers
  // supply each complete replacement grid, preserving their own game rules.
  function demoCascade(grid, matched, round) {
    const removed = new Set(matched);
    const next = grid.slice();
    for (let column = 0; column < 6; column++) {
      const survivors = [];
      for (let row = 0; row < 5; row++) {
        const index = row * 6 + column;
        if (!removed.has(index)) survivors.push(grid[index]);
      }
      const refillCount = 5 - survivors.length;
      for (let row = 0; row < 5; row++) {
        next[row * 6 + column] = row < refillCount
          ? SYMBOLS[(round + column + row * 2) % 7]
          : survivors[row - refillCount];
      }
    }
    return next;
  }

  async function demoProvider({ round, signal }) {
    if (signal.aborted) throw abortError();
    const grid = Array.from({ length: 30 }, (_, i) => SYMBOLS[(i * 3 + round + Math.floor(i / 6)) % 7]);
    // Scripted scenes, not detection or payout rules.
    const scenes = [
      { matched:[7,8,13,14], chains:1 },
      { matched:[], chains:0 },
      { matched:[24,25,26], chains:2 },
      { matched:[18,19,20,24,25,26], chains:3 }
    ];
    const sceneIndex=(round-1)%scenes.length;
    const scene=scenes[sceneIndex];
    const startingProgress=[0,25,25,75][sceneIndex];
    let matched=scene.matched.slice(),current=grid;
    matched.forEach(index=>{current[index]='donut';});
    const steps=[];
    for(let chain=0;chain<scene.chains;chain++){
      const next=demoCascade(current,matched,round+chain);
      const incoming=[];
      for(let column=0;column<6;column++){
        const count=matched.filter(index=>index%6===column).length;
        for(let row=0;row<count;row++)incoming.push(row*6+column);
      }
      // Only freshly entering symbols are selected for the next scripted scene.
      if(chain+1<scene.chains){
        const symbol=chain%2===0?'cupcake':'macaron';
        incoming.forEach(index=>{next[index]=symbol;});
      }
      steps.push({matched:matched.slice(),grid:next,multiplier:chain+1,fornadaProgress:Math.min(100,startingProgress+(chain+1)*25)});
      current=next;matched=incoming;
    }
    return { grid, steps, multiplier:1, fornadaProgress:startingProgress, totalWin:[2.50,0,10.20,6.75][sceneIndex] };
  }

  function cascadeTiming(row,column,refillCount,symbol){
    const columnOrder=[2,0,4,1,5,3];
    const weight={cereja:1,pirulito:4,donut:2,macaron:3,cupcake:2,bolo:0,forno:0}[symbol]||0;
    const incoming=row<refillCount;
    return {
      delay:incoming?1000+columnOrder[column]*65+(refillCount-1-row)*210:columnOrder[column]*65+(4-row)*105,
      duration:(incoming?450:350)+weight*24+refillCount*40,
      easing:'cubic-bezier(.38,.05,.68,1)'
    };
  }

  class CandyRoundEngine extends EventTarget {
    constructor({ provider } = {}) {
      super();
      if (provider !== undefined && typeof provider !== 'function') {
        throw new TypeError('provider must be a function');
      }
      this._provider = provider || demoProvider;
      this._providerMode = provider ? 'external' : 'demo';
      this._busy = false;
      this._disposed = false;
      this._controller = null;
      this._state = this._initialState();
    }

    _initialState() {
      return {
        phase: 'idle', grid: INITIAL_GRID.slice(), highlighted: [], removed: [],
        multiplier: 1, fornadaProgress: 0, round: 0, mode: this._providerMode
      };
    }

    get busy() { return this._busy; }
    get state() {
      return { ...this._state, grid: this._state.grid.slice(),
        highlighted: this._state.highlighted.slice(), removed: this._state.removed.slice() };
    }

    _emit(patch) {
      this._state = { ...this._state, ...patch };
      this.dispatchEvent(new CustomEvent('state', { detail: this.state }));
    }

    async spin({ turbo = false } = {}) {
      return this._run(context => this._provider(context), { turbo, mode: this._providerMode });
    }

    async playResult(result, { turbo = false } = {}) {
      return this._run(() => result, { turbo, mode: 'external' });
    }

    async _run(getResult, { turbo, mode }) {
      if (this._busy || this._disposed) return false;
      // A new round may interrupt the chef's closing speech.
      this._controller?.abort();
      const controller = new AbortController();
      const signal = controller.signal;
      this._controller = controller;
      this._busy = true;
      const round = this._state.round + 1;
      const speed = turbo ? 0.35 : 1;
      // Optional metadata belongs to one result; prevent previous totals leaking.
      delete this._state.remainingSpins;
      delete this._state.totalWin;
      this._emit({ phase: 'spinning', round, mode, motionSpeed: speed, outcome: 'neutral', chainIndex: 0, comboSize: 0, hasMatches: false, multiplier: 1, highlighted: [], removed: [] });
      try {
        const [rawResult] = await Promise.all([
          abortableResult(getResult, { round, signal }),
          delay(350 * speed, signal)
        ]);
        if (signal.aborted) return false;
        const result = normalizeResult(rawResult);
        const metadata = {};
        if(result.fornadaProgress!==undefined)metadata.fornadaProgress=result.fornadaProgress;
        if(result.outcome!==undefined)metadata.outcome=result.outcome;
        if (result.remainingSpins !== undefined) metadata.remainingSpins = result.remainingSpins;
        if (result.totalWin !== undefined) metadata.totalWin = result.totalWin;
        this._emit({ phase: 'reveal', grid: result.grid.slice(), multiplier: result.multiplier, ...metadata });
        await delay(3000 * speed, signal);
        const steps = result.steps;
        const perStep = speed;
        let chainIndex=0,hasMatches=false,coinsCompleteAt=0;
        for (const step of steps) {
          if(step.matched.length){chainIndex++;hasMatches=true;}
          const visual={};
          if(step.multiplier!==undefined)visual.multiplier=step.multiplier;
          if(step.fornadaProgress!==undefined)visual.fornadaProgress=step.fornadaProgress;
          this._emit({ phase: 'highlight', highlighted: step.matched.slice(), removed: [], chainIndex, comboSize: step.matched.length, hasMatches, ...visual });
          // Coin flight and board refill run concurrently from the same win.
          if(step.matched.length)coinsCompleteAt=Math.max(coinsCompleteAt,performance.now()+3600+(Math.min(8,step.matched.length)-1)*75);
          await delay(step.matched.length ? 820 : 200 * perStep, signal);
          this._emit({ phase: 'disappear', highlighted: [], removed: step.matched.slice() });
          // Burst already finished during highlight; no second empty-grid pause.
          const refillCounts=Array.from({length:6},(_,col)=>step.matched.filter(index=>index%6===col).length);
          let cascadeDuration=450;
          step.grid.forEach((symbol,index)=>{
            const col=index%6;if(!refillCounts[col])return;
            const timing=cascadeTiming(Math.floor(index/6),col,refillCounts[col],symbol);
            cascadeDuration=Math.max(cascadeDuration,timing.delay+timing.duration+80);
          });
          this._emit({ phase: 'cascade', grid: step.grid.slice(), highlighted: [], removed: [] });
          await delay(cascadeDuration * perStep, signal);
        }
        // Only release the next round after outstanding coin arrivals, without
        // delaying the cascade or any later matching steps.
        const remainingFlight=coinsCompleteAt-performance.now();
        if(remainingFlight>0)await delay(remainingFlight+80,signal);
        // Board and coin presentation is complete; speech no longer locks input.
        this._busy = false;
        this._emit({ phase: 'result', highlighted: [], removed: [] });
        await delay(2200, signal);
        this._emit({ phase: 'settled', highlighted: [], removed: [] });
        await delay(200 * speed, signal);
        return !signal.aborted;
      } catch (error) {
        if (signal.aborted) return false;
        this._emit({ phase: 'idle', highlighted: [], removed: [] });
        throw error;
      } finally {
        if (this._controller === controller) {
          this._controller = null;
          this._busy = false;
        }
      }
    }

    _cancelRun() {
      if (this._controller) this._controller.abort();
      this._controller = null;
      this._busy = false;
    }

    cancel() {
      if (this._disposed) return;
      this._cancelRun();
      this._emit({ phase: 'idle', highlighted: [], removed: [] });
    }

    reset() {
      if (this._disposed) return false;
      this._cancelRun();
      this._state = this._initialState();
      this.dispatchEvent(new CustomEvent('state', { detail: this.state }));
      return true;
    }

    dispose() {
      this._cancelRun();
      this._disposed = true;
    }
  }

  CandyRoundEngine.cascadeTiming=cascadeTiming;
  global.CandyRoundEngine = CandyRoundEngine;
})(window);
