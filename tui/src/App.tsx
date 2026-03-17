import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import MainMenu from './components/MainMenu.js';
import ResearchView from './components/ResearchView.js';
import ChatView from './components/ChatView.js';
import AutoApplyView from './components/AutoApplyView.js';
import KnowledgeView from './components/KnowledgeView.js';
import SystemStatus from './components/SystemStatus.js';

export type View =
  | 'menu'
  | 'research'
  | 'chat'
  | 'autoapply'
  | 'knowledge'
  | 'status';

export default function App() {
  const { exit } = useApp();
  const [view, setView] = useState<View>('menu');

  useInput((_input, key) => {
    if (key.escape && view !== 'menu') {
      setView('menu');
    }
    if (key.ctrl && _input === 'c') {
      exit();
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        marginBottom={1}
        justifyContent="center"
      >
        <Text bold color="cyan">
          {'  '}⚡ APLICA AI — Terminal Interface
          {'  '}
        </Text>
        {view !== 'menu' && (
          <Text color="gray"> · Press ESC to go back</Text>
        )}
      </Box>

      {/* Content */}
      <Box flexDirection="column" flexGrow={1}>
        {view === 'menu'      && <MainMenu onSelect={setView} />}
        {view === 'research'  && <ResearchView />}
        {view === 'chat'      && <ChatView />}
        {view === 'autoapply' && <AutoApplyView />}
        {view === 'knowledge' && <KnowledgeView />}
        {view === 'status'    && <SystemStatus />}
      </Box>

      {/* Footer */}
      <Box borderStyle="single" borderColor="gray" paddingX={2} marginTop={1}>
        <Text color="gray">
          {'['}Q{']'} Quit{'  '}
          {'['}ESC{']'} Back{'  '}
          {'['}↑↓{']'} Navigate{'  '}
          {'['}Enter{']'} Select
        </Text>
      </Box>
    </Box>
  );
}
