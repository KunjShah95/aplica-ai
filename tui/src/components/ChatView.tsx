import React, { useState, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';

type AgentMode = 'general' | 'researcher' | 'coder' | 'browser' | 'analyst' | 'security';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  mode?: AgentMode;
}

const MODE_CONFIG: Record<AgentMode, { label: string; color: string; icon: string; description: string }> = {
  general:    { label: 'General',    color: 'cyan',    icon: '🤖', description: 'General-purpose AI assistant' },
  researcher: { label: 'Researcher', color: 'magenta', icon: '🔬', description: 'Deep research and analysis' },
  coder:      { label: 'Coder',      color: 'green',   icon: '💻', description: 'Code generation and review' },
  browser:    { label: 'Browser',    color: 'blue',    icon: '🌐', description: 'NanoClaw web automation' },
  analyst:    { label: 'Analyst',    color: 'yellow',  icon: '📊', description: 'Data analysis and insights' },
  security:   { label: 'Security',   color: 'red',     icon: '🔐', description: 'PicoClaw security scanning' },
};

const MOCK_RESPONSES: Record<AgentMode, (msg: string) => string> = {
  general: (msg) => `I understand you're asking about "${msg.slice(0, 40)}…". Here's what I know:\n\nThis is a complex topic that spans multiple domains. Let me break it down systematically for you.\n\nWould you like me to dive deeper into any particular aspect?`,
  researcher: (msg) => `Researching: "${msg.slice(0, 40)}…"\n\n📚 Found 23 relevant sources\n🔍 Key insight: Recent studies show a 47% improvement in related benchmarks\n📊 Consensus across sources: Strong evidence for the hypothesis\n\nGenerating detailed report…`,
  coder: (msg) => `Analysing your request: "${msg.slice(0, 40)}…"\n\n\`\`\`typescript\n// Solution approach:\nfunction solve(input: string): Result {\n  const parsed = parse(input);\n  return transform(parsed);\n}\n\`\`\`\n\nThis implementation handles edge cases and has O(n log n) complexity.`,
  browser: (msg) => `[NanoClaw] Navigating to target page...\n✓ Page loaded: example.com\n✓ Extracted 14 elements\n✓ Found target data: "${msg.slice(0, 30)}"\n\n> Selector: .result-item h2\n> Data: Array(14) with 14 matches\n> Execution time: 1.2s`,
  analyst: (msg) => `Analysing data for: "${msg.slice(0, 40)}…"\n\n📈 Trend: +23% over last 6 months\n📉 Anomaly detected at T-14 days\n🎯 Predicted value (90-day): +34%\n⚠️  Confidence interval: 78%\n\nStatistical significance: p < 0.05`,
  security: (msg) => `[PicoClaw Security Scan] Analysing: "${msg.slice(0, 30)}…"\n\n✓ No SQL injection vectors found\n✓ XSS patterns: none detected\n⚠️  CSRF token missing on 2 endpoints\n⚠️  Outdated dependency: express@4.17.1\n🔐 Overall risk score: 3.2/10 (Low)`,
};

export default function ChatView() {
  const [mode, setMode] = useState<AgentMode>('general');
  const [phase, setPhase] = useState<'mode-select' | 'chat'>('mode-select');
  const [modeCursor, setModeCursor] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputBuffer, setInputBuffer] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const modes = Object.keys(MODE_CONFIG) as AgentMode[];

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;
      const userMsg: Message = { role: 'user', content };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);
      const delay = 800 + Math.random() * 1200;
      setTimeout(() => {
        const reply: Message = {
          role: 'assistant',
          content: MOCK_RESPONSES[mode](content),
          mode,
        };
        setMessages((prev) => [...prev, reply]);
        setIsTyping(false);
      }, delay);
    },
    [mode]
  );

  useInput((input, key) => {
    if (phase === 'mode-select') {
      if (key.upArrow)   setModeCursor((c) => (c - 1 + modes.length) % modes.length);
      if (key.downArrow) setModeCursor((c) => (c + 1) % modes.length);
      if (key.return) {
        setMode(modes[modeCursor]);
        setPhase('chat');
        const mc = MODE_CONFIG[modes[modeCursor]];
        setMessages([{
          role: 'assistant',
          content: `${mc.icon} ${mc.label} agent ready. ${mc.description}. How can I help you?`,
          mode: modes[modeCursor],
        }]);
      }
    } else if (phase === 'chat') {
      if (key.return) {
        sendMessage(inputBuffer);
        setInputBuffer('');
      } else if (key.backspace || key.delete) {
        setInputBuffer((b) => b.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setInputBuffer((b) => b + input);
      }
    }
  });

  const mc = MODE_CONFIG[mode];

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="magenta">💬 Agent Chat</Text>
        {phase === 'chat' && (
          <Text color="gray"> — Mode: <Text color={mc.color as any} bold>{mc.icon} {mc.label}</Text></Text>
        )}
      </Box>

      {phase === 'mode-select' && (
        <Box flexDirection="column">
          <Text color="white">Select agent mode:</Text>
          <Box flexDirection="column" marginTop={1} marginLeft={2}>
            {modes.map((m, idx) => {
              const cfg = MODE_CONFIG[m];
              return (
                <Box key={m} marginBottom={0}>
                  <Text
                    color={modeCursor === idx ? cfg.color as any : 'gray'}
                    bold={modeCursor === idx}
                  >
                    {modeCursor === idx ? '▶ ' : '  '}
                    {cfg.icon} {cfg.label.padEnd(12)}
                    <Text dimColor={modeCursor !== idx}>— {cfg.description}</Text>
                  </Text>
                </Box>
              );
            })}
          </Box>
          <Box marginTop={1}>
            <Text color="gray" dimColor>↑↓ to select · Enter to start chat</Text>
          </Box>
        </Box>
      )}

      {phase === 'chat' && (
        <Box flexDirection="column">
          {/* Messages */}
          <Box
            borderStyle="round"
            borderColor={mc.color as any}
            flexDirection="column"
            paddingX={1}
            paddingY={0}
            minHeight={12}
          >
            {messages.length === 0 && (
              <Text color="gray" dimColor>No messages yet. Type below to start.</Text>
            )}
            {messages.slice(-8).map((msg, idx) => (
              <Box key={idx} marginBottom={0} flexDirection="column">
                <Text
                  color={msg.role === 'user' ? 'cyan' : mc.color as any}
                  bold
                >
                  {msg.role === 'user' ? '> You' : `${mc.icon} ${mc.label}`}:
                </Text>
                {msg.content.split('\n').map((line, li) => (
                  <Text key={li} color="white" dimColor={msg.role === 'assistant'}>
                    {'  '}{line}
                  </Text>
                ))}
              </Box>
            ))}
            {isTyping && (
              <Box>
                <Text color={mc.color as any}>
                  <Spinner type="dots" />
                  {' '}{mc.label} is thinking…
                </Text>
              </Box>
            )}
          </Box>

          {/* Input */}
          <Box marginTop={1}>
            <Text color="cyan" bold>{'> '}</Text>
            <Text color="white">{inputBuffer}<Text color="gray">█</Text></Text>
          </Box>
          <Box>
            <Text color="gray" dimColor>Enter to send · ESC to go back</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
