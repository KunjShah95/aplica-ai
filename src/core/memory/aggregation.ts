import { db } from '../../db/index.js';
import { createProvider } from '../llm/index.js';
import type { AppConfig } from '../../config/types.js';

export async function aggregateMemories(config: AppConfig) {
  console.log('[🧠 Memory] Starting aggregation cycle...');
  const llm = createProvider(config.llm);

  // 1. Fetch recent ephemeral memories (last 24h)
  // We assume 'postgresMemory' stores raw logs.
  // For now, let's simulate fetching recent conversations.
  const recentConvos = await db.conversation.findMany({
    where: {
      updatedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    include: {
      messages: true,
    },
  });

  if (recentConvos.length === 0) {
    console.log('[🧠 Memory] No new memories to consolidate.');
    return;
  }

  // 2. Synthesize key learnings
  const conversationSummaries = recentConvos
    .map((c) => {
      const text = c.messages.map((m) => `${m.role}: ${m.content}`).join('\n');
      return `Conversation ${c.id}:\n${text}`;
    })
    .join('\n\n---\n\n');

  const prompt = `
        Analyze the following conversations. Extract key facts about the user, their preferences, 
        and important project details. Ignore trivial chit-chat.
        
        Format as a list of distinct facts:
        - User prefers dark mode.
        - Project X deadline is Friday.
        
        Conversations:
        ${conversationSummaries}
    `;

  const summary = await llm.complete([
    { role: 'system', content: 'You are a memory consolidation engine.' },
    { role: 'user', content: prompt },
  ]);

  // 3. Store permanent memory facts
  // We would store these in a specialized "Facts" table or vector store.
  // For simplicity, we log them or store as a "Memory" type log.

  console.log('[🧠 Memory] Consolidated Facts:', summary.content);

  await db.memory.create({
    data: {
      type: 'CONVERSATION_SUMMARY',
      content: summary.content,
      metadata: { source: 'daily_aggregation', count: recentConvos.length },
      userId: 'system',
    },
  });
}
