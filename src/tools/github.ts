import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';
import { createAppAuth } from '@octokit/auth-app';

export interface GitHubConfig {
  token?: string;
  appId?: number;
  privateKey?: string;
  installationID?: number;
  throttle?: {
    enabled: boolean;
    rateLimit?: number;
    timeout?: number;
  };
}

export interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  htmlUrl: string;
  defaultBranch: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'all';
  user: { login: string; avatarUrl: string };
  labels: { name: string; color: string }[];
  assignees: { login: string; avatarUrl: string }[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  htmlUrl: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  user: { login: string; avatarUrl: string };
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  draft: boolean;
  mergeable: boolean | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
}

export interface Commit {
  sha: string;
  message: string;
  author: { name: string; email: string; date: string };
  committer: { name: string; email: string; date: string };
  htmlUrl: string;
  files?: { filename: string; status: string; additions: number; deletions: number }[];
}

export interface FileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
  downloadUrl: string;
}

export interface Branch {
  name: string;
  commit: { sha: string; url: string };
  protected: boolean;
}

export interface SearchResult {
  totalCount: number;
  incompleteResults: boolean;
  items: any[];
}

export interface WorkflowRun {
  id: number;
  name: string;
  headBranch: string;
  headSha: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: string | null;
  workflowId: number;
  runNumber: number;
  runStartedAt: string;
  updatedAt: string;
  htmlUrl: string;
}

export class GitHubTool {
  private octokit: Octokit;
  private owner: string = '';
  private repo: string = '';

  constructor(config: GitHubConfig) {
    const ThrottledOctokit = throttling(Octokit as any, {
      onRateLimit: (retryAfter: number, options: Record<string, unknown>) => {
        console.warn(`Rate limit exceeded, retrying in ${retryAfter}s`);
        return true;
      },
      onAbuseLimit: (retryAfter: number, options: Record<string, unknown>) => {
        console.warn(`Abuse limit detected, retrying in ${retryAfter}s`);
        return true;
      },
    });

    this.octokit = new (ThrottledOctokit as any)({
      auth: config.token,
      authStrategy:
        config.appId && config.privateKey && config.installationID
          ? createAppAuth({
            appId: config.appId,
            privateKey: config.privateKey,
            installationID: config.installationID,
          } as any)
          : undefined,
      throttle: config.throttle?.enabled
        ? {
          onRateLimit: (retryAfter: number, options: Record<string, unknown>) => {
            console.warn(`Rate limit exceeded, retrying in ${retryAfter}s`);
            return true;
          },
          onAbuseLimit: (retryAfter: number, options: Record<string, unknown>) => {
            console.warn(`Abuse limit detected, retrying in ${retryAfter}s`);
            return true;
          },
        }
        : undefined,
    });
  }

  setRepository(owner: string, repo: string): void {
    this.owner = owner;
    this.repo = repo;
  }

  async getRepository(): Promise<Repository | null> {
    try {
      const { data } = await this.octokit.repos.get({
        owner: this.owner,
        repo: this.repo,
      });

      return {
        id: data.id,
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        private: data.private,
        htmlUrl: data.html_url,
        defaultBranch: data.default_branch,
        language: data.language,
        stargazersCount: data.stargazers_count,
        forksCount: data.forks_count,
        updatedAt: data.updated_at || '',
      };
    } catch (error) {
      console.error('Failed to get repository:', error);
      return null;
    }
  }

  async listIssues(options?: {
    state?: 'open' | 'closed' | 'all';
    labels?: string;
    assignee?: string;
    creator?: string;
    perPage?: number;
  }): Promise<Issue[]> {
    try {
      const { data } = await this.octokit.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        state: options?.state || 'open',
        labels: options?.labels,
        assignee: options?.assignee,
        creator: options?.creator,
        perPage: options?.perPage || 30,
      });

