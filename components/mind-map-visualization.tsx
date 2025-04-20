"use client"

import { useCallback, useMemo } from "react"
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Position,
} from "reactflow"
import "reactflow/dist/style.css"

interface MindMapNode {
  id: string
  content: string
  children: MindMapNode[]
  position: { x: number; y: number }
}

interface MindMapVisualizationProps {
  nodes: MindMapNode[]
  onNodeSelect: (nodeId: string | null) => void
  onNodeUpdate: (nodeId: string, content: string) => void
  onNodeDelete: (nodeId: string) => void
}

const nodeTypes = {
  custom: ({ data }: { data: { label: string } }) => (
    <div className="px-4 py-2 shadow-lg rounded-lg bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {data.label}
      </div>
    </div>
  ),
}

export default function MindMapVisualization({
  nodes,
  onNodeSelect,
  onNodeUpdate,
  onNodeDelete,
}: MindMapVisualizationProps) {
  // Convert our mind map nodes to react-flow nodes and edges
  const { flowNodes, flowEdges } = useMemo(() => {
    const nodesMap = new Map<string, Node>()
    const edges: Edge[] = []

    const processNode = (node: MindMapNode, parentId?: string) => {
      const flowNode: Node = {
        id: node.id,
        type: "custom",
        position: node.position,
        data: { label: node.content },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }

      nodesMap.set(node.id, flowNode)

      if (parentId) {
        edges.push({
          id: `${parentId}-${node.id}`,
          source: parentId,
          target: node.id,
          type: "smoothstep",
        })
      }

      node.children.forEach((child) => processNode(child, node.id))
    }

    nodes.forEach((node) => processNode(node))

    return {
      flowNodes: Array.from(nodesMap.values()),
      flowEdges: edges,
    }
  }, [nodes])

  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState(flowNodes)
  const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState(flowEdges)

  const onConnect = useCallback(
    (params: Connection) => setReactFlowEdges((eds) => addEdge(params, eds)),
    [setReactFlowEdges]
  )

  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      onNodeSelect(node.id)
    },
    [onNodeSelect]
  )

  const onNodeDoubleClick = useCallback(
    (_: any, node: Node) => {
      const newContent = prompt("Edit node content:", node.data.label)
      if (newContent !== null) {
        onNodeUpdate(node.id, newContent)
      }
    },
    [onNodeUpdate]
  )

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
} 