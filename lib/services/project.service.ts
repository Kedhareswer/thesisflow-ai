import { supabase } from "@/integrations/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

// Types matching our database schema
export interface Project {
  id: string
  title: string
  description?: string
  start_date?: string
  end_date?: string
  status: "planning" | "active" | "completed" | "on-hold"
  progress: number
  owner_id: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description?: string
  due_date?: string
  priority: "low" | "medium" | "high"
  status: "todo" | "in-progress" | "completed"
  assignee_id?: string
  estimated_hours?: number
  created_at: string
  updated_at: string
}

// Additional types matching our database schema
export interface Team {
  id: string
  name: string
  description?: string
  is_public: boolean
  category: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: "owner" | "admin" | "editor" | "viewer"
  joined_at: string
}

export interface ChatMessage {
  id: string
  team_id: string
  sender_id: string
  content: string
  message_type: "text" | "system" | "file"
  file_url?: string
  created_at: string
}

export interface ResearchIdea {
  id: string
  title: string
  description?: string
  research_question?: string
  methodology?: string
  impact?: string
  challenges?: string
  topic?: string
  context?: string
  user_id: string
  project_id?: string
  created_at: string
  updated_at: string
}

interface CreateProjectData {
  title: string
  description?: string
  start_date?: string
  end_date?: string
  status?: string
}

interface CreateTaskData {
  title: string
  description?: string
  project_id: string
  status?: string
  priority?: string
  due_date?: string
  estimated_hours?: number
}

interface UpdateTaskData {
  status?: string
  title?: string
  description?: string
  priority?: string
  due_date?: string
  estimated_hours?: number
}

class ProjectService {
  private realtimeChannels: Map<string, RealtimeChannel> = new Map()

  // Test connection and show success message
  static async testConnection() {
    try {
      const { data, error } = await supabase.from("projects").select("count").limit(1)

      if (error) {
        console.error("Supabase connection test failed:", error.message)
        return false
      }

      console.log("✅ Supabase connection successful!")
      return true
    } catch (error) {
      console.error("Supabase connection test failed:", error)
      return false
    }
  }

  // ====================
  // PROJECT MANAGEMENT
  // ====================

