import { create } from "zustand";
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
} from "@reactflow/core";

export type NodeType =
  | "trigger"
  | "action"
  | "condition"
  | "transform"
  | "agent"
  | "loop"
  | "parallel";

export interface WorkflowNodeData {
  label: string;
  type: NodeType;
  description?: string;
  config?: Record<string, unknown>;
  status?: "idle" | "running" | "success" | "error";
}

interface WorkflowState {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  selectedNode: Node<WorkflowNodeData> | null;
  workflowName: string;
  workflowDescription: string;
  isDirty: boolean;

  // Actions
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: NodeType, position: [number, number], label: string) => void;
  updateNodeData: (id: string, data: Partial<WorkflowNodeData>) => void;
  deleteNode: (id: string) => void;
  selectNode: (node: Node<WorkflowNodeData> | null) => void;
  setWorkflowName: (name: string) => void;
  setWorkflowDescription: (desc: string) => void;
  setDirty: (dirty: boolean) => void;
  resetWorkflow: () => void;
  loadWorkflow: (
    nodes: Node<WorkflowNodeData>[],
    edges: Edge[],
    name: string,
    description: string,
  ) => void;
}

const initialNodes: Node<WorkflowNodeData>[] = [
  {
    id: "trigger-1",
    type: "trigger",
    position: { x: 250, y: 50 },
    data: {
      label: "Message Received",
      type: "trigger",
      description: "Triggers when a message is received",
    },
  },
];

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: initialNodes,
  edges: [],
  selectedNode: null,
  workflowName: "Untitled Workflow",
  workflowDescription: "",
  isDirty: false,

  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),

  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
      isDirty: true,
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      isDirty: true,
    });
  },

  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(connection, get().edges),
      isDirty: true,
    });
  },

  addNode: (type: NodeType, position: [number, number], label: string) => {
    const id = `${type}-${Date.now()}`;
    const newNode: Node<WorkflowNodeData> = {
      id,
      type: "workflow",
      position,
      data: {
        label,
        type,
        description: getNodeDescription(type),
        config: getDefaultConfig(type),
      },
    };
    set({
      nodes: [...get().nodes, newNode],
      isDirty: true,
    });
  },

  updateNodeData: (id: string, data: Partial<WorkflowNodeData>) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node,
      ),
      isDirty: true,
    });
  },

  deleteNode: (id: string) => {
    set({
      nodes: get().nodes.filter((node) => node.id !== id),
      edges: get().edges.filter(
        (edge) => edge.source !== id && edge.target !== id,
      ),
      selectedNode: get().selectedNode?.id === id ? null : get().selectedNode,
      isDirty: true,
    });
  },

  selectNode: (node) => set({ selectedNode: node }),

  setWorkflowName: (name) => set({ workflowName: name, isDirty: true }),
  setWorkflowDescription: (desc) =>
    set({ workflowDescription: desc, isDirty: true }),
  setDirty: (dirty) => set({ isDirty: dirty }),

  resetWorkflow: () =>
    set({
      nodes: initialNodes,
      edges: [],
      workflowName: "Untitled Workflow",
      workflowDescription: "",
      isDirty: false,
      selectedNode: null,
    }),

  loadWorkflow: (nodes, edges, name, description) =>
    set({
      nodes,
      edges,
      workflowName: name,
      workflowDescription: description,
      isDirty: false,
      selectedNode: null,
    }),
}));

function getNodeDescription(type: NodeType): string {
  const descriptions: Record<NodeType, string> = {
    trigger: "Starts the workflow based on an event",
    action: "Performs a specific action",
    condition: "Checks a condition and branches",
    transform: "Transforms or processes data",
    agent: "Uses AI agent for complex tasks",
    loop: "Repeats steps multiple times",
    parallel: "Executes multiple branches simultaneously",
  };
  return descriptions[type];
}

function getDefaultConfig(type: NodeType): Record<string, unknown> {
  const configs: Record<NodeType, Record<string, unknown>> = {
    trigger: { event: "message", platform: "telegram" },
    action: { command: "echo", args: [] },
    condition: { operator: "equals", value: "" },
    transform: { operation: "map" },
    agent: { agentType: "general", task: "" },
    loop: { iterations: 5, mode: "times" },
    parallel: { branches: [] },
  };
  return configs[type];
}
