"use client"

import React from "react"
import type { Project, Task } from "@/lib/services/project.service"
import type { GanttFeature, GanttStatus } from "./gantt-primitives"
import {
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttHeader,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttFeatureItem,
  GanttToday,
} from "./gantt-primitives"

export interface GanttProps {
  projects: Project[]
  tasks: Task[]
  onEditTask: (task: Task) => void
  onDeleteTask: (task: Task) => void
  onCreateTask: (project: Project) => void
  onEditProject: (project: Project) => void
  onDeleteProject: (project: Project) => void
}

// Temporary wrapper to keep the page import stable while we integrate the new Gantt implementation.
// Later, replace the LegacyGanttChart with the new component internals without changing page.tsx.
export function Gantt({ projects, tasks, onCreateTask, onEditTask, onDeleteTask, onEditProject, onDeleteProject }: GanttProps) {
  // Map task status to colors used by primitives
  const statusMap: Record<string, GanttStatus> = {
    todo: { id: "todo", name: "To Do", color: "#9CA3AF" },
    "in-progress": { id: "in-progress", name: "In Progress", color: "#F59E0B" },
    completed: { id: "completed", name: "Completed", color: "#10B981" },
    planning: { id: "planning", name: "Planning", color: "#6366F1" },
    active: { id: "active", name: "Active", color: "#3B82F6" },
  }

  const features: Record<string, GanttFeature[]> = {}
  projects.forEach((project) => {
    features[project.id] = tasks
      .filter((t) => t.project_id === project.id)
      .map<GanttFeature>((t) => ({
        id: t.id,
        name: t.title,
        startAt: t.due_date ? new Date(t.due_date) : new Date(),
        endAt: null,
        status: statusMap[t.status] ?? statusMap["todo"],
      }))
  })

  return (
    <GanttProvider range="monthly" onAddItem={(date) => {
      // pick first project for now
      if (projects[0]) onCreateTask(projects[0])
    }}>
      <GanttSidebar>
        {projects.map((p) => (
          <GanttSidebarGroup key={p.id} name={p.title}>
            {features[p.id]?.map((f) => (
              <GanttSidebarItem key={f.id} feature={f} onSelectItem={() => onEditTask(tasks.find((t) => t.id === f.id)!)} />
            ))}
          </GanttSidebarGroup>
        ))}
      </GanttSidebar>

      <GanttTimeline>
        <GanttHeader />
        <GanttFeatureList>
          {projects.map((p, idx) => (
            <GanttFeatureListGroup key={p.id} className={idx > 0 ? 'mt-4' : ''}>
              {features[p.id]?.map((f) => (
                <GanttFeatureItem key={f.id} {...f} />
              ))}
            </GanttFeatureListGroup>
          ))}
        </GanttFeatureList>
        <GanttToday />
      </GanttTimeline>
    </GanttProvider>
  )
}

// keep default for convenience
export default Gantt
export { Gantt as GanttChart }

// New Gantt primitives (non-breaking re-exports)
export {
  GanttProvider,
  GanttTimeline,
  GanttHeader,
  GanttColumns,
  GanttColumn,
  GanttSidebar,
  GanttSidebarHeader,
  GanttSidebarItem,
  GanttSidebarGroup,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttFeatureItem,
  GanttFeatureItemCard,
  GanttFeatureDragHelper,
  GanttMarker,
  GanttCreateMarkerTrigger,
  GanttAddFeatureHelper,
  GanttToday,
  useGanttDragging,
  useGanttScrollX,
} from "./gantt-primitives"

export type {
  Range,
  GanttFeature,
  GanttStatus,
  GanttMarkerProps,
  TimelineData,
} from "./gantt-primitives"
