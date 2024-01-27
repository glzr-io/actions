import type { WriterOptions, Options } from 'conventional-changelog-core';

/**
 * Handlebars partial used for each commit of the release notes.
 *
 * Commit partial format:
 * 1. Prefix with scope (if one exists).
 * 2. Commit subject (commit message without scope).
 * 3. Thank you to contributor.
 * 4. Bullet points for each paragraph in commit body.
 */
const commitPartial = `
*{{#if scope}} **{{scope}}:**{{/if}} {{subject}}
{{#if body}}{{body}}{{/if}}
`;

// {{~#if}}
//   Thanks {{}}
// {{~/if}}

export function getWriterOpts(headerText: string): WriterOptions {
  return {
    headerPartial: headerText,
    commitPartial,
    transform: ((commit, context) => {
      console.log('!!! commit', JSON.stringify(commit));

      // Discard if no commit type is present.
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

      // Format commit subject.
      const subject = addPunctuationMark(
        capitalize(commit.subject.trim()),
      );

      // Format commit body.
      const body = commit.body
        .split(/\n[\s\n]*/)
        .map(paragraph => capitalize(paragraph.trim()))
        .filter(paragraph => !!paragraph)
        .map(paragraph => `* ${addPunctuationMark(paragraph)}`)
        .join('\n');

      return {
        ...commit,
        type: getTypeHeading(commit.type),
        subject,
        body,
      };
    }) as WriterOptions['transform'],
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
