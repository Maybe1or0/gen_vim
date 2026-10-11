# GENVIM for VS Code

GENVIM is now a VS Code extension: a focus-video player that lives beside your code.

Open the GENVIM icon in the Activity Bar to play one of the bundled videos, switch between videos in the playlist, or add local videos of your own. Custom videos remain on your computer; the extension only remembers their file locations.

![The original GENVIM layout](genvim_example.png)

## Features

- Video playback directly in the VS Code sidebar
- Four bundled GENVIM videos
- A persistent playlist of your own local videos
- Multi-file import for MP4, WebM, OGG, M4V, and MOV files
- Per-video removal without deleting the original file
- A command to clear every custom playlist entry

Playback support depends on the codecs included in VS Code. H.264 MP4, WebM, and OGG are the most portable choices.

## Run from source

1. Open this repository in VS Code.
2. Press `F5` and choose **Run GENVIM Extension** if prompted.
3. In the Extension Development Host, select the GENVIM icon in the Activity Bar.

The extension has no runtime dependencies and does not require a build step.

## Package a VSIX

Install the official VS Code extension packaging tool, then create the package:

```sh
npx @vscode/vsce package
```

Install the resulting `.vsix` from VS Code with **Extensions: Install from VSIX...**.

## Commands

- `GENVIM: Add Videos`
- `GENVIM: Clear Custom Videos`

## Privacy

GENVIM does not upload videos or make network requests. Added video paths are stored in VS Code's extension global state. Removing a video from GENVIM never deletes the source file.

## License

[MIT](LICENSE)
