// Synthesized sound effects (Web Audio, no asset files). Fails silently if audio is unavailable.
const SFX = (() => {
  let ctx = null;
  let muted = false;
  let master = null;
  let volume = 1;

  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      } catch (e) { ctx = null; }
    }
    if (ctx && !master) {
      try { master = ctx.createGain(); master.gain.value = volume; master.connect(ctx.destination); } catch (e) { master = null; }
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, freq2, dur, type, vol, when = 0) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (freq2) o.frequency.exponentialRampToValueAtTime(freq2, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master || c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  const recipes = {
    dodge:  () => tone(600, 900, 0.12, "sine", 0.12),
    strike: () => tone(260, 120, 0.1, "square", 0.08),
    gather: () => { tone(880, null, 0.08, "triangle", 0.12); tone(1320, null, 0.12, "triangle", 0.1, 0.07); },
    hurt:   () => tone(180, 70, 0.18, "sawtooth", 0.12),
    death:  () => tone(300, 50, 0.6, "sawtooth", 0.14),
    portal: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, null, 0.25, "sine", 0.12, i * 0.09)); },
  };

  return {
    play(name) {
      if (muted) return;
      const r = recipes[name];
      if (!r) return;
      try { r(); } catch (e) { /* audio is optional */ }
    },
    setMuted(m) { muted = !!m; },
    setVolume(v) { volume = Math.max(0, Math.min(2, Number(v) || 0)); if (master) master.gain.value = volume; },
    get volume() { return volume; },
    get muted() { return muted; },
    unlock: ensure,
  };
})();