  async getProjects(): Promise<{ projects: Project[]; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return { projects: [], error: "Not authenticated" }

      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })

      if (error) {
        console.error("Error fetching projects:", error)
        return { projects: [], error: error.message }
      }

      return { projects: projects || [] }
    } catch (error) {
      console.error("Unexpected error fetching projects:", error)
      return { projects: [], error: "Failed to load projects" }
    }
  }

  async createProject(
    projectData: Omit<Project, "id" | "created_at" | "updated_at" | "owner_id">,
  ): Promise<{ project?: Project; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return { error: "Not authenticated" }

      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          ...projectData,
          owner_id: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating project:", error)
        return { error: error.message }
      }

      // Log activity
      await this.logActivity("created", "project", project.id, { title: project.title })

      return { project }
    } catch (error) {
      console.error("Unexpected error creating project:", error)
      return { error: "Failed to create project" }
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<{ project?: Project; error?: string }> {
    try {
      const { data: project, error } = await supabase
        .from("projects")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("Error updating project:", error)
        return { error: error.message }
      }

      // Log activity
      await this.logActivity("updated", "project", id, updates)

      return { project }
    } catch (error) {
      console.error("Unexpected error updating project:", error)
      return { error: "Failed to update project" }
    }
  }

  async deleteProject(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id)

      if (error) {
        console.error("Error deleting project:", error)
        return { success: false, error: error.message }
      }

      // Log activity
      await this.logActivity("deleted", "project", id)

      return { success: true }
    } catch (error) {
      console.error("Unexpected error deleting project:", error)
      return { success: false, error: "Failed to delete project" }
    }
  }

  // ====================
  // TASK MANAGEMENT
  // ====================

  async getProjectTasks(projectId: string): Promise<{ tasks: Task[]; error?: string }> {
    try {
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching tasks:", error)
        return { tasks: [], error: error.message }
      }

      return { tasks: tasks || [] }
    } catch (error) {
      console.error("Unexpected error fetching tasks:", error)
      return { tasks: [], error: "Failed to load tasks" }
    }
  }

  async createTask(taskData: Omit<Task, "id" | "created_at" | "updated_at">): Promise<{ task?: Task; error?: string }> {
    try {
      const { data: task, error } = await supabase.from("tasks").insert(taskData).select().single()

      if (error) {
        console.error("Error creating task:", error)
        return { error: error.message }
      }

      // Update project progress
      await this.updateProjectProgress(taskData.project_id)

      // Log activity
      await this.logActivity("created", "task", task.id, { title: task.title, project_id: taskData.project_id })

      return { task }
    } catch (error) {
      console.error("Unexpected error creating task:", error)
      return { error: "Failed to create task" }
    }
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<{ task?: Task; error?: string }> {
    try {
      const { data: task, error } = await supabase
        .from("tasks")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("Error updating task:", error)
        return { error: error.message }
      }

      // Update project progress if status changed
      if (updates.status) {
        await this.updateProjectProgress(task.project_id)
      }

      // Log activity
      await this.logActivity("updated", "task", id, updates)

      return { task }
    } catch (error) {
      console.error("Unexpected error updating task:", error)
      return { error: "Failed to update task" }
    }
  }

  async deleteTask(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get task info before deletion for project progress update
      const { data: task } = await supabase.from("tasks").select("project_id").eq("id", id).single()

      const { error } = await supabase.from("tasks").delete().eq("id", id)

      if (error) {
        console.error("Error deleting task:", error)
        return { success: false, error: error.message }
      }

      // Update project progress
      if (task) {
        await this.updateProjectProgress(task.project_id)
      }

      // Log activity
      await this.logActivity("deleted", "task", id)

      return { success: true }
    } catch (error) {
      console.error("Unexpected error deleting task:", error)
      return { success: false, error: "Failed to delete task" }
    }
  }

  // ====================
  // TEAM MANAGEMENT
  // ====================

  async getUserTeams(): Promise<{ teams: (Team & { member_role: string })[]; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return { teams: [], error: "Not authenticated" }

      const { data: teams, error } = await supabase
        .from("teams")
        .select(`
          *,
          team_members!inner(role)
        `)
        .eq("team_members.user_id", user.id)
        .order("updated_at", { ascending: false })

      if (error) {
        console.error("Error fetching teams:", error)
        return { teams: [], error: error.message }
      }

      const teamsWithRole = (teams || []).map((team) => ({
        ...team,
        member_role: team.team_members[0]?.role || "viewer",
      }))

      return { teams: teamsWithRole }
    } catch (error) {
      console.error("Unexpected error fetching teams:", error)
      return { teams: [], error: "Failed to load teams" }
    }
  }

  async createTeam(
    teamData: Omit<Team, "id" | "created_at" | "updated_at" | "owner_id">,
  ): Promise<{ team?: Team; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return { error: "Not authenticated" }

      const { data: team, error } = await supabase
        .from("teams")
        .insert({
          ...teamData,
          owner_id: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating team:", error)
        return { error: error.message }
      }

      // Add creator as owner member
      await supabase.from("team_members").insert({
        team_id: team.id,
        user_id: user.id,
        role: "owner",
      })

      // Log activity
      await this.logActivity("created", "team", team.id, { name: team.name })

      return { team }
    } catch (error) {
      console.error("Unexpected error creating team:", error)
      return { error: "Failed to create team" }
    }
  }

  async getTeamMessages(
    teamId: string,
  ): Promise<{ messages: (ChatMessage & { sender_name: string })[]; error?: string }> {
    try {
      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select(`
          *,
          user_profiles!chat_messages_sender_id_fkey(display_name, full_name)
        `)
        .eq("team_id", teamId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching messages:", error)
        return { messages: [], error: error.message }
      }

      const messagesWithSender = (messages || []).map((message) => ({
        ...message,
        sender_name: message.user_profiles?.display_name || message.user_profiles?.full_name || "Unknown User",
      }))

      return { messages: messagesWithSender }
    } catch (error) {
      console.error("Unexpected error fetching messages:", error)
      return { messages: [], error: "Failed to load messages" }
    }
  }

  async sendMessage(teamId: string, content: string): Promise<{ message?: ChatMessage; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return { error: "Not authenticated" }

      const { data: message, error } = await supabase
        .from("chat_messages")
        .insert({
          team_id: teamId,
          sender_id: user.id,
          content,
          message_type: "text",
        })
        .select()
        .single()

      if (error) {
        console.error("Error sending message:", error)
        return { error: error.message }
      }

      return { message }
    } catch (error) {
      console.error("Unexpected error sending message:", error)
      return { error: "Failed to send message" }
    }
  }

  // ====================
  // RESEARCH IDEAS
  // ====================

  async getResearchIdeas(projectId?: string): Promise<{ ideas: ResearchIdea[]; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return { ideas: [], error: "Not authenticated" }

      let query = supabase.from("research_ideas").select("*").eq("user_id", user.id)

      if (projectId) {
        query = query.eq("project_id", projectId)
      }

      const { data: ideas, error } = await query.order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching research ideas:", error)
        return { ideas: [], error: error.message }
      }

      return { ideas: ideas || [] }
    } catch (error) {
      console.error("Unexpected error fetching research ideas:", error)
      return { ideas: [], error: "Failed to load research ideas" }
    }
  }

  async createResearchIdea(
    ideaData: Omit<ResearchIdea, "id" | "created_at" | "updated_at" | "user_id">,
  ): Promise<{ idea?: ResearchIdea; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return { error: "Not authenticated" }

      const { data: idea, error } = await supabase
        .from("research_ideas")
        .insert({
          ...ideaData,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating research idea:", error)
        return { error: error.message }
      }

      // Log activity
      await this.logActivity("created", "research_idea", idea.id, { title: idea.title })

      return { idea }
    } catch (error) {
      console.error("Unexpected error creating research idea:", error)
      return { error: "Failed to create research idea" }
    }
  }

  // ====================
  // REAL-TIME SUBSCRIPTIONS
  // ====================

  subscribeToProject(projectId: string, callback: (payload: any) => void): () => void {
    const channelName = `project_${projectId}`

    if (this.realtimeChannels.has(channelName)) {
      this.realtimeChannels.get(channelName)?.unsubscribe()
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects", filter: `id=eq.${projectId}` },
        callback,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${projectId}` },
        callback,
      )
      .subscribe()

    this.realtimeChannels.set(channelName, channel)

    return () => {
      channel.unsubscribe()
      this.realtimeChannels.delete(channelName)
    }
  }

  subscribeToTeam(teamId: string, callback: (payload: any) => void): () => void {
    const channelName = `team_${teamId}`

    if (this.realtimeChannels.has(channelName)) {
      this.realtimeChannels.get(channelName)?.unsubscribe()
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `team_id=eq.${teamId}` },
        callback,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_members", filter: `team_id=eq.${teamId}` },
        callback,
      )
      .subscribe()

    this.realtimeChannels.set(channelName, channel)

    return () => {
      channel.unsubscribe()
      this.realtimeChannels.delete(channelName)
    }
  }

  // ====================
  // UTILITY METHODS
  // ====================

  private async updateProjectProgress(projectId: string): Promise<void> {
    try {
      const { data: tasks } = await supabase.from("tasks").select("status").eq("project_id", projectId)

      if (!tasks || tasks.length === 0) return

      const completedTasks = tasks.filter((task) => task.status === "completed").length
      const progress = Math.round((completedTasks / tasks.length) * 100)

      await supabase.from("projects").update({ progress }).eq("id", projectId)
    } catch (error) {
      console.error("Error updating project progress:", error)
    }
  }

  private async logActivity(action: string, entityType: string, entityId: string, metadata?: any): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata: metadata || {},
      })
    } catch (error) {
      console.error("Error logging activity:", error)
    }
  }

  // Cleanup method
  cleanup(): void {
    this.realtimeChannels.forEach((channel) => channel.unsubscribe())
    this.realtimeChannels.clear()
  }

  async saveResearchIdea(idea: {
    title: string
    description: string
    research_question?: string
    methodology?: string
    impact?: string
    challenges?: string
    topic: string
    context?: string
  }): Promise<ResearchIdea> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase
        .from("research_ideas")
        .insert({
          user_id: user.id,
          title: idea.title,
          description: idea.description,
          research_question: idea.research_question,
          methodology: idea.methodology,
          impact: idea.impact,
          challenges: idea.challenges,
          topic: idea.topic,
          context: idea.context,
        })
        .select()
        .single()

      if (error) throw error

      // Log activity
      await this.logActivity("created", "research_idea", data.id, { title: data.title })

      return data
    } catch (error) {
      console.error("Error saving research idea:", error)
      throw error
    }
  }

  async deleteResearchIdea(ideaId: string): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase.from("research_ideas").delete().eq("id", ideaId).eq("user_id", user.id)

      if (error) throw error

      // Log activity
      await this.logActivity("deleted", "research_idea", ideaId)
    } catch (error) {
      console.error("Error deleting research idea:", error)
      throw error
    }
  }
}

// Auto-test connection when service loads
ProjectService.testConnection()

// 👇 add this just ABOVE the `export const projectService …` line
// (it co-exists with the interface via declaration-merging)
/** Runtime token so `{ ResearchIdea }` can be imported at runtime */
export class ResearchIdea {} // <- satisfies bundler

// ⬇️ replace the current export lines at the bottom with:
export const projectService = new ProjectService()
export default projectService // keep default for convenience
