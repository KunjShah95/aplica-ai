import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface Props { onBack: () => void }

interface SiteEntry {
  url: string; title: string; status: 'online' | 'offline' | 'unknown';
  lastChecked: string; keyInfo: string;
}

const INITIAL_SITES: SiteEntry[] = [
  { url:'https://linkedin.com/jobs',    title:'LinkedIn Jobs',        status:'online',  lastChecked:'--:--', keyInfo:'Top job board' },
  { url:'https://news.ycombinator.com', title:'Hacker News',          status:'online',  lastChecked:'--:--', keyInfo:'Tech jobs & news' },
  { url:'https://github.com/trending',  title:'GitHub Trending',      status:'online',  lastChecked:'--:--', keyInfo:'Trending repos' },
  { url:'https://jobs.lever.co',        title:'Lever Job Board',      status:'unknown', lastChecked:'--:--', keyInfo:'ATS job listings' },
  { url:'https://greenhouse.io',        title:'Greenhouse',           status:'unknown', lastChecked:'--:--', keyInfo:'ATS platform' },
  { url:'https://arxiv.org/list/cs.AI', title:'arXiv CS.AI',          status:'online',  lastChecked:'--:--', keyInfo:'AI research papers' },
  { url:'https://remoteok.com',         title:'Remote OK',            status:'unknown', lastChecked:'--:--', keyInfo:'Remote job listings' },
  { url:'https://wellfound.com',        title:'Wellfound (AngelList)', status:'online',  lastChecked:'--:--', keyInfo:'Startup jobs' },
];

const FAKE_INFO: Record<string, string> = {
  'https://linkedin.com/jobs':    '1.2M+ open roles · 340 new today',
  'https://news.ycombinator.com': 'Top story: AI agent frameworks',
  'https://github.com/trending':  '#1 ollama/ollama · 42k stars',
  'https://jobs.lever.co':        '8,400 active postings',
  'https://greenhouse.io':        'Enterprise ATS · connected',
  'https://arxiv.org/list/cs.AI': '47 new papers today',
  'https://remoteok.com':         '890 remote positions today',
  'https://wellfound.com':        '12k startups hiring',
};

function statusColor(s: string) {
  if (s === 'online') return 'green';
  if (s === 'offline') return 'red';
  return 'yellow';
}

export default function BrowserView({ onBack }: Props) {
  const [sites, setSites] = useState<SiteEntry[]>(INITIAL_SITES);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fakeFetch = (idx: number) => {
    setLoading(idx);
    setTimeout(() => {
      const now = new Date().toLocaleTimeString();
      setSites(prev => prev.map((s, i) => i === idx
        ? { ...s, status: 'online', lastChecked: now, keyInfo: FAKE_INFO[s.url] ?? s.keyInfo }
        : s
      ));
      setLoading(null);
    }, 1200);
  };

  const fakeRefreshAll = () => {
    setRefreshing(true);
    let i = 0;
    const tick = () => {
      if (i >= sites.length) { setRefreshing(false); return; }
      const idx = i++;
      const now = new Date().toLocaleTimeString();
      setSites(prev => prev.map((s, j) => j === idx
        ? { ...s, status: 'online', lastChecked: now, keyInfo: FAKE_INFO[s.url] ?? s.keyInfo }
        : s
      ));
      setTimeout(tick, 300);
    };
    setTimeout(tick, 300);
  };

  useInput((_input, key) => {
    if (key.escape) { onBack(); return; }
    if (key.upArrow)   setCursor(c => Math.max(0, c - 1));
    if (key.downArrow) setCursor(c => Math.min(sites.length - 1, c + 1));
    if (key.return && loading === null && !refreshing) fakeFetch(cursor);
    if (_input === 'r' && loading === null && !refreshing) fakeRefreshAll();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="cyan">🌐 Browser / Scraper</Text>
        {refreshing && <Text color="yellow">Refreshing all…</Text>}
      </Box>

      <Box flexDirection="column" borderStyle="single" borderColor="gray">
        <Box paddingX={1}>
          <Text bold color="gray">{'Status   '}</Text>
          <Text bold color="gray">{'URL / Title                          '}</Text>
          <Text bold color="gray">{'Last Checked  '}</Text>
          <Text bold color="gray">{'Key Info'}</Text>
        </Box>
        {sites.map((site, idx) => {
          const sel = cursor === idx;
          const isLoading = loading === idx;
          return (
            <Box key={site.url} paddingX={1} borderStyle={sel ? 'round' : undefined} borderColor={sel ? 'cyan' : undefined}>
              <Text color={statusColor(site.status)}>{isLoading ? '⟳ load ' : `● ${site.status.padEnd(7)}`}</Text>
              <Box flexDirection="column" width={38}>
                <Text color={sel ? 'white' : 'gray'} bold={sel}>{site.title}</Text>
                <Text color="gray" dimColor>{site.url.replace('https://','')}</Text>
              </Box>
              <Text color="gray">{(site.lastChecked + '  ').padEnd(14)}</Text>
              <Text color={sel ? 'yellow' : 'gray'}>{site.keyInfo}</Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">↑↓ navigate · Enter fetch selected · R refresh all · ESC back</Text>
      </Box>
    </Box>
  );
}
