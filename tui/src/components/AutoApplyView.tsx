import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';

type JobStatus = 'queued' | 'applying' | 'applied' | 'interview' | 'offer' | 'rejected';

interface Job {
  id: string;
  company: string;
  role: string;
  location: string;
  salary: string;
  status: JobStatus;
  matchScore: number;
  platform: string;
}


const STATUS_COLORS: Record<JobStatus, string> = {
  queued:    'gray',
  applying:  'cyan',
  applied:   'blue',
  interview: 'yellow',
  offer:     'green',
  rejected:  'red',
};

const STATUS_ICONS: Record<JobStatus, string> = {
  queued:    '○',
  applying:  '⟳',
  applied:   '●',
  interview: '★',
  offer:     '✓',
  rejected:  '✗',
};

const MOCK_JOBS: Job[] = [
  { id: '1', company: 'Anthropic',    role: 'Senior AI Engineer',      location: 'SF, CA',  salary: '$180-250k', status: 'interview', matchScore: 94, platform: 'LinkedIn'  },
  { id: '2', company: 'OpenAI',       role: 'Research Engineer',       location: 'Remote',  salary: '$200k+',    status: 'applied',   matchScore: 88, platform: 'Direct'    },
  { id: '3', company: 'Mistral AI',   role: 'ML Engineer',             location: 'Paris',   salary: '€120-160k', status: 'queued',    matchScore: 82, platform: 'Wellfound' },
  { id: '4', company: 'Hugging Face', role: 'Developer Advocate',      location: 'Remote',  salary: '$120-160k', status: 'applied',   matchScore: 79, platform: 'LinkedIn'  },
  { id: '5', company: 'DeepMind',     role: 'Research Scientist',      location: 'London',  salary: '£110-140k', status: 'offer',     matchScore: 91, platform: 'Direct'    },
  { id: '6', company: 'Cohere',       role: 'Product Engineer',        location: 'Toronto', salary: 'CA$130k',   status: 'rejected',  matchScore: 68, platform: 'Greenhouse'},
  { id: '7', company: 'Stability AI', role: 'AI Infrastructure Lead',  location: 'Remote',  salary: '$160-200k', status: 'applying',  matchScore: 86, platform: 'Direct'    },
];

// Props removed — ESC handled globally in App


type Phase = 'list' | 'scan' | 'detail';

