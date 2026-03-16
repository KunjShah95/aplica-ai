import React from 'react';
import {
  Zap,
  Play,
  GitBranch,
  ArrowRightLeft,
  Bot,
  Repeat,
  GitFork,
  Plus,
  Cpu,
  Brain,
  Workflow,
  Sparkles,
} from 'lucide-react';
import { NodeType } from '../../store/workflowStore';

interface NodePanelProps {
  onAddNode: (type: NodeType, position: [number, number]) => void;
}

const nodeTypes: {
  type: NodeType;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    type: 'trigger',
    label: 'Trigger',
    icon: <Zap className="w-5 h-5" />,
    description: 'Start workflow on events',
  },
  {
    type: 'action',
    label: 'Action',
    icon: <Play className="w-5 h-5" />,
    description: 'Perform an action',
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: <GitBranch className="w-5 h-5" />,
    description: 'Branch based on logic',
  },
  {
    type: 'transform',
    label: 'Transform',
    icon: <ArrowRightLeft className="w-5 h-5" />,
    description: 'Transform data',
  },
  {
    type: 'agent',
    label: 'AI Agent',
    icon: <Bot className="w-5 h-5" />,
    description: 'Use AI for tasks',
  },
  {
    type: 'loop',
    label: 'Loop',
    icon: <Repeat className="w-5 h-5" />,
    description: 'Repeat steps',
  },
  {
    type: 'parallel',
    label: 'Parallel',
    icon: <GitFork className="w-5 h-5" />,
    description: 'Run branches simultaneously',
  },
];

const colors: Record<NodeType, { bg: string; border: string; text: string; glow: string }> = {
  trigger: {
    bg: 'bg-neon-green/10',
    border: 'border-neon-green/30',
    text: 'text-neon-green',
    glow: 'hover:shadow-[0_0_20px_rgba(57,255,20,0.3)]',
  },
  action: {
    bg: 'bg-neon-cyan/10',
    border: 'border-neon-cyan/30',
    text: 'text-neon-cyan',
    glow: 'hover:shadow-[0_0_20px_rgba(0,245,255,0.3)]',
  },
  condition: {
    bg: 'bg-neon-amber/10',
    border: 'border-neon-amber/30',
    text: 'text-neon-amber',
    glow: 'hover:shadow-[0_0_20px_rgba(255,190,11,0.3)]',
  },
  transform: {
    bg: 'bg-neon-purple/10',
    border: 'border-neon-purple/30',
    text: 'text-neon-purple',
    glow: 'hover:shadow-[0_0_20px_rgba(176,38,255,0.3)]',
  },
  agent: {
    bg: 'bg-neon-magenta/10',
    border: 'border-neon-magenta/30',
    text: 'text-neon-magenta',
    glow: 'hover:shadow-[0_0_20px_rgba(255,0,255,0.3)]',
  },
  loop: {
    bg: 'bg-neon-pink/10',
    border: 'border-neon-pink/30',
    text: 'text-neon-pink',
    glow: 'hover:shadow-[0_0_20px_rgba(255,7,58,0.3)]',
  },
  parallel: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    glow: 'hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]',
  },
};

export default function NodePanel({ onAddNode }: NodePanelProps) {
  return (
    <div className="w-72 bg-dark-900/80 backdrop-blur-xl border-r border-glass-border flex flex-col">
      <div className="p-5 border-b border-glass-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-display font-semibold text-white">Add Nodes</h2>
            <p className="text-xs text-slate-400">Click to add to canvas</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {nodeTypes.map(({ type, label, icon, description }) => (
          <button
            key={type}
            onClick={() => onAddNode(type, [100, 100])}
            className={`
              w-full flex items-center gap-3 p-4 rounded-xl border transition-all duration-300
              ${colors[type].bg}
              ${colors[type].border}
              ${colors[type].glow}
              hover:translate-x-1
            `}
          >
            <div className={`${colors[type].text} p-2 rounded-lg bg-dark-800/50`}>{icon}</div>
            <div className="flex-1 text-left">
              <div className={`font-display font-semibold text-sm ${colors[type].text}`}>
                {label}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{description}</div>
            </div>
            <Plus className={`w-5 h-5 ${colors[type].text} opacity-50`} />
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-glass-border">
        <div className="glass-card p-3 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-neon-amber mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-400">
            <span className="text-neon-amber">Tip:</span> Click a node to configure its properties
          </p>
        </div>
      </div>
    </div>
  );
}
