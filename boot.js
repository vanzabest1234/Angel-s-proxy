const screen = document.getElementById('boot-screen');

if (screen) {
  const log = document.getElementById('boot-log');
  const percentEl = document.getElementById('boot-percent');

  const STEPS = [
    ['Checking for updates', 'done'],
    ['Downloading KB5039302 (24H2)', '312 MB'],
    ['Preparing to install', 'done'],
    ['Installing update 1 of 3', '33%'],
    ['Installing update 2 of 3', '66%'],
    ['Installing update 3 of 3', 'done'],
    ['Cleaning up temporary files', 'done'],
    ['Starting Angel\'s Windows', 'ready'],
  ];

  let step = 0;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    screen.style.setProperty('--boot-progress', '100');
    percentEl.textContent = '100%';
    screen.classList.add('is-done');
    screen.addEventListener('transitionend', () => screen.remove(), { once: true });
    setTimeout(() => screen.remove(), 900);
  };

  const next = () => {
    if (finished) return;
    if (step >= STEPS.length) { finish(); return; }

    const [text, status] = STEPS[step];
    const line = document.createElement('li');
    if (status === 'done' || status === 'ready') line.className = 'is-ok';
    const label = document.createElement('span');
    label.textContent = text;
    const value = document.createElement('em');
    value.textContent = status;
    line.append(label, value);
    log.append(line);

    step += 1;
    const percent = Math.round((step / STEPS.length) * 100);
    percentEl.textContent = `${percent}%`;
    screen.style.setProperty('--boot-progress', String(percent));

    setTimeout(next, 460 + step * 30);
  };

  setTimeout(next, 300);
  screen.addEventListener('click', finish);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' || event.key === 'Enter') finish();
  });
}
