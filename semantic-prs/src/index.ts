import * as core from '@actions/core';
import { context } from '@actions/github';

/**
 * The main function for the action.
 */
export async function run(): Promise<void> {
  try {
    const pullRequest = context.payload.pull_request;

    if (!pullRequest) {
      throw new Error('This action can only be run on pull requests.');
    }

    const title: string = pullRequest.title;
    const types = [
      'build',
      'chore',
      'ci',
      'docs',
      'feat',
      'fix',
      'perf',
      'refactor',
      'revert',
      'style',
      'test',
    ];

    const startRegex = new RegExp(`^(${types.join('|')}): `);

    if (startRegex.test(title)) {
      throw new Error(
        'Title needs to be of format:\n' +
          "<type>: <description> (eg. 'feat: added emojis')\n\n" +
          'Title needs to start with a valid type. These are:\n' +
          types.join(', '),
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
