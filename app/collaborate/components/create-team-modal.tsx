"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MotionEffect } from "@/components/animate-ui/effects/motion-effect"
import { RippleButton } from "@/components/animate-ui/buttons/ripple"
import { Plus, Loader2, Users, Globe, Lock } from "lucide-react"

interface CreateTeamModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateTeam: (teamData: {
    name: string
    description: string
    category: string
    isPublic: boolean
  }) => Promise<void>
  isCreating: boolean
}

export function CreateTeamModal({ isOpen, onClose, onCreateTeam, isCreating }: CreateTeamModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Research",
    isPublic: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    await onCreateTeam(formData)
    
    // Reset form
    setFormData({
      name: "",
      description: "",
      category: "Research",
      isPublic: false,
    })
  }

  const categories = [
    { value: "Research", icon: "🔬", description: "Academic or professional research" },
    { value: "Study Group", icon: "📚", description: "Learning and studying together" },
    { value: "Project", icon: "🚀", description: "Collaborative projects" },
    { value: "Discussion", icon: "💬", description: "Open discussions and brainstorming" },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            Create New Team
          </DialogTitle>
        </DialogHeader>
        
        <MotionEffect fade delay={0.1}>
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            {/* Team Name */}
            <div className="space-y-2">
              <Label htmlFor="team-name" className="text-sm font-medium">
                Team Name
              </Label>
              <Input
                id="team-name"
                placeholder="Enter team name..."
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={isCreating}
                className="h-12"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="What's this team about?"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={isCreating}
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Category
              </Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                disabled={isCreating}
              >
                <SelectTrigger id="category" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{category.icon}</span>
                        <div>
                          <div className="font-medium">{category.value}</div>
                          <div className="text-xs text-muted-foreground">{category.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Privacy Settings */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Privacy & Access</Label>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${formData.isPublic ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {formData.isPublic ? (
                      <Globe className="h-4 w-4 text-green-600" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm">
                      {formData.isPublic ? "Public Team" : "Private Team"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formData.isPublic 
                        ? "Anyone can discover and join this team"
                        : "Only invited members can access this team"
                      }
                    </div>
                  </div>
                </div>
                <Switch
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
                  disabled={isCreating}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button"
                variant="outline" 
                onClick={onClose} 
                disabled={isCreating}
              >
                Cancel
              </Button>
              <RippleButton 
                type="submit"
                disabled={!formData.name.trim() || isCreating}
                className="gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    Create Team
                  </>
                )}
              </RippleButton>
            </div>
          </form>
        </MotionEffect>
      </DialogContent>
    </Dialog>
  )
}
