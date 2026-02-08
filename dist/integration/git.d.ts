export interface GitConfig {
    repoPath?: string;
    remoteUrl?: string;
    branch?: string;
    username?: string;
    email?: string;
    token?: string;
}
export interface CommitInfo {
    hash: string;
    message: string;
    author: string;
    date: string;
    files: string[];
}
export interface BranchInfo {
    name: string;
    commit: string;
    isRemote: boolean;
}
export interface PRInfo {
    number: number;
    title: string;
    body: string;
    state: string;
    sourceBranch: string;
    targetBranch: string;
    author: string;
    createdAt: string;
    url?: string;
}
export interface DiffInfo {
    files: Array<{
        file: string;
        additions: number;
        deletions: number;
        changes: number;
        patch?: string;
    }>;
    totalAdditions: number;
    totalDeletions: number;
}
export declare class GitService {
    private repos;
    private getRepo;
    clone(repoUrl: string, targetPath: string, options?: {
        branch?: string;
        depth?: number;
    }): Promise<void>;
    init(workdir: string, options?: {
        bare?: boolean;
        remoteUrl?: string;
    }): Promise<void>;
    configure(workdir: string, username: string, email: string): Promise<void>;
    status(workdir: string): Promise<{
        current: string;
        detached: boolean;
        ahead: number;
        behind: number;
        staged: string[];
        unstaged: string[];
        untracked: string[];
    }>;
    add(workdir: string, files: string[] | '.'): Promise<void>;
    commit(workdir: string, message: string): Promise<CommitInfo>;
    private parseCommitFiles;
    push(workdir: string, remote?: string, branch?: string): Promise<void>;
    pull(workdir: string, remote?: string, branch?: string): Promise<void>;
    checkout(workdir: string, branch: string, createBranch?: boolean): Promise<void>;
    branch(workdir: string, options?: {
        remote?: boolean;
    }): Promise<BranchInfo[]>;
    createBranch(workdir: string, branchName: string, checkout?: boolean): Promise<void>;
    deleteBranch(workdir: string, branchName: string, force?: boolean): Promise<void>;
    merge(workdir: string, sourceBranch: string, targetBranch?: string): Promise<{
        success: boolean;
        conflicts?: string[];
        message?: string;
    }>;
    diff(workdir: string, commit1?: string, commit2?: string): Promise<DiffInfo>;
    log(workdir: string, options?: {
        maxCount?: number;
        from?: string;
        to?: string;
    }): Promise<CommitInfo[]>;
    stash(workdir: string, message?: string): Promise<void>;
    stashPop(workdir: string): Promise<void>;
    listStashes(workdir: string): Promise<Array<{
        index: number;
        message: string;
        hash: string;
    }>>;
    getFileContent(workdir: string, filePath: string, commit?: string): Promise<string>;
    revert(workdir: string, commit: string): Promise<void>;
    reset(workdir: string, commit: string, mode?: 'soft' | 'mixed' | 'hard'): Promise<void>;
    tag(workdir: string, tagName: string, message?: string, commit?: string): Promise<void>;
    listTags(workdir: string): Promise<Array<{
        name: string;
        hash: string;
    }>>;
    getRemotes(workdir: string): Promise<Array<{
        name: string;
        url: string;
    }>>;
    addRemote(workdir: string, name: string, url: string): Promise<void>;
    removeRemote(workdir: string, name: string): Promise<void>;
    fetch(workdir: string, remote?: string): Promise<void>;
    tagDelete(workdir: string, tagName: string): Promise<void>;
}
export declare const gitService: GitService;
//# sourceMappingURL=git.d.ts.map