import { atom } from "jotai";
import { type Node, type Edge, type OnNodesChange, type OnEdgesChange, type OnConnect, applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import { nanoid } from "nanoid";
import { NODE_TYPE_REGISTRY, type NodeSubtype, type NodeCategory } from "@/lib/workflow-node-types";

// Node data types
export type WorkflowNodeType = NodeCategory;

export type WorkflowNodeData = {
  label: string;
  description?: string;
  type: WorkflowNodeType;
  subtype?: string;
  config?: Record<string, unknown>;
  status?: "idle" | "running" | "success" | "error";
  enabled?: boolean;
};

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;

// Core state atoms
export const nodesAtom = atom<WorkflowNode[]>([]);
export const edgesAtom = atom<WorkflowEdge[]>([]);
export const selectedNodeIdAtom = atom<string | null>(null);
export const currentWorkflowIdAtom = atom<string | null>(null);
export const isSavingAtom = atom(false);

// Derived: selected node
export const selectedNodeAtom = atom((get) => {
  const id = get(selectedNodeIdAtom);
  if (!id) return null;
  return get(nodesAtom).find((n) => n.id === id) ?? null;
});

// Derived: upstream nodes (nodes connected before the selected node via edges)
export const upstreamNodesAtom = atom((get) => {
  const selectedId = get(selectedNodeIdAtom);
  if (!selectedId) return [];
  const nodes = get(nodesAtom);
  const edges = get(edgesAtom);

  // Walk edges backwards to find all ancestors
  const visited = new Set<string>();
  const queue = [selectedId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.target === current && !visited.has(edge.source)) {
        visited.add(edge.source);
        queue.push(edge.source);
      }
    }
  }

  return nodes.filter((n) => visited.has(n.id));
});

