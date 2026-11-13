/* "Connect a phone line" panel — saves the Twilio details the server needs in
   order to place real calls. Values go straight to the server, never into the page. */

import { saveLine, clearLine } from './voice.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');

export function openVoicePanel(el, { voice, onClose, onSaved }) {
  const webhook = `${location.origin}/api/voice/twiml`;
  const live = Boolean(voice && voice.configured);

  const close = () => {
    el.hidden = true;
    el.className = 'phone-call';
    el.innerHTML = '';
    if (onClose) onClose();
  };

  el.className = 'phone-call phone-setup';
  el.hidden = false;
  el.innerHTML = `
    <div class="setup-head">
      <button class="setup-x" type="button" data-close aria-label="Close">✕</button>
      <p class="setup-kicker">Real calls</p>
      <h3 class="setup-title">${live ? `Line live · ${esc(voice.from)}` : 'Connect a phone line'}</h3>
      <p class="setup-copy">Angel&rsquo;s Line dials real numbers through your own Twilio account, over WebRTC. Your Twilio number is the caller ID.</p>
    </div>

    <ol class="setup-steps">
      <li>Buy a number in Twilio — that becomes your caller ID.</li>
      <li>Create an API Key: you get a Key SID and Secret.</li>
      <li>Create a TwiML App, Voice URL mode POST:</li>
    </ol>
    <div class="setup-hook">
      <code>${esc(webhook)}</code>
      <button class="setup-copy-btn" type="button" data-copy-hook>Copy</button>
    </div>

    <form class="setup-form" data-line-form autocomplete="off">
      <label class="setup-field"><span>Account SID</span>
        <input name="accountSid" placeholder="AC…" autocomplete="off" required></label>
      <label class="setup-field"><span>API Key SID</span>
        <input name="keySid" placeholder="SK…" autocomplete="off" required></label>
      <label class="setup-field"><span>API Key Secret</span>
        <input name="keySecret" type="password" placeholder="Your key secret" autocomplete="off" required></label>
      <label class="setup-field"><span>TwiML App SID</span>
        <input name="appSid" placeholder="AP…" autocomplete="off" required></label>
      <label class="setup-field"><span>Twilio number</span>
        <input name="from" type="tel" placeholder="+15551234567" autocomplete="off" required></label>
      <p class="setup-msg" data-message></p>
      <div class="setup-actions">
        <button class="setup-go" type="submit" data-save>Save line</button>
        <button class="setup-cancel" type="button" data-close>Close</button>
      </div>
      ${live ? '<button class="setup-drop" type="button" data-drop>Disconnect this line</button>' : ''}
    </form>`;

  const message = (text) => {
    const el2 = el.querySelector('[data-message]');
    if (el2) el2.textContent = text;
  };

  el.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', close));

  el.querySelector('[data-copy-hook]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(webhook);
      message('Webhook URL copied — paste it as the TwiML App Voice URL.');
    } catch {
      message('Could not copy — select the URL and copy it.');
    }
  });

  const form = el.querySelector('[data-line-form]');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const save = form.querySelector('[data-save]');
    const data = Object.fromEntries(new FormData(form).entries());
    save.disabled = true;
    save.textContent = 'Saving…';
    message('Checking the line with Twilio…');
    try {
      const status = await saveLine(data);
      if (onSaved) onSaved(status);
    } catch (err) {
      message(err.message || 'Could not save the line.');
      save.disabled = false;
      save.textContent = 'Save line';
    }
  });

  const drop = el.querySelector('[data-drop]');
  if (drop) {
    drop.addEventListener('click', async () => {
      drop.disabled = true;
      message('Disconnecting…');
      try {
        const status = await clearLine();
        if (onSaved) onSaved(status);
      } catch (err) {
        message(err.message || 'Could not disconnect the line.');
        drop.disabled = false;
      }
    });
  }
}
