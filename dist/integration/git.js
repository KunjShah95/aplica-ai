import { simpleGit } from 'simple-git';
export class GitService {
    repos = new Map();
    getRepo(workdir) {
        if (!this.repos.has(workdir)) {
            const git = simpleGit({
                baseDir: workdir,
                binary: 'git',
                maxConcurrentProcesses: 10,
            });
            this.repos.set(workdir, git);
        }
        return this.repos.get(workdir);
    }
    async clone(repoUrl, targetPath, options) {
        const git = this.getRepo(targetPath);
        const cloneOptions = [];
        if (options?.branch)
            cloneOptions.push('--branch', options.branch);
        if (options?.depth)
            cloneOptions.push('--depth', String(options.depth));
        await git.clone(repoUrl, targetPath, cloneOptions);
    }
    async init(workdir, options) {
        const git = this.getRepo(workdir);
        if (options?.bare) {
            await git.init(true);
        }
        else {
            await git.init();
        }
        if (options?.remoteUrl) {
            await git.addRemote('origin', options.remoteUrl);
        }
    }
    async configure(workdir, username, email) {
        const git = this.getRepo(workdir);
        await git.addConfig('user.name', username);
        await git.addConfig('user.email', email);
    }
    async status(workdir) {
        const git = this.getRepo(workdir);
        const status = await git.status();
        return {
            current: status.current || '',
            detached: status.detached,
            ahead: status.ahead,
            behind: status.behind,
            staged: status.staged,
            unstaged: status.not_added,
            untracked: status.files.filter(f => f.index === '?' && f.working_dir === '?').map(f => f.path),
        };
    }
    async add(workdir, files) {
        const git = this.getRepo(workdir);
        const filesToAdd = files === '.' ? ['.'] : files;
        await git.add(filesToAdd);
    }
    async commit(workdir, message) {
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
    parseCommitFiles(diff) {
        const files = [];
        const fileRegex = /^diff --git a\/(.+) b\//gm;
        let match;
        while ((match = fileRegex.exec(diff)) !== null) {
            files.push(match[1]);
        }
        return files;
    }
    async push(workdir, remote = 'origin', branch) {
        const git = this.getRepo(workdir);
        await git.push(remote, branch);
    }
    async pull(workdir, remote = 'origin', branch) {
        const git = this.getRepo(workdir);
        await git.pull(remote, branch);
    }
    async checkout(workdir, branch, createBranch = false) {
        const git = this.getRepo(workdir);
        if (createBranch) {
            await git.checkoutLocalBranch(branch);
        }
        else {
            await git.checkout(branch);
        }
    }
    async branch(workdir, options) {
        const git = this.getRepo(workdir);
        const branchOptions = options?.remote ? ['-r'] : [];
        const branches = await git.branch(branchOptions);
        return branches.all.map((name) => ({
            name,
            commit: branches.branches[name]?.commit || '',
            isRemote: name.startsWith('remotes/'),
        }));
    }
    async createBranch(workdir, branchName, checkout = true) {
        const git = this.getRepo(workdir);
        await git.checkoutLocalBranch(branchName);
        if (!checkout) {
            await git.checkout('HEAD');
        }
    }
    async deleteBranch(workdir, branchName, force = false) {
        const git = this.getRepo(workdir);
        await git.deleteLocalBranch(branchName, force);
    }
    async merge(workdir, sourceBranch, targetBranch) {
        const git = this.getRepo(workdir);
        if (targetBranch) {
            await git.checkout(targetBranch);
        }
        try {
            await git.merge([sourceBranch]);
            return { success: true, message: 'Merge completed successfully' };
        }
        catch (error) {
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
    async diff(workdir, commit1, commit2) {
        const git = this.getRepo(workdir);
        const args = commit1 ? [commit1, commit2 || 'HEAD'] : [];
        const diff = await git.diff(args);
        const files = [];
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
            }
            else if (line.startsWith('+') && !line.startsWith('+++')) {
                fileAdditions++;
            }
            else if (line.startsWith('-') && !line.startsWith('---')) {
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
    async log(workdir, options) {
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
    async stash(workdir, message) {
        const git = this.getRepo(workdir);
        if (message) {
            await git.stash(['push', '-m', message]);
        }
        else {
            await git.stash(['push']);
        }
    }
    async stashPop(workdir) {
        const git = this.getRepo(workdir);
        await git.stash(['pop']);
    }
    async listStashes(workdir) {
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
    async getFileContent(workdir, filePath, commit) {
        const git = this.getRepo(workdir);
        return git.show([commit || 'HEAD', filePath]);
    }
    async revert(workdir, commit) {
        const git = this.getRepo(workdir);
        await git.revert(commit);
    }
    async reset(workdir, commit, mode = 'mixed') {
        const git = this.getRepo(workdir);
        await git.reset([mode, commit]);
    }
    async tag(workdir, tagName, message, commit) {
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
    async listTags(workdir) {
        const git = this.getRepo(workdir);
        const tags = await git.tags();
        // TagResult only has 'all' and 'latest' properties, no hash info directly available
        return tags.all.map((name) => ({
            name,
            hash: '', // Hash would require additional git command to fetch
        }));
    }
    async getRemotes(workdir) {
        const git = this.getRepo(workdir);
        const remotes = await git.getRemotes(true);
        return remotes.map((r) => ({
            name: r.name,
            url: r.refs.fetch || r.refs.push,
        }));
    }
    async addRemote(workdir, name, url) {
        const git = this.getRepo(workdir);
        await git.addRemote(name, url);
    }
    async removeRemote(workdir, name) {
        const git = this.getRepo(workdir);
        await git.removeRemote(name);
    }
    async fetch(workdir, remote) {
        const git = this.getRepo(workdir);
        if (remote) {
            await git.fetch({ remote });
        }
        else {
            await git.fetch();
        }
    }
    async tagDelete(workdir, tagName) {
        const git = this.getRepo(workdir);
        await git.tag(['-d', tagName]);
    }
}
export const gitService = new GitService();
//# sourceMappingURL=git.js.map