      return data
        .filter((issue) => !issue.pull_request)
        .map((issue) => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          body: issue.body || '',
          state: issue.state as 'open' | 'closed',
          user: {
            login: issue.user?.login || '',
            avatarUrl: issue.user?.avatar_url || '',
          },
          labels: issue.labels.map((label) => {
            if (typeof label === 'string') {
              return { name: label, color: '' };
            }
            return {
              name: label.name || '',
              color: label.color || '',
            };
          }),
          assignees: (issue.assignees || []).map((user) => ({
            login: user.login || '',
            avatarUrl: user.avatar_url || '',
          })),
          createdAt: issue.created_at || '',
          updatedAt: issue.updated_at || '',
          closedAt: issue.closed_at || null,
          htmlUrl: issue.html_url || '',
        }));
    } catch (error) {
      console.error('Failed to list issues:', error);
      return [];
    }
  }

  async createIssue(
    title: string,
    body: string,
    options?: {
      labels?: string[];
      assignees?: string[];
    }
  ): Promise<Issue | null> {
    try {
      const { data } = await this.octokit.issues.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
        labels: options?.labels,
        assignees: options?.assignees,
      });

      return {
        id: data.id,
        number: data.number,
        title: data.title,
        body: data.body || '',
        state: data.state as 'open' | 'closed',
        user: {
          login: data.user?.login || '',
          avatarUrl: data.user?.avatar_url || '',
        },
        labels: [],
        assignees: [],
        createdAt: data.created_at || '',
        updatedAt: data.updated_at || '',
        closedAt: data.closed_at || null,
        htmlUrl: data.html_url || '',
      };
    } catch (error) {
      console.error('Failed to create issue:', error);
      return null;
    }
  }

  async closeIssue(number: number): Promise<boolean> {
    try {
      await this.octokit.issues.update({
        owner: this.owner,
        repo: this.repo,
        issue_number: number,
        state: 'closed',
      } as any);
      return true;
    } catch (error) {
      console.error('Failed to close issue:', error);
      return false;
    }
  }

  async addComment(issueNumber: number, body: string): Promise<boolean> {
    try {
      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body,
      } as any);
      return true;
    } catch (error) {
      console.error('Failed to add comment:', error);
      return false;
    }
  }

  async listPullRequests(options?: {
    state?: 'open' | 'closed' | 'all';
    perPage?: number;
  }): Promise<PullRequest[]> {
    try {
      const { data } = await this.octokit.pulls.list({
        owner: this.owner,
        repo: this.repo,
        state: options?.state || 'open',
        perPage: options?.perPage || 30,
      });

      return data.map((pr) => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        state: pr.merged_at ? 'merged' : (pr.state as 'open' | 'closed'),
        user: {
          login: pr.user?.login || '',
          avatarUrl: pr.user?.avatar_url || '',
        },
        head: {
          ref: pr.head.ref,
          sha: pr.head.sha,
        },
        base: {
          ref: pr.base.ref,
          sha: pr.base.sha,
        },
        draft: pr.draft || false,
        mergeable: (pr as any).mergeable || false,
        additions: (pr as any).additions || 0,
        deletions: (pr as any).deletions || 0,
        changedFiles: (pr as any).changed_files || 0,
        htmlUrl: pr.html_url || '',
        createdAt: pr.created_at || '',
        updatedAt: pr.updated_at || '',
        mergedAt: pr.merged_at || null,
      }));
    } catch (error) {
      console.error('Failed to list pull requests:', error);
      return [];
    }
  }

  async getPullRequest(number: number): Promise<PullRequest | null> {
    try {
      const { data } = await this.octokit.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: number,
      } as any);

      return {
        id: data.id,
        number: data.number,
        title: data.title,
        body: data.body || '',
        state: data.merged_at ? 'merged' : (data.state as 'open' | 'closed'),
        user: {
          login: data.user?.login || '',
          avatarUrl: data.user?.avatar_url || '',
        },
        head: {
          ref: data.head.ref,
          sha: data.head.sha,
        },
        base: {
          ref: data.base.ref,
          sha: data.base.sha,
        },
        draft: data.draft || false,
        mergeable: data.mergeable,
        additions: data.additions || 0,
        deletions: data.deletions || 0,
        changedFiles: data.changed_files || 0,
        htmlUrl: data.html_url || '',
        createdAt: data.created_at || '',
        updatedAt: data.updated_at || '',
        mergedAt: data.merged_at || null,
      };
    } catch (error) {
      console.error('Failed to get pull request:', error);
      return null;
    }
  }

  async mergePullRequest(
    number: number,
    method: 'merge' | 'squash' | 'rebase' = 'squash'
  ): Promise<boolean> {
    try {
      await this.octokit.pulls.merge({
        owner: this.owner,
        repo: this.repo,
        pull_number: number,
        merge_method: method,
      } as any);
      return true;
    } catch (error) {
      console.error('Failed to merge pull request:', error);
      return false;
    }
  }

  async listCommits(options?: {
    sha?: string;
    path?: string;
    author?: string;
    perPage?: number;
  }): Promise<Commit[]> {
    try {
      const { data } = await this.octokit.repos.listCommits({
        owner: this.owner,
        repo: this.repo,
        sha: options?.sha,
        path: options?.path,
        author: options?.author,
        per_page: options?.perPage || 30,
      });

      return data.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author?.name || '',
          email: commit.commit.author?.email || '',
          date: commit.commit.author?.date || '',
        },
        committer: {
          name: commit.commit.committer?.name || '',
          email: commit.commit.committer?.email || '',
          date: commit.commit.committer?.date || '',
        },
        htmlUrl: commit.html_url || '',
      }));
    } catch (error) {
      console.error('Failed to list commits:', error);
      return [];
    }
  }

  async getFileContent(path: string, ref?: string): Promise<FileContent | null> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref,
      });

      if (Array.isArray(data)) return null;

      return {
        name: data.name,
        path: data.path,
        sha: data.sha,
        size: data.size,
        type: data.type as 'file' | 'dir',
        content: (data as any).content,
        encoding: (data as any).encoding,
        downloadUrl: data.download_url || '',
      };
    } catch (error) {
      console.error('Failed to get file content:', error);
      return null;
    }
  }

  async createOrUpdateFile(
    path: string,
    content: string,
    message: string,
    options?: { sha?: string; branch?: string }
  ): Promise<{ success: boolean; sha?: string; url?: string }> {
    try {
      const { data } = await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        sha: options?.sha,
        branch: options?.branch,
      });

      return {
        success: true,
        sha: data.content?.sha,
        url: data.content?.html_url,
      };
    } catch (error) {
      console.error('Failed to create/update file:', error);
      return { success: false };
    }
  }

  async deleteFile(path: string, message: string, sha: string): Promise<boolean> {
    try {
      await this.octokit.repos.deleteFile({
        owner: this.owner,
        repo: this.repo,
        path,
        message,
        sha,
      });
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  async listBranches(): Promise<Branch[]> {
    try {
      const { data } = await this.octokit.repos.listBranches({
        owner: this.owner,
        repo: this.repo,
      });

      return data.map((branch) => ({
        name: branch.name,
        commit: {
          sha: branch.commit.sha,
          url: branch.commit.url,
        },
        protected: branch.protected,
      }));
    } catch (error) {
      console.error('Failed to list branches:', error);
      return [];
    }
  }

  async createBranch(name: string, fromBranch: string): Promise<boolean> {
    try {
      const { data: refData } = await this.octokit.git.getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${fromBranch}`,
      });

      await this.octokit.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${name}`,
        sha: refData.object.sha,
      });

      return true;
    } catch (error) {
      console.error('Failed to create branch:', error);
      return false;
    }
  }

  async searchCode(
    query: string,
    options?: {
      language?: string;
      repo?: string;
      user?: string;
      perPage?: number;
    }
  ): Promise<SearchResult> {
    try {
      const { data } = await this.octokit.search.code({
        q: `${query}${options?.language ? ` language:${options.language}` : ''}${options?.repo ? ` repo:${options.repo}` : ''}${options?.user ? ` user:${options.user}` : ''}`,
        per_page: options?.perPage || 30,
      });

      return {
        totalCount: data.total_count,
        incompleteResults: data.incomplete_results,
        items: data.items,
      };
    } catch (error) {
      console.error('Failed to search code:', error);
      return { totalCount: 0, incompleteResults: false, items: [] };
    }
  }

  async searchIssues(
    query: string,
    options?: {
      state?: 'open' | 'closed' | 'all';
      repo?: string;
      perPage?: number;
    }
  ): Promise<SearchResult> {
    try {
      const { data } = await this.octokit.search.issuesAndPullRequests({
        q: query,
        state: options?.state || 'open',
        per_page: options?.perPage || 30,
      });

      return {
        totalCount: data.total_count,
        incompleteResults: data.incomplete_results,
        items: data.items,
      };
    } catch (error) {
      console.error('Failed to search issues:', error);
      return { totalCount: 0, incompleteResults: false, items: [] };
    }
  }

  async runWorkflow(
    workflowId: string,
    ref?: string,
    inputs?: Record<string, string>
  ): Promise<boolean> {
    try {
      await this.octokit.actions.createWorkflowDispatch({
        owner: this.owner,
        repo: this.repo,
        workflow_id: workflowId,
        ref: ref || 'main',
        inputs,
      });
      return true;
    } catch (error) {
      console.error('Failed to run workflow:', error);
      return false;
    }
  }

  async listWorkflowRuns(perPage = 10): Promise<WorkflowRun[]> {
    try {
      const { data } = await this.octokit.actions.listWorkflowRunsForRepo({
        owner: this.owner,
        repo: this.repo,
        per_page: perPage,
      });

      return data.workflow_runs.map((run) => ({
        id: run.id,
        name: run.name || '',
        headBranch: run.head_branch || '',
        headSha: run.head_sha || '',
        status: run.status as 'queued' | 'in_progress' | 'completed',
        conclusion: run.conclusion,
        workflowId: run.workflow_id,
        runNumber: run.run_number,
        runStartedAt: run.run_started_at || '',
        updatedAt: run.updated_at || '',
        htmlUrl: run.html_url || '',
      }));
    } catch (error) {
      console.error('Failed to list workflow runs:', error);
      return [];
    }
  }

  async getAuthenticatedUser(): Promise<{ login: string; name: string; email: string } | null> {
    try {
      const { data } = await this.octokit.users.getAuthenticated();
      return {
        login: data.login || '',
        name: data.name || '',
        email: data.email || '',
      };
    } catch (error) {
      console.error('Failed to get authenticated user:', error);
      return null;
    }
  }

  async listRepositories(perPage = 30): Promise<Repository[]> {
    try {
      const { data } = await this.octokit.repos.listForAuthenticatedUser({
        per_page: perPage,
        sort: 'updated',
      });

      return data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        htmlUrl: repo.html_url,
        defaultBranch: repo.default_branch || 'main',
        language: repo.language,
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count,
        updatedAt: repo.updated_at || '',
      }));
    } catch (error) {
      console.error('Failed to list repositories:', error);
      return [];
    }
  }
}
