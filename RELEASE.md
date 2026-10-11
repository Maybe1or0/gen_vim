# Release GENVIM

The release workflow always tests and packages the extension. Marketplace publishing has an additional repository-variable gate and is disabled initially.

## Current safety gate

The GitHub Actions repository variable `PUBLISH_ENABLED` must equal `true` before the Marketplace job can run. It is intentionally set to `false` until the extension has been tested manually.

Even after enabling the variable, publishing only runs for a `vX.Y.Z` tag whose version exactly matches `package.json`. Manual workflow runs build a VSIX but never publish it.

## One-time Marketplace setup

1. Create or verify the `maybe1or0` publisher in the Visual Studio Marketplace.
2. Configure Marketplace trusted publishing for the `Maybe1or0/gen_vim` GitHub repository.
3. Set the trusted workflow filename to `release.yml` and leave the environment name empty.
4. Keep the GitHub repository variable `PUBLISH_ENABLED` set to `false` while testing.

The workflow uses OIDC through `vsce publish --oidc`; no long-lived Marketplace token is stored in GitHub.

## Test a release candidate

Run the **Release** workflow manually from GitHub Actions. Download the `genvim-vsix` artifact and install it with **Extensions: Install from VSIX...**.

The manual run executes validation, an npm security audit, a real VS Code Extension Host smoke test, and VSIX packaging. The publish job remains skipped.

## Publish after approval

1. Update the version without creating a tag:

   ```sh
   npm version patch --no-git-tag-version
   ```

2. Run the local checks:

   ```sh
   npm ci
   npm run ci
   npm test
   ```

3. Commit and push the version change.
4. Set the GitHub repository variable `PUBLISH_ENABLED` to `true`.
5. Create and push a matching tag, for example:

   ```sh
   git tag v1.0.1
   git push origin v1.0.1
   ```

The tag starts the release workflow. Publishing happens only after every build and test step succeeds.

To disable publishing again, set `PUBLISH_ENABLED` back to `false`.
