/* Account gate for Angel's Proxy — sign in or create an account before the
   desktop opens. Sessions are server-side cookies, see server/auth.mjs. */

const gate = document.getElementById('gate');
const form = document.getElementById('gate-form');
const title = document.getElementById('gate-title');
const sub = document.getElementById('gate-sub');
const errorEl = document.getElementById('gate-error');
const goBtn = document.getElementById('gate-go');
const switchBtn = document.getElementById('gate-switch');
const switchLabel = document.getElementById('gate-switch-label');
const nameField = document.getElementById('gate-name-field');
const nameInput = document.getElementById('gate-name');
const emailInput = document.getElementById('gate-email');
const passwordInput = document.getElementById('gate-password');
const userLabel = document.querySelector('[data-user-name]');
const userAvatar = document.querySelector('[data-user-avatar]');
const signOutBtn = document.getElementById('sign-out');

let mode = 'login';

const api = (path, body) => fetch(`api/${path}`, {
  method: body ? 'POST' : 'GET',
  headers: body ? { 'content-type': 'application/json' } : undefined,
  body: body ? JSON.stringify(body) : undefined,
}).then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => ({})) }));

function setMode(next) {
  mode = next;
  const signup = mode === 'signup';
  title.textContent = signup ? 'Create your account' : 'Sign in';
  sub.textContent = signup
    ? 'One account for this desktop — stored on this machine.'
    : 'Use your account to open the desktop.';
  goBtn.textContent = signup ? 'Create account' : 'Sign in';
  switchLabel.textContent = signup ? 'Already have an account?' : 'New here?';
  switchBtn.textContent = signup ? 'Sign in instead' : 'Create an account';
  nameField.hidden = !signup;
  nameInput.required = signup;
  passwordInput.autocomplete = signup ? 'new-password' : 'current-password';
  errorEl.textContent = '';
}

function unlock(user) {
  const name = (user.name || 'Angel').trim() || 'Angel';
  userLabel.textContent = name;
  userAvatar.textContent = name[0].toUpperCase();
  document.body.classList.remove('is-locked');
  gate.hidden = true;
}

switchBtn.addEventListener('click', () => setMode(mode === 'signup' ? 'login' : 'signup'));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorEl.textContent = '';

  const payload = {
    email: emailInput.value.trim(),
    password: passwordInput.value,
  };
  if (mode === 'signup') payload.name = nameInput.value.trim();

  if (!payload.email || !payload.password) {
    errorEl.textContent = 'Enter your email and a password.';
    return;
  }
  if (payload.password.length < 6) {
    errorEl.textContent = 'Passwords need at least 6 characters.';
    return;
  }

  goBtn.disabled = true;
  const { ok, data } = await api(`auth/${mode === 'signup' ? 'signup' : 'login'}`, payload);
  goBtn.disabled = false;

  if (!ok) {
    errorEl.textContent = data.error || 'That did not work — try again.';
    return;
  }

  form.reset();
  unlock(data.user);
});

signOutBtn.addEventListener('click', async () => {
  await api('auth/logout', {});
  window.location.reload();
});

setMode('login');

api('auth/me').then(({ ok, data }) => {
  if (ok && data.user) unlock(data.user);
});
