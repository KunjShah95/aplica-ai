import React from "react";
import { X, Settings, Save, Trash2 } from "lucide-react";
import {
  useWorkflowStore,
  NodeType,
  WorkflowNodeData,
} from "../../store/workflowStore";

const nodeTypeLabels: Record<NodeType, string> = {
  trigger: "Trigger",
  action: "Action",
  condition: "Condition",
  transform: "Transform",
  agent: "AI Agent",
  loop: "Loop",
  parallel: "Parallel",
};

const triggerOptions = [
  { value: "message", label: "Message Received" },
  { value: "schedule", label: "Scheduled Time" },
  { value: "webhook", label: "Webhook" },
  { value: "keyword", label: "Keyword Detected" },
  { value: "command", label: "Command Received" },
];

const platformOptions = [
  { value: "telegram", label: "Telegram" },
  { value: "discord", label: "Discord" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "websocket", label: "WebSocket" },
];

const conditionOperators = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
];

const agentTypes = [
  { value: "general", label: "General Assistant" },
  { value: "researcher", label: "Researcher" },
  { value: "coder", label: "Code Expert" },
  { value: "writer", label: "Content Writer" },
  { value: "analyst", label: "Data Analyst" },
];

export default function NodeConfigPanel() {
  const { selectedNode, updateNodeData, deleteNode, selectNode } =
    useWorkflowStore();

  if (!selectedNode) {
    return (
      <div className="w-80 bg-slate-900 border-l border-slate-700 p-6">
        <div className="text-center text-slate-500">
          <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Select a node to configure its properties</p>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    deleteNode(selectedNode.id);
    selectNode(null);
  };

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">
            {nodeTypeLabels[selectedNode.data.type]}
          </h3>
          <p className="text-xs text-slate-400">Configure node settings</p>
        </div>
        <button
          onClick={() => selectNode(null)}
          className="p-1 hover:bg-slate-800 rounded"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Label
          </label>
          <input
            type="text"
            value={selectedNode.data.label}
            onChange={(e) =>
              updateNodeData(selectedNode.id, { label: e.target.value })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Description
          </label>
          <textarea
            value={selectedNode.data.description || ""}
            onChange={(e) =>
              updateNodeData(selectedNode.id, { description: e.target.value })
            }
            rows={3}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>

        {selectedNode.data.type === "trigger" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Trigger Event
              </label>
              <select
                value={(selectedNode.data.config?.event as string) || "message"}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      event: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {triggerOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Platform
              </label>
              <select
                value={
                  (selectedNode.data.config?.platform as string) || "telegram"
                }
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      platform: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {platformOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {selectedNode.data.type === "condition" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Variable
              </label>
              <input
                type="text"
                placeholder="message.text"
                value={(selectedNode.data.config?.variable as string) || ""}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      variable: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Operator
              </label>
              <select
                value={
                  (selectedNode.data.config?.operator as string) || "equals"
                }
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      operator: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {conditionOperators.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Value
              </label>
              <input
                type="text"
                placeholder="hello"
                value={(selectedNode.data.config?.value as string) || ""}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      value: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </>
        )}

        {selectedNode.data.type === "action" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Command
              </label>
              <input
                type="text"
                placeholder="send_message"
                value={(selectedNode.data.config?.command as string) || ""}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      command: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Arguments (JSON)
              </label>
              <textarea
                placeholder='{"text": "Hello!"}'
                value={JSON.stringify(selectedNode.data.config?.args || {})}
                onChange={(e) => {
                  try {
                    const args = JSON.parse(e.target.value);
                    updateNodeData(selectedNode.id, {
                      config: { ...selectedNode.data.config, args },
                    });
                  } catch {}
                }}
                rows={4}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none font-mono text-sm"
              />
            </div>
          </>
        )}

        {selectedNode.data.type === "agent" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Agent Type
              </label>
              <select
                value={
                  (selectedNode.data.config?.agentType as string) || "general"
                }
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      agentType: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {agentTypes.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Task
              </label>
              <textarea
                placeholder="What should the agent do?"
                value={(selectedNode.data.config?.task as string) || ""}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      task: e.target.value,
                    },
                  })
                }
                rows={4}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
          </>
        )}

        {selectedNode.data.type === "loop" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Loop Mode
              </label>
              <select
                value={(selectedNode.data.config?.mode as string) || "times"}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      mode: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="times">Fixed Iterations</option>
                <option value="while">While Condition</option>
                <option value="foreach">For Each Item</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Iterations
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={(selectedNode.data.config?.iterations as number) || 5}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      iterations: parseInt(e.target.value),
                    },
                  })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </>
        )}
      </div>

      <div className="p-4 border-t border-slate-700 flex gap-2">
        <button
          onClick={handleDelete}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
}
