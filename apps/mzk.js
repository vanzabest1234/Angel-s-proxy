const PAGE = './mzk.html';

function renderMzk(body) {
  body.innerHTML = `
    <div class="proxy">
      <div class="proxy-view is-frame">
        <iframe class="proxy-frame" title="MZK Player" src="${PAGE}"></iframe>
      </div>
    </div>`;
}

export const mzk = {
  name: 'MZK Player',
  title: 'MZK Player',
  tile: 'tile-mzk',
  desc: 'Your own local music library.',
  render: renderMzk,
};
