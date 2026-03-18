import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { View } from '../App.js';

interface MenuItem {
  id: View;
  label: string;
  description: string;
  icon: string;
  color: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'research',
    label: 'Research Assistant',
    description: 'AutoResearcher — deep multi-source research',
    icon: '🔬',
    color: 'cyan',
  },
  {
    id: 'chat',
    label: 'Agent Chat',
    description: '6-mode chat: General / Researcher / Coder / Browser / Analyst / Security',
    icon: '💬',
    color: 'magenta',
  },
  {
    id: 'autoapply',
    label: 'Auto Apply',
    description: 'AI job application automation & pipeline tracker',
    icon: '💼',
    color: 'yellow',
  },
  {
    id: 'knowledge',
    label: 'Knowledge Base',
    description: 'Notes, bookmarks, research and code snippets',
    icon: '📚',
    color: 'green',
  },
  {
    id: 'status',
    label: 'System Status',
    description: 'API usage, agent health, and system metrics',
    icon: '📊',
    color: 'blue',
  },
  {
    id: 'job-tracker',
    label: 'Job Tracker',
    description: 'Track applications, interviews, and offers',
    icon: '📋',
    color: 'yellow',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'API keys, models, preferences, and TUI config',
    icon: '⚙️',
    color: 'gray',
  },
  {
    id: 'browser',
    label: 'Browser / Scraper',
    description: 'Fetch and extract data from URLs',
    icon: '🌐',
    color: 'cyan',
  },
];

interface MainMenuProps {
  onSelect: (view: View) => void;
}

export default function MainMenu({ onSelect }: MainMenuProps) {
  const [cursor, setCursor] = useState(0);

  useInput((_input, key) => {
    if (key.upArrow) {
      setCursor((c) => (c - 1 + MENU_ITEMS.length) % MENU_ITEMS.length);
    }
    if (key.downArrow) {
      setCursor((c) => (c + 1) % MENU_ITEMS.length);
    }
    if (key.return) {
      onSelect(MENU_ITEMS[cursor].id);
    }
    // Number shortcuts
    const num = parseInt(_input, 10);
    if (!isNaN(num) && num >= 1 && num <= MENU_ITEMS.length) {
      onSelect(MENU_ITEMS[num - 1].id);
    }
  });

  return (
    <Box flexDirection="column" alignItems="center" paddingTop={1}>
      <Box marginBottom={2}>
        <Text bold color="cyan">
          {`
  █████╗ ██████╗ ██╗     ██╗ ██████╗ █████╗      █████╗ ██╗
 ██╔══██╗██╔══██╗██║     ██║██╔════╝██╔══██╗    ██╔══██╗██║
 ███████║██████╔╝██║     ██║██║     ███████║    ███████║██║
 ██╔══██║██╔═══╝ ██║     ██║██║     ██╔══██║    ██╔══██║██║
 ██║  ██║██║     ███████╗██║╚██████╗██║  ██║    ██║  ██║██║
 ╚═╝  ╚═╝╚═╝     ╚══════╝╚═╝ ╚═════╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝`}
        </Text>
      </Box>

      <Text color="gray" dimColor>
        Select a feature  (↑↓ to navigate, Enter or 1-5 to select)
      </Text>

      <Box flexDirection="column" marginTop={1} width={70}>
        {MENU_ITEMS.map((item, idx) => {
          const isSelected = cursor === idx;
          return (
            <Box
              key={item.id}
              paddingX={2}
              paddingY={0}
              borderStyle={isSelected ? 'round' : undefined}
              borderColor={isSelected ? item.color as any : undefined}
              marginBottom={isSelected ? 0 : 0}
            >
              <Box width={4}>
                <Text color={isSelected ? 'white' : 'gray'} bold={isSelected}>
                  {`${idx + 1}.`}
                </Text>
              </Box>
              <Box width={4}>
                <Text>{item.icon}</Text>
              </Box>
              <Box flexDirection="column" flexGrow={1}>
                <Text bold color={isSelected ? (item.color as any) : 'white'}>
                  {item.label}
                </Text>
                <Text color="gray" dimColor>
                  {'  '}{item.description}
                </Text>
              </Box>
              {isSelected && (
                <Box>
                  <Text color={item.color as any} bold>
                    {' →'}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      <Box marginTop={2}>
        <Text color="gray" dimColor>
          Built with ❤  using Ink · React for terminals
        </Text>
      </Box>
    </Box>
  );
}
