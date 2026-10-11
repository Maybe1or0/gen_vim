'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');

async function run() {
  const extension = vscode.extensions.getExtension('maybe1or0.genvim');
  assert.ok(extension, 'GENVIM extension is discoverable');

  await extension.activate();
  assert.equal(extension.isActive, true, 'GENVIM extension activates');

  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes('genvim.addVideos'), 'Add Videos command is registered');
  assert.ok(commands.includes('genvim.selectVideo'), 'Select Video command is registered');
  assert.ok(commands.includes('genvim.nextVideo'), 'Next Video command is registered');
  assert.ok(commands.includes('genvim.removeCurrentVideo'), 'Remove Current Video command is registered');
  assert.ok(commands.includes('genvim.clearCustomVideos'), 'Clear Custom Videos command is registered');
  assert.ok(commands.includes('genvim.openSettings'), 'Open Settings command is registered');

  const configuration = vscode.workspace.getConfiguration('genvim');
  assert.equal(configuration.get('autoplay'), true, 'Autoplay is enabled by default');
  assert.equal(configuration.get('videoFit'), 'cover', 'Video fills the sidebar by default');

  const views = extension.packageJSON.contributes?.views?.genvim ?? [];
  assert.ok(views.some(({ id }) => id === 'genvim.videoView'), 'Focus Player view is contributed');

  for (const number of [1, 3, 4, 5]) {
    const videoPath = path.join(
      extension.extensionPath,
      'genvimSetup',
      'brainrotvideos',
      `brainrot${number}.mp4`,
    );
    assert.ok(fs.existsSync(videoPath), `Bundled video ${number} is available`);
  }

  await vscode.commands.executeCommand('workbench.view.extension.genvim');
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log('GENVIM activated, registered its commands, and opened its sidebar view.');
}

module.exports = { run };
