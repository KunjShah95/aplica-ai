import { Skill, SkillExecutionContext, SkillResult } from '../loader.js';
import { memoryManager } from '../../memory/index.js';

export const manifest: Skill['manifest'] = {
  name: 'memory',
  version: '1.0.0',
  description: 'Memory and context management skill',
  triggers: [
    { type: 'keyword', value: 'remember', description: 'Store a memory' },
    { type: 'keyword', value: 'forget', description: 'Remove a memory' },
    { type: 'keyword', value: 'search memory', description: 'Search memories' },
    { type: 'keyword', value: 'recall', description: 'Recall information' },
    { type: 'keyword', value: 'save note', description: 'Save a note' },
  ],
  parameters: [
    {
      name: 'action',
      type: 'string',
      required: true,
      description: 'Action to perform',
      enum: ['remember', 'forget', 'search', 'recall', 'save_note', 'get_context'],
    },
    { name: 'content', type: 'string', required: false, description: 'Content to remember' },
    { name: 'query', type: 'string', required: false, description: 'Search query' },
    { name: 'id', type: 'string', required: false, description: 'Memory ID to forget' },
    { name: 'title', type: 'string', required: false, description: 'Note title' },
    { name: 'tags', type: 'array', required: false, description: 'Tags for organization' },
    { name: 'type', type: 'string', required: false, description: 'Memory type filter' },
  ],
  permissions: ['memory'],
  examples: [
    'remember that user prefers dark mode',
    'search memory preferences',
    'recall what was discussed about the project',
    'save note Project Ideas with tags project,todo',
    'forget the temporary password',
  ],
};

export class MemorySkill implements Skill {
  manifest = manifest;

  async execute(context: SkillExecutionContext): Promise<SkillResult> {
    const { parameters, userId, conversationId } = context;
    const action = parameters.action as string;

    try {
      switch (action) {
        case 'remember':
          const content = parameters.content as string;
          if (!content) {
            return { success: false, output: 'Content is required' };
          }
          const tags = parameters.tags as string[] | undefined;

          await memoryManager.saveConversation(conversationId, userId, [
            { role: 'user', content: `Remember: ${content}` },
          ]);

          return {
            success: true,
            output: `I'll remember: "${content}"${tags ? ` [${tags.join(', ')}]` : ''}`,
            data: { content, tags },
          };

        case 'search':
          const query = parameters.query as string;
          if (!query) {
            return { success: false, output: 'Query is required' };
          }
          const searchResults = await memoryManager.search({
            query,
            limit: 10,
            type: parameters.type as string,
          });

          const allResults = searchResults.flatMap((r) => r.results);
          const formatted = allResults
            .slice(0, 5)
            .map((r) => `- ${r.content}`)
            .join('\n');

          return {
            success: true,
            output:
              allResults.length > 0
                ? `Found ${allResults.length} memories:\n\n${formatted}`
                : `No memories found for "${query}"`,
            data: { results: allResults },
          };

        case 'recall':
          const recallQuery = parameters.query as string;
          if (!recallQuery) {
            return { success: false, output: 'Query is required' };
          }
          const memories = await memoryManager.remember(recallQuery, { maxResults: 5 });

          return {
            success: true,
            output: memories
              ? `Here's what I recall:\n\n${memories}`
              : `I don't have any memories matching "${recallQuery}"`,
            data: { memories },
          };

        case 'save_note':
          const noteContent = parameters.content as string;
          const noteTitle = (parameters.title as string) || 'Untitled Note';
          const noteTags = parameters.tags as string[] | undefined;

          if (!noteContent) {
            return { success: false, output: 'Note content is required' };
          }

          const note = await memoryManager.saveNote({
            title: noteTitle,
            content: noteContent,
            tags: noteTags || [],
            category: 'user',
          });

          return {
            success: true,
            output: `Saved note: "${noteTitle}"`,
            data: { note },
          };

        case 'forget':
          const memoryId = parameters.id as string;
          if (!memoryId) {
            return { success: false, output: 'Memory ID is required' };
          }
          const deleted = await memoryManager.forget(memoryId);

          return {
            success: deleted,
            output: deleted ? `Memory forgotten` : `Could not find memory to forget`,
          };

        case 'get_context':
          const context = await memoryManager.getContext(userId, conversationId, 2000);

          return {
            success: true,
            output: context || 'No contextual memories found',
            data: { context },
          };

        default:
          return { success: false, output: `Unknown action: ${action}` };
      }
    } catch (error) {
      return {
        success: false,
        output: `Memory error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
