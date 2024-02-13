import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { type WebhookPayload } from '@actions/github/lib/interfaces';

const VALID_CHANGE_TYPES = [
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
    const startRegex = new RegExp(`^(${VALID_CHANGE_TYPES.join('|')}): `);

    if (!startRegex.test(title)) {
      exitWithPrComment(pullRequest);
    }
  } catch (error) {
    // Fail the workflow run if an error occurs.
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

async function exitWithPrComment(
  pullRequest: WebhookPayload['pull_request'],
): Promise<void> {
  const ghToken = core.getInput('gh-token');
  const allowedScopes = JSON.parse(core.getInput('allowed-scopes'));
  const exampleTitle = core.getInput('example-title');
  const exampleTitleWithScope = core.getInput('example-title-with-scope');
  const octokit = getOctokit(ghToken);

  const message = getErrorMessage(
    allowedScopes,
    exampleTitle,
    exampleTitleWithScope,
  );

  await octokit.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: pullRequest!.number,
    body: message,
  });

  throw new Error(message);
}

function getErrorMessage(
  allowedScopes: string[],
  exampleTitle: string,
  exampleTitleWithScope: string,
): string {
  let message = `
    ## ⚠️ Problem with PR title formatting

    Title needs to be of format:
    \`\`\`
    `;

  if (allowedScopes.length) {
    const scopes = allowedScopes.join('|');
    message += `
      <change type>(<scope>): <short summary>
        │             │         │
        │             │         └─⫸ Summary in present tense. Not capitalized. No period at the end.
        │             │
        │             └─⫸ Affected scope (optional to include): ${scopes}
        │
        └─⫸ Valid change types: ${VALID_CHANGE_TYPES.join('|')}
      `;
  } else {
    message += `
      <change type>: <short summary>
        │                   │
        │                   └─⫸ Summary in present tense. Not capitalized. No period at the end.
        │
        └─⫸ Valid change types: ${VALID_CHANGE_TYPES.join('|')}
      `;
  }

  message += `
    \`\`\`

    eg. \`${exampleTitle}\` ✅
    `;

  if (allowedScopes.length) {
    message += `
      eg. \`${exampleTitleWithScope}\` ✅
      `;
  }

  message += `
    ### Which change type to choose?
    * **chore**: Changes that affect the build system or external dependencies
    * **ci**: Changes to CI configuration files and scripts
    * **docs**: Documentation only changes
    * **feat**: A new feature
    * **fix**: A bug fix
    * **perf**: A code change that improves performance
    * **refactor**: A code change that neither fixes a bug nor adds a feature
    * **revert**: Reverting a previous change
    * **style**: A code formatting change
    * **test**: Adding missing tests or correcting existing tests
  `;

  return message.replace(/(\n)\s+/g, '$1');
}

run();