export default function AutoApplyView() {
  const [phase, setPhase] = useState<Phase>('list');
  const [cursor, setCursor] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const startScan = () => {
    setScanning(true);
    setScanProgress(0);
    setPhase('scan');
    let progress = 0;
    const interval = setInterval(() => {
      progress += 7;
      setScanProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(interval);
        // Add 2 new jobs
        setJobs((prev) => [
          ...prev,
          { id: `new-1`, company: 'xAI', role: 'AI Safety Researcher', location: 'Remote', salary: '$200k+', status: 'queued', matchScore: 89, platform: 'Direct' },
          { id: `new-2`, company: 'Perplexity', role: 'Full-Stack Engineer', location: 'SF, CA', salary: '$160k', status: 'queued', matchScore: 81, platform: 'LinkedIn' },
        ]);
        setScanning(false);
        setPhase('list');
      }
    }, 200);
  };

  useInput((input, key) => {
    if (phase === 'list') {
      if (key.upArrow)   setCursor((c) => (c - 1 + jobs.length) % jobs.length);
      if (key.downArrow) setCursor((c) => (c + 1) % jobs.length);
      if (key.return) {
        setSelectedJob(jobs[cursor]);
        setPhase('detail');
      }
      if (input === 's' || input === 'S') startScan();
    } else if (phase === 'detail') {
      if (key.escape || input === 'q') {
        setSelectedJob(null);
        setPhase('list');
      }
      if (input === 'a' && selectedJob && selectedJob.status === 'queued') {
        setJobs((prev) => prev.map((j) => j.id === selectedJob.id ? { ...j, status: 'applying' } : j));
        setSelectedJob(null);
        setPhase('list');
      }
    }
  });

  const stats = {
    total: jobs.length,
    applied: jobs.filter((j) => ['applied', 'interview', 'offer'].includes(j.status)).length,
    interviews: jobs.filter((j) => j.status === 'interview').length,
    offers: jobs.filter((j) => j.status === 'offer').length,
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="yellow">💼 Auto Apply</Text>
        <Text color="gray"> — AI Job Application Automation</Text>
      </Box>

      {/* Stats row */}
      <Box marginBottom={1} gap={4}>
        <Text color="white">Total: <Text color="cyan" bold>{stats.total}</Text></Text>
        <Text color="white">Applied: <Text color="blue" bold>{stats.applied}</Text></Text>
        <Text color="white">Interviews: <Text color="yellow" bold>{stats.interviews}</Text></Text>
        <Text color="white">Offers: <Text color="green" bold>{stats.offers}</Text></Text>
      </Box>

      {phase === 'scan' && (
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text color="cyan"><Spinner type="dots" /></Text>
            <Text color="cyan"> Scanning job boards… {scanProgress}%</Text>
          </Box>
          <Box marginTop={1}>
            {'█'.repeat(Math.floor(scanProgress / 4)).padEnd(25, '░').split('').map((c, i) => (
              <Text key={i} color={c === '█' ? 'cyan' : 'gray'}>{c}</Text>
            ))}
          </Box>
        </Box>
      )}

      {phase === 'list' && (
        <Box flexDirection="column">
          {/* Header */}
          <Box marginBottom={0} paddingX={1}>
            <Text color="gray" dimColor>
              {'ST  SCORE  COMPANY'.padEnd(18)}
              {'ROLE'.padEnd(28)}
              {'LOCATION'.padEnd(12)}
              {'PLATFORM'}
            </Text>
          </Box>

          {/* Job rows */}
          {jobs.map((job, idx) => {
            const isSelected = cursor === idx;
            return (
              <Box
                key={job.id}
                paddingX={1}
                borderStyle={isSelected ? 'single' : undefined}
                borderColor={isSelected ? 'yellow' : undefined}
              >
                <Text color={STATUS_COLORS[job.status] as any} bold={isSelected}>
                  {STATUS_ICONS[job.status]}{'  '}
                </Text>
                <Text
                  color={job.matchScore >= 90 ? 'green' : job.matchScore >= 80 ? 'yellow' : 'gray'}
                  bold={isSelected}
                >
                  {`${job.matchScore}%`.padEnd(6)}
                </Text>
                <Text color={isSelected ? 'white' : 'gray'} bold={isSelected}>
                  {job.company.slice(0, 14).padEnd(15)}
                </Text>
                <Text color={isSelected ? 'white' : 'gray'}>
                  {job.role.slice(0, 26).padEnd(28)}
                </Text>
                <Text color="gray" dimColor>
                  {job.location.slice(0, 10).padEnd(12)}
                </Text>
                <Text color="gray" dimColor>
                  {job.platform}
                </Text>
              </Box>
            );
          })}

          <Box marginTop={1}>
            <Text color="gray" dimColor>
              ↑↓ navigate · Enter to view · [S] scan new jobs · ESC back
            </Text>
          </Box>
        </Box>
      )}

      {phase === 'detail' && selectedJob && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="yellow"
          paddingX={2}
          paddingY={1}
        >
          <Text bold color="yellow">{selectedJob.company} — {selectedJob.role}</Text>
          <Box marginTop={1} flexDirection="column" gap={0}>
            <Text color="white">📍 Location: <Text color="cyan">{selectedJob.location}</Text></Text>
            <Text color="white">💰 Salary:   <Text color="green">{selectedJob.salary}</Text></Text>
            <Text color="white">🎯 Match:    <Text color={selectedJob.matchScore >= 90 ? 'green' : 'yellow'} bold>{selectedJob.matchScore}%</Text></Text>
            <Text color="white">📋 Platform: <Text color="gray">{selectedJob.platform}</Text></Text>
            <Text color="white">⚙️  Status:   <Text color={STATUS_COLORS[selectedJob.status] as any} bold>{selectedJob.status.toUpperCase()}</Text></Text>
          </Box>
          <Box marginTop={1}>
            {selectedJob.status === 'queued' ? (
              <Text color="gray" dimColor>[A] Apply now · [Q] Back</Text>
            ) : (
              <Text color="gray" dimColor>[Q] Back to list</Text>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );

}
