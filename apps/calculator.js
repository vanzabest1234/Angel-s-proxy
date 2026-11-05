const KEYS = [
  ['%', 'CE', 'C', '⌫'],
  ['1/x', 'x²', '√', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['±', '0', '.', '='],
];

export function renderCalculator(body) {
  body.innerHTML = `
    <div class="calc">
      <div class="calc-screen">
        <span class="calc-expr" data-expr></span>
        <span class="calc-value" data-value>0</span>
      </div>
      <div class="calc-keys">
        ${KEYS.flat().map((key) => `<button class="calc-key${/[÷×−+=]/.test(key) ? ' is-op' : ''}${key === '=' ? ' is-eq' : ''}" data-key="${key}">${key}</button>`).join('')}
      </div>
    </div>`;

  const valueEl = body.querySelector('[data-value]');
  const exprEl = body.querySelector('[data-expr]');
  let entry = '0';
  let stored = null;
  let op = null;
  let fresh = true;

  const render = () => {
    valueEl.textContent = format(entry);
    exprEl.textContent = stored === null ? '' : `${format(String(stored))} ${op}`;
  };

  const format = (raw) => {
    if (!raw) return '0';
    const [whole, frac] = String(raw).split('.');
    const tidy = Number(whole || 0).toLocaleString();
    return frac === undefined ? tidy : `${tidy}.${frac}`;
  };

  const compute = (a, b, symbol) => {
    if (symbol === '+') return a + b;
    if (symbol === '−') return a - b;
    if (symbol === '×') return a * b;
    if (symbol === '÷') return b === 0 ? NaN : a / b;
    return b;
  };

  const digits = (char) => {
    if (fresh) { entry = char === '.' ? '0.' : char; fresh = false; }
    else if (char === '.') { if (!entry.includes('.')) entry += '.'; }
    else entry = entry === '0' ? char : entry + char;
  };

  const act = (key) => {
    if (/^[0-9.]$/.test(key)) return digits(key);

    if (key === 'C') {
      entry = '0'; stored = null; op = null; fresh = true; return;
    }
    if (key === 'CE') { entry = '0'; fresh = true; return; }
    if (key === '⌫') { entry = entry.length > 1 ? entry.slice(0, -1) : '0'; return; }
    if (key === '±') { entry = entry.startsWith('-') ? entry.slice(1) : `-${entry}`; return; }
    if (key === '%') { entry = String(Number(entry) / 100); return; }
    if (key === '1/x') { entry = String(1 / Number(entry)); return; }
    if (key === 'x²') { entry = String(Number(entry) ** 2); return; }
    if (key === '√') { entry = String(Math.sqrt(Number(entry))); return; }

    if (['+', '−', '×', '÷'].includes(key)) {
      if (stored !== null && op && !fresh) stored = compute(stored, Number(entry), op);
      else stored = Number(entry);
      op = key;
      fresh = true;
      return;
    }

    if (key === '=') {
      if (op === null) return;
      entry = String(compute(stored, Number(entry), op));
      stored = null;
      op = null;
      fresh = true;
    }
  };

  body.querySelectorAll('.calc-key').forEach((btn) => {
    btn.addEventListener('click', () => {
      act(btn.dataset.key);
      if (!Number.isFinite(Number(entry))) entry = 'Cannot divide by zero';
      render();
    });
  });

  render();
}

export const calculator = {
  name: 'Calculator',
  title: 'Calculator',
  tile: 'tile-calc',
  desc: 'Add, subtract and convert, like the Windows calculator.',
  render: renderCalculator,
};
