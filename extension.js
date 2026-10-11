const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');

const CUSTOM_VIDEOS_KEY = 'genvim.customVideos';
const VIEW_ID = 'genvim.videoView';
const VIDEO_FILTERS = {
  Videos: ['mp4', 'webm', 'ogg', 'ogv', 'm4v', 'mov'],
};

class GenVimViewProvider {
  constructor(context) {
    this.context = context;
    this.extensionUri = context.extensionUri;
    this.view = undefined;
    this.selectedVideo = undefined;
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'addVideos':
            await this.addVideos();
            break;
          case 'removeVideo':
            await this.removeVideo(message.uri);
            break;
          case 'selectVideo':
            this.selectedVideo = message.uri;
            break;
        }
      },
      undefined,
      this.context.subscriptions,
    );

    this.render();
  }

  async addVideos() {
    const selectedFiles = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: true,
      filters: VIDEO_FILTERS,
      openLabel: 'Add to GENVIM',
      title: 'Choose focus videos',
    });

    if (!selectedFiles?.length) {
      return;
    }

    const currentVideos = this.getCustomVideoUris();
    const knownVideos = new Set(currentVideos.map((uri) => uri.toString()));
    const addedVideos = selectedFiles.filter((uri) => !knownVideos.has(uri.toString()));

    if (!addedVideos.length) {
      void vscode.window.showInformationMessage('Those videos are already in GENVIM.');
      return;
    }

    const updatedVideos = [...currentVideos, ...addedVideos];
    await this.context.globalState.update(
      CUSTOM_VIDEOS_KEY,
      updatedVideos.map((uri) => uri.toString()),
    );
    this.selectedVideo = addedVideos[0].toString();
    this.render();

    const noun = addedVideos.length === 1 ? 'video' : 'videos';
    void vscode.window.showInformationMessage(`Added ${addedVideos.length} ${noun} to GENVIM.`);
  }

  async removeVideo(uriValue) {
    if (typeof uriValue !== 'string') {
      return;
    }

    const currentVideos = this.getCustomVideoUris();
    const updatedVideos = currentVideos.filter((uri) => uri.toString() !== uriValue);

    if (updatedVideos.length === currentVideos.length) {
      return;
    }

    await this.context.globalState.update(
      CUSTOM_VIDEOS_KEY,
      updatedVideos.map((uri) => uri.toString()),
    );

    if (this.selectedVideo === uriValue) {
      this.selectedVideo = undefined;
    }

    this.render();
  }

  async clearCustomVideos() {
    if (!this.getCustomVideoUris().length) {
      void vscode.window.showInformationMessage('GENVIM has no custom videos to clear.');
      return;
    }

    const choice = await vscode.window.showWarningMessage(
      'Remove all custom videos from GENVIM? The original files will not be deleted.',
      { modal: true },
      'Remove All',
    );

    if (choice !== 'Remove All') {
      return;
    }

    await this.context.globalState.update(CUSTOM_VIDEOS_KEY, []);
    this.selectedVideo = undefined;
    this.render();
  }

  getCustomVideoUris() {
    const storedVideos = this.context.globalState.get(CUSTOM_VIDEOS_KEY, []);

    return storedVideos
      .filter((value) => typeof value === 'string')
      .map((value) => vscode.Uri.parse(value))
      .filter((uri) => uri.scheme === 'file' && fs.existsSync(uri.fsPath));
  }

  getVideos() {
    const builtInVideos = [1, 3, 4, 5]
      .map((number) => ({
        name: `GENVIM ${number}`,
        uri: vscode.Uri.joinPath(
          this.extensionUri,
          'genvimSetup',
          'brainrotvideos',
          `brainrot${number}.mp4`,
        ),
        isCustom: false,
      }))
      .filter((video) => fs.existsSync(video.uri.fsPath));

    const customVideos = this.getCustomVideoUris().map((uri) => ({
      name: path.parse(uri.fsPath).name,
      uri,
      isCustom: true,
    }));

    return [...builtInVideos, ...customVideos];
  }

  getLocalResourceRoots() {
    const customFolders = this.getCustomVideoUris().map((uri) => vscode.Uri.file(path.dirname(uri.fsPath)));
    const roots = [this.extensionUri, ...customFolders];
    const uniqueRoots = new Map(roots.map((uri) => [uri.toString(), uri]));
    return [...uniqueRoots.values()];
  }

  render() {
    if (!this.view) {
      return;
    }

    const webview = this.view.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: this.getLocalResourceRoots(),
    };
    webview.html = this.getHtml(webview);
  }

  getHtml(webview) {
    const videos = this.getVideos();
    const selectedVideo = videos.some((video) => video.uri.toString() === this.selectedVideo)
      ? this.selectedVideo
      : videos[0]?.uri.toString();
    this.selectedVideo = selectedVideo;

    const selected = videos.find((video) => video.uri.toString() === selectedVideo);
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'sidebar.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'sidebar.js'));
    const nonce = getNonce();

    const playlist = videos
      .map((video, index) => {
        const uriValue = video.uri.toString();
        const source = webview.asWebviewUri(video.uri).toString();
        const isSelected = uriValue === selectedVideo;
        const removeButton = video.isCustom
          ? `<button class="remove-button" type="button" data-action="remove" data-uri="${escapeHtml(uriValue)}" aria-label="Remove ${escapeHtml(video.name)}" title="Remove from GENVIM">&times;</button>`
          : '';

        return `<li class="video-row">
          <button class="video-button${isSelected ? ' is-active' : ''}" type="button" data-action="select" data-uri="${escapeHtml(uriValue)}" data-video-src="${escapeHtml(source)}" data-video-name="${escapeHtml(video.name)}" aria-current="${isSelected ? 'true' : 'false'}">
            <span class="video-number">${String(index + 1).padStart(2, '0')}</span>
            <span class="video-name">${escapeHtml(video.name)}</span>
            <span class="video-origin">${video.isCustom ? 'Yours' : 'Built in'}</span>
          </button>
          ${removeButton}
        </li>`;
      })
      .join('');

    const player = selected
      ? `<video id="video-player" src="${escapeHtml(webview.asWebviewUri(selected.uri).toString())}" controls loop playsinline preload="metadata"></video>`
      : `<div class="empty-player"><span>No videos yet</span></div>`;

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; media-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <link rel="stylesheet" href="${styleUri}">
    <title>GENVIM Focus Player</title>
  </head>
  <body>
    <main>
      <header class="hero">
        <p class="eyebrow">FOCUS MODE</p>
        <h1>GENVIM</h1>
        <p class="tagline">No noise. No distractions. No excuses.</p>
      </header>

      <section class="player-shell" aria-labelledby="now-playing-label">
        ${player}
        <div class="now-playing">
          <span id="now-playing-label">Now playing</span>
          <strong id="now-playing-name">${selected ? escapeHtml(selected.name) : 'Nothing selected'}</strong>
        </div>
        <p id="player-status" class="player-status" aria-live="polite"></p>
      </section>

      <section class="playlist-section" aria-labelledby="playlist-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">YOUR ROTATION</p>
            <h2 id="playlist-title">Playlist</h2>
          </div>
          <span class="video-count">${videos.length}</span>
        </div>
        <ol id="playlist" class="playlist">${playlist}</ol>
        <button id="add-videos" class="add-button" type="button">
          <span aria-hidden="true">+</span>
          Add your videos
        </button>
        <p class="privacy-note">Your custom files stay on this computer.</p>
      </section>
    </main>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
  }
}

function activate(context) {
  const provider = new GenVimViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_ID, provider),
    vscode.commands.registerCommand('genvim.addVideos', () => provider.addVideos()),
    vscode.commands.registerCommand('genvim.clearCustomVideos', () => provider.clearCustomVideos()),
  );
}

function deactivate() {}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getNonce() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';

  for (let index = 0; index < 32; index += 1) {
    nonce += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return nonce;
}

module.exports = {
  activate,
  deactivate,
};
