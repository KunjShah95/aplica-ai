import { simpleGit, SimpleGit, CleanOptions } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';

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

export class GitService {
  private repos: Map<string, SimpleGit> = new Map();

  private getRepo(workdir: string): SimpleGit {
    if (!this.repos.has(workdir)) {
      const git = simpleGit({
        baseDir: workdir,
        binary: 'git',
        maxConcurrentProcesses: 10,
      }).clean(CleanOptions.SHOW_UNTRACKED_FILES | CleanOptions.CLEAN_ALL);
      this.repos.set(workdir, git);
    }
    return this.repos.get(workdir)!;
  }

  async clone(
    repoUrl: string,
    targetPath: string,
    options?: { branch?: string; depth?: number }
  ): Promise<void> {
    const git = this.getRepo(targetPath);
    const cloneOptions: string[] = [];

    if (options?.branch) cloneOptions.push('--branch', options.branch);
    if (options?.depth) cloneOptions.push('--depth', options.depth);

    await git.clone(repoUrl, targetPath, cloneOptions);
  }

  async init(workdir: string, options?: { bare?: boolean; remoteUrl?: string }): Promise<void> {
    const git = this.getRepo(workdir);

    if (options?.bare) {
      await git.init(true);
    } else {
      await git.init();
    }

    if (options?.remoteUrl) {
      await git.addRemote('origin', options.remoteUrl);
    }
  }

  async configure(workdir: string, username: string, email: string): Promise<void> {
    const git = this.getRepo(workdir);
    await git.addConfig('user.name', username);
    await git.addConfig('user.email', email);
  }

  async status(workdir: string): Promise<{
    current: string;
    detached: boolean;
    ahead: number;
    behind: number;
    staged: Array<{ file: string; index: string }>;
    unstaged: Array<{ file: string; workingTree: string }>;
    untracked: string[];
  }> {
    const git = this.getRepo(workdir);
    const status = await git.status();

    return {
      current: status.current || '',
      detached: status.detached,
      ahead: status.ahead,
      behind: status.behind,
      staged: status.staged.map((s) => ({ file: s.index, workingTree: s.workingTree })),
      unstaged: status.not_added,
      untracked: status.untracked,
    };
  }

  async add(workdir: string, files: string[] | '.'): Promise<void> {
    const git = this.getRepo(workdir);
    const filesToAdd = files === '.' ? ['.'] : files;
    await git.add(filesToAdd);
  }

  async commit(workdir: string, message: string): Promise<CommitInfo> {
    const git = this.getRepo(workdir);

    const commit = await git.commit(message);

    const log = await git.log({ maxCount: 1 });

    const diff = await git.diff(['HEAD~1', 'HEAD']);

    const files = this.parseCommitFiles(diff);

    return {
      hash: commit.commit,
      message: message,
      author: log.all[0]?.author_name || 'Unknown',
      date: log.all[0]?.date || new Date().toISOString(),
      files,
    };
  }

  private parseCommitFiles(diff: string): string[] {
    const files: string[] = [];
    const fileRegex = /^diff --git a\/(.+) b\//gm;
    let match;

    while ((match = fileRegex.exec(diff)) !== null) {
      files.push(match[1]);
    }

    return files;
  }

  async push(workdir: string, remote: string = 'origin', branch?: string): Promise<void> {
    const git = this.getRepo(workdir);
    await git.push(remote, branch);
  }

  async pull(workdir: string, remote: string = 'origin', branch?: string): Promise<void> {
    const git = this.getRepo(workdir);
    await git.pull(remote, branch);
  }

  async checkout(workdir: string, branch: string, createBranch: boolean = false): Promise<void> {
    const git = this.getRepo(workdir);
    if (createBranch) {
      await git.checkoutLocalBranch(branch);
    } else {
      await git.checkout(branch);
    }
  }

  async branch(workdir: string, options?: { remote?: boolean }): Promise<BranchInfo[]> {
    const git = this.getRepo(workdir);
    const branches = await git.branch(options);

    return branches.all.map((name) => ({
      name,
      commit: branches.branches[name]?.commit || '',
      isRemote: name.startsWith('remotes/'),
    }));
  }

  async createBranch(workdir: string, branchName: string, checkout: boolean = true): Promise<void> {
    const git = this.getRepo(workdir);
    await git.checkoutLocalBranch(branchName);
    if (!checkout) {
      await git.checkout('HEAD');
    }
  }

  async deleteBranch(workdir: string, branchName: string, force: boolean = false): Promise<void> {
    const git = this.getRepo(workdir);
    await git.deleteLocalBranch(branchName, force);
  }

  async merge(
    workdir: string,
    sourceBranch: string,
    targetBranch?: string
  ): Promise<{
    success: boolean;
    conflicts?: string[];
    message?: string;
  }> {
    const git = this.getRepo(workdir);

    if (targetBranch) {
      await git.checkout(targetBranch);
    }

    try {
      await git.merge([sourceBranch]);
      return { success: true, message: 'Merge completed successfully' };
    } catch (error: any) {
      if (error.message?.includes('CONFLICT')) {
        const status = await git.status();
        return {
          success: false,
          conflicts: status.conflicted,
        };
      }
      throw error;
    }
  }

