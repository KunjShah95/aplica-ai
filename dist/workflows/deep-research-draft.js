import { workflowEngine } from './engine.js';
import { db } from '../db/index.js';
export async function setupDeepResearchWorkflow() {
    const user = await db.user.findFirst();
    if (!user) {
        console.error('No user found for workflows');
        return;
    }
    // Deep Research Workflow Definition
    await workflowEngine.createWorkflow({
        name: 'Deep Research Agent',
        description: 'Conducts in-depth research on a topic by searching, reading, and synthesizing multiple sources.',
        triggers: [{ type: 'MANUAL', config: {} }],
        steps: [
            // Step 1: Analyze Request & Plan
            {
                id: 'plan_research',
                name: 'Plan Research Strategy',
                type: 'LLM_PROMPT',
                config: {
                    systemPrompt: 'You are a senior research analyst. Create a search strategy for the given topic.',
                    prompt: 'Topic: {{variables.topic}}\n\nGenerate 3 distinct search queries to cover different aspects of this topic. Return as JSON array of strings.',
                    // We need to parse this JSON in the next step, or use a tool to enforce JSON schema. 
                    // For now, we assume the LLM follows instructions or we use a tool in between.
                    // simpler approach: Ask for one main broad query first.
                },
                onSuccess: 'execute_search_1'
            },
            // Step 2: Parallel Searches (Simulated by sequential for now as our engine is simple)
            {
                id: 'execute_search_1',
                name: 'Primary Search',
                type: 'TOOL_EXECUTION',
                config: {
                    tool: 'web_search',
                    input: {
                        query: '{{variables.topic}} plan planning', // This is a placeholder, ideally we use the output from step 1
                        limit: 3
                    }
                },
                onSuccess: 'analyze_search_results'
            },
            // Step 3: Select Best Sources
            {
                id: 'analyze_search_results',
                name: 'Analyze & Select Sources',
                type: 'LLM_PROMPT',
                config: {
                    systemPrompt: 'You are a research assistant. Select the most relevant URLs from the search results.',
                    prompt: 'Search Results: {{stepResults.execute_search_1.results}}\n\nSelect the top 2 most promising URLs to read in depth. Return them as a comma-separated string.'
                },
                onSuccess: 'read_source_1'
            },
            // Step 4: Read Source 1 (We need a way to loop or dynamic dispatch, but hardcoding for MVP)
            // Limitations of current workflow engine: no dynamic looping or mapping. 
            // We will make a "Research Skill" instead that handles the looping logic in code, 
            // and the workflow just calls that skill. This is much more robust for "Viral" quality.
        ],
        isEnabled: true
    }, user.id);
}
//# sourceMappingURL=deep-research-draft.js.map