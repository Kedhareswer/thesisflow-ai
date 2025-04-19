"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Copy, Edit, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Define template types
const templateTypes = [
  {
    id: "radial",
    name: "Radial",
    description: "Central idea with radiating concepts",
    preview: "/placeholder.svg?height=100&width=200",
  },
  {
    id: "hierarchical",
    name: "Hierarchical",
    description: "Top-down structure with parent-child relationships",
    preview: "/placeholder.svg?height=100&width=200",
  },
  {
    id: "flowchart",
    name: "Flowchart",
    description: "Sequential process with decision points",
    preview: "/placeholder.svg?height=100&width=200",
  },
  {
    id: "concept",
    name: "Concept Map",
    description: "Interconnected ideas with labeled relationships",
    preview: "/placeholder.svg?height=100&width=200",
  },
  {
    id: "fishbone",
    name: "Fishbone",
    description: "Cause and effect analysis diagram",
    preview: "/placeholder.svg?height=100&width=200",
  },
]

// Sample user templates
const initialUserTemplates = [
  {
    id: "user-template-1",
    name: "Research Framework",
    type: "hierarchical",
    nodes: [
      { id: "root", label: "Research Topic", x: 400, y: 100 },
      { id: "node1", label: "Literature Review", x: 200, y: 200 },
      { id: "node2", label: "Methodology", x: 400, y: 200 },
      { id: "node3", label: "Results", x: 600, y: 200 },
    ],
    edges: [
      { source: "root", target: "node1" },
      { source: "root", target: "node2" },
      { source: "root", target: "node3" },
    ],
  },
  {
    id: "user-template-2",
    name: "Project Plan",
    type: "flowchart",
    nodes: [
      { id: "start", label: "Start", x: 400, y: 50 },
      { id: "planning", label: "Planning", x: 400, y: 150 },
      { id: "execution", label: "Execution", x: 400, y: 250 },
      { id: "review", label: "Review", x: 400, y: 350 },
      { id: "end", label: "End", x: 400, y: 450 },
    ],
    edges: [
      { source: "start", target: "planning" },
      { source: "planning", target: "execution" },
      { source: "execution", target: "review" },
      { source: "review", target: "end" },
    ],
  },
]

interface MindMapTemplatesProps {
  onSelectTemplate: (template: any) => void
  onCreateTemplate: (template: any) => void
}

