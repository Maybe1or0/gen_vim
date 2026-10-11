const vscode = acquireVsCodeApi();
const player = document.querySelector('#video-player');
const playerStatus = document.querySelector('#player-status');
const addVideosButton = document.querySelector('#add-videos');

addVideosButton?.addEventListener('click', () => {
  vscode.postMessage({ type: 'addVideos' });
});

player?.addEventListener('error', () => {
  playerStatus.textContent = 'This video format could not be played by VS Code.';
  playerStatus.classList.add('is-visible');
});

player?.addEventListener('playing', () => {
  playerStatus.textContent = '';
  playerStatus.classList.remove('is-visible');
});

player?.addEventListener('ended', () => {
  vscode.postMessage({ type: 'nextVideo' });
});

if (player?.dataset.autoplay === 'true') {
  player.play().catch(() => {
    playerStatus.textContent = 'Click the video to start playback.';
    playerStatus.classList.add('is-visible');
  });
}
