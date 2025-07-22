import React from 'react'
import { useResearchIdeas } from '@/components/research-session-provider'
import { MotionGrid } from '@/components/animate-ui/components/motion-grid'
import { Checkbox } from '@/components/animate-ui/base/checkbox'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/animate-ui/base/tooltip'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Lightbulb } from 'lucide-react'

export function GeneratedIdeas({ className }: { className?: string }) {
  const { ideas, selectedIdeas, selectIdea } = useResearchIdeas()
  // Calculate grid size (3 columns, enough rows)
  const columns = 3
  const rows = Math.max(1, Math.ceil(ideas.length / columns))

  return (
    <div className={className}>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Lightbulb className="w-6 h-6 text-yellow-400" />
        Generated Ideas
      </h2>
      <MotionGrid gridSize={[columns, rows]} frames={[]} className="w-full">
        {ideas.length === 0 && (
          <div className="col-span-3 text-center text-gray-400 py-12">
            No ideas generated yet. Use the Idea Generator to create research ideas.
          </div>
        )}
        {ideas.map((idea) => {
          const isSelected = selectedIdeas.some((sel) => sel.id === idea.id)
          return (
            <Card key={idea.id} className={`transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
              <CardHeader className="flex flex-row items-center gap-2 justify-between">
                <CardTitle className="text-lg font-semibold flex-1 line-clamp-2">
                  {idea.title}
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => selectIdea(idea.id, !!checked)}
                      aria-label={isSelected ? 'Deselect idea' : 'Select idea'}
                      className="ml-2"
                    />
                  </TooltipTrigger>
                  <TooltipContent>{isSelected ? 'Deselect this idea' : 'Select this idea for session context'}</TooltipContent>
                </Tooltip>
              </CardHeader>
              <CardContent>
                <div className="text-gray-700 mb-2 whitespace-pre-line">{idea.description}</div>
                {idea.topic && (
                  <div className="text-xs text-gray-500 mb-1"><strong>Topic:</strong> {idea.topic}</div>
                )}
                {idea.source && (
                  <div className="text-xs text-gray-500 mb-1"><strong>Source:</strong> {idea.source}</div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </MotionGrid>
    </div>
  )
}
