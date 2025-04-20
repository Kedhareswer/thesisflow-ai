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
  Panel,
  NodeChange,
  EdgeChange,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  MarkerType
} from "reactflow"
import "reactflow/dist/style.css"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

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

const CustomNode = ({ data }: { data: { label: string; onDelete: () => void } }) => (
  <div className="px-4 py-2 shadow-lg rounded-lg bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 group">
    <div className="flex items-center gap-2">
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {data.label}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation()
          data.onDelete()
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  </div>
)

const nodeTypes = {
  custom: CustomNode,
}

export default function MindMapVisualization({
  nodes,
  onNodeSelect,
  onNodeUpdate,
  onNodeDelete,
}: MindMapVisualizationProps) {
  // Convert mind map nodes to react-flow format
  const { flowNodes, flowEdges } = useMemo(() => {
    const nodesMap = new Map<string, Node>()
    const edges: Edge[] = []

    const processNode = (node: MindMapNode, parentId?: string) => {
      const flowNode: Node = {
        id: node.id,
        type: "custom",
        position: node.position,
        data: { 
          label: node.content,
          onDelete: () => onNodeDelete(node.id)
        },
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
          animated: true,
          style: { stroke: "#94a3b8" },
        })
      }

      node.children.forEach((child) => processNode(child, node.id))
    }

    nodes.forEach((node) => processNode(node))

    return {
      flowNodes: Array.from(nodesMap.values()),
      flowEdges: edges,
    }
  }, [nodes, onNodeDelete])

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
        minZoom={0.5}
        maxZoom={2}
        attributionPosition="bottom-right"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
} 