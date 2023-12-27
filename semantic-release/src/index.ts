import * as core from '@actions/core';
import semanticRelease from 'semantic-release';

/**
 * The main function for the action.
 */
export async function run(): Promise<void> {
  try {
    const isPrelease = core.getBooleanInput('is_prerelease');
    const prereleaseTag = core.getInput('prerelease_tag');
    const repositoryUrl = core.getInput('repository_url');
    const ghPublish = core.getInput('gh_publish');
    const npmPublish = core.getInput('npm_publish');

    const result = await semanticRelease({
      branches: [
        {
          name: 'main',
          channel: isPrelease ? prereleaseTag : undefined,
          prerelease: isPrelease,
        },
      ],
      repositoryUrl,
      plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        '@semantic-release/npm',
        [
          '@semantic-release/github',
          {
            successComment: false,
            // Create a draft release for manual approval.
            draftRelease: !isPrelease,
          },
        ],
      ],
    });

    if (!result) {
      throw new Error('Failed to publish release.');
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
