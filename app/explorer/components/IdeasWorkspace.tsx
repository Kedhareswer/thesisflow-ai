"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, MoreVertical, Lightbulb } from "lucide-react"
import { useResearchIdeas } from "@/components/research-session-provider"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface IdeasWorkspaceProps {
  className?: string
}

export function IdeasWorkspace({ className }: IdeasWorkspaceProps) {
  const { ideas, selectedIdeas, selectIdea } = useResearchIdeas()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("Last Modified")

  // Filter ideas based on search query
  const filteredIdeas = ideas.filter(idea =>
    idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    idea.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort ideas based on sortBy value
  const sortedIdeas = [...filteredIdeas].sort((a, b) => {
    switch (sortBy) {
      case "Title":
        return a.title.toLowerCase().localeCompare(b.title.toLowerCase())
      case "Date Created":
        // Sort by savedAt (newest first)
        return new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime()
      case "Last Modified":
        // Sort by updatedAt (newest first)
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      default:
        return 0
    }
  })

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Ideas Workspace</h1>
        <p className="text-sm md:text-base text-gray-600">Capture your thoughts and watch them grow into groundbreaking research.</p>
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 md:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search my ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Last Modified">Last Modified</SelectItem>
            <SelectItem value="Title">Title</SelectItem>
            <SelectItem value="Date Created">Date Created</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {/* Create New Idea Card */}
        <Card className="border-2 border-dashed border-gray-300 hover:border-primary transition-colors cursor-pointer group">
          <CardContent className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[200px] md:min-h-[250px] text-center">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center mb-3 md:mb-4 transition-colors">
              <Plus className="h-5 w-5 md:h-6 md:w-6 text-gray-400 group-hover:text-primary transition-colors" />
            </div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1 md:mb-2">Add New Idea</h3>
            <p className="text-xs md:text-sm text-gray-600">Start a new research journey with a fresh idea.</p>
          </CardContent>
        </Card>

        {/* Idea Cards */}
        {filteredIdeas.length === 0 && searchQuery && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No ideas found matching "{searchQuery}"</p>
          </div>
        )}

        {sortedIdeas.map((idea) => (
          <Card
            key={idea.id}
            className="hover:shadow-lg transition-shadow cursor-pointer group"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
                    {idea.title}
                  </CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                {idea.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {idea.topic && (
                  <Badge variant="secondary" className="text-xs">
                    {idea.topic}
                  </Badge>
                )}
                {idea.source && (
                  <Badge variant="outline" className="text-xs">
                    {idea.source}
                  </Badge>
                )}
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t">
                <Lightbulb className="h-3 w-3" />
                <span>2 days ago</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {ideas.length === 0 && !searchQuery && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Lightbulb className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No ideas yet</h3>
          <p className="text-gray-600 mb-6">Start capturing your research ideas to build your workspace.</p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Idea
          </Button>
        </div>
      )}
    </div>
  )
}
