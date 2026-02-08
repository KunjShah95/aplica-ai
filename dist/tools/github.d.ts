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
    user: {
        login: string;
        avatarUrl: string;
    };
    labels: {
        name: string;
        color: string;
    }[];
    assignees: {
        login: string;
        avatarUrl: string;
    }[];
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
    user: {
        login: string;
        avatarUrl: string;
    };
    head: {
        ref: string;
        sha: string;
    };
    base: {
        ref: string;
        sha: string;
    };
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
    author: {
        name: string;
        email: string;
        date: string;
    };
    committer: {
        name: string;
        email: string;
        date: string;
    };
    htmlUrl: string;
    files?: {
        filename: string;
        status: string;
        additions: number;
        deletions: number;
    }[];
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
    commit: {
        sha: string;
        url: string;
    };
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
export declare class GitHubTool {
    private octokit;
    private owner;
    private repo;
    constructor(config: GitHubConfig);
    setRepository(owner: string, repo: string): void;
    getRepository(): Promise<Repository | null>;
    listIssues(options?: {
        state?: 'open' | 'closed' | 'all';
        labels?: string;
        assignee?: string;
        creator?: string;
        perPage?: number;
    }): Promise<Issue[]>;
    createIssue(title: string, body: string, options?: {
        labels?: string[];
        assignees?: string[];
    }): Promise<Issue | null>;
    closeIssue(number: number): Promise<boolean>;
    addComment(issueNumber: number, body: string): Promise<boolean>;
    listPullRequests(options?: {
        state?: 'open' | 'closed' | 'all';
        perPage?: number;
    }): Promise<PullRequest[]>;
    getPullRequest(number: number): Promise<PullRequest | null>;
    mergePullRequest(number: number, method?: 'merge' | 'squash' | 'rebase'): Promise<boolean>;
    listCommits(options?: {
        sha?: string;
        path?: string;
        author?: string;
        perPage?: number;
    }): Promise<Commit[]>;
    getFileContent(path: string, ref?: string): Promise<FileContent | null>;
    createOrUpdateFile(path: string, content: string, message: string, options?: {
        sha?: string;
        branch?: string;
    }): Promise<{
        success: boolean;
        sha?: string;
        url?: string;
    }>;
    deleteFile(path: string, message: string, sha: string): Promise<boolean>;
    listBranches(): Promise<Branch[]>;
    createBranch(name: string, fromBranch: string): Promise<boolean>;
    searchCode(query: string, options?: {
        language?: string;
        repo?: string;
        user?: string;
        perPage?: number;
    }): Promise<SearchResult>;
    searchIssues(query: string, options?: {
        state?: 'open' | 'closed' | 'all';
        repo?: string;
        perPage?: number;
    }): Promise<SearchResult>;
    runWorkflow(workflowId: string, ref?: string, inputs?: Record<string, string>): Promise<boolean>;
    listWorkflowRuns(perPage?: number): Promise<WorkflowRun[]>;
    getAuthenticatedUser(): Promise<{
        login: string;
        name: string;
        email: string;
    } | null>;
    listRepositories(perPage?: number): Promise<Repository[]>;
}
//# sourceMappingURL=github.d.ts.map