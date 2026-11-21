// Procedurally synthesised background music (Web Audio) — no audio files needed.
//   dungeonTrack(): dark, atmospheric ambience — slow minor drones, wind, distant rumbles, sparse bells and drips.
//   elvenTrack():   happy elven shop tune — a breathy flute over a plucked-harp arpeggio, soft strings and a light hand drum, in 6/8.
// Both are started/stopped (with fades) by engine.js. To use real recordings instead, set `src` in js/audio-config.js.

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const note = (name) => { const m = /^([A-G])([#b]?)(\d)$/.exec(name); return midi(12 * (+m[3] + 1) + SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0)); };
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function impulse(AC, seconds, decay) {
  const n = Math.floor(AC.sampleRate * seconds), buf = AC.createBuffer(2, n, AC.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
  return buf;
}
function noiseBuffer(AC, seconds) {
  const n = Math.floor(AC.sampleRate * seconds), buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** shared plumbing: input -> (dry + reverb) -> compressor -> fading master -> speakers; remembers sources so stop() can tear everything down */
function makeInstance(AC, level, wet, irSeconds) {
  const srcs = [], timers = [];
  const input = AC.createGain(), dry = AC.createGain(), rev = AC.createConvolver(), wetG = AC.createGain(), comp = AC.createDynamicsCompressor(), out = AC.createGain();
  rev.buffer = impulse(AC, irSeconds, 2.8); wetG.gain.value = wet; dry.gain.value = 1;
  comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.4;
  input.connect(dry); input.connect(rev); rev.connect(wetG); dry.connect(comp); wetG.connect(comp); comp.connect(out); out.connect(AC.destination);
  out.gain.value = 0; out.gain.setTargetAtTime(level, AC.currentTime, 1.4);
  const inst = {
    AC, input, out, srcs, timers,
    osc(type, freq, dest = input, gain = 1) { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = freq; g.gain.value = gain; o.connect(g); g.connect(dest); o.start(); srcs.push(o); return { o, g }; },
    every(ms, fn) { const t = setInterval(fn, ms); timers.push(t); return t; },
    later(ms, fn) { const t = setTimeout(fn, ms); timers.push(t); return t; },
    stop() {
      out.gain.cancelScheduledValues(AC.currentTime); out.gain.setTargetAtTime(0, AC.currentTime, 0.5);
      timers.forEach((t) => { clearInterval(t); clearTimeout(t); });
      setTimeout(() => { srcs.forEach((s) => { try { s.stop(); } catch (e) {} }); try { out.disconnect(); } catch (e) {} }, 2600);
    },
  };
  return inst;
}

// ====================================================================================== dread: dark dungeon ambience
export function dungeonTrack(AC, level = 0.4) {
  return {
    start() {
      const I = makeInstance(AC, level, 0.7, 7);
      // dissonant clusters: root + minor 2nd + tritone, drifting between roots a semitone or two apart (nothing ever resolves)
      const CH = [[38, [0, 1, 6]], [37, [0, 6, 13]], [34, [0, 1, 7]], [36, [0, 6, 7]], [33, [0, 1, 6]]];
      const filt = AC.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = 170; filt.Q.value = 5;
      const padG = AC.createGain(); padG.gain.value = 0.125; filt.connect(padG); padG.connect(I.input);
      I.osc("sine", 0.04, filt.frequency, 85);                                // the filter slowly opens and closes, like breathing
      const pad = [0, 1, 2].map((k) => { const x = I.osc("sawtooth", midi(50 + k), filt, 1); x.o.detune.value = (k - 1) * 14; return x; });
      const sub = I.osc("sine", midi(26), I.input, 0.3), sub2 = I.osc("triangle", midi(38), I.input, 0.06);
      I.osc("sine", 0.13, sub.g.gain, 0.12);                                    // sub-bass throb
      let ci = 0;
      const setChord = () => {
        const [root, iv] = CH[ci % CH.length], t = AC.currentTime; ci++;
        pad.forEach((x, k) => x.o.frequency.setTargetAtTime(midi(root + 12 + iv[k]), t, 5));
        sub.o.frequency.setTargetAtTime(midi(root - 12), t, 5); sub2.o.frequency.setTargetAtTime(midi(root), t, 5);
      };
      setChord(); I.every(26000, setChord);
      // wind / whispering breath
      const wind = AC.createBufferSource(); wind.buffer = noiseBuffer(AC, 6); wind.loop = true;
      const bp = AC.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 420; bp.Q.value = 1.4;
      const wg = AC.createGain(); wg.gain.value = 0.05; wind.connect(bp); bp.connect(wg); wg.connect(I.input); wind.start(); I.srcs.push(wind);
      I.osc("sine", 0.032, bp.frequency, 300); I.osc("sine", 0.055, wg.gain, 0.045);   // slow swells, like waves
      // slow heartbeat, in episodes that come and go
      let beat = 0;
      const thump = (t, g) => { const o = AC.createOscillator(), e = AC.createGain(); o.type = "sine"; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.18); e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + 0.015); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.34); o.connect(e); e.connect(I.input); o.start(t); o.stop(t + 0.4); };
      I.every(1900, () => { beat++; if (beat % 26 < 6) { const t = AC.currentTime + 0.05; thump(t, 0.3); thump(t + 0.3, 0.2); } });
      const bell = (m, vel = 1) => {                                            // low, inharmonic tolling bell
        const t = AC.currentTime, f = midi(m);
        for (const [ratio, g, dec] of [[1, 0.11, 9], [2.4, 0.045, 5], [3.9, 0.025, 3], [5.9, 0.012, 1.6]]) {
          const o = AC.createOscillator(), e = AC.createGain(); o.type = "sine"; o.frequency.value = f * ratio;
          e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g * vel, t + 0.008); e.gain.exponentialRampToValueAtTime(0.0001, t + dec);
          o.connect(e); e.connect(I.input); o.start(t); o.stop(t + dec + 0.1);
        }
      };
      const voices = () => {                                                    // a dissonant, throaty choir swell (minor second apart)
        const base = pick([50, 51, 56, 57]), t = AC.currentTime, dur = rnd(7, 11);
        for (const m of [base, base + 1, base + 7]) {
          const o = AC.createOscillator(), f1 = AC.createBiquadFilter(), f2 = AC.createBiquadFilter(), e = AC.createGain(), lfo = AC.createOscillator(), lg = AC.createGain();
          o.type = "sawtooth"; o.frequency.value = midi(m); o.detune.value = rnd(-12, 12); f1.type = "bandpass"; f1.frequency.value = 520; f1.Q.value = 5; f2.type = "bandpass"; f2.frequency.value = 900; f2.Q.value = 6;
          lfo.frequency.value = rnd(4.2, 5.4); lg.gain.value = 5; lfo.connect(lg); lg.connect(o.detune);
          e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.03, t + dur * 0.45); e.gain.linearRampToValueAtTime(0.0001, t + dur);
          o.connect(f1); o.connect(f2); f1.connect(e); f2.connect(e); e.connect(I.input); o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
        }
      };
      const scrape = () => {                                                    // distant metal dragged across stone
        const t = AC.currentTime, d = rnd(2, 3.5), n = AC.createBufferSource(), f = AC.createBiquadFilter(), e = AC.createGain();
        n.buffer = noiseBuffer(AC, 4); f.type = "bandpass"; f.Q.value = 14; f.frequency.setValueAtTime(rnd(700, 1100), t); f.frequency.exponentialRampToValueAtTime(rnd(1800, 3200), t + d);
        e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.035, t + d * 0.4); e.gain.linearRampToValueAtTime(0.0001, t + d);
        n.connect(f); f.connect(e); e.connect(I.input); n.start(t); n.stop(t + d + 0.1);
      };
      const drip = () => {
        const t = AC.currentTime, o = AC.createOscillator(), e = AC.createGain(); o.type = "sine"; const f = rnd(900, 1500);
        o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.12);
        e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(0.03, t + 0.005); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        o.connect(e); e.connect(I.input); o.start(t); o.stop(t + 0.3);
      };
      const growl = () => {                                                     // something huge, far below
        const t = AC.currentTime, n = AC.createBufferSource(), lp = AC.createBiquadFilter(), e = AC.createGain(); n.buffer = noiseBuffer(AC, 4); lp.type = "lowpass"; lp.frequency.setValueAtTime(90, t); lp.frequency.linearRampToValueAtTime(180, t + 1.8);
        e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(0.65, t + 1.4); e.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
        n.connect(lp); lp.connect(e); e.connect(I.input); n.start(t); n.stop(t + 4);
        const o = AC.createOscillator(), g = AC.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(46, t); o.frequency.exponentialRampToValueAtTime(30, t + 3); const lp2 = AC.createBiquadFilter(); lp2.type = "lowpass"; lp2.frequency.value = 160;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2); o.connect(lp2); lp2.connect(g); g.connect(I.input); o.start(t); o.stop(t + 3.4);
      };
      const schedule = (fn, lo, hi) => { const go = () => { fn(); I.later(rnd(lo, hi) * 1000, go); }; I.later(rnd(lo, hi) * 500, go); };
      schedule(() => { bell(pick([50, 51, 56, 44, 45])); if (Math.random() < 0.5) I.later(rnd(1800, 3200), () => bell(pick([56, 57, 44]), 0.8)); }, 26, 48);
      schedule(voices, 38, 65);
      schedule(scrape, 48, 85);
      schedule(growl, 32, 58);
      schedule(drip, 16, 34);          // long stretches of nothing but hum and waves
      return I;
    },
  };
}

