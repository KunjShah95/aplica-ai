import { fileSystemExecutor, sandboxExecutor } from '../../execution/index.js';
export const manifest = {
    name: 'code',
    version: '1.0.0',
    description: 'Code execution and file manipulation skill',
    triggers: [
        { type: 'keyword', value: 'write code', description: 'Write code to a file' },
        { type: 'keyword', value: 'read file', description: 'Read a file' },
        { type: 'keyword', value: 'run code', description: 'Execute code in sandbox' },
        { type: 'keyword', value: 'list files', description: 'List directory contents' },
        { type: 'keyword', value: 'search files', description: 'Search for files' },
        { type: 'command', value: '/code', description: 'Execute code command' },
    ],
    parameters: [
        {
            name: 'action',
            type: 'string',
            required: true,
            description: 'Action to perform',
            enum: ['write', 'read', 'run', 'list', 'search', 'delete'],
        },
        { name: 'path', type: 'string', required: false, description: 'File/directory path' },
        { name: 'content', type: 'string', required: false, description: 'Code/file content' },
        {
            name: 'language',
            type: 'string',
            required: false,
            description: 'Programming language',
            default: 'javascript',
        },
        { name: 'pattern', type: 'string', required: false, description: 'Search pattern' },
        {
            name: 'recursive',
            type: 'boolean',
            required: false,
            description: 'Search recursively',
            default: true,
        },
    ],
    permissions: ['filesystem', 'sandbox'],
    examples: [
        'write code to src/test.js',
        'read file config.json',
        'run code console.log("hello")',
        'list files in src/',
        'search files *.ts',
    ],
};
export class CodeSkill {
    manifest = manifest;
    async execute(context) {
        const { parameters } = context;
        const action = parameters.action;
        try {
            switch (action) {
                case 'write':
                    const writePath = parameters.path;
                    const content = parameters.content;
                    if (!writePath || content === undefined) {
                        return { success: false, output: 'Path and content are required' };
                    }
                    const writeResult = await fileSystemExecutor.writeFile(writePath, content);
                    return {
                        success: writeResult.success,
                        output: writeResult.success
                            ? `Written to ${writePath}`
                            : `Failed to write: ${writeResult.error}`,
                    };
                case 'read':
                    const readPath = parameters.path;
                    if (!readPath) {
                        return { success: false, output: 'Path is required' };
                    }
                    const readResult = await fileSystemExecutor.readFile(readPath);
                    return {
                        success: readResult.success,
                        output: readResult.success
                            ? `Content of ${readPath}:\n\n${readResult.data}`
                            : `Failed to read: ${readResult.error}`,
                        data: { content: readResult.data },
                    };
                case 'run':
                    const code = parameters.content;
                    const language = parameters.language || 'javascript';
                    if (!code) {
                        return { success: false, output: 'Code content is required' };
                    }
                    const runResult = await sandboxExecutor.executeJavaScript(code);
                    return {
                        success: runResult.success,
                        output: runResult.success
                            ? `Output:\n${runResult.output}`
                            : `Error: ${runResult.error}`,
                        data: { stdout: runResult.output, stderr: runResult.error },
                    };
                case 'list':
                    const listPath = parameters.path || '.';
                    const listResult = await fileSystemExecutor.listDirectory(listPath);
                    return {
                        success: listResult.success,
                        output: listResult.success
                            ? `Contents of ${listPath}:\n${this.formatFileList(listResult.data)}`
                            : `Failed to list: ${listResult.error}`,
                        data: { files: listResult.data },
                    };
                case 'search':
                    const pattern = parameters.pattern;
                    if (!pattern) {
                        return { success: false, output: 'Pattern is required' };
                    }
                    const searchResult = await fileSystemExecutor.search({
                        pattern,
                        recursive: parameters.recursive,
                    });
                    return {
                        success: searchResult.success,
                        output: searchResult.success
                            ? `Found ${this.countResults(searchResult.data)} matches`
                            : `Search failed: ${searchResult.error}`,
                        data: { results: searchResult.data },
                    };
                case 'delete':
                    const deletePath = parameters.path;
                    if (!deletePath) {
                        return { success: false, output: 'Path is required' };
                    }
                    const deleteResult = await fileSystemExecutor.deleteFile(deletePath);
                    return {
                        success: deleteResult.success,
                        output: deleteResult.success
                            ? `Deleted ${deletePath}`
                            : `Failed to delete: ${deleteResult.error}`,
                    };
                default:
                    return { success: false, output: `Unknown action: ${action}` };
            }
        }
        catch (error) {
            return {
                success: false,
                output: `Code skill error: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
    formatFileList(data) {
        if (!data)
            return '';
        try {
            const files = JSON.parse(data);
            return files
                .map((f) => `${f.isDirectory ? '📁' : '📄'} ${f.name}${f.size ? ` (${this.formatSize(f.size)})` : ''}`)
                .join('\n');
        }
        catch {
            return data;
        }
    }
    formatSize(bytes) {
        if (bytes < 1024)
            return `${bytes}B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }
    countResults(data) {
        if (!data)
            return 0;
        try {
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed.length : 0;
        }
        catch {
            return 0;
        }
    }
}
//# sourceMappingURL=code.js.map