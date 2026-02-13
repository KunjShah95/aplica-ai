import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@reactflow/core";
import {
  Zap,
  Play,
  GitBranch,
  ArrowRightLeft,
  Bot,
  Repeat,
  GitFork,
} from "lucide-react";
import { NodeType, WorkflowNodeData } from "../../store/workflowStore";

const nodeColors: Record<
  NodeType,
  { bg: string; border: string; text: string; icon: React.ReactNode }
> = {
  trigger: {
    bg: "bg-emerald-500/20",
    border: "border-emerald-500",
    text: "text-emerald-400",
    icon: <Zap className="w-4 h-4" />,
  },
  action: {
    bg: "bg-blue-500/20",
    border: "border-blue-500",
    text: "text-blue-400",
    icon: <Play className="w-4 h-4" />,
  },
  condition: {
    bg: "bg-amber-500/20",
    border: "border-amber-500",
    text: "text-amber-400",
    icon: <GitBranch className="w-4 h-4" />,
  },
  transform: {
    bg: "bg-purple-500/20",
    border: "border-purple-500",
    text: "text-purple-400",
    icon: <ArrowRightLeft className="w-4 h-4" />,
  },
  agent: {
    bg: "bg-pink-500/20",
    border: "border-pink-500",
    text: "text-pink-400",
    icon: <Bot className="w-4 h-4" />,
  },
  loop: {
    bg: "bg-cyan-500/20",
    border: "border-cyan-500",
    text: "text-cyan-400",
    icon: <Repeat className="w-4 h-4" />,
  },
  parallel: {
    bg: "bg-orange-500/20",
    border: "border-orange-500",
    text: "text-orange-400",
    icon: <GitFork className="w-4 h-4" />,
  },
};

const nodeStatusColors = {
  idle: "",
  running: "ring-2 ring-yellow-500 animate-pulse",
  success: "ring-2 ring-green-500",
  error: "ring-2 ring-red-500",
};

function WorkflowNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  const colors = nodeColors[data.type];
  const statusColor = nodeStatusColors[data.status || "idle"];

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-slate-800 min-w-[180px]
        ${colors.border}
        ${selected ? "ring-2 ring-primary-500" : ""}
        ${statusColor}
        transition-all duration-200
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-slate-400"
      />

      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors.bg}`}>{colors.icon}</div>

        <div className="flex-1 min-w-0">
          <div className={`font-medium text-sm ${colors.text}`}>
            {data.label}
          </div>
          {data.description && (
            <div className="text-xs text-slate-400 truncate mt-0.5">
              {data.description}
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-slate-400"
      />
    </div>
  );
}

export default memo(WorkflowNode);
