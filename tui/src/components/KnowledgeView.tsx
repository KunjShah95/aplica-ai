import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

type NoteType = 'note' | 'research' | 'code' | 'bookmark' | 'summary';

interface KnowledgeEntry {
  id: string;
  type: NoteType;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<NoteType, string> = {
  note:     '📝',
  research: '🔬',
  code:     '💻',
  bookmark: '🔖',
  summary:  '📋',
};

const TYPE_COLORS: Record<NoteType, string> = {
  note:     'white',
  research: 'cyan',
  code:     'green',
  bookmark: 'yellow',
  summary:  'magenta',
};

const MOCK_ENTRIES: KnowledgeEntry[] = [
  {
    id: '1', type: 'research', title: 'LangGraph multi-agent architectures',
    content: 'LangGraph enables stateful, graph-based LLM workflows. Key features: persistent checkpointing, cycles (agent loops), conditional routing via PostgreSQL or Redis.',
    tags: ['langgraph', 'llm', 'agents'], pinned: true, createdAt: '2025-01-15',
  },
  {
    id: '2', type: 'code', title: 'RAG pipeline boilerplate (TypeScript)',
    content: 'const chain = RunnableSequence.from([retriever, promptTemplate, llm, outputParser]); const result = await chain.invoke({ query });',
    tags: ['rag', 'typescript', 'langchain'], pinned: false, createdAt: '2025-01-14',
  },
  {
    id: '3', type: 'bookmark', title: 'arXiv: Scaling Test-Time Compute',
    content: 'https://arxiv.org/abs/2501.12345 — Shows 3x performance gains using test-time scaling vs training-time scaling.',
    tags: ['arxiv', 'scaling', 'llm'], pinned: true, createdAt: '2025-01-13',
  },
  {
    id: '4', type: 'note', title: 'Interview prep: Anthropic',
    content: 'Focus areas: Constitutional AI, RLHF, safety evaluation, Red teaming. They value thinking from first principles. Bring up Claude\'s character/personality work.',
    tags: ['interview', 'anthropic', 'prep'], pinned: false, createdAt: '2025-01-12',
  },
  {
    id: '5', type: 'summary', title: 'AutoResearcher session: "AI Agents 2025"',
    content: 'Key takeaways: (1) Agentic systems now surpass human baselines on SWE-bench. (2) Memory+retrieval is the bottleneck. (3) Tool-use standardisation via MCP is accelerating.',
    tags: ['ai-agents', 'research', 'summary'], pinned: false, createdAt: '2025-01-11',
  },
];

type Phase = 'list' | 'detail' | 'add';

export default function KnowledgeView() {
  const [phase, setPhase] = useState<Phase>('list');
  const [cursor, setCursor] = useState(0);
  const [entries, setEntries] = useState<KnowledgeEntry[]>(MOCK_ENTRIES);
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);
  const [filterType, setFilterType] = useState<NoteType | 'all'>('all');
  const [addBuffer, setAddBuffer] = useState('');

  const filtered = filterType === 'all' ? entries : entries.filter((e) => e.type === filterType);

  useInput((input, key) => {
    if (phase === 'list') {
      if (key.upArrow)   setCursor((c) => (c - 1 + filtered.length) % filtered.length);
      if (key.downArrow) setCursor((c) => (c + 1) % filtered.length);
      if (key.return && filtered.length > 0) {
        setSelectedEntry(filtered[cursor]);
        setPhase('detail');
      }
      if (input === 'a' || input === 'A') {
        setPhase('add');
        setAddBuffer('');
      }
      if (input === 'f' || input === 'F') {
        const types: (NoteType | 'all')[] = ['all', 'note', 'research', 'code', 'bookmark', 'summary'];
        const idx = types.indexOf(filterType);
        setFilterType(types[(idx + 1) % types.length]);
        setCursor(0);
      }
      if (input === 'p' && filtered.length > 0) {
        const id = filtered[cursor].id;
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, pinned: !e.pinned } : e)));
      }
    } else if (phase === 'detail') {
      if (key.escape || input === 'q' || input === 'Q') {
        setSelectedEntry(null);
        setPhase('list');
      }
    } else if (phase === 'add') {
      if (key.return && addBuffer.trim()) {
        const newEntry: KnowledgeEntry = {
          id: `k${Date.now()}`,
          type: 'note',
          title: addBuffer.trim().slice(0, 50),
          content: addBuffer.trim(),
          tags: [],
          pinned: false,
          createdAt: new Date().toISOString().split('T')[0],
        };
        setEntries((prev) => [newEntry, ...prev]);
        setPhase('list');
        setCursor(0);
      } else if (key.escape) {
        setPhase('list');
      } else if (key.backspace || key.delete) {
        setAddBuffer((b) => b.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setAddBuffer((b) => b + input);
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="green">📚 Knowledge Base</Text>
        <Text color="gray"> — {filtered.length} entries</Text>
        {filterType !== 'all' && (
          <Text color="yellow"> [{filterType}]</Text>
        )}
      </Box>

      {phase === 'list' && (
        <Box flexDirection="column">
          {filtered.length === 0 && (
            <Text color="gray" dimColor>No entries. Press [A] to add one.</Text>
          )}
          {filtered.map((entry, idx) => {
            const isSelected = cursor === idx;
            return (
              <Box
                key={entry.id}
                paddingX={1}
                borderStyle={isSelected ? 'single' : undefined}
                borderColor={isSelected ? 'green' : undefined}
              >
                <Text color={TYPE_COLORS[entry.type] as any}>{TYPE_ICONS[entry.type]}{'  '}</Text>
                {entry.pinned && <Text color="yellow">📌 </Text>}
                <Text color={isSelected ? 'white' : 'gray'} bold={isSelected}>
                  {entry.title.slice(0, 40).padEnd(42)}
                </Text>
                <Text color="gray" dimColor>{entry.createdAt}</Text>
              </Box>
            );
          })}
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              ↑↓ navigate · Enter view · [A] add · [F] filter · [P] pin · ESC back
            </Text>
          </Box>
        </Box>
      )}

      {phase === 'detail' && selectedEntry && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={TYPE_COLORS[selectedEntry.type] as any}
          paddingX={2}
          paddingY={1}
        >
          <Box marginBottom={1}>
            <Text bold color={TYPE_COLORS[selectedEntry.type] as any}>
              {TYPE_ICONS[selectedEntry.type]} {selectedEntry.title}
            </Text>
          </Box>
          <Box flexDirection="column" marginBottom={1}>
            {selectedEntry.content.split('. ').map((sentence, i) => (
              <Text key={i} color="white">{sentence.trim()}{sentence.trim() ? '.' : ''}</Text>
            ))}
          </Box>
          {selectedEntry.tags.length > 0 && (
            <Box gap={2} marginBottom={1}>
              {selectedEntry.tags.map((tag) => (
                <Text key={tag} color="cyan">#{tag}</Text>
              ))}
            </Box>
          )}
          <Text color="gray" dimColor>Created: {selectedEntry.createdAt}</Text>
          <Box marginTop={1}>
            <Text color="gray" dimColor>[Q] Back to list</Text>
          </Box>
        </Box>
      )}

      {phase === 'add' && (
        <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={2} paddingY={1}>
          <Text bold color="green">📝 Add Note</Text>
          <Box marginTop={1}>
            <Text color="white">Content: </Text>
            <Text color="cyan">{addBuffer}<Text color="gray">█</Text></Text>
          </Box>
          <Box marginTop={1}>
            <Text color="gray" dimColor>Enter to save · ESC to cancel</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
