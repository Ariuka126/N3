/* Quiet synth: a soft ambient pad plus gentle UI chimes. Silent unless enabled. */
window.N3 = window.N3 || {};

N3.Audio = (function () {
  let ctx = null, master = null, pad = null, chimeTimer = null, enabled = false;
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    return true;
  }

  function note(freq, when, dur, vol, type = 'triangle') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(master);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  function startPad() {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    const g = ctx.createGain();
    g.gain.value = 0.035;
    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain).connect(g.gain);
    const oscs = [130.81, 196.0, 261.63, 329.63].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.detune.value = (i % 2 ? 4 : -4);
      o.connect(filter);
      o.start();
      return o;
    });
    filter.connect(g).connect(master);
    lfo.start();
    pad = { oscs, lfo, g };
    const sprinkle = () => {
      if (enabled) note(PENTA[Math.floor(Math.random() * PENTA.length)], ctx.currentTime, 2.4, 0.025, 'sine');
      chimeTimer = setTimeout(sprinkle, 7000 + Math.random() * 9000);
    };
    chimeTimer = setTimeout(sprinkle, 4000);
  }

  function stopPad() {
    if (!pad) return;
    clearTimeout(chimeTimer);
    pad.oscs.forEach(o => o.stop());
    pad.lfo.stop();
    pad = null;
  }

  return {
    setEnabled(on) {
      enabled = on;
      if (!on) {
        if (ctx) {
          master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
          setTimeout(() => { if (!enabled) stopPad(); }, 1500);
        }
        return;
      }
      if (!ensure()) return;
      ctx.resume();
      if (!pad) startPad();
      master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.8);
    },
    gem() {
      if (!enabled || !ctx) return;
      const t = ctx.currentTime;
      note(783.99, t, 0.5, 0.06);
      note(1174.66, t + 0.09, 0.7, 0.05);
    },
    soft() {
      if (!enabled || !ctx) return;
      note(659.25, ctx.currentTime, 0.4, 0.035, 'sine');
    },
    done() {
      if (!enabled || !ctx) return;
      const t = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((f, i) => note(f, t + i * 0.22, 1.6, 0.05, 'sine'));
    },
    purr() {
      if (!enabled || !ctx) return;
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      const t = ctx.currentTime;
      o.type = 'sawtooth'; o.frequency.value = 55;
      lfo.frequency.value = 22; lg.gain.value = 0.02;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.03, t + 0.2);
      g.gain.linearRampToValueAtTime(0, t + 1.1);
      lfo.connect(lg).connect(g.gain);
      o.connect(f).connect(g).connect(master);
      o.start(t); lfo.start(t); o.stop(t + 1.2); lfo.stop(t + 1.2);
    }
  };
})();
