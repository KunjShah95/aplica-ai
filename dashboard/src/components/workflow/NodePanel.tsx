import React from "react";
import {
  Zap,
  Play,
  GitBranch,
  ArrowRightLeft,
  Bot,
  Repeat,
  GitFork,
  Plus,
} from "lucide-react";
import { NodeType } from "../../store/workflowStore";

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
    type: "trigger",
    label: "Trigger",
    icon: <Zap className="w-5 h-5" />,
    description: "Start workflow on events",
  },
  {
    type: "action",
    label: "Action",
    icon: <Play className="w-5 h-5" />,
    description: "Perform an action",
  },
  {
    type: "condition",
    label: "Condition",
    icon: <GitBranch className="w-5 h-5" />,
    description: "Branch based on logic",
  },
  {
    type: "transform",
    label: "Transform",
    icon: <ArrowRightLeft className="w-5 h-5" />,
    description: "Transform data",
  },
  {
    type: "agent",
    label: "AI Agent",
    icon: <Bot className="w-5 h-5" />,
    description: "Use AI for tasks",
  },
  {
    type: "loop",
    label: "Loop",
    icon: <Repeat className="w-5 h-5" />,
    description: "Repeat steps",
  },
  {
    type: "parallel",
    label: "Parallel",
    icon: <GitFork className="w-5 h-5" />,
    description: "Run branches simultaneously",
  },
];

const colors: Record<NodeType, { bg: string; border: string; text: string }> = {
  trigger: {
    bg: "bg-emerald-500/20",
    border: "border-emerald-500/50",
    text: "text-emerald-400",
  },
  action: {
    bg: "bg-blue-500/20",
    border: "border-blue-500/50",
    text: "text-blue-400",
  },
  condition: {
    bg: "bg-amber-500/20",
    border: "border-amber-500/50",
    text: "text-amber-400",
  },
  transform: {
    bg: "bg-purple-500/20",
    border: "border-purple-500/50",
    text: "text-purple-400",
  },
  agent: {
    bg: "bg-pink-500/20",
    border: "border-pink-500/50",
    text: "text-pink-400",
  },
  loop: {
    bg: "bg-cyan-500/20",
    border: "border-cyan-500/50",
    text: "text-cyan-400",
  },
  parallel: {
    bg: "bg-orange-500/20",
    border: "border-orange-500/50",
    text: "text-orange-400",
  },
};

export default function NodePanel({ onAddNode }: NodePanelProps) {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-white">Add Nodes</h2>
        <p className="text-sm text-slate-400 mt-1">Drag or click to add</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {nodeTypes.map(({ type, label, icon, description }) => (
          <button
            key={type}
            onClick={() => onAddNode(type, [100, 100])}
            className={`
              w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200
              ${colors[type].bg}
              ${colors[type].border}
              hover:ring-2 hover:ring-primary-500/50
            `}
          >
            <div className={colors[type].text}>{icon}</div>
            <div className="flex-1 text-left">
              <div className={`font-medium text-sm ${colors[type].text}`}>
                {label}
              </div>
              <div className="text-xs text-slate-400">{description}</div>
            </div>
            <Plus className="w-4 h-4 text-slate-400" />
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-slate-700">
        <div className="text-xs text-slate-500">
          💡 Tip: Click a node to configure its properties
        </div>
      </div>
    </div>
  );
}
