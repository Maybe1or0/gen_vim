const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');

const CUSTOM_VIDEOS_KEY = 'genvim.customVideos';
const SELECTED_VIDEO_KEY = 'genvim.selectedVideo';
const VIEW_ID = 'genvim.videoView';
const VIDEO_FILTERS = {
  Videos: ['mp4', 'webm', 'ogg', 'ogv', 'm4v', 'mov'],
};

class GenVimViewProvider {
  constructor(context) {
    this.context = context;
    this.extensionUri = context.extensionUri;
    this.view = undefined;
    this.selectedVideo = context.globalState.get(SELECTED_VIDEO_KEY);
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'addVideos':
            await this.addVideos();
            break;
          case 'nextVideo':
            await this.nextVideo();
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
    await this.setSelectedVideo(addedVideos[0].toString());
    await this.focusView();

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
      await this.context.globalState.update(SELECTED_VIDEO_KEY, undefined);
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
    const selected = this.getSelectedVideo();
    if (selected?.isCustom) {
      this.selectedVideo = undefined;
      await this.context.globalState.update(SELECTED_VIDEO_KEY, undefined);
    }
    this.render();
  }

  async selectVideo() {
    const videos = this.getVideos();
    const selected = await vscode.window.showQuickPick(
      videos.map((video) => ({
        label: video.name,
        description: video.isCustom ? 'Your video' : 'Built in',
        detail: video.isCustom ? video.uri.fsPath : undefined,
        video,
      })),
      {
        placeHolder: 'Choose the video to play',
        title: 'GENVIM playlist',
      },
    );

    if (!selected) {
      return;
    }

    await this.setSelectedVideo(selected.video.uri.toString());
    await this.focusView();
  }

  async nextVideo() {
    const videos = this.getVideos();
    if (!videos.length) {
      return;
    }

    const currentIndex = videos.findIndex((video) => video.uri.toString() === this.selectedVideo);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % videos.length : 0;
    await this.setSelectedVideo(videos[nextIndex].uri.toString());
  }

  async removeCurrentVideo() {
    const selected = this.getSelectedVideo();

    if (!selected) {
      return;
    }

    if (!selected.isCustom) {
      void vscode.window.showInformationMessage('Bundled GENVIM videos cannot be removed.');
      return;
    }

    await this.removeVideo(selected.uri.toString());
  }

  getSelectedVideo(videos = this.getVideos()) {
    return videos.find((video) => video.uri.toString() === this.selectedVideo) ?? videos[0];
  }

  async setSelectedVideo(uriValue) {
    this.selectedVideo = uriValue;
    await this.context.globalState.update(SELECTED_VIDEO_KEY, uriValue);
    this.render();
  }

  async focusView() {
    await vscode.commands.executeCommand(`${VIEW_ID}.focus`);
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
    const selected = this.getSelectedVideo(videos);
    if (selected && selected.uri.toString() !== this.selectedVideo) {
      this.selectedVideo = selected.uri.toString();
      void this.context.globalState.update(SELECTED_VIDEO_KEY, this.selectedVideo);
    }

    const configuration = vscode.workspace.getConfiguration('genvim');
    const autoplay = configuration.get('autoplay', true);
    const loop = configuration.get('loop', true);
    const muted = configuration.get('muted', true);
    const showControls = configuration.get('showControls', true);
    const configuredVideoFit = configuration.get('videoFit', 'cover');
    const videoFit = ['cover', 'contain', 'fill'].includes(configuredVideoFit)
      ? configuredVideoFit
      : 'cover';
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'sidebar.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'sidebar.js'));
    const nonce = getNonce();

    const player = selected
      ? `<video
          id="video-player"
          src="${escapeHtml(webview.asWebviewUri(selected.uri).toString())}"
          aria-label="Playing ${escapeHtml(selected.name)}"
          data-autoplay="${autoplay}"
          ${autoplay ? 'autoplay' : ''}
          ${loop ? 'loop' : ''}
          ${muted ? 'muted' : ''}
          ${showControls ? 'controls' : ''}
          playsinline
          preload="auto"
        ></video>`
      : `<div class="empty-player">
          <p>No videos available.</p>
          <button id="add-videos" type="button">Add a video</button>
        </div>`;

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; media-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <link rel="stylesheet" href="${styleUri}">
    <title>GENVIM Focus Player</title>
  </head>
  <body class="fit-${videoFit}">
    <main title="${selected ? escapeHtml(selected.name) : 'GENVIM'}">
      ${player}
      <p id="player-status" class="player-status" aria-live="polite"></p>
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
    vscode.commands.registerCommand('genvim.selectVideo', () => provider.selectVideo()),
    vscode.commands.registerCommand('genvim.nextVideo', () => provider.nextVideo()),
    vscode.commands.registerCommand('genvim.removeCurrentVideo', () => provider.removeCurrentVideo()),
    vscode.commands.registerCommand('genvim.clearCustomVideos', () => provider.clearCustomVideos()),
    vscode.commands.registerCommand('genvim.openSettings', () =>
      vscode.commands.executeCommand('workbench.action.openSettings', '@ext:maybe1or0.genvim'),
    ),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('genvim')) {
        provider.render();
      }
    }),
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
