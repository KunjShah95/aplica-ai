import { X, Settings, Trash2, Sliders, Zap } from 'lucide-react';
import { useWorkflowStore, NodeType } from '../../store/workflowStore';

const nodeTypeLabels: Record<NodeType, string> = {
  trigger: 'Trigger',
  action: 'Action',
  condition: 'Condition',
  transform: 'Transform',
  agent: 'AI Agent',
  loop: 'Loop',
  parallel: 'Parallel',
};

const nodeColors: Record<NodeType, { from: string; to: string; text: string }> = {
  trigger: { from: 'from-neon-green', to: 'to-neon-cyan', text: 'text-neon-green' },
  action: { from: 'from-neon-cyan', to: 'to-neon-purple', text: 'text-neon-cyan' },
  condition: { from: 'from-neon-amber', to: 'to-neon-pink', text: 'text-neon-amber' },
  transform: { from: 'from-neon-purple', to: 'to-neon-magenta', text: 'text-neon-purple' },
  agent: { from: 'from-neon-magenta', to: 'to-neon-pink', text: 'text-neon-magenta' },
  loop: { from: 'from-neon-pink', to: 'to-neon-amber', text: 'text-neon-pink' },
  parallel: { from: 'from-indigo-500', to: 'to-purple-500', text: 'text-indigo-400' },
};

const triggerOptions = [
  { value: 'message', label: 'Message Received' },
  { value: 'schedule', label: 'Scheduled Time' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'keyword', label: 'Keyword Detected' },
  { value: 'command', label: 'Command Received' },
];

const platformOptions = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'discord', label: 'Discord' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'websocket', label: 'WebSocket' },
];

const conditionOperators = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
];

const agentTypes = [
  { value: 'general', label: 'General Assistant' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'coder', label: 'Code Expert' },
  { value: 'writer', label: 'Content Writer' },
  { value: 'analyst', label: 'Data Analyst' },
];

export default function NodeConfigPanel() {
  const { selectedNode, updateNodeData, deleteNode, selectNode } = useWorkflowStore();

  if (!selectedNode) {
    return (
      <div className="w-80 bg-dark-900/80 backdrop-blur-xl border-l border-glass-border p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-800 flex items-center justify-center">
            <Settings className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-slate-500">Select a node to configure</p>
        </div>
      </div>
    );
  }

  const colors = nodeColors[selectedNode.data.type];

  const handleDelete = () => {
    deleteNode(selectedNode.id);
    selectNode(null);
  };

  return (
    <div className="w-80 bg-dark-900/80 backdrop-blur-xl border-l border-glass-border flex flex-col">
      <div className="p-4 border-b border-glass-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to} flex items-center justify-center`}
          >
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-white">
              {nodeTypeLabels[selectedNode.data.type]}
            </h3>
            <p className="text-xs text-slate-500">Configure settings</p>
          </div>
        </div>
        <button
          onClick={() => selectNode(null)}
          className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Label</label>
          <input
            type="text"
            value={selectedNode.data.label}
            onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
          <textarea
            value={selectedNode.data.description || ''}
            onChange={(e) => updateNodeData(selectedNode.id, { description: e.target.value })}
            rows={3}
            className="w-full resize-none"
          />
        </div>

        {selectedNode.data.type === 'trigger' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Trigger Event</label>
              <select
                value={(selectedNode.data.config?.event as string) || 'message'}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      event: e.target.value,
                    },
                  })
                }
                className="w-full"
              >
                {triggerOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Platform</label>
              <select
                value={(selectedNode.data.config?.platform as string) || 'telegram'}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      platform: e.target.value,
                    },
                  })
                }
                className="w-full"
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

        {selectedNode.data.type === 'condition' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Variable</label>
              <input
                type="text"
                placeholder="message.text"
                value={(selectedNode.data.config?.variable as string) || ''}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      variable: e.target.value,
                    },
                  })
                }
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Operator</label>
              <select
                value={(selectedNode.data.config?.operator as string) || 'equals'}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      operator: e.target.value,
                    },
                  })
                }
                className="w-full"
              >
                {conditionOperators.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Value</label>
              <input
                type="text"
                placeholder="hello"
                value={(selectedNode.data.config?.value as string) || ''}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      value: e.target.value,
                    },
                  })
                }
                className="w-full"
              />
            </div>
          </>
        )}

        {selectedNode.data.type === 'action' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Command</label>
              <input
                type="text"
                placeholder="send_message"
                value={(selectedNode.data.config?.command as string) || ''}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      command: e.target.value,
                    },
                  })
                }
                className="w-full"
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
                className="w-full resize-none font-mono text-sm"
              />
            </div>
          </>
        )}

        {selectedNode.data.type === 'agent' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Agent Type</label>
              <select
                value={(selectedNode.data.config?.agentType as string) || 'general'}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      agentType: e.target.value,
                    },
                  })
                }
                className="w-full"
              >
                {agentTypes.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Task</label>
              <textarea
                placeholder="What should the agent do?"
                value={(selectedNode.data.config?.task as string) || ''}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      task: e.target.value,
                    },
                  })
                }
                rows={4}
                className="w-full resize-none"
              />
            </div>
          </>
        )}

        {selectedNode.data.type === 'loop' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Loop Mode</label>
              <select
                value={(selectedNode.data.config?.mode as string) || 'times'}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: {
                      ...selectedNode.data.config,
                      mode: e.target.value,
                    },
                  })
                }
                className="w-full"
              >
                <option value="times">Fixed Iterations</option>
                <option value="while">While Condition</option>
                <option value="foreach">For Each Item</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Iterations</label>
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
                className="w-full"
              />
            </div>
          </>
        )}
      </div>

      <div className="p-4 border-t border-glass-border flex gap-2">
        <button
          onClick={handleDelete}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neon-pink/10 border border-neon-pink/30 text-neon-pink rounded-xl hover:bg-neon-pink/20 transition-all"
        >
          <Trash2 className="w-4 h-4" />
          Delete Node
        </button>
      </div>
    </div>
  );
}
