import type { WriterOptions } from 'conventional-changelog-core';

/**
 * Handlebars partial used for each commit of the release notes.
 *
 * Commit partial format:
 * 1. Prefix with scope (if one exists).
 * 2. Commit subject (commit message without scope).
 * 3. Contributor username.
 * 4. Bullet points for each paragraph in commit body.
 */
const commitPartial = `\
*{{#if scope}} **{{scope}}:**{{/if}} {{subject}}
{{~#if author}} @{{author.name}}{{/if}}
{{#if body}}{{body}}{{/if}}
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
{{thankYouMessage}}
`;

export function getWriterOpts(headerText: string): WriterOptions {
  return {
    mainTemplate,
    commitPartial,
    headerPartial: headerText,
    transform: ((commit, _context) => {
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
      const type = getTypeHeading(commit.type);

      // Format commit subject.
      const subject = addPunctuationMark(
        capitalize(commit.subject.trim()),
      );

      // Format commit body.
      const body = (commit.body ?? '')
        .split(/\n[\s\n]*/)
        .map(paragraph => capitalize(paragraph.trim()))
        .filter(paragraph => !!paragraph)
        .map(paragraph => `  * ${addPunctuationMark(paragraph)}`)
        .join('\n');

      return { ...commit, type, subject, body };
    }) as WriterOptions['transform'],
    // @ts-ignore - Return type from `conventional-changelog-core` is
    // completely incorrect.
    finalizeContext: (context, _options, commits, _keyCommit) => {
      const authors = commits.reduce((acc, commit) => {
        // TS type from `conventional-changelog-core` doesn't include
        // author field.
        const author = commit.raw.author as unknown as
          | { name: string }
          | undefined;

        return author?.name && !acc.includes(`@${author.name}`)
          ? [...acc, `@${author.name}`]
          : acc;
      }, []);

      const authorsText =
        authors.length === 1
          ? authors[0]
          : `${authors.slice(0, -1).join(', ')}, and ${authors.slice(-1)}`;

      const thankYouMessage = `Big thanks to ${authorsText} for contributing to this release 💛`;

      return {
        ...context,
        thankYouMessage,
      };
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
