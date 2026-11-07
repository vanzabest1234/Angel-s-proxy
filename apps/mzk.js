const PAGE = './mzk.html';

function renderMzk(body) {
  body.innerHTML = `
    <div class="proxy">
      <div class="proxy-view is-frame">
        <iframe class="proxy-frame" title="Your own music" src="${PAGE}"></iframe>
      </div>
    </div>`;
}

export const mzk = {
  name: 'Your own music',
  title: 'Your own music',
  tile: 'tile-mzk',
  desc: 'Your own local music library.',
  render: renderMzk,
};
