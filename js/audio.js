/* Quiet synth ambience plus gentle sound effects. Both are synthesized with Web Audio; no files. */
window.N3 = window.N3 || {};

N3.Audio = (function () {
  let ctx = null, master = null, padBus = null, pad = null, chimeTimer = null;
  let ambient = false, sfx = false;
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

  // Contexts can only start after a user gesture, so this is called lazily from click handlers.
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      padBus = ctx.createGain();
      padBus.gain.value = 0;
      padBus.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function note(freq, when, dur, vol, type = 'triangle', dest = master) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(dest);
    o.start(when);
    o.stop(when + dur + 0.05);
    return o;
  }

  // A soft pitched "pop": quick downward glide, like tapping a wooden bead.
  function pop(from, to, vol, dur = 0.09) {
    const t = ctx.currentTime;
    const o = note(from, t, dur, vol, 'sine');
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur * 0.8);
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
    filter.connect(g).connect(padBus);
    lfo.start();
    pad = { oscs, lfo };
    const sprinkle = () => {
      if (ambient) note(PENTA[Math.floor(Math.random() * PENTA.length)], ctx.currentTime, 2.4, 0.025, 'sine', padBus);
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

  const ready = () => sfx && ensure();

  return {
    setAmbient(on) {
      ambient = on;
      if (!on) {
        if (ctx) {
          padBus.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
          setTimeout(() => { if (!ambient) stopPad(); }, 1500);
        }
        return;
      }
      if (!ensure()) return;
      if (!pad) startPad();
      padBus.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
    },
    setSfx(on) { sfx = on; },

    tap() { if (ready()) pop(760, 520, 0.05); },
    tab() { if (ready()) pop(620, 440, 0.05, 0.11); },
    toggle(on) {
      if (!ready()) return;
      const t = ctx.currentTime;
      const [a, b] = on ? [587.33, 880] : [880, 587.33];
      note(a, t, 0.12, 0.04, 'sine');
      note(b, t + 0.07, 0.16, 0.04, 'sine');
    },
    // Sparkle as a gem appears.
    gem() {
      if (!ready()) return;
      const t = ctx.currentTime;
      [1318.51, 1567.98, 1975.53, 2637.02].forEach((f, i) => note(f, t + i * 0.05, 0.35, 0.035, 'triangle'));
    },
    // Glassy clink as it lands in the jar.
    clink() {
      if (!ready()) return;
      const t = ctx.currentTime;
      note(2093.0, t, 0.5, 0.05, 'sine');
      note(3135.96, t + 0.01, 0.35, 0.025, 'sine');
      note(4186.01, t + 0.02, 0.2, 0.012, 'sine');
    },
    unlock() {
      if (!ready()) return;
      const t = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, t + i * 0.11, 0.9, 0.045, 'triangle'));
    },
    // Not-quite-right answers get a soft, low "hmm" rather than a buzzer.
    gentle() {
      if (!ready()) return;
      const t = ctx.currentTime;
      note(392.0, t, 0.3, 0.04, 'sine');
      note(329.63, t + 0.12, 0.4, 0.035, 'sine');
    },
    soft() { if (ready()) note(659.25, ctx.currentTime, 0.4, 0.035, 'sine'); },
    done() {
      if (!ready()) return;
      const t = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((f, i) => note(f, t + i * 0.22, 1.6, 0.05, 'sine'));
    },
    purr() {
      if (!ready()) return;
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
