/* ===== TicketQuest — zvukový engine (WebAudio, len efekty) ===== */

const SFX = (() => {
  let actx = null;
  function ctx() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    return actx;
  }
  function tone(freq, dur, type = "square", vol = 0.03) {
    const a = ctx(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + dur);
  }
  return {
    blip:  () => tone(640 + Math.random() * 140, 0.03, "square", 0.015),
    ping:  () => { tone(880, 0.08); setTimeout(() => tone(1174, 0.10), 90); },   // nový ticket
    ding:  () => { tone(660, 0.07); setTimeout(() => tone(880, 0.07), 80); setTimeout(() => tone(1320, 0.14), 160); }, // resolve
    err:   () => tone(180, 0.15, "sawtooth", 0.04),
    alarm: () => { tone(440, 0.12, "square", 0.05); setTimeout(() => tone(440, 0.12, "square", 0.05), 250); },
    click: () => tone(300, 0.04, "triangle", 0.02),
    type:  () => tone(1100 + Math.random() * 200, 0.015, "square", 0.008),
    fanfare: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.14, "square", 0.03), i * 130)); },
  };
})();
