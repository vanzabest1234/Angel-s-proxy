const HELP = [
  'ls              list the files in this PC',
  'cat <file>      print a file',
  'open <app>      launch an app by name',
  'echo <text>     print text back',
  'date            the current date and time',
  'whoami          who is signed in',
  'clear           empty the window',
  'help            this list',
];

export function renderTerminal(body, ctx) {
  body.innerHTML = `
    <div class="terminal">
      <div class="term-out" data-out></div>
      <form class="term-line">
        <span class="term-prompt">angel@windows:~$</span>
        <input class="term-input" aria-label="Command" autocomplete="off" spellcheck="false" autofocus>
      </form>
    </div>`;

  const out = body.querySelector('[data-out]');
  const form = body.querySelector('.term-line');
  const input = body.querySelector('.term-input');
  const history = [];
  let cursor = -1;

  const write = (text, tone) => {
    const line = document.createElement('div');
    line.className = `term-row${tone ? ` is-${tone}` : ''}`;
    line.textContent = text;
    out.append(line);
    out.scrollTop = out.scrollHeight;
  };

  const run = async (raw) => {
    const line = raw.trim();
    if (!line) return;
    history.push(line);
    cursor = history.length;
    write(`angel@windows:~$ ${line}`, 'echo');

    const [command, ...rest] = line.split(/\s+/);
    const argument = rest.join(' ');

    switch (command.toLowerCase()) {
      case 'help':
        HELP.forEach((row) => write(row));
        break;

      case 'clear':
        out.innerHTML = '';
        break;

      case 'date':
        write(new Date().toString());
        break;

      case 'whoami':
        write('angel');
        break;

      case 'echo':
        write(argument);
        break;

      case 'ls': {
        const files = await fetch('/api/files', { cache: 'no-store' }).then((res) => res.json());
        files.forEach((file) => write(`${file.dir ? 'd' : '-'} ${file.path}`));
        break;
      }

      case 'cat': {
        if (!argument) { write('cat: which file? try ls', 'warn'); break; }
        const file = await fetch(`/api/file?path=${encodeURIComponent(argument)}`).then((res) => res.json());
        if (file.error) { write(`cat: ${argument}: no such file`, 'warn'); break; }
        if (file.binary) { write(`cat: ${argument}: binary file`, 'warn'); break; }
        String(file.content).split('\n').slice(0, 200).forEach((row) => write(row));
        break;
      }

      case 'open': {
        if (!argument) { write('open: which app? try help', 'warn'); break; }
        const key = Object.keys(ctx.appsList).find((id) => id === argument.toLowerCase()
          || ctx.appsList[id].name.toLowerCase() === argument.toLowerCase());
        if (!key) { write(`open: no app called ${argument}`, 'warn'); break; }
        ctx.openApp(key);
        write(`Launching ${ctx.appsList[key].name}…`, 'ok');
        break;
      }

      default:
        write(`${command}: command not found — try help`, 'warn');
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value;
    input.value = '';
    run(value);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    if (event.key === 'ArrowUp' && cursor > 0) cursor -= 1;
    if (event.key === 'ArrowDown' && cursor < history.length) cursor += 1;
    input.value = history[cursor] || '';
  });

  write("Angel's Windows terminal — type help to see what works.");
  setTimeout(() => input.focus(), 60);
}

export const terminal = {
  name: 'Terminal',
  title: 'Terminal',
  tile: 'tile-terminal',
  desc: 'A small command line for this PC.',
  render: renderTerminal,
};
