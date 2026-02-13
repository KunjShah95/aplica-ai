import React from "react";
import {
  Play,
  Pause,
  Save,
  Download,
  Upload,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Share2,
  Settings,
} from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore";

interface WorkflowToolbarProps {
  onExecute: () => void;
  isExecuting: boolean;
}

export default function WorkflowToolbar({
  onExecute,
  isExecuting,
}: WorkflowToolbarProps) {
  const {
    workflowName,
    setWorkflowName,
    isDirty,
    setDirty,
    resetWorkflow,
    nodes,
    edges,
  } = useWorkflowStore();

  const handleSave = async () => {
    const workflow = {
      name: workflowName,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
      createdAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowName.toLowerCase().replace(/\s+/g, "-")}.workflow.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDirty(false);
  };

  const handleExport = () => {
    const exportData = {
      workflow: {
        name: workflowName,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowName.toLowerCase().replace(/\s+/g, "-")}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    const shareData = {
      name: workflowName,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    };
    navigator.clipboard.writeText(JSON.stringify(shareData, null, 2));
    alert("Workflow stats copied to clipboard!");
  };

  return (
    <div className="h-14 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="bg-transparent text-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
          placeholder="Untitled Workflow"
        />

        {isDirty && (
          <span className="text-xs text-amber-400">● Unsaved changes</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-slate-800 rounded-lg p-1">
          <button
            className="p-2 hover:bg-slate-700 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-slate-300" />
          </button>
          <button
            className="p-2 hover:bg-slate-700 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-slate-300" />
          </button>
          <button
            className="p-2 hover:bg-slate-700 rounded transition-colors"
            title="Fit View"
          >
            <Maximize className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        <div className="w-px h-6 bg-slate-700 mx-2" />

        <button
          onClick={handleShare}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          title="Share"
        >
          <Share2 className="w-5 h-5 text-slate-300" />
        </button>

        <button
          onClick={handleExport}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          title="Export"
        >
          <Download className="w-5 h-5 text-slate-300" />
        </button>

        <button
          onClick={handleSave}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          title="Save"
        >
          <Save className="w-5 h-5 text-slate-300" />
        </button>

        <button
          onClick={resetWorkflow}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          title="Reset"
        >
          <RotateCcw className="w-5 h-5 text-slate-300" />
        </button>

        <div className="w-px h-6 bg-slate-700 mx-2" />

        <button
          onClick={onExecute}
          disabled={isExecuting || nodes.length === 0}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
            ${
              isExecuting
                ? "bg-amber-500/20 text-amber-400 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-white"
            }
          `}
        >
          {isExecuting ? (
            <>
              <Pause className="w-4 h-4" />
              Executing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Execute Workflow
            </>
          )}
        </button>
      </div>
    </div>
  );
}