  async diff(workdir: string, commit1?: string, commit2?: string): Promise<DiffInfo> {
    const git = this.getRepo(workdir);

    const args = commit1 ? [commit1, commit2 || 'HEAD'] : [];
    const diff = await git.diff(args);

    const files: DiffInfo['files'] = [];
    let totalAdditions = 0;
    let totalDeletions = 0;

    const fileRegex = /^diff --git a\/(.+) b\/(.+)$/gm;
    const hunkRegex = /^@@ -\d+,\d+ \+(\d+),(\d+) @@/g;
    const additionsRegex = /^\+(?!\+\+)/g;
    const deletionsRegex = /^-(?!\-\-)/g;

    let match;
    let currentFile = '';
    let fileAdditions = 0;
    let fileDeletions = 0;

    const lines = diff.split('\n');

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        if (currentFile) {
          files.push({
            file: currentFile,
            additions: fileAdditions,
            deletions: fileDeletions,
            changes: fileAdditions + fileDeletions,
          });
          totalAdditions += fileAdditions;
          totalDeletions += fileDeletions;
        }
        const fileMatch = line.match(/a\/(.+) b\/(.+)$/);
        currentFile = fileMatch?.[1] || '';
        fileAdditions = 0;
        fileDeletions = 0;
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        fileAdditions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        fileDeletions++;
      }
    }

    if (currentFile) {
      files.push({
        file: currentFile,
        additions: fileAdditions,
        deletions: fileDeletions,
        changes: fileAdditions + fileDeletions,
      });
      totalAdditions += fileAdditions;
      totalDeletions += fileDeletions;
    }

    return { files, totalAdditions, totalDeletions };
  }

  async log(
    workdir: string,
    options?: { maxCount?: number; from?: string; to?: string }
  ): Promise<CommitInfo[]> {
    const git = this.getRepo(workdir);

    const log = await git.log({
      maxCount: options?.maxCount || 20,
      from: options?.from,
      to: options?.to,
    });

    return log.all.map((entry) => ({
      hash: entry.hash,
      message: entry.message,
      author: entry.author_name,
      date: entry.date,
      files: [],
    }));
  }

  async stash(workdir: string, message?: string): Promise<void> {
    const git = this.getRepo(workdir);
    if (message) {
      await git.stash(['push', '-m', message]);
    } else {
      await git.stash(['push']);
    }
  }

  async stashPop(workdir: string): Promise<void> {
    const git = this.getRepo(workdir);
    await git.stash(['pop']);
  }

  async listStashes(
    workdir: string
  ): Promise<Array<{ index: number; message: string; hash: string }>> {
    const git = this.getRepo(workdir);
    const stashList = await git.stash(['list']);

    return stashList
      .split('\n')
      .filter(Boolean)
      .map((line, index) => {
        const match = line.match(/stash@\{(\d+)\}: (.*)/);
        return {
          index: index,
          message: match?.[2] || '',
          hash: '',
        };
      });
  }

  async getFileContent(workdir: string, filePath: string, commit?: string): Promise<string> {
    const git = this.getRepo(workdir);
    return git.show([commit || 'HEAD', filePath]);
  }

  async revert(workdir: string, commit: string): Promise<void> {
    const git = this.getRepo(workdir);
    await git.revert([commit]);
  }

  async reset(
    workdir: string,
    commit: string,
    mode: 'soft' | 'mixed' | 'hard' = 'mixed'
  ): Promise<void> {
    const git = this.getRepo(workdir);
    await git.reset([mode, commit]);
  }

  async tag(workdir: string, tagName: string, message?: string, commit?: string): Promise<void> {
    const git = this.getRepo(workdir);
    const args = ['-a', tagName];

    if (message) {
      args.push('-m', message);
    }
    if (commit) {
      args.push(commit);
    }

    await git.tag(args);
  }

  async listTags(workdir: string): Promise<Array<{ name: string; hash: string }>> {
    const git = this.getRepo(workdir);
    const tags = await git.tags();

    return tags.all.map((name) => ({
      name,
      hash: tags.remotes[name] || '',
    }));
  }

  async getRemotes(workdir: string): Promise<Array<{ name: string; url: string }>> {
    const git = this.getRepo(workdir);
    const remotes = await git.getRemotes(true);

    return remotes.map((r) => ({
      name: r.name,
      url: r.refs.fetch || r.refs.push,
    }));
  }

  async addRemote(workdir: string, name: string, url: string): Promise<void> {
    const git = this.getRepo(workdir);
    await git.addRemote(name, url);
  }

  async removeRemote(workdir: string, name: string): Promise<void> {
    const git = this.getRepo(workdir);
    await git.removeRemote(name);
  }

  async fetch(workdir: string, remote?: string): Promise<void> {
    const git = this.getRepo(workdir);
    await git.fetch(remote);
  }

  async tagDelete(workdir: string, tagName: string): Promise<void> {
    const git = this.getRepo(workdir);
    await git.tag(['-d', tagName]);
  }
}

export const gitService = new GitService();
