import { supabase } from "@/integrations/supabase/client"
import type { Project, ProjectInsert, ProjectUpdate, Task, TaskInsert, TaskUpdate } from "@/src/integrations/supabase/types"

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

export class ProjectService {

  // Test connection and show success message
  static async testConnection() {
    try {
      const { data, error } = await supabase.from('projects').select('count').limit(1)
      if (error) throw error
      
      console.log('✅ Database connection successful!')
      console.log('🚀 Projects service is ready to use')
      console.log('📊 Your Supabase database is properly configured')
      
      return { success: true, message: 'Database connection successful!' }
    } catch (error) {
      console.error('❌ Database connection failed:', error)
      return { success: false, error: error }
    }
  }

  // Create a new project
  static async createProject(projectData: CreateProjectData, userId: string) {
    console.log('🎯 Creating new project:', projectData.title)
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            title: projectData.title,
            description: projectData.description || '',
            owner_id: userId,
            status: projectData.status || 'planning',
            start_date: projectData.start_date,
            end_date: projectData.end_date,
          }
        ])
        .select('*')
        .single()

      if (error) throw error

      console.log('✅ Project created successfully:', data.title)
      return { data, error: null }
    } catch (error) {
      console.error('❌ Failed to create project:', error)
      return { data: null, error }
    }
  }

  // Get user's projects
  static async getUserProjects(userId: string) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          tasks (
            id,
            title,
            status,
            priority,
            due_date,
            created_at
          )
        `)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log(`📋 Loaded ${data?.length || 0} projects for user`)
      return { data, error: null }
    } catch (error) {
      console.error('❌ Failed to load projects:', error)
      return { data: null, error }
    }
  }

  // Create a task
  static async createTask(taskData: CreateTaskData, userId: string) {
    console.log('📝 Creating new task:', taskData.title)
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            title: taskData.title,
            description: taskData.description || '',
            project_id: taskData.project_id,
            assignee_id: userId,
            status: taskData.status || 'todo',
            priority: taskData.priority || 'medium',
            due_date: taskData.due_date,
            estimated_hours: taskData.estimated_hours,
          }
        ])
        .select('*')
        .single()

      if (error) throw error

      console.log('✅ Task created successfully:', data.title)
      return { data, error: null }
    } catch (error) {
      console.error('❌ Failed to create task:', error)
      return { data: null, error }
    }
  }

  // Update task status
  static async updateTask(taskId: string, updates: UpdateTaskData): Promise<Task> {
    console.log('🔄 Updating task:', taskId)
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select('*')
        .single()

      if (error) throw error

      console.log('✅ Task updated successfully')
      return data
    } catch (error) {
      console.error('❌ Failed to update task:', error)
      throw error
    }
  }

  // Get project tasks
  static async getProjectTasks(projectId: string) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('❌ Failed to load tasks:', error)
      return { data: null, error }
    }
  }

  // Real-time subscription for project updates
  static subscribeToProjectUpdates(projectId: string, callback: (payload: any) => void) {
    console.log('🔄 Setting up real-time subscription for project:', projectId)
    
    const subscription = supabase
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        callback
      )
      .subscribe()

    return subscription
  }

  // Calculate project progress
  static calculateProgress(tasks: any[]) {
    if (!tasks || tasks.length === 0) return 0
    
    const completedTasks = tasks.filter(task => task.status === 'completed').length
    const progress = Math.round((completedTasks / tasks.length) * 100)
    
    console.log(`📊 Project progress: ${completedTasks}/${tasks.length} tasks completed (${progress}%)`)
    return progress
  }

  // Delete project
  static async deleteProject(projectId: string) {
    console.log('🗑️ Deleting project:', projectId)
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error

      console.log('✅ Project deleted successfully')
      return { error: null }
    } catch (error) {
      console.error('❌ Failed to delete project:', error)
      return { error }
    }
  }

  // Delete task
  static async deleteTask(taskId: string) {
    console.log('🗑️ Deleting task:', taskId)
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      console.log('✅ Task deleted successfully')
      return { error: null }
    } catch (error) {
      console.error('❌ Failed to delete task:', error)
      return { error }
    }
  }

  // Project CRUD operations
  static async getProjects(): Promise<Project[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async getProject(id: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  }

  static async updateProject(id: string, updates: ProjectUpdate): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Task CRUD operations
  static async getTasks(projectId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  // Helper method to update project progress based on completed tasks
  static async updateProjectProgress(projectId: string): Promise<void> {
    const tasks = await ProjectService.getTasks(projectId)
    const completedTasks = tasks.filter(task => task.status === 'completed')
    const progress = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0

    await ProjectService.updateProject(projectId, { progress })
  }

  // Get project with tasks (combined query)
  static async getProjectWithTasks(projectId: string): Promise<Project & { tasks: Task[] }> {
    const [project, tasks] = await Promise.all([
      ProjectService.getProject(projectId),
      ProjectService.getTasks(projectId)
    ])

    if (!project) throw new Error('Project not found')

    return {
      ...project,
      tasks
    }
  }

  // Real-time subscriptions
  static subscribeToProjects(callback: (projects: Project[]) => void) {
    return supabase
      .channel('projects')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'projects' }, 
        () => {
          // Refresh projects when changes occur
          ProjectService.getProjects().then(callback).catch(console.error)
        }
      )
      .subscribe()
  }

  static subscribeToTasks(projectId: string, callback: (tasks: Task[]) => void) {
    return supabase
      .channel(`tasks:${projectId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'tasks',
          filter: `project_id=eq.${projectId}`
        }, 
        () => {
          // Refresh tasks when changes occur
          ProjectService.getTasks(projectId).then(callback).catch(console.error)
        }
      )
      .subscribe()
  }

  // Bulk operations
  static async createMultipleTasks(tasks: TaskInsert[]): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .insert(tasks)
      .select()

    if (error) throw error

    // Update progress for all affected projects
    const projectIds = [...new Set(tasks.map(task => task.project_id))]
    await Promise.all(projectIds.map(id => ProjectService.updateProjectProgress(id)))

    return data || []
  }

  static async updateTaskStatus(taskId: string, status: Task['status']): Promise<Task> {
    return ProjectService.updateTask(taskId, { status })
  }

  static async updateProjectStatus(projectId: string, status: Project['status']): Promise<Project> {
    return ProjectService.updateProject(projectId, { status })
  }

  // Analytics methods
  static async getProjectStats(projectId: string) {
    const tasks = await ProjectService.getTasks(projectId)
    
    const stats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
      todoTasks: tasks.filter(t => t.status === 'todo').length,
      highPriorityTasks: tasks.filter(t => t.priority === 'high').length,
      mediumPriorityTasks: tasks.filter(t => t.priority === 'medium').length,
      lowPriorityTasks: tasks.filter(t => t.priority === 'low').length,
      overdueTasks: tasks.filter(t => 
        t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
      ).length,
      totalEstimatedHours: tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
    }

    return stats
  }

  static async getAllProjectsStats() {
    const projects = await ProjectService.getProjects()
    
    const stats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'active').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      planningProjects: projects.filter(p => p.status === 'planning').length,
      onHoldProjects: projects.filter(p => p.status === 'on-hold').length,
      averageProgress: projects.length > 0 
        ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length) 
        : 0,
    }

    return stats
  }
}

// Auto-test connection when service loads
ProjectService.testConnection() 