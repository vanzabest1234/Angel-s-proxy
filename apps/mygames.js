/* Games made by me — the shelf of my own games.
   Add a game here and it shows up as a choice: { id, name, desc, page } */
const GAMES = [
  {
    id: 'retrobowl',
    name: 'Retro Bowl',
    desc: 'Pixel football — run, pass and score.',
    page: './retrobowl.html',
  },
];

function renderMyGames(body) {
  body.innerHTML = `
    <div class="mygames">
      <h1>Games made by me</h1>
      <p class="muted">Pick a game to play.</p>
      ${GAMES.length
        ? `<div class="mygames-grid">${GAMES.map((game) => `
            <button class="mygames-card" type="button" data-game="${game.id}">
              <span class="tile tile-mygames" aria-hidden="true"></span>
              <h2>${game.name}</h2>
              <p>${game.desc}</p>
            </button>`).join('')}</div>`
        : `<div class="mygames-empty">No games yet — the games I make will show up here as choices.</div>`}
    </div>`;

  body.querySelectorAll('[data-game]').forEach((card) => {
    card.addEventListener('click', (event) => {
      event.stopPropagation();
      const game = GAMES.find((g) => g.id === card.dataset.game);
      if (game) openGame(body, game);
    });
  });
}

function openGame(body, game) {
  body.innerHTML = `
    <div class="mygames-game">
      <div class="mygames-bar">
        <button class="mygames-back" type="button">← All games</button>
        <span>${game.name}</span>
      </div>
      <iframe class="mygames-frame" title="${game.name}" src="${game.page}"></iframe>
    </div>`;
  body.querySelector('.mygames-back').addEventListener('click', (event) => {
    event.stopPropagation();
    renderMyGames(body);
  });
}

export const mygames = {
  name: 'Games made by me',
  title: 'Games made by me',
  tile: 'tile-mygames',
  desc: 'My own games, all in one place.',
  render: renderMyGames,
};
