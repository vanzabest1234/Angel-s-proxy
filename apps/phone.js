/* Phone — a working dial pad with real DTMF tones, contacts and a call screen.
   Numbers, contacts and recents stay in this browser. */

import { playTone } from './dtmf.js';

const CONTACTS_KEY = 'angel.phone.contacts';
const RECENTS_KEY = 'angel.phone.recents';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');

const read = (key, fallback) => {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    return Array.isArray(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ }
};

const digits = (value) => String(value).replace(/[^\d*#]/g, '');

function format(raw) {
  const value = String(raw);
  const intl = value.trimStart().startsWith('+');
  const d = digits(value);
  if (!d) return '';
  if (intl) return `+${d}`;
  if (d.includes('*') || d.includes('#')) return d;
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  if (d.length <= 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return d.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
}

const initials = (label) => {
  const words = String(label).replace(/[^A-Za-z\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '#';
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
};

const clock = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

const when = (ts) => {
  const date = new Date(ts);
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const KEYS = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
  ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
  ['*', ''], ['0', '+'], ['#', ''],
];

const HANDSET = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 3.5h3.2c.8 0 1.5.6 1.7 1.4l.7 2.6c.2.8-.1 1.6-.8 2l-1.6 1c1 2.2 2.8 4 5 5l1-1.6c.4-.7 1.2-1 2-.8l2.6.7c.8.2 1.4.9 1.4 1.7v3.2c0 1-.8 1.8-1.8 1.7C10.9 19.9 4.1 13.1 3.5 5.3c-.1-1 .7-1.8 1.7-1.8Z" fill="currentColor"/></svg>';

export function renderPhone(body) {
  body.innerHTML = `
    <div class="phone">
      <div class="phone-tabs" data-tabs></div>
      <div class="phone-body" data-view></div>
      <div class="phone-call" data-call hidden></div>
    </div>`;

  const tabs = body.querySelector('[data-tabs]');
  const view = body.querySelector('[data-view]');
  const callEl = body.querySelector('[data-call]');

  const state = {
    view: 'pad',
    dial: '',
    contacts: read(CONTACTS_KEY, []),
    recents: read(RECENTS_KEY, []),
    call: null,
    tone: true,
  };

  let ringTimer = null;
  let tickTimer = null;

  const nameOf = (number) => {
    const hit = state.contacts.find((c) => digits(c.number) === digits(number));
    return hit ? hit.name : '';
  };

  /* ---------- call screen ---------- */
  function drawCall() {
    const call = state.call;
    if (!call) {
      callEl.hidden = true;
      callEl.innerHTML = '';
      return;
    }
    callEl.hidden = false;
    callEl.innerHTML = `
      <p class="call-kicker">${call.connected ? 'In call' : 'Calling…'}</p>
      <div class="call-who">
        <span class="call-avatar">${esc(initials(call.name || format(call.number)))}</span>
        <b class="call-name">${esc(call.name || format(call.number))}</b>
        <span class="call-num">${call.name ? esc(call.shown || format(call.number)) : call.connected ? 'Connected' : 'Ringing…'}</span>
        <span class="call-time" data-call-time>${call.connected ? clock(call.secs) : ''}</span>
      </div>
      <button class="call-more${call.keypad ? ' is-on' : ''}" data-call-keypad>${call.keypad ? 'Hide keypad' : 'Keypad'}</button>
      ${call.keypad ? `
        <div class="call-pad">
          ${KEYS.map(([key, letters]) => `<button class="call-key" data-dtmf="${key}"><span>${key}</span>${letters ? `<small>${letters}</small>` : ''}</button>`).join('')}
        </div>` : '<span class="call-spacer"></span>'}
      <div class="call-actions">
        <button class="call-btn${call.muted ? ' is-on' : ''}" data-call-toggle="muted">Mute</button>
        <button class="call-btn${call.speaker ? ' is-on' : ''}" data-call-toggle="speaker">Speaker</button>
        <button class="call-btn call-end" data-call-end>End</button>
      </div>`;

    callEl.querySelectorAll('[data-dtmf]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!state.call || !state.call.connected) return;
        playTone(btn.dataset.dtmf, 120);
      });
    });
    callEl.querySelector('[data-call-keypad]').addEventListener('click', () => {
      if (!state.call) return;
      state.call.keypad = !state.call.keypad;
      drawCall();
    });

    callEl.querySelectorAll('[data-call-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!state.call) return;
        const key = btn.dataset.callToggle;
        state.call[key] = !state.call[key];
        drawCall();
      });
    });
    callEl.querySelector('[data-call-end]').addEventListener('click', endCall);
  }

  function startCall(raw) {
    const number = digits(raw);
    if (!number) return;
    state.call = {
      number,
      name: nameOf(number),
      shown: format(raw),
      started: Date.now(),
      connected: false,
      secs: 0,
      muted: false,
      speaker: false,
      keypad: false,
    };
    drawCall();

    clearTimeout(ringTimer);
    clearInterval(tickTimer);
    ringTimer = setTimeout(() => {
      if (!state.call) return;
      state.call.connected = true;
      drawCall();
    }, 1600);
    tickTimer = setInterval(() => {
      if (!state.call || !state.call.connected) return;
      state.call.secs += 1;
      const time = callEl.querySelector('[data-call-time]');
      if (time) time.textContent = clock(state.call.secs);
    }, 1000);
  }

  function endCall() {
    const call = state.call;
    if (!call) return;
    state.call = null;
    clearTimeout(ringTimer);
    clearInterval(tickTimer);
    ringTimer = null;
    tickTimer = null;
    callEl.hidden = true;
    callEl.innerHTML = '';

    state.recents = [{ number: call.number, name: call.name, secs: call.secs, at: Date.now() }, ...state.recents].slice(0, 25);
    write(RECENTS_KEY, state.recents);
    state.view = 'recents';
    draw();
  }

  /* ---------- views ---------- */
  function drawTabs() {
    tabs.innerHTML = [['pad', 'Keypad'], ['contacts', 'Contacts'], ['recents', 'Recents']]
      .map(([id, label]) => `<button class="phone-tab${state.view === id ? ' is-on' : ''}" data-tab="${id}">${label}</button>`)
      .join('');
    tabs.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.view = btn.dataset.tab;
        draw();
      });
    });
  }

  function setHint(text) {
    const hint = view.querySelector('[data-hint]');
    if (hint) hint.textContent = text;
  }

  function pressKey(key) {
    if (state.tone) playTone(key);
    if (navigator.vibrate) navigator.vibrate(10);
    state.dial = (state.dial + key).slice(0, 18);
    drawPad();
  }

  function backspace() {
    state.dial = state.dial.slice(0, -1);
    drawPad();
  }

  function placeCall() {
    if (!state.dial) {
      setHint('Type a number first, then press call.');
      return;
    }
    startCall(state.dial);
  }

  function drawPad() {
    const who = state.contacts.find((c) => digits(c.number) === digits(state.dial) && digits(state.dial).length > 2);
    const number = format(state.dial);
    const tel = state.dial.replace(/[^\d+*#]/g, '');

    view.innerHTML = `
      <div class="pad">
        <div class="pad-top">
          <span class="pad-brand">Angel&rsquo;s Line</span>
          <button class="pad-tone${state.tone ? '' : ' is-off'}" data-tone aria-pressed="${state.tone}" aria-label="Keypad tones">${state.tone ? '♪' : '♪̸'}</button>
        </div>
        <div class="pad-display${state.dial ? '' : ' is-empty'}">
          ${who ? `<span class="pad-who">${esc(who.name)}</span>` : ''}
          <span data-number>${state.dial ? esc(number) : 'Enter a number'}</span>
        </div>
        <p class="pad-hint" data-hint>${state.tone ? 'Real DTMF tones · hold 0 for +' : 'Keypad tones muted · hold 0 for +'}</p>
        <div class="pad-grid">
          ${KEYS.map(([key, letters]) => `
            <button class="pad-key" data-key="${key}">
              <span>${key}</span>
              ${letters ? `<small>${letters}</small>` : ''}
            </button>`).join('')}
        </div>
        <div class="pad-foot">
          <button class="pad-back" data-back aria-label="Delete last digit">⌫</button>
          <button class="pad-call" data-call-start aria-label="Call">${HANDSET}</button>
          <button class="pad-back" data-clear aria-label="Clear number">✕</button>
        </div>
        <div class="pad-alt">
          <button class="pad-alt-btn" data-copy${state.dial ? '' : ' disabled'}>Copy number</button>
          <a class="pad-alt-btn" data-real href="${tel ? `tel:${attr(tel)}` : '#'}"${state.dial ? '' : ' aria-disabled="true"'}>Call on this device</a>
        </div>
      </div>`;

    view.querySelectorAll('[data-key]').forEach((btn) => {
      const key = btn.dataset.key;
      if (key === '0') return;
      btn.addEventListener('click', () => pressKey(key));
    });

    /* hold 0 for +, like a real phone */
    const zero = view.querySelector('[data-key="0"]');
    let holdTimer = null;
    let heldAt = 0;
    zero.addEventListener('pointerdown', () => {
      holdTimer = setTimeout(() => {
        heldAt = Date.now();
        pressKey('+');
      }, 550);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((type) => {
      zero.addEventListener(type, () => {
        clearTimeout(holdTimer);
        holdTimer = null;
      });
    });
    zero.addEventListener('click', () => {
      if (Date.now() - heldAt < 500) return;
      pressKey('0');
    });

    /* hold ⌫ to clear the whole number */
    const back = view.querySelector('[data-back]');
    let clearTimer = null;
    let clearedAt = 0;
    back.addEventListener('pointerdown', () => {
      clearTimer = setTimeout(() => {
        clearedAt = Date.now();
        setHint('Number cleared.');
        state.dial = '';
        drawPad();
      }, 650);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((type) => {
      back.addEventListener(type, () => {
        clearTimeout(clearTimer);
        clearTimer = null;
      });
    });
    back.addEventListener('click', () => {
      if (Date.now() - clearedAt < 500) return;
      backspace();
    });

    view.querySelector('[data-clear]').addEventListener('click', () => {
      state.dial = '';
      drawPad();
    });
    view.querySelector('[data-call-start]').addEventListener('click', placeCall);

    view.querySelector('[data-tone]').addEventListener('click', () => {
      state.tone = !state.tone;
      drawPad();
      if (state.tone) playTone('5');
    });

    const copy = view.querySelector('[data-copy]');
    copy.addEventListener('click', async () => {
      if (!state.dial) return;
      try {
        await navigator.clipboard.writeText(format(state.dial));
        setHint('Number copied.');
      } catch {
        setHint('Could not copy — select the number instead.');
      }
    });

    const real = view.querySelector('[data-real]');
    real.addEventListener('click', (event) => {
      if (!state.dial) {
        event.preventDefault();
        setHint('Type a number first, then call.');
      }
    });
  }

  function drawContacts() {
    view.innerHTML = `
      <form class="phone-add" data-add>
        <input class="phone-input" name="name" placeholder="Name" aria-label="Contact name" autocomplete="off" required>
        <input class="phone-input" name="number" placeholder="Phone number" aria-label="Phone number" inputmode="tel" autocomplete="off" required>
        <button class="phone-go" type="submit">Add</button>
      </form>
      ${state.contacts.length
        ? `<div class="phone-list">
            ${state.contacts.map((contact, index) => `
              <div class="list-row">
                <button class="row-main" data-dial="${attr(contact.number)}">
                  <span class="avatar">${esc(initials(contact.name))}</span>
                  <span class="who"><b>${esc(contact.name)}</b><span>${esc(format(contact.number))}</span></span>
                </button>
                <button class="row-x" data-remove="${index}" aria-label="Remove ${attr(contact.name)}">✕</button>
              </div>`).join('')}
          </div>`
        : '<p class="phone-empty">No contacts yet — add one above and tap it to call.</p>'}`;

    view.querySelector('[data-add]').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const name = form.name.value.trim();
      const number = digits(form.number.value);
      if (!name || number.length < 3) return;
      state.contacts = [...state.contacts, { name, number }].sort((a, b) => a.name.localeCompare(b.name));
      write(CONTACTS_KEY, state.contacts);
      state.dial = number;
      draw();
    });

    view.querySelectorAll('[data-dial]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.dial = btn.dataset.dial;
        startCall(btn.dataset.dial);
      });
    });
    view.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.contacts = state.contacts.filter((_, index) => index !== Number(btn.dataset.remove));
        write(CONTACTS_KEY, state.contacts);
        draw();
      });
    });
  }

  function drawRecents() {
    view.innerHTML = `
      <div class="phone-head">
        <span>${state.recents.length ? `${state.recents.length} recent call${state.recents.length === 1 ? '' : 's'}` : 'Recent calls'}</span>
        ${state.recents.length ? '<button class="phone-clear" data-clear-recents>Clear</button>' : ''}
      </div>
      ${state.recents.length
        ? `<div class="phone-list">
            ${state.recents.map((call, index) => `
              <div class="list-row">
                <button class="row-main" data-dial="${attr(call.number)}">
                  <span class="avatar${call.secs ? '' : ' is-missed'}">${esc(initials(call.name || format(call.number)))}</span>
                  <span class="who">
                    <b>${esc(call.name || format(call.number))}</b>
                    <span>${call.name ? `${esc(format(call.number))} · ` : ''}${esc(when(call.at))}</span>
                  </span>
                  <span class="row-dur">${call.secs ? clock(call.secs) : 'No answer'}</span>
                </button>
                <button class="row-x" data-remove-call="${index}" aria-label="Remove call">✕</button>
              </div>`).join('')}
          </div>`
        : '<p class="phone-empty">No calls yet — dial a number or pick a contact.</p>'}`;

    const clear = view.querySelector('[data-clear-recents]');
    if (clear) {
      clear.addEventListener('click', () => {
        state.recents = [];
        write(RECENTS_KEY, state.recents);
        draw();
      });
    }
    view.querySelectorAll('[data-dial]').forEach((btn) => {
      btn.addEventListener('click', () => startCall(btn.dataset.dial));
    });
    view.querySelectorAll('[data-remove-call]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.recents = state.recents.filter((_, index) => index !== Number(btn.dataset.removeCall));
        write(RECENTS_KEY, state.recents);
        draw();
      });
    });
  }

  function draw() {
    drawTabs();
    if (state.view === 'contacts') drawContacts();
    else if (state.view === 'recents') drawRecents();
    else drawPad();
  }

  /* a physical keypad works too, while the Phone window is the active one */
  const win = body.closest('.window');
  document.addEventListener('keydown', (event) => {
    if (state.call || state.view !== 'pad') return;
    if (!body.isConnected || !win || !win.classList.contains('is-active')) return;
    const target = event.target;
    if (target && target.closest && target.closest('input, textarea, [contenteditable="true"]')) return;

    if (/^[0-9*#]$/.test(event.key)) { event.preventDefault(); pressKey(event.key); }
    else if (event.key === '+') { event.preventDefault(); pressKey('+'); }
    else if (event.key === 'Backspace') { event.preventDefault(); backspace(); }
    else if (event.key === 'Enter') { event.preventDefault(); placeCall(); }
    else if (event.key === 'Escape') { state.dial = ''; drawPad(); }
  });

  draw();
}

export const phone = {
  name: 'Phone',
  title: 'Phone — Calls',
  tile: 'tile-phone',
  desc: 'Dial, keep contacts and see recent calls.',
  render: renderPhone,
};
