import matchAll from 'match-all';

import {
  BOT_BRANCH_PATTERNS,
  DEFAULT_BRANCH_PATTERNS,
  HIDDEN_MARKER_END,
  HIDDEN_MARKER_START,
  JIRA_REGEX_MATCHER,
  WARNING_MESSAGE_ABOUT_HIDDEN_MARKERS,
} from './constants';

import { JiraDetails } from './types';

const TICKET_TABLE_REGEX = /title="([a-zA-Z0-9-]*)"/gm;

export const getJiraIssueKeys = (input: string, regexp: RegExp = JIRA_REGEX_MATCHER): string[] | null => {
  const matches = input.toUpperCase().match(regexp);
  return matches?.length ? matches.map((key) => key.replace(' ', '-')) : null;
};

export const shouldSkipBranch = (branch: string, additionalIgnorePattern?: string): boolean => {
  if (BOT_BRANCH_PATTERNS.some((pattern) => pattern.test(branch))) {
    console.log(`You look like a bot 🤖 so we're letting you off the hook!`);
    return true;
  }

  if (DEFAULT_BRANCH_PATTERNS.some((pattern) => pattern.test(branch))) {
    console.log(`Ignoring check for default branch ${branch}`);
    return true;
  }

  const ignorePattern = new RegExp(additionalIgnorePattern || '');
  if (!!additionalIgnorePattern && ignorePattern.test(branch)) {
    console.log(`branch '${branch}' ignored as it matches the ignore pattern '${additionalIgnorePattern}' provided in skip-branches`);
    return true;
  }

  console.log(`branch '${branch}' does not match ignore pattern provided in 'skip-branches' option, therefore action will continue running`);
  return false;
};

const escapeRegexp = (str: string): string => {
  return str.replace(/[\\^$.|?*+(<>)[{]/g, '\\$&');
};

export const getTicketsFromPRDescription = (body: string = ''): string[] | null => {
  const matches = matchAll(body, TICKET_TABLE_REGEX);

  return matches.toArray();
};

export const shouldUpdateBody = (bodyIssueMatches: string[], titleIssueKeys: string[]) => {
  if (bodyIssueMatches.length !== titleIssueKeys.length) {
    return true;
  }

  const count = bodyIssueMatches.reduce((count, issue) => {
    if (titleIssueKeys.includes(issue)) {
      count += 1;
    }

    return count;
  }, 0);

  return count !== titleIssueKeys.length;
};

export const getPRDescription = (oldBody: string, details: string): string => {
  const hiddenMarkerStartRg = escapeRegexp(HIDDEN_MARKER_START);
  const hiddenMarkerEndRg = escapeRegexp(HIDDEN_MARKER_END);

  const rg = new RegExp(`${hiddenMarkerStartRg}([\\s\\S]+)${hiddenMarkerEndRg}`, 'igm');
  const bodyWithoutJiraDetails = oldBody.replace(rg, '');

  return `${WARNING_MESSAGE_ABOUT_HIDDEN_MARKERS}
${HIDDEN_MARKER_START}
${details}
${HIDDEN_MARKER_END}
${bodyWithoutJiraDetails}`;
};

const ticketRow = (details: JiraDetails): string => {
  const displayKey = details.key.toUpperCase();

  return `<tr><td>
  <a href="${details.url}" title="${displayKey}" target="_blank"><img alt="${details.type.name}" src="${details.type.icon}" />${displayKey}</a>  ${details.summary}
  </tr></td>
  `;
};

export const buildPRDescription = (tickets: JiraDetails[]): string => {
  const allRows = tickets.map((ticket) => ticketRow(ticket)).join('');

  return `
<table>
  ${allRows}
</table>
  <br />
  `;
};