// Undo/redo history
type HistoryEntry = { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
const historyAtom = atom<HistoryEntry[]>([]);
const futureAtom = atom<HistoryEntry[]>([]);

const pushHistoryAtom = atom(null, (get, set) => {
  const nodes = get(nodesAtom);
  const edges = get(edgesAtom);
  set(historyAtom, [...get(historyAtom).slice(-20), { nodes, edges }]);
  set(futureAtom, []);
});

export const undoAtom = atom(null, (get, set) => {
  const history = get(historyAtom);
  if (history.length === 0) return;
  const current = { nodes: get(nodesAtom), edges: get(edgesAtom) };
  const prev = history[history.length - 1];
  set(historyAtom, history.slice(0, -1));
  set(futureAtom, [...get(futureAtom), current]);
  set(nodesAtom, prev.nodes);
  set(edgesAtom, prev.edges);
});

export const redoAtom = atom(null, (get, set) => {
  const future = get(futureAtom);
  if (future.length === 0) return;
  const current = { nodes: get(nodesAtom), edges: get(edgesAtom) };
  const next = future[future.length - 1];
  set(futureAtom, future.slice(0, -1));
  set(historyAtom, [...get(historyAtom), current]);
  set(nodesAtom, next.nodes);
  set(edgesAtom, next.edges);
});

export const canUndoAtom = atom((get) => get(historyAtom).length > 0);
export const canRedoAtom = atom((get) => get(futureAtom).length > 0);

// Node change handlers
export const onNodesChangeAtom = atom(null, (get, set, changes: Parameters<OnNodesChange>[0]) => {
  set(nodesAtom, applyNodeChanges(changes, get(nodesAtom)) as WorkflowNode[]);
});

export const onEdgesChangeAtom = atom(null, (get, set, changes: Parameters<OnEdgesChange>[0]) => {
  set(edgesAtom, applyEdgeChanges(changes, get(edgesAtom)));
});

export const onConnectAtom = atom(null, (get, set, connection: Parameters<OnConnect>[0]) => {
  set(pushHistoryAtom);
  set(edgesAtom, addEdge({ ...connection, type: "animated" }, get(edgesAtom)));
});

// Add a node at a specific position from the registry
export const addNodeAtom = atom(null, (
  get, set,
  { subtype, position }: { subtype: NodeSubtype; position: { x: number; y: number } }
) => {
  const def = NODE_TYPE_REGISTRY[subtype];
  if (!def) return;

  set(pushHistoryAtom);
  const id = `${def.category}-${nanoid(6)}`;

  const newNode: WorkflowNode = {
    id,
    type: def.category,
    position,
    data: {
      label: def.label,
      description: def.description,
      type: def.category,
      subtype,
      config: { ...def.defaultConfig },
    },
  };

  set(nodesAtom, [...get(nodesAtom), newNode]);
  set(selectedNodeIdAtom, id);
});

// Add action node after the last node (toolbar shortcut)
export const addActionNodeAtom = atom(null, (get, set) => {
  const nodes = get(nodesAtom);
  const lastNode = nodes[nodes.length - 1];
  const x = lastNode ? lastNode.position.x : 250;
  const y = lastNode ? lastNode.position.y + 200 : 250;

  set(addNodeAtom, { subtype: "send_email" as NodeSubtype, position: { x, y } });

  // Auto-connect from the last node
  const updatedNodes = get(nodesAtom);
  const newNode = updatedNodes[updatedNodes.length - 1];
  if (lastNode && newNode) {
    set(edgesAtom, addEdge(
      { id: `e-${lastNode.id}-${newNode.id}`, source: lastNode.id, target: newNode.id, type: "animated" },
      get(edgesAtom)
    ));
  }
});

// Add a Composio action node (from IntegrationBrowser)
export const addComposioNodeAtom = atom(null, (
  get, set,
  { appName, actionName, actionLabel, position }: {
    appName: string;
    actionName: string;
    actionLabel: string;
    position: { x: number; y: number };
  }
) => {
  set(pushHistoryAtom);
  const id = `action-${nanoid(6)}`;
  const newNode: WorkflowNode = {
    id,
    type: "action",
    position,
    data: {
      label: actionLabel,
      description: `${appName} action`,
      type: "action",
      subtype: "composio_action",
      config: { composioApp: appName, composioAction: actionName },
    },
  };
  set(nodesAtom, [...get(nodesAtom), newNode]);
  set(selectedNodeIdAtom, id);
});

// Delete selected node
export const deleteSelectedNodeAtom = atom(null, (get, set) => {
  const selectedId = get(selectedNodeIdAtom);
  if (!selectedId) return;

  const node = get(nodesAtom).find((n) => n.id === selectedId);
  if (node?.data.type === "trigger") return;

  set(pushHistoryAtom);
  set(nodesAtom, get(nodesAtom).filter((n) => n.id !== selectedId));
  set(edgesAtom, get(edgesAtom).filter((e) => e.source !== selectedId && e.target !== selectedId));
  set(selectedNodeIdAtom, null);
});

// Update node data (top-level fields like label, description, enabled)
export const updateNodeDataAtom = atom(null, (get, set, { nodeId, data }: { nodeId: string; data: Partial<WorkflowNodeData> }) => {
  set(nodesAtom, get(nodesAtom).map((n) =>
    n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
  ));
});

// Update a single config field on a node
export const updateNodeConfigAtom = atom(null, (
  get, set,
  { nodeId, configKey, value }: { nodeId: string; configKey: string; value: unknown }
) => {
  set(nodesAtom, get(nodesAtom).map((n) =>
    n.id === nodeId
      ? { ...n, data: { ...n.data, config: { ...n.data.config, [configKey]: value } } }
      : n
  ));
});

// Autosave function — throws on failure so callers (like handleRun) can detect it
export const saveWorkflowAtom = atom(null, async (get, set) => {
  const workflowId = get(currentWorkflowIdAtom);
  if (!workflowId) return;

  set(isSavingAtom, true);
  try {
    const nodes = get(nodesAtom);
    const edges = get(edgesAtom);
    const res = await fetch("/api/model/workflow/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        where: { id: workflowId },
        data: { nodesJson: nodes, edgesJson: edges },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Save failed (${res.status}): ${text}`);
    }

    // ZenStack may return null when write is policy-denied but status is 200
    const body = await res.json().catch(() => null);
    if (!body) {
      throw new Error("Save denied by access policy");
    }
  } finally {
    set(isSavingAtom, false);
  }
});
