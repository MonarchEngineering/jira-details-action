import { getInputs } from './action-inputs';
import { IGithubData, JiraDetails, PullRequestParams } from './types';
import { PullsUpdateParams } from '@octokit/rest';
import { buildPRDescription as buildPrDescription, getJiraIssueKeys, getPRDescription as getPrDescription } from './utils';
import { context, GitHub } from '@actions/github/lib/github';

export class GithubConnector {
  client: GitHub = {} as GitHub;
  githubData: IGithubData = {} as IGithubData;

  constructor() {
    const { GITHUB_TOKEN } = getInputs();
    this.client = new GitHub(GITHUB_TOKEN);
    this.githubData = this.getGithubData();
  }

  get isPRAction(): boolean {
    return this.githubData.eventName === 'pull_request';
  }

  get headBranch(): string {
    return this.githubData.pullRequest.head.ref;
  }

  getIssueKeysFromTitle(): string[] | null {
    const prTitle = this.githubData.pullRequest.title;
    const branchName = this.headBranch;

    return getJiraIssueKeys(prTitle) || getJiraIssueKeys(branchName);
  }

  async updatePrDetails(tickets: JiraDetails[]) {
    const owner = this.githubData.owner;
    const repo = this.githubData.repository.name;

    const { number: prNumber = 0, body: prBody = '' } = this.githubData.pullRequest;

    const prData: PullsUpdateParams = {
      owner,
      repo,
      pull_number: prNumber,
      body: getPrDescription(prBody, buildPrDescription(tickets)),
    };

    await this.client.pulls.update(prData);
  }

  getGithubData(): IGithubData {
    const {
      eventName,
      payload: {
        repository,
        organization: { login: owner },
        pull_request: pullRequest,
      },
    } = context;

    return {
      eventName,
      repository,
      owner,
      pullRequest: pullRequest as PullRequestParams,
    };
  }
}