// ====================================================================================== happy elven shop music
const CHORDS = {
  D: ["D4", "F#4", "A4", "D5"], A: ["A3", "C#4", "E4", "A4"], Bm: ["B3", "D4", "F#4", "B4"], G: ["G3", "B3", "D4", "G4"],
};
const PROG = ["D", "A", "Bm", "G", "D", "A", "G", "A"];
const ROOT = { D: "D2", A: "A2", Bm: "B2", G: "G2" };
// melody: per bar, [note, length in eighth notes] — each bar sums to 6 (6/8)
const MEL_A = [
  [["F#5", 1], ["A5", 1], ["D6", 2], ["B5", 1], ["A5", 1]], [["E5", 1], ["A5", 1], ["C#6", 2], ["B5", 1], ["A5", 1]],
  [["D5", 1], ["F#5", 1], ["B5", 2], ["A5", 1], ["F#5", 1]], [["G5", 1], ["B5", 1], ["D6", 2], ["B5", 2]],
  [["A5", 1], ["D6", 1], ["F#6", 2], ["E6", 1], ["D6", 1]], [["C#6", 1], ["E6", 2], ["D6", 1], ["C#6", 1], ["A5", 1]],
  [["B5", 1], ["D6", 1], ["G6", 2], ["F#6", 1], ["E6", 1]], [["F#6", 2], ["E6", 1], ["C#6", 1], ["D6", 2]],
];
const MEL_B = [
  [["A5", 2], ["F#5", 1], ["A5", 1], ["D6", 2]], [["C#6", 2], ["A5", 1], ["E5", 1], ["A5", 2]],
  [["B5", 1], ["D6", 1], ["F#6", 2], ["D6", 1], ["B5", 1]], [["D6", 2], ["B5", 1], ["G5", 1], ["B5", 2]],
  [["F#6", 1], ["E6", 1], ["D6", 2], ["A5", 1], ["F#5", 1]], [["E5", 1], ["A5", 1], ["C#6", 2], ["E6", 2]],
  [["D6", 1], ["B5", 1], ["G5", 2], ["A5", 1], ["B5", 1]], [["C#6", 2], ["A5", 2], ["D5", 2]],
];
const SONG = [MEL_A, MEL_B, MEL_A, MEL_B];

