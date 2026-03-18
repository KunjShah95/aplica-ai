import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface Props { onBack: () => void }

interface Job {
  id: number; company: string; role: string; status: string;
  applied: string; score: number; notes: string;
}

const JOBS: Job[] = [
  { id:1,  company:'Google',    role:'SWE II',          status:'interview',  applied:'2025-01-10', score:88, notes:'Phone screen passed' },
  { id:2,  company:'Meta',      role:'Frontend Eng',    status:'applied',    applied:'2025-01-12', score:72, notes:'Awaiting response' },
  { id:3,  company:'Stripe',    role:'Full Stack Dev',  status:'offer',      applied:'2025-01-05', score:95, notes:'Offer: $180k + equity' },
  { id:4,  company:'Netflix',   role:'Senior SWE',      status:'rejected',   applied:'2024-12-20', score:60, notes:'No feedback provided' },
  { id:5,  company:'Airbnb',    role:'React Engineer',  status:'screening',  applied:'2025-01-14', score:80, notes:'HR call scheduled' },
  { id:6,  company:'Shopify',   role:'Backend Dev',     status:'interview',  applied:'2025-01-08', score:85, notes:'Technical round 2' },
  { id:7,  company:'Vercel',    role:'DX Engineer',     status:'applied',    applied:'2025-01-15', score:78, notes:'Submitted portfolio' },
  { id:8,  company:'GitHub',    role:'Staff Engineer',  status:'offer',      applied:'2024-12-28', score:92, notes:'Negotiating salary' },
  { id:9,  company:'Linear',    role:'Product Eng',     status:'rejected',   applied:'2024-12-15', score:55, notes:'Not enough exp' },
  { id:10, company:'Figma',     role:'UI Engineer',     status:'screening',  applied:'2025-01-16', score:82, notes:'Design challenge sent' },
];

const STATUS_FILTERS = ['all','applied','interview','offer','rejected','screening'];

function statusColor(s: string) {
  if (s === 'offer') return 'green';
  if (s === 'interview') return 'yellow';
  if (s === 'screening') return 'yellow';
  if (s === 'rejected') return 'red';
  return 'blue';
}

export default function JobTrackerView({ onBack }: Props) {
  const [cursor, setCursor] = useState(0);
  const [filterIdx, setFilterIdx] = useState(0);
  const [detail, setDetail] = useState<Job | null>(null);

  const filter = STATUS_FILTERS[filterIdx];
  const visible = filter === 'all' ? JOBS : JOBS.filter(j => j.status === filter);

  const stats = {
    total: JOBS.length,
    applied: JOBS.filter(j => j.status === 'applied').length,
    interviews: JOBS.filter(j => j.status === 'interview' || j.status === 'screening').length,
    offers: JOBS.filter(j => j.status === 'offer').length,
  };

  useInput((_input, key) => {
    if (key.escape) { if (detail) setDetail(null); else onBack(); return; }
    if (detail) return;
    if (key.upArrow)   setCursor(c => Math.max(0, c - 1));
    if (key.downArrow) setCursor(c => Math.min(visible.length - 1, c + 1));
    if (key.return && visible[cursor]) setDetail(visible[cursor]);
    const n = parseInt(_input, 10);
    if (!isNaN(n) && n >= 1 && n <= STATUS_FILTERS.length) setFilterIdx(n - 1);
  });

  if (detail) return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">── Job Detail ──────────────────────────</Text>
      <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="cyan" padding={1}>
        <Text><Text bold color="white">Company: </Text><Text color="cyan">{detail.company}</Text></Text>
        <Text><Text bold color="white">Role:    </Text>{detail.role}</Text>
        <Text><Text bold color="white">Status:  </Text><Text color={statusColor(detail.status)}>{detail.status.toUpperCase()}</Text></Text>
        <Text><Text bold color="white">Applied: </Text>{detail.applied}</Text>
        <Text><Text bold color="white">Score:   </Text><Text color="yellow">{detail.score}/100</Text></Text>
        <Text><Text bold color="white">Notes:   </Text><Text color="gray">{detail.notes}</Text></Text>
      </Box>
      <Box marginTop={1}><Text color="gray">Press ESC to go back</Text></Box>
    </Box>
  );

  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="cyan">💼 Job Tracker</Text>
        <Box gap={2}>
          <Text color="white">Total:<Text color="cyan"> {stats.total}</Text></Text>
          <Text color="white">Applied:<Text color="blue"> {stats.applied}</Text></Text>
          <Text color="white">Interviews:<Text color="yellow"> {stats.interviews}</Text></Text>
          <Text color="white">Offers:<Text color="green"> {stats.offers}</Text></Text>
        </Box>
      </Box>

      <Box marginBottom={1} gap={1}>
        {STATUS_FILTERS.map((f, i) => (
          <Text key={f} color={filterIdx === i ? 'cyan' : 'gray'}>[{i+1}]{f}</Text>
        ))}
      </Box>

      <Box flexDirection="column" borderStyle="single" borderColor="gray">
        <Box paddingX={1}>
          <Text bold color="gray">{' #  '}</Text>
          <Text bold color="gray">{'Company         '}</Text>
          <Text bold color="gray">{'Role                  '}</Text>
          <Text bold color="gray">{'Status      '}</Text>
          <Text bold color="gray">{'Applied     '}</Text>
          <Text bold color="gray">{'Score'}</Text>
        </Box>
        {visible.map((job, idx) => {
          const sel = cursor === idx;
          return (
            <Box key={job.id} paddingX={1} borderStyle={sel ? 'round' : undefined} borderColor={sel ? 'cyan' : undefined}>
              <Text color={sel ? 'cyan' : 'gray'}>{String(job.id).padEnd(4)}</Text>
              <Text color={sel ? 'white' : 'gray'}>{job.company.padEnd(16)}</Text>
              <Text color={sel ? 'white' : 'gray'}>{job.role.padEnd(22)}</Text>
              <Text color={statusColor(job.status)}>{job.status.padEnd(12)}</Text>
              <Text color="gray">{job.applied.padEnd(12)}</Text>
              <Text color="yellow">{String(job.score)}</Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}><Text color="gray">↑↓ navigate · Enter view detail · 1-6 filter · ESC back</Text></Box>
    </Box>
  );
}
