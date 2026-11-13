/* Real calls — Twilio Voice over WebRTC.
   The server mints a short-lived access token from the saved line, the TwiML app
   bridges the call to the public phone network, so a real number rings. */

const SDK_SRC = 'https://cdn.jsdelivr.net/npm/@twilio/voice-sdk@2.18.5/dist/twilio.min.js';
const ID_KEY = 'angel.phone.identity';

let devicePromise = null;
let activeCall = null;
let deviceError = '';
let activeHandlers = null;

export async function voiceStatus() {
  try {
    const res = await fetch('./api/voice/status', { cache: 'no-store' });
    if (!res.ok) return { configured: false, from: '' };
    const data = await res.json();
    return { configured: Boolean(data.configured), from: data.from || '' };
  } catch {
    return { configured: false, from: '' };
  }
}

export async function saveLine(line) {
  const res = await fetch('./api/voice/config', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(line),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not save the line.');
  devicePromise = null;
  return { configured: Boolean(data.configured), from: data.from || '' };
}

export async function clearLine() {
  const res = await fetch('./api/voice/config', { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  devicePromise = null;
  return { configured: Boolean(data.configured), from: data.from || '' };
}

function identity() {
  let id = '';
  try { id = localStorage.getItem(ID_KEY) || ''; } catch { /* storage blocked */ }
  if (!id) {
    id = `angel-${Math.random().toString(36).slice(2, 10)}`;
    try { localStorage.setItem(ID_KEY, id); } catch { /* storage blocked */ }
  }
  return id;
}

async function fetchToken() {
  const res = await fetch('./api/voice/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identity: identity() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) throw new Error(data.error || 'Real calling is not connected yet.');
  return data.token;
}

/* The SDK's official browser bundle — loaded once, on the first real call. */
function loadSdk() {
  if (window.Twilio && window.Twilio.Device) return Promise.resolve(window.Twilio.Device);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Twilio && window.Twilio.Device) resolve(window.Twilio.Device);
      else reject(new Error('The calling SDK did not load.'));
    };
    script.onerror = () => reject(new Error('Could not download the calling SDK — check the connection.'));
    document.head.append(script);
  });
}

async function device() {
  if (devicePromise) {
    const dev = await devicePromise;
    if (dev.state !== 'registered') await dev.register();
    return dev;
  }
  devicePromise = (async () => {
    const [Device, token] = await Promise.all([loadSdk(), fetchToken()]);
    const dev = new Device(token);
    dev.on('error', (err) => {
      deviceError = (err && (err.message || err.code)) || 'The line reported an error.';
      if (activeHandlers && activeHandlers.failed) activeHandlers.failed(deviceError);
    });
    dev.on('tokenWillExpire', () => {
      fetchToken().then((token) => dev.updateToken(token)).catch(() => { /* the next call renews it */ });
    });
    await dev.register();
    return dev;
  })().catch((err) => {
    devicePromise = null;
    throw err;
  });
  devicePromise.catch(() => { /* the caller handles it */ });
  return devicePromise;
}

/* Twilio can take a while to hand out a registration; if it never answers,
   say so instead of ringing forever. */
async function readyDevice() {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      devicePromise = null;
      reject(new Error('The line did not answer — check the Twilio keys and the TwiML app URL.'));
    }, 12000);
  });
  try {
    return await Promise.race([device(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/* Places a real call. Resolves once the device has been asked to connect;
   the handlers report the call's own progress. */
async function failureReason(err) {
  if (err && err.message) return err.message;
  /* Twilio reports a rejected token a beat after the call itself fails. */
  if (!deviceError) await new Promise((resolve) => setTimeout(resolve, 700));
  return deviceError
    ? `The line refused the call: ${deviceError}`
    : 'The line could not connect — check the Twilio keys and the TwiML app URL.';
}

export async function dialReal(number, handlers = {}) {
  deviceError = '';
  activeHandlers = handlers;

  let dev = null;
  try {
    dev = await readyDevice();
  } catch (err) {
    activeHandlers = null;
    throw new Error(await failureReason(err));
  }

  /* If the signaling never comes back, stop pretending the phone is ringing. */
  let timer = null;
  const stall = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('The call did not connect — check the line settings.')), 15000);
  });

  let call = null;
  try {
    call = await Promise.race([dev.connect({ params: { To: number } }), stall]);
  } catch (err) {
    const reason = await failureReason(err);
    activeHandlers = null;
    throw new Error(reason);
  } finally {
    clearTimeout(timer);
  }

  activeCall = call;
  const done = () => {
    activeCall = null;
    activeHandlers = null;
    if (handlers.ended) handlers.ended();
  };
  call.on('accept', () => handlers.connected && handlers.connected());
  call.on('disconnect', done);
  call.on('cancel', done);
  call.on('reject', done);
  call.on('error', (err) => {
    activeCall = null;
    activeHandlers = null;
    if (handlers.failed) handlers.failed((err && err.message) || 'The call could not connect.');
  });
  return call;
}

export function muteReal(on) {
  if (!activeCall) return;
  try { activeCall.mute(Boolean(on)); } catch { /* call already finished */ }
}

export function hangUp() {
  if (!activeCall) return;
  const call = activeCall;
  activeCall = null;
  try { call.disconnect(); } catch { /* already gone */ }
}
