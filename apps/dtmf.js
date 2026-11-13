/* DTMF — the real telephone keypad tones (ITU-T Q.23), synthesised with Web Audio.
   Every key is a pair of sine tones; pressing a key sounds exactly like a phone. */

const ROW = {
  1: 697, 2: 697, 3: 697,
  4: 770, 5: 770, 6: 770,
  7: 852, 8: 852, 9: 852,
  '*': 941, 0: 941, '#': 941,
};

const COL = {
  1: 1209, 2: 1336, 3: 1477,
  4: 1209, 5: 1336, 6: 1477,
  7: 1209, 8: 1336, 9: 1477,
  '*': 1209, 0: 1336, '#': 1477,
};

let ctx = null;
let enabled = true;

function audio() {
  if (!enabled) return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try {
    if (!ctx) ctx = new Ctor();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  } catch {
    return null;
  }
  return ctx;
}

export function setToneEnabled(on) {
  enabled = Boolean(on);
}

export function tonesEnabled() {
  return enabled;
}

export function playTone(key, ms = 140) {
  const context = audio();
  const row = ROW[key];
  const col = COL[key];
  if (!context || !row || !col) return;

  const now = context.currentTime;
  const len = ms / 1000;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.008);
  gain.gain.setValueAtTime(0.14, now + Math.max(len - 0.03, 0.02));
  gain.gain.linearRampToValueAtTime(0, now + len);
  gain.connect(context.destination);

  [row, col].forEach((freq) => {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + len);
  });
}
