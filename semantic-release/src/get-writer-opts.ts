import type { WriterOptions } from 'conventional-changelog-core';

/**
 * Handlebars partial used for each commit of the release notes.
 *
 * Commit partial format:
 * 1. Prefix with scope (if one exists).
 * 2. Commit subject (commit message without scope).
 * 3. Link to contributor.
 * 4. Bullet points for each paragraph in commit body.
 */
const commitPartial = `\
*{{#if scope}} **{{scope}}:**{{/if}} {{subject}}
{{~#if authorLink}} {{authorLink}}{{/if}}
{{#if body}}{{body}}{{/if}}\
`;

/**
 * Handlebars template for the whole release notes.
 */
const mainTemplate = `\
{{> header}}

{{#each commitGroups}}

{{#if title}}
### {{title}}

{{/if}}
{{#each commits}}
{{> commit root=@root}}
{{/each}}

{{/each}}
{{> footer}}
---
{{thankYouMessage}}\
`;

interface CommitUser {
  name: string;
  email: string;
}

export function getWriterOpts(headerText: string): WriterOptions {
  return {
    mainTemplate,
    commitPartial,
    headerPartial: headerText,
    transform: (commit, context) => {
      // Discard if no commit type or subject is present.
      if (!commit.type || !commit.subject) {
        return false;
      }

      let hasBreakingChange = false;
      commit.notes.forEach(note => {
        hasBreakingChange = true;
        note.title = '🚨 BREAKING CHANGES';
      });

      // Discard breaking changes. These are instead shown in the footer.
      if (hasBreakingChange) {
        return false;
      }

      // Format commit type.
      commit.type = getTypeHeading(commit.type);

      // Format commit subject.
      commit.subject = addPunctuationMark(
        capitalize(
          addMarkdownLinks(commit.subject, context.repoUrl!).trim(),
        ),
      );

      // Format commit body.
      commit.body = (commit.body ?? '')
        .split(/\n[\s\n]*/)
        .map(paragraph => capitalize(paragraph.trim()))
        .filter(paragraph => !!paragraph)
        .map(
          paragraph =>
            `  * ${addPunctuationMark(
              addMarkdownLinks(paragraph, context.repoUrl!),
            )}`,
        )
        .join('\n');

      const author = commit.author as unknown as CommitUser | undefined;
      const commiter = commit.commiter as unknown as
        | CommitUser
        | undefined;

      // Add a link to the author of the commit. This is only added in
      // cases where the commit comes from a merged PR, or if the commit
      // was made directly from GitHub's UI.
      if (author?.name && commiter?.name === 'GitHub') {
        commit.authorLink = addMarkdownLinks(
          `@${author.name}`,
          context.repoUrl!,
        );
      }

      return commit;
    },
    finalizeContext: (context, _options, commits, _keyCommit) => {
      const authors = commits.reduce<string[]>((acc, commit) => {
        // TS type from `conventional-changelog-core` doesn't include
        // author field.
        const author = commit.raw.author as unknown as
          | CommitUser
          | undefined;

        return author?.name && !acc.includes(`@${author.name}`)
          ? [...acc, `@${author.name}`]
          : acc;
      }, []);

      const authorsText =
        authors.length === 1
          ? authors[0]
          : `${authors.slice(0, -1).join(', ')}, and ${authors.slice(-1)}`;

      // Add thank you message to context.
      context.thankYouMessage = `Big thanks to ${authorsText} for contributing to this release 💛`;

      return context;
    },
  };
}

function getTypeHeading(type: string): string {
  switch (type) {
    case 'feat':
      return '🎉 New features';
    case 'fix':
      return '🐛 Bug fixes';
    case 'perf':
      return '🏎️ Performance improvements';
    case 'docs':
      return '📘 Docs improvements';
    default:
      return '🛠️️ Internal changes';
  }
}

function capitalize(str: string) {
  return str.replace(/^[a-z]/, firstChar => firstChar.toUpperCase());
}

function addPunctuationMark(str: string) {
  const lastChar = str[str.length - 1];
  const hasPunctuationMark = lastChar === '.';
  return lastChar && !hasPunctuationMark ? `${str}.` : str;
}

function addMarkdownLinks(str: string, repoUrl: string) {
  // Replace referenced issues with a markdown link to the issue.
  // eg. '#500' -> '[#500](https://github.com/...)'
  const issueUrl = `${repoUrl}/issues/`;
  const strWithIssueUrls = str.replace(
    /\b#([0-9]+)/g,
    (_, issueNo) => `[#${issueNo}](${issueUrl}${issueNo})`,
  );

  // Replace referenced usernames with a markdown link to the user.
  // eg. '@lars-berger' -> '[@lars-berger](https://github.com/...)'
  return strWithIssueUrls.replace(
    /\b@([a-z0-9](?:-?[a-z0-9/]){0,38})/g,
    (_, username) =>
      username.includes('/')
        ? `@${username}`
        : `[@${username}](${repoUrl}/${username})`,
  );
}