export function MindMapTemplates({ onSelectTemplate, onCreateTemplate }: MindMapTemplatesProps) {
  const { toast } = useToast()
  const [userTemplates, setUserTemplates] = useState(initialUserTemplates)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState("")
  const [templateType, setTemplateType] = useState("radial")
  const [nodeSize, setNodeSize] = useState(50)
  const [edgeThickness, setEdgeThickness] = useState(2)
  const [showLabels, setShowLabels] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  // Load templates from localStorage on component mount
  React.useEffect(() => {
    const savedTemplates = localStorage.getItem("mind-map-templates")
    if (savedTemplates) {
      try {
        setUserTemplates(JSON.parse(savedTemplates))
      } catch (error) {
        console.error("Failed to parse templates:", error)
      }
    }
  }, [])

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template.id)
    onSelectTemplate(template)

    toast({
      title: "Template selected",
      description: `${template.name} template has been applied to your mind map.`,
    })
  }

  const handleCreateTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Template name required",
        description: "Please provide a name for your template.",
        variant: "destructive",
      })
      return
    }

    const newTemplate = {
      id: isEditing && editingTemplateId ? editingTemplateId : `user-template-${Date.now()}`,
      name: templateName,
      type: templateType,
      nodes: [],
      edges: [],
      settings: {
        nodeSize,
        edgeThickness,
        showLabels,
      },
    }

    if (isEditing && editingTemplateId) {
      // Update existing template
      const updatedTemplates = userTemplates.map((template) =>
        template.id === editingTemplateId ? newTemplate : template,
      )
      setUserTemplates(updatedTemplates)
      localStorage.setItem("mind-map-templates", JSON.stringify(updatedTemplates))

      toast({
        title: "Template updated",
        description: `${templateName} has been updated successfully.`,
      })
    } else {
      // Create new template
      const updatedTemplates = [...userTemplates, newTemplate]
      setUserTemplates(updatedTemplates)
      localStorage.setItem("mind-map-templates", JSON.stringify(updatedTemplates))

      toast({
        title: "Template created",
        description: `${templateName} has been created successfully.`,
      })
    }

    onCreateTemplate(newTemplate)
    resetForm()
  }

  const handleEditTemplate = (template: any) => {
    setIsEditing(true)
    setEditingTemplateId(template.id)
    setTemplateName(template.name)
    setTemplateType(template.type)
    setNodeSize(template.settings?.nodeSize || 50)
    setEdgeThickness(template.settings?.edgeThickness || 2)
    setShowLabels(template.settings?.showLabels !== false)
  }

  const handleDeleteTemplate = (templateId: string) => {
    const updatedTemplates = userTemplates.filter((template) => template.id !== templateId)
    setUserTemplates(updatedTemplates)
    localStorage.setItem("mind-map-templates", JSON.stringify(updatedTemplates))

    toast({
      title: "Template deleted",
      description: "The template has been removed successfully.",
    })
  }

  const handleDuplicateTemplate = (template: any) => {
    const duplicatedTemplate = {
      ...template,
      id: `user-template-${Date.now()}`,
      name: `${template.name} (Copy)`,
    }

    const updatedTemplates = [...userTemplates, duplicatedTemplate]
    setUserTemplates(updatedTemplates)
    localStorage.setItem("mind-map-templates", JSON.stringify(updatedTemplates))

    toast({
      title: "Template duplicated",
      description: `A copy of ${template.name} has been created.`,
    })
  }

  const resetForm = () => {
    setIsEditing(false)
    setEditingTemplateId(null)
    setTemplateName("")
    setTemplateType("radial")
    setNodeSize(50)
    setEdgeThickness(2)
    setShowLabels(true)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Mind Map Templates</CardTitle>
        <CardDescription>Choose from pre-designed templates or create your own</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="built-in">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="built-in">Built-in Templates</TabsTrigger>
            <TabsTrigger value="custom">My Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="built-in" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templateTypes.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedTemplate === template.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <img
                      src={template.preview || "/placeholder.svg"}
                      alt={`${template.name} template preview`}
                      className="w-full h-24 object-cover rounded-md mb-2"
                    />
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userTemplates.map((template) => (
                <Card key={template.id} className="relative">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditTemplate(template)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDuplicateTemplate(template)
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTemplate(template.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground mb-2">
                      Type: {templateTypes.find((t) => t.id === template.type)?.name || template.type}
                    </p>
                    <Button variant="outline" className="w-full" onClick={() => handleSelectTemplate(template)}>
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {/* Create new template card */}
              <Card
                className="border-dashed border-2 flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => {
                  resetForm()
                  setIsEditing(false)
                }}
              >
                <Plus className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground font-medium">Create New Template</p>
              </Card>
            </div>

            {/* Template creation/editing form */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{isEditing ? "Edit Template" : "Create New Template"}</CardTitle>
                <CardDescription>
                  {isEditing ? "Modify your existing template" : "Design a custom template for your mind maps"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Template Name</Label>
                  <Input
                    id="templateName"
                    placeholder="Enter template name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="templateType">Template Type</Label>
                  <Select value={templateType} onValueChange={setTemplateType}>
                    <SelectTrigger id="templateType">
                      <SelectValue placeholder="Select template type" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nodeSize">Node Size: {nodeSize}px</Label>
                  <Slider
                    id="nodeSize"
                    min={30}
                    max={100}
                    step={1}
                    value={[nodeSize]}
                    onValueChange={(value) => setNodeSize(value[0])}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edgeThickness">Edge Thickness: {edgeThickness}px</Label>
                  <Slider
                    id="edgeThickness"
                    min={1}
                    max={5}
                    step={0.5}
                    value={[edgeThickness]}
                    onValueChange={(value) => setEdgeThickness(value[0])}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="showLabels" checked={showLabels} onCheckedChange={setShowLabels} />
                  <Label htmlFor="showLabels">Show Labels</Label>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate}>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing ? "Update Template" : "Save Template"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
