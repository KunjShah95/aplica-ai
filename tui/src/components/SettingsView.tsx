import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface Props { onBack: () => void }

interface Setting { label: string; value: string; masked?: boolean; section: string }

const SETTINGS: Setting[] = [
  { section:'API Keys',    label:'OpenAI API Key',      value:'sk-proj-••••••••••••••••XYZ9', masked:true },
  { section:'API Keys',    label:'Anthropic API Key',   value:'sk-ant-••••••••••••••••ABC1', masked:true },
  { section:'Models',      label:'Default Chat Model',  value:'gpt-4o' },
  { section:'Models',      label:'Research Model',      value:'claude-3-5-sonnet' },
  { section:'Preferences', label:'Research Depth',      value:'deep' },
  { section:'Preferences', label:'Notification Sounds', value:'enabled' },
  { section:'Preferences', label:'Auto-save Sessions',  value:'true' },
  { section:'TUI Settings',label:'Theme',               value:'dark' },
  { section:'TUI Settings',label:'Border Style',        value:'round' },
  { section:'TUI Settings',label:'Animation Speed',     value:'normal' },
];

const SECTIONS = [...new Set(SETTINGS.map(s => s.section))];
const SECTION_COLORS: Record<string, string> = {
  'API Keys': 'red', 'Models': 'cyan', 'Preferences': 'yellow', 'TUI Settings': 'magenta'
};

export default function SettingsView({ onBack }: Props) {
  const [cursor, setCursor] = useState(0);

  useInput((_input, key) => {
    if (key.escape) { onBack(); return; }
    if (key.upArrow)   setCursor(c => Math.max(0, c - 1));
    if (key.downArrow) setCursor(c => Math.min(SETTINGS.length - 1, c + 1));
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">⚙  Settings</Text>
      <Text color="gray" dimColor>Read-only — edit keys in App Settings panel · ↑↓ navigate · ESC back</Text>

      <Box flexDirection="column" marginTop={1}>
        {SECTIONS.map(section => (
          <Box key={section} flexDirection="column" marginBottom={1}>
            <Box borderStyle="single" borderColor={SECTION_COLORS[section] as any} paddingX={1} marginBottom={0}>
              <Text bold color={SECTION_COLORS[section] as any}>{section}</Text>
            </Box>
            {SETTINGS.filter(s => s.section === section).map((setting, _i) => {
              const idx = SETTINGS.indexOf(setting);
              const sel = cursor === idx;
              return (
                <Box
                  key={setting.label}
                  paddingX={2}
                  borderStyle={sel ? 'round' : undefined}
                  borderColor={sel ? (SECTION_COLORS[section] as any) : undefined}
                >
                  <Box width={30}>
                    <Text color={sel ? 'white' : 'gray'} bold={sel}>{setting.label}</Text>
                  </Box>
                  <Text color={setting.masked ? 'red' : 'green'}>
                    {setting.masked ? setting.value : setting.value}
                  </Text>
                  {sel && <Text color="gray">  ← selected</Text>}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
