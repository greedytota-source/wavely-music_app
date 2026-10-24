/* ═══════════════════════════════════════════════════════════════
   Wavely — procedural demo audio
   Generates original, royalty-free music with the Web Audio API so
   every track makes sound without shipping any audio files.

   Public API:
     WavelySynth.play(seed)      start (or switch to) a generated loop
     WavelySynth.stop()          fade out
     WavelySynth.setVolume(0..1) master volume
     WavelySynth.suspend()/resume()
   ═══════════════════════════════════════════════════════════════ */

window.WavelySynth = (() => {
  "use strict";

  const A4 = 440;
  const midiToFreq = (m) => A4 * Math.pow(2, (m - 69) / 12);

  let ctx = null;
  let master = null;
  let sessionGain = null;
  let noiseBuffer = null;
  let timer = null;
  let running = false;
  let seed = "";
  let setup = null;
  let step = 0;
  let nextTime = 0;
  let volume = 0.65;

  /* FNV-1a, same hashing approach as the artwork generator. */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }

  function ensureContext() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 24;
      comp.ratio.value = 4;
      comp.attack.value = 0.004;
      comp.release.value = 0.22;

      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  function getNoise() {
    if (noiseBuffer) return noiseBuffer;
    const len = Math.floor(ctx.sampleRate * 0.4);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  /* Key, tempo and pattern derived from the track, so each song differs. */
  function buildSetup(trackSeed) {
    const h = hash(trackSeed);
    const base = 45 + (h % 5); // A2 .. D#3
    const tempo = 78 + (h % 27); // 78 – 104 BPM
    const minor = h % 3 !== 0;
    const progression = [
      { root: 0, quality: "minor" },
      { root: 8, quality: "major" },
      { root: 3, quality: "major" },
      { root: 10, quality: "minor" }
    ];
    const arpPattern = [0, 2, 1, 3, 2, 0, 3, 1];
    return { base, tempo, minor, progression, arpPattern, h };
  }

  function chordTones(prog) {
    const triad = prog.quality === "minor" ? [0, 3, 7, 10] : [0, 4, 7, 11];
    return triad;
  }

  function note(type, freq, when, dur, peak, dest, filterHz) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);

    let node = osc;
    if (filterHz) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = filterHz;
      filter.Q.value = 0.6;
      node.connect(filter);
      node = filter;
    }

    const attack = type === "triangle" ? 0.09 : 0.008;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(peak, when + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);

    node.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + dur + 0.03);
  }

  function kick(when, dest, level) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(132, when);
    osc.frequency.exponentialRampToValueAtTime(46, when + 0.12);
    gain.gain.setValueAtTime(level, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + 0.24);
  }

  function hat(when, dest, level) {
    const src = ctx.createBufferSource();
    src.buffer = getNoise();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);
    src.connect(hp);
    hp.connect(gain);
    gain.connect(dest);
    src.start(when);
    src.stop(when + 0.08);
  }

  function scheduleStep(i, when) {
    const s = setup;
    const dest = sessionGain;
    const stepDur = 60 / s.tempo / 2; // eighth notes
    const bar = Math.floor(i / 8) % 4;
    const beat = i % 8;
    const prog = s.progression[bar];
    const tones = chordTones(prog);
    const root = s.base + prog.root;

    // Pad: a soft chord at the start of every bar.
    if (beat === 0) {
      const chord = tones.map((n) => root + 12 + n);
      chord.forEach((n, idx) => {
        note("triangle", midiToFreq(n), when, stepDur * 7.4, 0.045, dest, 1500);
        if (idx === 0) note("sine", midiToFreq(n - 12), when, stepDur * 7.4, 0.05, dest, 900);
      });
    }

    // Bass on beats 1 and 3.
    if (beat === 0 || beat === 4) {
      note("sine", midiToFreq(root - 12), when, stepDur * 1.9, 0.16, dest, 400);
    }

    // Arpeggio — chord tones, one octave up.
    const arpNote = root + 24 + tones[s.arpPattern[i % 8]];
    note("triangle", midiToFreq(arpNote), when, stepDur * 0.9, 0.035, dest, 3200);

    // Light percussion.
    if (beat === 0 || beat === 3 || beat === 6) kick(when, dest, 0.16);
    if (beat % 2 === 1) hat(when, dest, 0.05);
  }

  function scheduleAhead() {
    if (!running || !ctx) return;
    const horizon = ctx.currentTime + 0.55;
    while (nextTime < horizon) {
      scheduleStep(step, nextTime);
      nextTime += 60 / setup.tempo / 2;
      step++;
    }
  }

  function startTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(scheduleAhead, 90);
    scheduleAhead();
  }

  function stopSession(fade = 0.08) {
    running = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (!ctx || !sessionGain) return;
    const g = sessionGain;
    sessionGain = null;
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0.0001, now + fade);
    setTimeout(() => {
      try {
        g.disconnect();
      } catch (_) {}
    }, (fade + 0.2) * 1000);
  }

  return {
    play(trackSeed) {
      if (!ensureContext()) return false;
      if (running && seed === trackSeed) return true;
      stopSession(0.06);
      seed = trackSeed || "wavely";
      setup = buildSetup(seed);
      sessionGain = ctx.createGain();
      sessionGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      sessionGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.18);
      sessionGain.connect(master);
      step = 0;
      nextTime = ctx.currentTime + 0.08;
      running = true;
      startTimer();
      return true;
    },

    stop() {
      if (!running && !sessionGain) return;
      stopSession();
    },

    setVolume(v) {
      const next = Math.min(1, Math.max(0, Number(v) || 0));
      volume = next;
      if (ctx && master) {
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(next, now, 0.02);
      }
    },

    suspend() {
      if (ctx && ctx.state === "running") ctx.suspend().catch(() => {});
    },
    resume() {
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    },
    getState() {
      return {
        supported: Boolean(window.AudioContext || window.webkitAudioContext),
        context: ctx ? ctx.state : "none",
        running,
        seed,
        volume: ctx && master ? Number(master.gain.value.toFixed(2)) : volume
      };
    }
  };
})();
