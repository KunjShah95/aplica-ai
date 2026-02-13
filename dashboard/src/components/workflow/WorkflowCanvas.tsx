import React, { useCallback, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
} from "@reactflow/core";
import { useWorkflowStore, NodeType } from "../../store/workflowStore";
import WorkflowNode from "./WorkflowNode";

const nodeTypes = {
  workflow: WorkflowNode,
};

export default function WorkflowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    selectNode,
  } = useWorkflowStore();

  const handleAddNode = useCallback(
    (type: NodeType) => {
      addNode(type, [Math.random() * 400 + 100, Math.random() * 300 + 100]);
    },
    [addNode],
  );

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => selectNode(node as Node)}
        onPaneClick={() => selectNode(null)}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: true,
          style: { stroke: "#64748b", strokeWidth: 2 },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#334155"
        />

        <Controls
          className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl"
          showInteractive={false}
        />

        <MiniMap
          className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl"
          nodeColor={(node) => {
            const colors: Record<NodeType, string> = {
              trigger: "#10b981",
              action: "#3b82f6",
              condition: "#f59e0b",
              transform: "#8b5cf6",
              agent: "#ec4899",
              loop: "#06b6d4",
              parallel: "#f97316",
            };
            return colors[node.data.type] || "#64748b";
          }}
          maskColor="rgba(15, 23, 42, 0.8)"
        />

        <Panel position="top-right">
          <div className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg p-3 text-sm text-slate-400">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span>Trigger</span>
              <span className="w-3 h-3 rounded-full bg-blue-500 ml-2"></span>
              <span>Action</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span>Condition</span>
              <span className="w-3 h-3 rounded-full bg-pink-500 ml-2"></span>
              <span>Agent</span>
            </div>
          </div>
        </Panel>

        <Panel position="bottom-center">
          <div className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-400">
            {nodes.length} nodes • {edges.length} connections
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