export function elvenTrack(AC, level = 0.4) {
  return {
    start() {
      const I = makeInstance(AC, level, 0.32, 2.6);
      const EIGHTH = 0.19;
      const breath = noiseBuffer(AC, 1);
      const flute = (freq, t, dur) => {
        const o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain(), g2 = AC.createGain(), env = AC.createGain();
        o.type = "sine"; o2.type = "triangle"; o.frequency.value = freq; o2.frequency.value = freq * 2; g.gain.value = 1; g2.gain.value = 0.1;
        const vib = AC.createOscillator(), vg = AC.createGain(); vib.frequency.value = 5.3; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(freq * 0.007, t + Math.min(0.4, dur));
        vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
        env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(0.2, t + 0.055); env.gain.setTargetAtTime(0.15, t + 0.08, 0.25);
        env.gain.setValueAtTime(0.15, t + dur - 0.04); env.gain.linearRampToValueAtTime(0.0001, t + dur + 0.1);
        o.connect(g); o2.connect(g2); g.connect(env); g2.connect(env); env.connect(I.input);
        const nz = AC.createBufferSource(), bp = AC.createBiquadFilter(), ng = AC.createGain(); nz.buffer = breath; bp.type = "bandpass"; bp.frequency.value = Math.min(6000, freq * 3.2); bp.Q.value = 1.2;
        ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(0.05, t + 0.03); ng.gain.exponentialRampToValueAtTime(0.004, t + 0.3); ng.gain.linearRampToValueAtTime(0.0001, t + dur + 0.1);
        nz.connect(bp); bp.connect(ng); ng.connect(I.input);
        for (const s of [o, o2, vib, nz]) { s.start(t); s.stop(t + dur + 0.2); }
      };
      const pluck = (freq, t, vol = 0.1) => {                                  // harp-like: bright triangle + soft octave, quick decay
        for (const [mul, gain, type] of [[1, vol, "triangle"], [2, vol * 0.35, "sine"]]) {
          const o = AC.createOscillator(), e = AC.createGain(); o.type = type; o.frequency.value = freq * mul;
          e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(gain, t + 0.006); e.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
          o.connect(e); e.connect(I.input); o.start(t); o.stop(t + 1.2);
        }
      };
      const bass = (freq, t) => { const o = AC.createOscillator(), e = AC.createGain(); o.type = "sine"; o.frequency.value = freq; e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(0.16, t + 0.01); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.55); o.connect(e); e.connect(I.input); o.start(t); o.stop(t + 0.6); };
      const drum = (t, accent) => { const o = AC.createOscillator(), e = AC.createGain(); o.type = "sine"; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(75, t + 0.12); e.gain.setValueAtTime(accent ? 0.12 : 0.06, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.connect(e); e.connect(I.input); o.start(t); o.stop(t + 0.2); };
      const shaker = (t, v) => { const n = AC.createBufferSource(), hp = AC.createBiquadFilter(), e = AC.createGain(); n.buffer = breath; hp.type = "highpass"; hp.frequency.value = 7000; e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.07); n.connect(hp); hp.connect(e); e.connect(I.input); n.start(t, Math.random() * 0.5); n.stop(t + 0.09); };
      const strings = (chord, t, dur) => {                                      // soft sustained strings
        for (const nm of CHORDS[chord].slice(0, 3)) {
          const o = AC.createOscillator(), lp = AC.createBiquadFilter(), e = AC.createGain(); o.type = "sawtooth"; o.frequency.value = note(nm) / 2; o.detune.value = rnd(-6, 6); lp.type = "lowpass"; lp.frequency.value = 900;
          e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.022, t + 0.35); e.gain.setValueAtTime(0.022, t + dur - 0.3); e.gain.linearRampToValueAtTime(0.0001, t + dur + 0.25);
          o.connect(lp); lp.connect(e); e.connect(I.input); o.start(t); o.stop(t + dur + 0.3);
        }
      };
      // sequencer: schedule one bar at a time, slightly ahead of the audio clock
      let t0 = AC.currentTime + 0.15, bar = 0;
      const scheduleBar = (b) => {
        const part = SONG[Math.floor(b / 8) % SONG.length], idx = b % 8, chord = PROG[idx], t = t0 + b * 6 * EIGHTH;
        strings(chord, t, 6 * EIGHTH);
        const tones = CHORDS[chord].map(note);
        [0, 1, 2, 3, 2, 1].forEach((k, s) => pluck(tones[k], t + s * EIGHTH, s === 0 ? 0.11 : 0.075));
        bass(note(ROOT[chord]), t); bass(note(ROOT[chord]) * (chord === "Bm" ? 1.5 : 1.5), t + 3 * EIGHTH);
        drum(t, true); drum(t + 3 * EIGHTH, false); for (let s = 0; s < 6; s++) shaker(t + s * EIGHTH, s % 3 === 0 ? 0.03 : 0.015);
        let pos = 0;
        for (const [nm, len] of part[idx]) { flute(note(nm), t + pos * EIGHTH, len * EIGHTH * 0.94); pos += len; }
      };
      const pump = () => { while (t0 + bar * 6 * EIGHTH < AC.currentTime + 1.2) scheduleBar(bar++); };
      pump(); I.every(250, pump);
      return I;
    },
  };
}
