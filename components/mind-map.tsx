"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, ZoomIn, ZoomOut, Save, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  const [nodes, setNodes] = useState<Node[]>([
    { id: "1", text: "Main Idea", x: 400, y: 200, color: "#3b82f6" },
    { id: "2", text: "Concept 1", x: 200, y: 100, color: "#10b981" },
    { id: "3", text: "Concept 2", x: 600, y: 100, color: "#f59e0b" },
    { id: "4", text: "Concept 3", x: 200, y: 300, color: "#ef4444" },
    { id: "5", text: "Concept 4", x: 600, y: 300, color: "#8b5cf6" },
  ])

  const [connections, setConnections] = useState<Connection[]>([
    { source: "1", target: "2" },
    { source: "1", target: "3" },
    { source: "1", target: "4" },
    { source: "1", target: "5" },
  ])

  const [newNodeText, setNewNodeText] = useState("")
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [nodeColor, setNodeColor] = useState("#3b82f6")

  const canvasRef = useRef<HTMLDivElement>(null)

  const colorOptions = [
    { value: "#3b82f6", label: "Blue" },
    { value: "#10b981", label: "Green" },
    { value: "#f59e0b", label: "Yellow" },
    { value: "#ef4444", label: "Red" },
    { value: "#8b5cf6", label: "Purple" },
  ]

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && selectedNode) {
        const node = nodes.find((n) => n.id === selectedNode)
        if (node) {
          const updatedNodes = nodes.map((n) =>
            n.id === selectedNode ? { ...n, x: n.x + e.movementX / zoom, y: n.y + e.movementY / zoom } : n,
          )
          setNodes(updatedNodes)
        }
      } else if (isDragging) {
        setPan({
          x: pan.x + e.movementX / zoom,
          y: pan.y + e.movementY / zoom,
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setConnectingFrom(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, selectedNode, nodes, zoom, pan])

  const addNode = () => {
    if (!newNodeText.trim()) return

    const newNode: Node = {
      id: Date.now().toString(),
      text: newNodeText,
      x: 400,
      y: 200,
      color: nodeColor,
    }

    setNodes([...nodes, newNode])
    setNewNodeText("")
  }

  const startNodeDrag = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    setSelectedNode(nodeId)
    setIsDragging(true)
  }

  const startConnection = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    setConnectingFrom(nodeId)
  }

  const completeConnection = (targetId: string) => {
    if (connectingFrom && connectingFrom !== targetId) {
      // Check if connection already exists
      const connectionExists = connections.some(
        (conn) =>
          (conn.source === connectingFrom && conn.target === targetId) ||
          (conn.source === targetId && conn.target === connectingFrom),
      )

      if (!connectionExists) {
        setConnections([...connections, { source: connectingFrom, target: targetId }])
      }

      setConnectingFrom(null)
    }
  }

  const startCanvasDrag = (e: React.MouseEvent) => {
    if (!connectingFrom) {
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const deleteNode = (nodeId: string) => {
    setNodes(nodes.filter((node) => node.id !== nodeId))
    setConnections(connections.filter((conn) => conn.source !== nodeId && conn.target !== nodeId))
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5))
  }

  const saveMindMap = () => {
    const data = { nodes, connections }
    localStorage.setItem("mindMap", JSON.stringify(data))
    alert("Mind map saved!")
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Mind Map Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nodeText">New Node Text</Label>
                <Input
                  id="nodeText"
                  value={newNodeText}
                  onChange={(e) => setNewNodeText(e.target.value)}
                  placeholder="Enter node text"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nodeColor">Node Color</Label>
                <Select value={nodeColor} onValueChange={setNodeColor}>
                  <SelectTrigger id="nodeColor">
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center">
                          <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: color.value }} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={addNode} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Node
                </Button>
              </div>
            </div>

            <div className="flex justify-between">
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </div>

              <Button variant="outline" onClick={saveMindMap}>
                <Save className="mr-2 h-4 w-4" />
                Save Mind Map
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div
        className="relative border rounded-lg overflow-hidden bg-white h-[600px]"
        onMouseDown={startCanvasDrag}
        ref={canvasRef}
      >
        <div
          className="absolute w-full h-full"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: "0 0",
          }}
        >
          {/* Connections */}
          <svg className="absolute w-full h-full pointer-events-none">
            {connections.map((conn, index) => {
              const sourceNode = nodes.find((n) => n.id === conn.source)
              const targetNode = nodes.find((n) => n.id === conn.target)

              if (!sourceNode || !targetNode) return null

              return (
                <line
                  key={index}
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke="#888"
                  strokeWidth="2"
                />
              )
            })}

            {/* Active connection line */}
            {connectingFrom && (
              <line
                x1={nodes.find((n) => n.id === connectingFrom)?.x || 0}
                y1={nodes.find((n) => n.id === connectingFrom)?.y || 0}
                x2={dragStart.x / zoom - pan.x}
                y2={dragStart.y / zoom - pan.y}
                stroke="#888"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              className="absolute p-2 rounded-lg shadow-md cursor-move flex flex-col items-center"
              style={{
                left: `${node.x - 75}px`,
                top: `${node.y - 30}px`,
                width: "150px",
                backgroundColor: node.color,
                color: getContrastColor(node.color),
                zIndex: selectedNode === node.id ? 10 : 1,
              }}
              onMouseDown={(e) => startNodeDrag(e, node.id)}
              onClick={() => connectingFrom && completeConnection(node.id)}
            >
              <div className="text-center font-medium">{node.text}</div>
              <div className="flex mt-2 space-x-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 bg-white/30"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNode(node.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 bg-white/30"
                  onClick={(e) => startConnection(e, node.id)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Helper function to determine text color based on background
function getContrastColor(hexColor: string): string {
  // Convert hex to RGB
  const r = Number.parseInt(hexColor.slice(1, 3), 16)
  const g = Number.parseInt(hexColor.slice(3, 5), 16)
  const b = Number.parseInt(hexColor.slice(5, 7), 16)

  // Calculate brightness
  const brightness = (r * 299 + g * 587 + b * 114) / 1000

  // Return white for dark colors, black for light colors
  return brightness > 128 ? "#000000" : "#ffffff"
}
