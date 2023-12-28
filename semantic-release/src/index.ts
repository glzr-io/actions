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

    const isPrelease = core.getBooleanInput('is_prerelease');
    const prereleaseTag = core.getInput('prerelease_tag');
    const repositoryUrl = core.getInput('repository_url');
    const releaseBranch = core.getInput('release_branch');
    const ghPublish = core.getBooleanInput('gh_publish');
    const ghToken = core.getInput('gh_token');
    const ghAssets = core.getInput('gh_assets');
    const npmPublish = core.getBooleanInput('npm_publish');
    const npmToken = core.getInput('npm_token');

    const plugins: PluginSpec[] = [
      '@semantic-release/commit-analyzer',
      '@semantic-release/release-notes-generator',
    ];

    // If enabled, push plugin for publishing to NPM.
    if (npmPublish) {
      plugins.push('@semantic-release/npm');
    }

    // If enabled, push plugin for publishing as GitHub release.
    if (ghPublish) {
      const assets = ghAssets ? JSON.parse(ghAssets) : [];

      plugins.push([
        '@semantic-release/github',
        {
          // Create a draft release for manual approval.
          draftRelease: !isPrelease,
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
          { name: '*|*/*' },
        ],
        repositoryUrl,
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
