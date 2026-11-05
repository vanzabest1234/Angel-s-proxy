const PROVIDERS = [
  {
    id: 'claude',
    name: 'Claude',
    maker: 'Anthropic',
    mark: 'Cl',
    grad: 'linear-gradient(150deg, #f6c3a8, #d97757 55%, #a24a2c)',
    models: ['Claude Sonnet 4.5', 'Claude Opus 4.1', 'Claude Haiku 3.5'],
    note: 'Claude is Anthropic’s assistant — careful reasoning, long documents and tidy code.',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    maker: 'OpenAI',
    mark: 'Gpt',
    grad: 'linear-gradient(150deg, #5eead4, #10a37f 55%, #0b6b55)',
    models: ['GPT-5', 'GPT-4.1', 'o4-mini'],
    note: 'ChatGPT is OpenAI’s assistant — a broad all-rounder for writing, code and images.',
  },
  {
    id: 'grok',
    name: 'Grok',
    maker: 'xAI',
    mark: 'Gr',
    grad: 'linear-gradient(150deg, #8a939f, #2b3138 60%, #111318)',
    models: ['Grok 4', 'Grok 3', 'Grok 3 Mini'],
    note: 'Grok is xAI’s assistant — fast, blunt answers with a live look at the web.',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    maker: 'Google',
    mark: 'Ge',
    grad: 'linear-gradient(150deg, #8ab4f8, #4285f4 55%, #1a56c4)',
    models: ['Gemini 2.5 Pro', 'Gemini 2.5 Flash', 'Gemini 2.0 Flash'],
    note: 'Gemini is Google’s assistant — strong on research, images and long context.',
  },
  {
    id: 'copilot',
    name: 'Copilot',
    maker: 'Microsoft',
    mark: 'Co',
    grad: 'linear-gradient(150deg, #ffb3e6, #8b5cf6 55%, #3b1e8f)',
    models: ['Copilot', 'Copilot Think Deeper', 'Copilot Vision'],
    note: 'Copilot is Microsoft’s assistant — Office, Windows and everyday questions.',
  },
  {
    id: 'llama',
    name: 'Llama',
    maker: 'Meta',
    mark: 'Ll',
    grad: 'linear-gradient(150deg, #74b6ff, #0866ff 58%, #0a3fa8)',
    models: ['Llama 4 Maverick', 'Llama 4 Scout', 'Llama 3.3 70B'],
    note: 'Llama is Meta’s open model family — chat, summarising and code you can host yourself.',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    maker: 'DeepSeek',
    mark: 'Ds',
    grad: 'linear-gradient(150deg, #9fb4ff, #4d6bfe 58%, #2436b8)',
    models: ['DeepSeek V3.2', 'DeepSeek R1', 'DeepSeek Coder'],
    note: 'DeepSeek specialises in maths and code, with a reasoning model that shows its steps.',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    maker: 'Mistral AI',
    mark: 'Mi',
    grad: 'linear-gradient(150deg, #ffd06b, #fa520f 60%, #b83208)',
    models: ['Mistral Large', 'Mistral Small', 'Codestral'],
    note: 'Mistral is the European challenger — quick, cheap models with a coding specialist.',
  },
];

const greet = (provider, model) =>
  `Hi — I’m ${provider.name} (${model}). ${provider.note}\n\nPick another assistant on the left whenever you like; this conversation comes with you.`;

const demoReply = (provider, model, text) => {
  const ask = text.length > 100 ? `${text.slice(0, 100)}…` : text;
  return `You asked: “${ask}”\n\nThis is a demo reply on the ${provider.name} card, running ${model}. Connect a ${provider.maker} API key and this window will fetch a real answer from ${provider.name} instead.`;
};

