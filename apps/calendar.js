const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export function renderCalendar(body) {
  body.innerHTML = `
    <div class="calendar">
      <div class="cal-bar">
        <div>
          <h1 data-month></h1>
          <p class="muted" data-sub></p>
        </div>
        <div class="cal-nav">
          <button class="cal-btn" data-step="-1" aria-label="Previous month">&#8249;</button>
          <button class="cal-btn cal-today" data-today>Today</button>
          <button class="cal-btn" data-step="1" aria-label="Next month">&#8250;</button>
        </div>
      </div>
      <div class="cal-grid cal-weekdays">
        ${DAYS.map((day) => `<span>${day}</span>`).join('')}
      </div>
      <div class="cal-grid" data-days></div>
      <p class="cal-note" data-note></p>
    </div>`;

  const today = new Date();
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  let picked = null;

  const monthEl = body.querySelector('[data-month]');
  const subEl = body.querySelector('[data-sub]');
  const daysEl = body.querySelector('[data-days]');
  const noteEl = body.querySelector('[data-note]');

  const draw = () => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const prevTotal = new Date(year, month, 0).getDate();
    const cells = [];
    const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

    monthEl.textContent = `${MONTHS[month]} ${year}`;
    subEl.textContent = `${total} days · starts on a ${DAYS[first]}`;

    for (let i = first - 1; i >= 0; i -= 1) {
      cells.push({ day: prevTotal - i, outside: true });
    }
    for (let day = 1; day <= total; day += 1) {
      cells.push({ day, outside: false });
    }
    const trailing = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= trailing; day += 1) {
      cells.push({ day, outside: true });
    }

    daysEl.innerHTML = cells
      .map((cell) => {
        const isToday = !cell.outside && isThisMonth && cell.day === today.getDate();
        const isPicked = !cell.outside && picked === cell.day;
        return `<button class="cal-day${cell.outside ? ' is-outside' : ''}${isToday ? ' is-today' : ''}${isPicked ? ' is-picked' : ''}" data-day="${cell.day}" data-outside="${cell.outside}">${cell.day}</button>`;
      })
      .join('');

    daysEl.querySelectorAll('.cal-day').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.outside === 'true') return;
        picked = Number(btn.dataset.day);
        const label = new Date(year, month, picked).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
        noteEl.textContent = `Selected ${label}`;
        draw();
      });
    });

    if (!picked) noteEl.textContent = `Today is ${today.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.`;
  };

  body.querySelectorAll('[data-step]').forEach((btn) => {
    btn.addEventListener('click', () => {
      view = new Date(view.getFullYear(), view.getMonth() + Number(btn.dataset.step), 1);
      picked = null;
      draw();
    });
  });

  body.querySelector('[data-today]').addEventListener('click', () => {
    view = new Date(today.getFullYear(), today.getMonth(), 1);
    picked = null;
    draw();
  });

  draw();
}

export const calendar = {
  name: 'Calendar',
  title: 'Calendar',
  tile: 'tile-calendar',
  desc: 'A month view of the year, with today highlighted.',
  render: renderCalendar,
};
