import { getJiraIssueKeys, getPRDescription, shouldSkipBranch, getTicketsFromPRDescription, shouldUpdateBody } from '../src/utils';
import { HIDDEN_MARKER_END, HIDDEN_MARKER_START, WARNING_MESSAGE_ABOUT_HIDDEN_MARKERS } from '../src/constants';

jest.spyOn(console, 'log').mockImplementation(); // avoid actual console.log in test output

describe('shouldSkipBranch()', () => {
  it('should recognize bot PRs', () => {
    expect(shouldSkipBranch('dependabot/npm_and_yarn/types/react-dom-16.9.6')).toBe(true);
    expect(shouldSkipBranch('feature/add-dependabot-config')).toBe(false);
  });

  it('should handle custom ignore patterns', () => {
    expect(shouldSkipBranch('bar', '^bar')).toBeTruthy();
    expect(shouldSkipBranch('foobar', '^bar')).toBeFalsy();

    expect(shouldSkipBranch('bar', '[0-9]{2}')).toBeFalsy();
    expect(shouldSkipBranch('bar', '')).toBeFalsy();
    expect(shouldSkipBranch('f00', '[0-9]{2}')).toBeTruthy();

    const customBranchRegex = '^(production-release|master|release/v\\d+)$';

    expect(shouldSkipBranch('production-release', customBranchRegex)).toBeTruthy();
    expect(shouldSkipBranch('master', customBranchRegex)).toBeTruthy();
    expect(shouldSkipBranch('release/v77', customBranchRegex)).toBeTruthy();

    expect(shouldSkipBranch('release/very-important-feature', customBranchRegex)).toBeFalsy();
    expect(shouldSkipBranch('')).toBeFalsy();
  });
});

describe('getJIRAIssueKeys()', () => {
  it('gets single jira key from different strings', () => {
    expect(getJiraIssueKeys('fix/login-protocol-es-43')).toEqual(['ES-43']);
    expect(getJiraIssueKeys('fix/login-protocol-ES 43')).toEqual(['ES-43']);

    expect(getJiraIssueKeys('feature/missingKey')).toEqual(null);
    expect(getJiraIssueKeys('')).toEqual(null);
  });

  it('gets multiple jira key from different strings', () => {
    expect(getJiraIssueKeys('[ES-43, ES-15] Feature description')).toEqual(['ES-43', 'ES-15']);
    expect(getJiraIssueKeys('feature/IMSW-203 IMSW 204 IMSW-555')).toEqual(['IMSW-203', 'IMSW-204', 'IMSW-555']);
  });
});

describe('getTicketsFromPRDescription', () => {
  it('returns empty if there are no matches', () => {
    expect(getTicketsFromPRDescription()).toEqual([]);
  });

  it('returns tickets if there are matches', () => {
    expect(getTicketsFromPRDescription(`<a title="MON-1530"></a><a title="MON-1531"></a>`)).toEqual(['MON-1530', 'MON-1531']);
  });
});

describe('shouldUpdateBody', () => {
  it('should return true if the body has 0 issues and the title has one', () => {
    expect(shouldUpdateBody([], ['MON-1234'])).toBe(true);
  });

  it('should return true if there are added issues', () => {
    expect(shouldUpdateBody(['MON-1234'], ['MON-1234', 'MON-12345'])).toBe(true);
  });

  it('should return true if there are removed issues', () => {
    expect(shouldUpdateBody(['MON-1234', 'MON-12345'], ['MON-1234'])).toBe(true);
  });

  it('should return true if there are updated issues of the same count', () => {
    expect(shouldUpdateBody(['MON-1234', 'MON-12345'], ['MON-1234', 'MON-123456'])).toBe(true);
  });

  it('should return false if the body and title share the same issues', () => {
    expect(shouldUpdateBody(['MON-1234'], ['MON-1234'])).toBe(false);
  });
});

describe('getPRDescription()', () => {
  it('should prepend issue info with hidden markers to old PR body', () => {
    const oldPRBody = 'old PR description body';
    const issueInfo = 'new info about jira task';
    const description = getPRDescription(oldPRBody, issueInfo);

    expect(description).toEqual(`${WARNING_MESSAGE_ABOUT_HIDDEN_MARKERS}
${HIDDEN_MARKER_START}
${issueInfo}
${HIDDEN_MARKER_END}
${oldPRBody}`);
  });

  it('should replace issue info', () => {
    const oldPRBodyInformation = 'old PR description body';
    const oldPRBody = `${HIDDEN_MARKER_START}Here is some old issue information${HIDDEN_MARKER_END}${oldPRBodyInformation}`;
    const issueInfo = 'new info about jira task';

    const description = getPRDescription(oldPRBody, issueInfo);

    expect(description).toEqual(`${WARNING_MESSAGE_ABOUT_HIDDEN_MARKERS}
${HIDDEN_MARKER_START}
${issueInfo}
${HIDDEN_MARKER_END}
${oldPRBodyInformation}`);
  });
});
