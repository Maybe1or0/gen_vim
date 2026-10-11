'use strict';

const path = require('node:path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, '..');
  const extensionTestsPath = path.resolve(__dirname, 'suite', 'index');

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    version: process.env.VSCODE_VERSION || 'stable',
    launchArgs: [
      '--disable-extensions',
      '--disable-gpu',
      '--disable-workspace-trust',
      '--skip-release-notes',
      '--skip-welcome',
    ],
  });
}

main().catch((error) => {
  console.error('GENVIM extension tests failed.');
  console.error(error);
  process.exitCode = 1;
});
