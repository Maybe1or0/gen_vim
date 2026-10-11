'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = readJson('package.json');
const expectedCommands = ['genvim.addVideos', 'genvim.clearCustomVideos'];
const expectedVideos = [1, 3, 4, 5].map(
  (number) => `genvimSetup/brainrotvideos/brainrot${number}.mp4`,
);

assert(manifest.name === 'genvim', 'package name must remain "genvim"');
assert(manifest.publisher, 'package publisher is required');
assert(manifest.main === './extension.js', 'package main must point to extension.js');
assert(manifest.engines?.vscode, 'VS Code engine range is required');
assert(Array.isArray(manifest.files), 'package files allowlist is required');

const contributedCommands = manifest.contributes?.commands?.map(({ command }) => command) ?? [];
assert(new Set(contributedCommands).size === contributedCommands.length, 'command IDs must be unique');

for (const command of expectedCommands) {
  assert(contributedCommands.includes(command), `missing contributed command: ${command}`);
  assert(
    manifest.activationEvents.includes(`onCommand:${command}`),
    `missing activation event for ${command}`,
  );
}

const focusView = manifest.contributes?.views?.genvim?.find(({ id }) => id === 'genvim.videoView');
assert(focusView?.type === 'webview', 'GENVIM focus view must be a webview');
assert(
  manifest.activationEvents.includes('onView:genvim.videoView'),
  'missing focus view activation event',
);

for (const relativePath of [
  'extension.js',
  'media/genvim.svg',
  'media/sidebar.css',
  'media/sidebar.js',
  ...expectedVideos,
]) {
  assert(manifest.files.includes(relativePath) || manifest.files.includes('media/**'), `${relativePath} is not packaged`);
  assert(fs.existsSync(path.join(root, relativePath)), `missing packaged file: ${relativePath}`);
}

for (const relativePath of expectedVideos) {
  const absolutePath = path.join(root, relativePath);
  const file = fs.openSync(absolutePath, 'r');
  const header = Buffer.alloc(12);
  fs.readSync(file, header, 0, header.length, 0);
  fs.closeSync(file);

  assert(fs.statSync(absolutePath).size > 1_000_000, `${relativePath} is unexpectedly small`);
  assert(header.toString('ascii', 4, 8) === 'ftyp', `${relativePath} is not a valid MP4 container`);
}

console.log(`Validated ${manifest.publisher}.${manifest.name} with ${expectedVideos.length} bundled videos.`);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
