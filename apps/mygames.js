/* Games made by me — the shelf of my own games.
   Add a game here and it shows up as a choice:
   { id: 'snake', name: 'Snake', desc: 'Eat the dots, dodge yourself.', tile: 'tile-mygames' } */
const GAMES = [];

function renderMyGames(body) {
  body.innerHTML = `
    <div class="mygames">
      <h1>Games made by me</h1>
      <p class="muted">Pick a game to play.</p>
      ${GAMES.length
        ? `<div class="mygames-grid">${GAMES.map((game) => `
            <article class="mygames-card">
              <span class="tile ${game.tile || 'tile-mygames'}" aria-hidden="true"></span>
              <h2>${game.name}</h2>
              <p>${game.desc}</p>
            </article>`).join('')}</div>`
        : `<div class="mygames-empty">No games yet — the games I make will show up here as choices.</div>`}
    </div>`;
}

export const mygames = {
  name: 'Games made by me',
  title: 'Games made by me',
  tile: 'tile-mygames',
  desc: 'My own games, all in one place.',
  render: renderMyGames,
};
