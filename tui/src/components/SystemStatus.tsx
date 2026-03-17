import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';

interface ApiStatus {
  provider: string;
  status: 'connected' | 'limited' | 'error' | 'unconfigured';
  latency?: number;
  usagePercent?: number;
  icon: string;
}

interface AgentStatus {
  name: string;
  state: 'idle' | 'running' | 'error';
  lastRun: string;
  totalRuns: number;
  avgLatency: string;
  icon: string;
}

const STATUS_COLORS = {
  connected: 'green',
  limited: 'yellow',
  error: 'red',
  unconfigured: 'gray',
  idle: 'gray',
  running: 'cyan',
};

const INITIAL_APIS: ApiStatus[] = [
  { provider: 'OpenAI',     status: 'connected',    latency: 245,  usagePercent: 43, icon: '🟢' },
  { provider: 'Anthropic',  status: 'connected',    latency: 312,  usagePercent: 12, icon: '🟣' },
  { provider: 'Perplexity', status: 'limited',      latency: 512,  usagePercent: 67, icon: '🔵' },
  { provider: 'Groq',       status: 'connected',    latency: 89,   usagePercent: 8,  icon: '⚡' },
  { provider: 'Gemini',     status: 'unconfigured', latency: undefined, usagePercent: 0, icon: '🟡' },
];

const INITIAL_AGENTS: AgentStatus[] = [
  { name: 'ResearchAgent',  state: 'running', lastRun: '2m ago',   totalRuns: 142, avgLatency: '4.2s',  icon: '🔬' },
  { name: 'ChatAgent',      state: 'idle',    lastRun: '5m ago',   totalRuns: 892, avgLatency: '1.1s',  icon: '💬' },
  { name: 'AutoApplyAgent', state: 'idle',    lastRun: '12m ago',  totalRuns: 23,  avgLatency: '8.7s',  icon: '💼' },
  { name: 'BrowserAgent',   state: 'running', lastRun: 'now',      totalRuns: 67,  avgLatency: '3.4s',  icon: '🌐' },
  { name: 'MemoryAgent',    state: 'idle',    lastRun: '1h ago',   totalRuns: 318, avgLatency: '0.8s',  icon: '🧠' },
];

export default function SystemStatus() {
  const [apis, setApis] = useState<ApiStatus[]>(INITIAL_APIS);
  const [agents, setAgents] = useState<AgentStatus[]>(INITIAL_AGENTS);
  const [refreshing, setRefreshing] = useState(false);
  const [uptime] = useState('2h 34m');
  const [memoryUsage] = useState(67);
  const [tick, setTick] = useState(0);

  // Simulated live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      // Randomly vary latencies slightly
      setApis((prev) =>
        prev.map((a) => ({
          ...a,
          latency: a.latency ? a.latency + Math.floor((Math.random() - 0.5) * 30) : undefined,
        }))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  useInput((input, key) => {
    if (input === 'r' || input === 'R') refresh();
  });

  const totalRuns = agents.reduce((s, a) => s + a.totalRuns, 0);
  const runningCount = agents.filter((a) => a.state === 'running').length;

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} justifyContent="space-between">
        <Box>
          <Text bold color="cyan">📊 System Status</Text>
          <Text color="gray"> — Aplica AI v2.1.0</Text>
        </Box>
        <Box>
          {refreshing ? (
            <Text color="cyan"><Spinner type="dots" /> Refreshing…</Text>
          ) : (
            <Text color="gray" dimColor>[R] Refresh</Text>
          )}
        </Box>
      </Box>

      {/* System metrics */}
      <Box marginBottom={1} gap={4}>
        <Text color="white">Uptime: <Text color="green" bold>{uptime}</Text></Text>
        <Text color="white">Memory: <Text color={memoryUsage > 80 ? 'red' : memoryUsage > 60 ? 'yellow' : 'green'} bold>{memoryUsage}%</Text></Text>
        <Text color="white">Agents running: <Text color="cyan" bold>{runningCount}</Text></Text>
        <Text color="white">Total runs: <Text color="white" bold>{totalRuns}</Text></Text>
      </Box>

      {/* API Status */}
      <Box borderStyle="round" borderColor="cyan" paddingX={1} paddingY={0} flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">API Connections</Text>
        <Box flexDirection="column" marginTop={0}>
          {apis.map((api) => (
            <Box key={api.provider} gap={2}>
              <Text>{api.icon}</Text>
              <Text color="white" bold={api.status === 'connected'}>{api.provider.padEnd(12)}</Text>
              <Text color={STATUS_COLORS[api.status] as any}>{api.status.padEnd(14)}</Text>
              {api.latency !== undefined && (
                <Text color={api.latency < 300 ? 'green' : api.latency < 600 ? 'yellow' : 'red'}>
                  {`${api.latency}ms`.padEnd(8)}
                </Text>
              )}
              {api.usagePercent !== undefined && api.usagePercent > 0 && (
                <Box>
                  <Text color="gray">{'['}
                    {'█'.repeat(Math.floor(api.usagePercent / 10))}
                    {'░'.repeat(10 - Math.floor(api.usagePercent / 10))}
                    {']'}
                  </Text>
                  <Text color={api.usagePercent > 80 ? 'yellow' : 'gray'}> {api.usagePercent}%</Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Agent Status */}
      <Box borderStyle="round" borderColor="magenta" paddingX={1} paddingY={0} flexDirection="column">
        <Text bold color="magenta">Agent Health</Text>
        <Box flexDirection="column" marginTop={0}>
          {agents.map((agent) => (
            <Box key={agent.name} gap={2}>
              <Text>{agent.icon}</Text>
              <Text color="white" bold={agent.state === 'running'}>{agent.name.padEnd(16)}</Text>
              {agent.state === 'running' ? (
                <Text color="cyan"><Spinner type="dots" /> running     </Text>
              ) : (
                <Text color={STATUS_COLORS[agent.state] as any}>{agent.state.padEnd(13)}</Text>
              )}
              <Text color="gray">{agent.lastRun.padEnd(10)}</Text>
              <Text color="gray">{`${agent.totalRuns} runs`.padEnd(10)}</Text>
              <Text color="gray">avg {agent.avgLatency}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>Live metrics · tick #{tick} · [R] Refresh · ESC back</Text>
      </Box>
    </Box>
  );
}
