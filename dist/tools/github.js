import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';
import { createAppAuth } from '@octokit/auth-app';
export class GitHubTool {
    octokit;
    owner = '';
    repo = '';
    constructor(config) {
        const ThrottledOctokit = throttling(Octokit, {
            onRateLimit: (retryAfter, options) => {
                console.warn(`Rate limit exceeded, retrying in ${retryAfter}s`);
                return true;
            },
            onAbuseLimit: (retryAfter, options) => {
                console.warn(`Abuse limit detected, retrying in ${retryAfter}s`);
                return true;
            },
        });
        this.octokit = new ThrottledOctokit({
            auth: config.token,
            authStrategy: config.appId && config.privateKey && config.installationID
                ? createAppAuth({
                    appId: config.appId,
                    privateKey: config.privateKey,
                    installationID: config.installationID,
                })
                : undefined,
            throttle: config.throttle?.enabled
                ? {
                    onRateLimit: (retryAfter, options) => {
                        console.warn(`Rate limit exceeded, retrying in ${retryAfter}s`);
                        return true;
                    },
                    onAbuseLimit: (retryAfter, options) => {
                        console.warn(`Abuse limit detected, retrying in ${retryAfter}s`);
                        return true;
                    },
                }
                : undefined,
        });
    }
    setRepository(owner, repo) {
        this.owner = owner;
        this.repo = repo;
    }
    async getRepository() {
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
        }
        catch (error) {
            console.error('Failed to get repository:', error);
            return null;
        }
    }
    async listIssues(options) {
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
                state: issue.state,
                user: {
                    login: issue.user?.login || '',
                    avatarUrl: issue.user?.avatar_url || '',
                },
                labels: issue.labels.map((label) => ({
                    name: label.name,
                    color: label.color,
                })),
                assignees: (issue.assignees || []).map((user) => ({
                    login: user.login || '',
                    avatarUrl: user.avatar_url || '',
                })),
                createdAt: issue.created_at || '',
                updatedAt: issue.updated_at || '',
                closedAt: issue.closed_at || null,
                htmlUrl: issue.html_url || '',
            }));
        }
        catch (error) {
            console.error('Failed to list issues:', error);
            return [];
        }
    }
    async createIssue(title, body, options) {
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
                state: data.state,
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
        }
        catch (error) {
            console.error('Failed to create issue:', error);
            return null;
        }
    }
    async closeIssue(number) {
        try {
            await this.octokit.issues.update({
                owner: this.owner,
                repo: this.repo,
                issue_number: number,
                state: 'closed',
            });
            return true;
        }
        catch (error) {
            console.error('Failed to close issue:', error);
            return false;
        }
    }
    async addComment(issueNumber, body) {
        try {
            await this.octokit.issues.createComment({
                owner: this.owner,
                repo: this.repo,
                issue_number: issueNumber,
                body,
            });
            return true;
        }
        catch (error) {
            console.error('Failed to add comment:', error);
            return false;
        }
    }
    async listPullRequests(options) {
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
                state: pr.merged_at ? 'merged' : pr.state,
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
                mergeable: pr.mergeable || false,
                additions: pr.additions || 0,
                deletions: pr.deletions || 0,
                changedFiles: pr.changed_files || 0,
                htmlUrl: pr.html_url || '',
                createdAt: pr.created_at || '',
                updatedAt: pr.updated_at || '',
                mergedAt: pr.merged_at || null,
            }));
        }
        catch (error) {
            console.error('Failed to list pull requests:', error);
            return [];
        }
    }
    async getPullRequest(number) {
        try {
            const { data } = await this.octokit.pulls.get({
                owner: this.owner,
                repo: this.repo,
                pull_number: number,
            });
            return {
                id: data.id,
                number: data.number,
                title: data.title,
                body: data.body || '',
                state: data.merged_at ? 'merged' : data.state,
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
        }
        catch (error) {
            console.error('Failed to get pull request:', error);
            return null;
        }
    }
    async mergePullRequest(number, method = 'squash') {
        try {
            await this.octokit.pulls.merge({
                owner: this.owner,
                repo: this.repo,
                pull_number: number,
                merge_method: method,
            });
            return true;
        }
        catch (error) {
            console.error('Failed to merge pull request:', error);
            return false;
        }
    }
    async listCommits(options) {
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
        }
        catch (error) {
            console.error('Failed to list commits:', error);
            return [];
        }
    }
    async getFileContent(path, ref) {
        try {
            const { data } = await this.octokit.repos.getContent({
                owner: this.owner,
                repo: this.repo,
                path,
                ref,
            });
            if (Array.isArray(data))
                return null;
            return {
                name: data.name,
                path: data.path,
                sha: data.sha,
                size: data.size,
                type: data.type,
                content: data.content,
                encoding: data.encoding,
                downloadUrl: data.download_url || '',
            };
        }
        catch (error) {
            console.error('Failed to get file content:', error);
            return null;
        }
    }
    async createOrUpdateFile(path, content, message, options) {
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
        }
        catch (error) {
            console.error('Failed to create/update file:', error);
            return { success: false };
        }
    }
    async deleteFile(path, message, sha) {
        try {
            await this.octokit.repos.deleteFile({
                owner: this.owner,
                repo: this.repo,
                path,
                message,
                sha,
            });
            return true;
        }
        catch (error) {
            console.error('Failed to delete file:', error);
            return false;
        }
    }
    async listBranches() {
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
        }
        catch (error) {
            console.error('Failed to list branches:', error);
            return [];
        }
    }
    async createBranch(name, fromBranch) {
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
        }
        catch (error) {
            console.error('Failed to create branch:', error);
            return false;
        }
    }
    async searchCode(query, options) {
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
        }
        catch (error) {
            console.error('Failed to search code:', error);
            return { totalCount: 0, incompleteResults: false, items: [] };
        }
    }
    async searchIssues(query, options) {
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
        }
        catch (error) {
            console.error('Failed to search issues:', error);
            return { totalCount: 0, incompleteResults: false, items: [] };
        }
    }
    async runWorkflow(workflowId, ref, inputs) {
        try {
            await this.octokit.actions.createWorkflowDispatch({
                owner: this.owner,
                repo: this.repo,
                workflow_id: workflowId,
                ref: ref || 'main',
                inputs,
            });
            return true;
        }
        catch (error) {
            console.error('Failed to run workflow:', error);
            return false;
        }
    }
    async listWorkflowRuns(perPage = 10) {
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
                status: run.status,
                conclusion: run.conclusion,
                workflowId: run.workflow_id,
                runNumber: run.run_number,
                runStartedAt: run.run_started_at || '',
                updatedAt: run.updated_at || '',
                htmlUrl: run.html_url || '',
            }));
        }
        catch (error) {
            console.error('Failed to list workflow runs:', error);
            return [];
        }
    }
    async getAuthenticatedUser() {
        try {
            const { data } = await this.octokit.users.getAuthenticated();
            return {
                login: data.login || '',
                name: data.name || '',
                email: data.email || '',
            };
        }
        catch (error) {
            console.error('Failed to get authenticated user:', error);
            return null;
        }
    }
    async listRepositories(perPage = 30) {
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
        }
        catch (error) {
            console.error('Failed to list repositories:', error);
            return [];
        }
    }
}
//# sourceMappingURL=github.js.map