export function renderAi(body) {
  body.innerHTML = `
    <div class="ai">
      <aside class="ai-rail">
        <div class="ai-rail-head"><strong>AI assistants</strong><span>${PROVIDERS.length} included</span></div>
        <div class="ai-list">
          ${PROVIDERS.map(
            (p) => `<button class="ai-pick" data-provider="${p.id}" type="button">
              <span class="ai-logo" style="background:${p.grad}">${p.mark}</span>
              <span><strong>${p.name}</strong><em>${p.maker} · ${p.models.length} models</em></span>
            </button>`
          ).join('')}
        </div>
      </aside>
      <section class="ai-chat">
        <header class="ai-head">
          <span class="ai-logo" data-logo></span>
          <div><strong data-name></strong><em data-maker></em></div>
          <label class="ai-model"><span>Model</span><select data-model></select></label>
          <button class="ai-new" type="button" data-new>New chat</button>
        </header>
        <div class="ai-thread" data-thread role="log" aria-label="Conversation"></div>
        <form class="ai-composer" data-form>
          <textarea data-input rows="1" placeholder="Ask anything…" aria-label="Message"></textarea>
          <button class="ai-send" type="submit">Send</button>
        </form>
      </section>
    </div>`;

  const thread = body.querySelector('[data-thread]');
  const input = body.querySelector('[data-input]');
  const form = body.querySelector('[data-form]');
  const modelSel = body.querySelector('[data-model]');
  const logo = body.querySelector('[data-logo]');
  const nameEl = body.querySelector('[data-name]');
  const makerEl = body.querySelector('[data-maker]');

  let active = PROVIDERS[0];
  let busy = false;

  const scroll = () => { thread.scrollTop = thread.scrollHeight; };

  const notice = () => {
    const el = document.createElement('p');
    el.className = 'ai-demo';
    el.textContent = 'Demo mode — replies are placeholders. Add a provider API key for live answers.';
    thread.append(el);
  };

  const say = (role, text) => {
    const el = document.createElement('div');
    el.className = `ai-msg is-${role}`;
    el.innerHTML = role === 'user'
      ? '<span class="ai-avatar">A</span><div class="ai-bubble"></div>'
      : `<span class="ai-logo" style="background:${active.grad}">${active.mark}</span><div class="ai-bubble"></div>`;
    el.querySelector('.ai-bubble').textContent = text;
    thread.append(el);
    scroll();
    return el;
  };

  const divider = (text) => {
    const el = document.createElement('p');
    el.className = 'ai-switch';
    el.textContent = text;
    thread.append(el);
  };

  const hello = () => {
    say('ai', greet(active, modelSel.value));
  };

  const select = (id, announce) => {
    active = PROVIDERS.find((p) => p.id === id) || PROVIDERS[0];
    localStorage.setItem('angel.ai', active.id);
    logo.style.background = active.grad;
    logo.textContent = active.mark;
    nameEl.textContent = active.name;
    makerEl.textContent = active.maker;
    modelSel.innerHTML = active.models.map((m) => `<option>${m}</option>`).join('');
    body.querySelectorAll('.ai-pick').forEach((btn) => {
      btn.classList.toggle('is-on', btn.dataset.provider === active.id);
    });

    if (announce) {
      divider(`Switched to ${active.name} · ${modelSel.value}`);
      hello();
      scroll();
    }
  };

  const reset = () => {
    thread.innerHTML = '';
    notice();
    hello();
    scroll();
  };

  body.querySelectorAll('.ai-pick').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.provider !== active.id) select(btn.dataset.provider, true);
    });
  });

  modelSel.addEventListener('change', () => divider(`Now using ${active.name} · ${modelSel.value}`));

  body.querySelector('[data-new]').addEventListener('click', reset);

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 96)}px`;
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;

    say('user', text);
    input.value = '';
    input.style.height = 'auto';
    busy = true;

    const typing = document.createElement('div');
    typing.className = 'ai-msg is-ai';
    typing.innerHTML = `<span class="ai-logo" style="background:${active.grad}">${active.mark}</span><div class="ai-bubble ai-typing">Thinking…</div>`;
    thread.append(typing);
    scroll();

    setTimeout(() => {
      typing.remove();
      say('ai', demoReply(active, modelSel.value, text));
      busy = false;
    }, 600);
  });

  select(localStorage.getItem('angel.ai') || PROVIDERS[0].id, false);
  reset();
}

export const ai = {
  name: 'AI Studio',
  title: 'AI Studio — Pick your assistant',
  tile: 'tile-ai',
  desc: 'Chat with Claude, ChatGPT, Grok, Gemini and five more — switch any time.',
  render: renderAi,
};
