import * as core from '@actions/core';
import { type PluginSpec } from 'semantic-release';
import { exec } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

/**
 * The main function for the action.
 */
export async function run(): Promise<void> {
  try {
    if (process.env.CI) {
      // Semantic Release refuses to work when bundled into a single file, so
      // instead we install it at runtime.
      const { stdout, stderr } = await promisify(exec)(
        'npm --loglevel error i semantic-release@22.0.12',
        { cwd: path.resolve(__dirname) },
      );

      core.debug(stdout);

      if (stderr) {
        throw new Error(stderr);
      }
    }

    const isPrelease = core.getBooleanInput('is-prerelease');
    const prereleaseTag = core.getInput('prerelease-tag');
    const releaseBranch = core.getInput('release-branch');
    const ghPublish = core.getBooleanInput('gh-publish');
    const ghToken = core.getInput('gh-token');
    const ghAssets = core.getInput('gh-assets');
    const ghDraftRelease = core.getBooleanInput('gh-draft-release');
    const npmPublish = core.getBooleanInput('npm-publish');
    const npmToken = core.getInput('npm-token');
    const npmPackageRoot = core.getInput('npm-package-root');

    const plugins: PluginSpec[] = [
      [
        '@semantic-release/commit-analyzer',
        { config: './conventional-changelog-preset' },
      ],
      [
        '@semantic-release/release-notes-generator',
        { config: './conventional-changelog-preset' },
      ],
    ];

    // If enabled, push plugin for publishing to NPM.
    if (npmPublish) {
      plugins.push(['@semantic-release/npm', { pkgRoot: npmPackageRoot }]);
    }

    // If enabled, push plugin for publishing as GitHub release.
    if (ghPublish) {
      const assets = ghAssets ? JSON.parse(ghAssets) : [];

      plugins.push([
        '@semantic-release/github',
        {
          draftRelease: ghDraftRelease,
          successComment: false,
          assets,
        },
      ]);
    }

    // Since Semantic Release is installed at runtime, it needs to be imported
    // dynamically.
    const semanticRelease = (await import('semantic-release')).default;

    const result = await semanticRelease(
      {
        branches: [
          {
            name: releaseBranch,
            ...(isPrelease ? { channel: prereleaseTag } : {}),
            prerelease: isPrelease ? prereleaseTag : false,
          },
          // If there is only a prerelease branch, Semantic Release will error
          // and require a release branch to be added. We can bypass this by
          // adding a wildcard release branch, but it means the repository has
          // to have at least one branch other than `main`.
          { name: '*' },
        ],
        plugins,
      },
      { env: { GITHUB_TOKEN: ghToken, NPM_TOKEN: npmToken, CI: 'true' } },
    );

    // Return early when a release isn't created (eg. in case no change types
    // caused a version bump).
    if (!result) {
      return;
    }

    const { lastRelease, commits, nextRelease, releases } = result;

    core.debug(
      `Published ${nextRelease.type} release version ${nextRelease.version} containing ${commits.length} commits.`,
    );

    if (lastRelease.version) {
      core.debug(`The last release was "${lastRelease.version}".`);
    }

    for (const release of releases) {
      core.debug(
        `The release was published with plugin "${release.pluginName}".`,
      );
    }
  } catch (error) {
    // Fail the workflow run if an error occurs.
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
