const vscode = acquireVsCodeApi();
const player = document.querySelector('#video-player');
const nowPlayingName = document.querySelector('#now-playing-name');
const playerStatus = document.querySelector('#player-status');
const playlist = document.querySelector('#playlist');
const addVideosButton = document.querySelector('#add-videos');

addVideosButton?.addEventListener('click', () => {
  vscode.postMessage({ type: 'addVideos' });
});

playlist?.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');

  if (!target) {
    return;
  }

  if (target.dataset.action === 'remove') {
    vscode.postMessage({ type: 'removeVideo', uri: target.dataset.uri });
    return;
  }

  if (target.dataset.action === 'select') {
    selectVideo(target);
  }
});

player?.addEventListener('error', () => {
  playerStatus.textContent = 'This video format could not be played by VS Code.';
});

player?.addEventListener('playing', () => {
  playerStatus.textContent = '';
});

function selectVideo(button) {
  if (!player) {
    return;
  }

  document.querySelectorAll('.video-button').forEach((item) => {
    const isSelected = item === button;
    item.classList.toggle('is-active', isSelected);
    item.setAttribute('aria-current', String(isSelected));
  });

  playerStatus.textContent = '';
  nowPlayingName.textContent = button.dataset.videoName;
  player.src = button.dataset.videoSrc;
  player.load();
  player.play().catch(() => {
    playerStatus.textContent = 'Press play to start this video.';
  });

  vscode.postMessage({ type: 'selectVideo', uri: button.dataset.uri });
}
