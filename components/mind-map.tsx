"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Plus, Minus, ZoomIn, ZoomOut, Save } from "lucide-react"

interface Node {
  id: string
  text: string
  x: number
  y: number
  color: string
}

interface Connection {
  source: string
  target: string
}

export default function MindMap() {
  const { toast } = useToast()
  const svgRef = useRef<SVGSVGElement>(null)
  const [nodes, setNodes] = useState<Node[]>([
    { id: "1", text: "Research Topic", x: 400, y: 200, color: "#3b82f6" },
  ])
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [newNodeText, setNewNodeText] = useState("")
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const colors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // yellow
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
  ]

  const handleNodeClick = (nodeId: string) => {
    if (selectedNode === nodeId) {
      setSelectedNode(null)
    } else if (selectedNode) {
      // Create connection if not already exists
      const connectionExists = connections.some(
        (conn) =>
          (conn.source === selectedNode && conn.target === nodeId) ||
          (conn.source === nodeId && conn.target === selectedNode)
      )

      if (!connectionExists) {
        setConnections([...connections, { source: selectedNode, target: nodeId }])
      }
      setSelectedNode(null)
    } else {
      setSelectedNode(nodeId)
    }
  }

  const addNode = () => {
    if (!newNodeText.trim()) return

    const centerX = 400
    const centerY = 200
    const radius = 150
    const angle = (Math.PI * 2 * nodes.length) / 8

    const newNode: Node = {
      id: Date.now().toString(),
      text: newNodeText,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      color: colors[nodes.length % colors.length],
    }

    setNodes([...nodes, newNode])
    setNewNodeText("")

    if (selectedNode) {
      setConnections([...connections, { source: selectedNode, target: newNode.id }])
      setSelectedNode(null)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(Math.max(0.5, prev + delta), 2))
  }

  const saveMindMap = () => {
    const data = {
      nodes,
      connections,
    }

    // In a real app, you would save this to your backend
    console.log("Saving mind map:", data)

    toast({
      title: "Mind Map Saved",
      description: "Your mind map has been saved successfully.",
    })
  }

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => handleZoom(-0.1)}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleZoom(0.1)}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Add new node..."
            value={newNodeText}
            onChange={(e) => setNewNodeText(e.target.value)}
            className="w-64"
          />
          <Button onClick={addNode}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
          <Button variant="outline" onClick={saveMindMap}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div
        className="border rounded-lg overflow-hidden"
        style={{ height: "600px", cursor: isDragging ? "grabbing" : "grab" }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Connections */}
            {connections.map((conn) => {
              const source = nodes.find((n) => n.id === conn.source)
              const target = nodes.find((n) => n.id === conn.target)
              if (!source || !target) return null

              return (
                <line
                  key={`${conn.source}-${conn.target}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="#94a3b8"
                  strokeWidth="2"
                />
              )
            })}

            {/* Nodes */}
            {nodes.map((node) => (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                onClick={() => handleNodeClick(node.id)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  r="30"
                  fill={node.color}
                  opacity={selectedNode === node.id ? 0.8 : 0.6}
                  stroke={selectedNode === node.id ? "#000" : "none"}
                  strokeWidth="2"
                />
                <text
                  textAnchor="middle"
                  dy=".3em"
                  fill="#fff"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {node.text}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </Card>
  )
}
